-- Ranger Station: the member-facing feedback board. Any member can file a
-- feature request or bug report and vote items up the board; Rangers set
-- status. Reads are open to all members; every write goes through a
-- SECURITY DEFINER RPC — neither table has an INSERT/UPDATE/DELETE policy,
-- so clients cannot touch rows directly (the self-insert class of bug has
-- no policy to exploit).

CREATE TABLE IF NOT EXISTS public.feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('feature', 'bug')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'planned', 'in_progress', 'done', 'declined')),
  ranger_note text CHECK (ranger_note IS NULL OR char_length(ranger_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_items_status_idx ON public.feedback_items (status);
CREATE INDEX IF NOT EXISTS feedback_items_author_idx ON public.feedback_items (author_id);

CREATE TABLE IF NOT EXISTS public.feedback_votes (
  item_id uuid NOT NULL REFERENCES public.feedback_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_items_member_select ON public.feedback_items;
CREATE POLICY feedback_items_member_select ON public.feedback_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS feedback_votes_member_select ON public.feedback_votes;
CREATE POLICY feedback_votes_member_select ON public.feedback_votes
  FOR SELECT TO authenticated USING (true);

-- Submit a feature request or bug report. Rate-limited to 5 per author per
-- 24h; the author's own vote is recorded on insert so a fresh item starts
-- at 1 like everywhere else on the board.
CREATE OR REPLACE FUNCTION public.submit_feedback(_type text, _title text, _body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _author uuid := auth.uid();
  _item_id uuid;
BEGIN
  IF _author IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _type IS NULL OR _type NOT IN ('feature', 'bug') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_type');
  END IF;

  IF _title IS NULL OR char_length(btrim(_title)) < 3 OR char_length(btrim(_title)) > 120 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_title');
  END IF;

  IF _body IS NULL OR char_length(btrim(_body)) < 1 OR char_length(btrim(_body)) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_body');
  END IF;

  IF (SELECT count(*) FROM public.feedback_items
      WHERE author_id = _author
        AND created_at > now() - interval '24 hours') >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  INSERT INTO public.feedback_items (author_id, item_type, title, body)
  VALUES (_author, _type, btrim(_title), btrim(_body))
  RETURNING id INTO _item_id;

  INSERT INTO public.feedback_votes (item_id, user_id) VALUES (_item_id, _author);

  RETURN jsonb_build_object('success', true, 'item_id', _item_id);
END;
$$;

-- Toggle the caller's vote on an item. Idempotent per call direction; no
-- rate limit — the PK bounds it at one row per (item, user), and toggling
-- churn is harmless.
CREATE OR REPLACE FUNCTION public.toggle_feedback_vote(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _voter uuid := auth.uid();
  _voted boolean;
  _count integer;
BEGIN
  IF _voter IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feedback_items WHERE id = _item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  DELETE FROM public.feedback_votes WHERE item_id = _item_id AND user_id = _voter;
  IF NOT FOUND THEN
    INSERT INTO public.feedback_votes (item_id, user_id) VALUES (_item_id, _voter);
    _voted := true;
  ELSE
    _voted := false;
  END IF;

  SELECT count(*) INTO _count FROM public.feedback_votes WHERE item_id = _item_id;

  RETURN jsonb_build_object('success', true, 'voted', _voted, 'vote_count', _count);
END;
$$;

-- Authors can rewrite their own item while it is still open (once a Ranger
-- has moved it, the board history stays put).
CREATE OR REPLACE FUNCTION public.update_own_feedback(_item_id uuid, _title text, _body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _author uuid := auth.uid();
BEGIN
  IF _author IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _title IS NULL OR char_length(btrim(_title)) < 3 OR char_length(btrim(_title)) > 120 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_title');
  END IF;

  IF _body IS NULL OR char_length(btrim(_body)) < 1 OR char_length(btrim(_body)) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_body');
  END IF;

  UPDATE public.feedback_items
  SET title = btrim(_title), body = btrim(_body), updated_at = now()
  WHERE id = _item_id AND author_id = _author AND status = 'open';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_editable');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_feedback(_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _author uuid := auth.uid();
BEGIN
  IF _author IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  DELETE FROM public.feedback_items
  WHERE id = _item_id AND author_id = _author AND status = 'open';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_deletable');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Rangers move items across the board and can leave a note members see.
CREATE OR REPLACE FUNCTION public.set_feedback_status(_item_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF _actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF public.ranger_level(_actor) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;

  IF _status IS NULL OR _status NOT IN ('open', 'planned', 'in_progress', 'done', 'declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  IF _note IS NOT NULL AND char_length(_note) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_note');
  END IF;

  UPDATE public.feedback_items
  SET status = _status,
      ranger_note = COALESCE(_note, ranger_note),
      updated_at = now()
  WHERE id = _item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
