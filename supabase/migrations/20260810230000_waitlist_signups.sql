-- Coming-soon waitlist: visitors without an invite can leave an email at the
-- landing page. Writes go only through the join_waitlist() definer RPC — the
-- table has no INSERT policy, so anon/authenticated cannot touch rows
-- directly, and only rangers can read the list.

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'invited', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_admin_select ON public.waitlist_signups;
CREATE POLICY waitlist_admin_select ON public.waitlist_signups
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS waitlist_admin_update ON public.waitlist_signups;
CREATE POLICY waitlist_admin_update ON public.waitlist_signups
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- The one write path. Always answers success for a well-formed email —
-- including duplicates — so the RPC can't be used to probe who is already
-- on the list. The hourly cap blunts scripted flooding; a real launch spike
-- hitting it just means "try again in a bit", which the client copy handles.
CREATE OR REPLACE FUNCTION public.join_waitlist(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := public.normalize_email(_email);
BEGIN
  IF _norm IS NULL
     OR length(_norm) > 320
     OR _norm !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  IF (SELECT count(*) FROM public.waitlist_signups
      WHERE created_at > now() - interval '1 hour') >= 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'try_later');
  END IF;

  INSERT INTO public.waitlist_signups (email, email_normalized)
  VALUES (btrim(_email), _norm)
  ON CONFLICT (email_normalized) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;
