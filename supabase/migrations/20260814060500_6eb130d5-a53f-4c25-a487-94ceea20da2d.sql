-- Notification system overhaul: server-side producers, live aggregated
-- reactions, clear-all, and RLS tightening.
--
-- Until now every notification was a best-effort client-side insert —
-- skippable, silently failing, and inconsistent (friend-request accepts
-- notified from one of three code paths; invite acceptance notified nobody;
-- camp joins notified nobody). Producers move server-side here: AFTER
-- INSERT/UPDATE triggers on the event tables plus hooks in the invite
-- redemption functions, all funneling through one exception-swallowing
-- SECURITY DEFINER helper (the proven cabin_notify pattern), so a failed
-- notification can never fail the action it decorates.
--
-- Also fixed in passing, because the same constraint gates them:
--   * notifications_notification_type_check was stale — live code writes
--     'system' (ranger moderation!), 'camp_newsletter', 'design_approved',
--     'design_rejected', 'design_purchased', 'inactive_nudge',
--     'annual_wrapped'; every one of those inserts has been failing.
--   * reactions_reaction_type_check was missing 'relatable', 'eyeroll',
--     'moonstruck' — three of the nine reactions the client offers were
--     silently thrown away.
--
-- Reaction aggregation: one notifications row per (recipient, post), count
-- RECOMPUTED from the reactions table on every insert (self-healing), bumped
-- to unread only when the count exceeds the stored count — which makes the
-- client's change-emoji dance (delete then insert) a no-op instead of a
-- re-notification. Accepted edges, chosen deliberately:
--   * a post's sole reactor changing their emoji deletes the row at count 0
--     and recreates it — one spurious re-notification;
--   * after an un-react the stored count stays high until the next insert
--     (display heals then), so the next new reactor may not flip the row
--     back to unread.
--
-- quiet_mode deliberately does NOT gate writes — it stays a delivery/display
-- concept (Daily Ember reads it); dropping rows at write time would lose
-- them forever. The notify_* preference flags DO gate writes here — the
-- first time those settings do anything.

-- ---------------------------------------------------------------------------
-- 1. Schema: aggregation count + the index the Updates page actually needs
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS aggregate_count integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Collapse historical reaction_batch rows to one per (recipient, post),
--    then enforce that shape with a partial unique index (the upsert target).
-- ---------------------------------------------------------------------------

WITH grouped AS (
  SELECT recipient_id, post_id,
         count(*)                    AS cnt,
         bool_and(is_read)           AS all_read,
         bool_and(is_delivered_in_ember) AS all_delivered,
         (array_agg(id ORDER BY created_at DESC, id DESC))[1] AS keep_id
  FROM public.notifications
  WHERE notification_type = 'reaction_batch' AND post_id IS NOT NULL
  GROUP BY recipient_id, post_id
)
UPDATE public.notifications n
SET aggregate_count = g.cnt,
    is_read = g.all_read,
    is_delivered_in_ember = g.all_delivered
FROM grouped g
WHERE n.id = g.keep_id;

DELETE FROM public.notifications n
WHERE n.notification_type = 'reaction_batch'
  AND (
    n.post_id IS NULL
    OR n.id NOT IN (
      SELECT (array_agg(id ORDER BY created_at DESC, id DESC))[1]
      FROM public.notifications
      WHERE notification_type = 'reaction_batch' AND post_id IS NOT NULL
      GROUP BY recipient_id, post_id
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS notifications_reaction_agg_uq
  ON public.notifications (recipient_id, post_id)
  WHERE notification_type = 'reaction_batch';

-- ---------------------------------------------------------------------------
-- 3. Type constraints brought back in line with reality
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check CHECK (notification_type IN (
    'reaction_batch', 'reply', 'quote_post',
    'circle_request', 'circle_accepted',
    'invite_accepted', 'smoke_signal',
    'campfire_message', 'collection_subscriber',
    'cabin_knock', 'cabin_gift', 'cabin_guestbook', 'cabin_note', 'cabin_trade',
    'system', 'camp_newsletter',
    'design_approved', 'design_rejected', 'design_purchased',
    'inactive_nudge', 'annual_wrapped',
    'camp_join_request', 'camp_join_accepted', 'camp_role_changed',
    'camp_member_joined'
  ));

ALTER TABLE public.reactions
  DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;
ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_reaction_type_check CHECK (reaction_type IN (
    'fire', 'grounded', 'warmth', 'laughed', 'noted', 'present', 'heavy',
    'delight', 'relatable', 'eyeroll', 'moonstruck'
  ));

-- ---------------------------------------------------------------------------
-- 4. The generalized notify helper (cabin_notify's grown-up sibling)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_user(
  _recipient uuid,
  _actor uuid,
  _type text,
  _post uuid DEFAULT NULL,
  _campfire uuid DEFAULT NULL,
  _collection uuid DEFAULT NULL,
  _camp uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _recipient IS NULL OR (_actor IS NOT NULL AND _recipient = _actor) THEN
    RETURN;
  END IF;

  IF _actor IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _recipient AND blocked_id = _actor)
       OR (blocker_id = _actor AND blocked_id = _recipient)
  ) THEN
    RETURN;
  END IF;

  -- Write-time enforcement of the per-type notification preferences.
  IF _type = 'circle_request' AND EXISTS (
    SELECT 1 FROM public.notification_preferences
    WHERE user_id = _recipient AND notify_circle_requests = false
  ) THEN RETURN; END IF;
  IF _type = 'invite_accepted' AND EXISTS (
    SELECT 1 FROM public.notification_preferences
    WHERE user_id = _recipient AND notify_invite_accepted = false
  ) THEN RETURN; END IF;
  IF _type = 'smoke_signal' AND EXISTS (
    SELECT 1 FROM public.notification_preferences
    WHERE user_id = _recipient AND notify_smoke_signals = false
  ) THEN RETURN; END IF;

  -- Dedupe guard: absorbs the window where an old client still inserts the
  -- notification the new trigger also writes, and any double-firing trigger
  -- pair (join-request acceptance + member insert).
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.recipient_id = _recipient
      AND n.notification_type = _type
      AND n.actor_id      IS NOT DISTINCT FROM _actor
      AND n.post_id       IS NOT DISTINCT FROM _post
      AND n.campfire_id   IS NOT DISTINCT FROM _campfire
      AND n.collection_id IS NOT DISTINCT FROM _collection
      AND n.camp_id_ref   IS NOT DISTINCT FROM _camp
      AND n.created_at > now() - interval '10 minutes'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications
    (recipient_id, actor_id, notification_type, post_id, campfire_id, collection_id, camp_id_ref)
  VALUES (_recipient, _actor, _type, _post, _campfire, _collection, _camp);
EXCEPTION WHEN OTHERS THEN
  NULL;  -- a failed notification never fails the action it decorates
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, uuid, text, uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Trigger functions. All SECURITY DEFINER with EXECUTE revoked; every body
--    ends in an exception guard so the decorated write always survives.
-- ---------------------------------------------------------------------------

-- Replies: notify the post author, and — new — the parent reply's author on
-- nested replies (previously never notified at all).
CREATE OR REPLACE FUNCTION public.trg_fn_notify_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _post_author uuid;
  _parent_author uuid;
BEGIN
  SELECT author_id INTO _post_author FROM public.posts WHERE id = NEW.post_id;
  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT author_id INTO _parent_author FROM public.replies WHERE id = NEW.parent_reply_id;
    PERFORM public.notify_user(_parent_author, NEW.author_id, 'reply', NEW.post_id);
  END IF;
  IF _post_author IS DISTINCT FROM _parent_author THEN
    PERFORM public.notify_user(_post_author, NEW.author_id, 'reply', NEW.post_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Reactions, insert: the aggregation core. The count is RECOMPUTED from the
-- reactions table (never incremented), and the row only goes back to unread
-- when the count exceeds what's stored.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_reaction_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _author uuid;
  _cnt integer;
BEGIN
  SELECT author_id INTO _author FROM public.posts WHERE id = NEW.post_id;
  IF _author IS NULL OR _author = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _author AND blocked_id = NEW.user_id)
       OR (blocker_id = NEW.user_id AND blocked_id = _author)
  ) THEN RETURN NEW; END IF;

  SELECT count(*) INTO _cnt
  FROM public.reactions
  WHERE post_id = NEW.post_id AND user_id <> _author;

  INSERT INTO public.notifications
    (recipient_id, notification_type, actor_id, post_id, aggregate_count)
  VALUES (_author, 'reaction_batch', NEW.user_id, NEW.post_id, _cnt)
  ON CONFLICT (recipient_id, post_id) WHERE notification_type = 'reaction_batch'
  DO UPDATE SET
    actor_id        = EXCLUDED.actor_id,
    aggregate_count = EXCLUDED.aggregate_count,
    created_at      = CASE WHEN EXCLUDED.aggregate_count > notifications.aggregate_count
                           THEN now() ELSE notifications.created_at END,
    is_read         = CASE WHEN EXCLUDED.aggregate_count > notifications.aggregate_count
                           THEN false ELSE notifications.is_read END,
    is_delivered_in_ember = CASE WHEN EXCLUDED.aggregate_count > notifications.aggregate_count
                           THEN false ELSE notifications.is_delivered_in_ember END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Reactions, delete: drop the notification when the last reaction goes; when
-- reactions remain, keep count and read-state (going momentarily stale-high
-- beats re-notifying on every emoji change) but stop naming an un-reactor.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_reaction_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _author uuid;
  _cnt integer;
  _latest uuid;
BEGIN
  SELECT author_id INTO _author FROM public.posts WHERE id = OLD.post_id;
  IF _author IS NULL OR _author = OLD.user_id THEN RETURN OLD; END IF;

  SELECT count(*) INTO _cnt
  FROM public.reactions
  WHERE post_id = OLD.post_id AND user_id <> _author;

  IF _cnt = 0 THEN
    DELETE FROM public.notifications
    WHERE recipient_id = _author AND post_id = OLD.post_id
      AND notification_type = 'reaction_batch';
  ELSE
    SELECT user_id INTO _latest
    FROM public.reactions
    WHERE post_id = OLD.post_id AND user_id <> _author
    ORDER BY created_at DESC LIMIT 1;

    UPDATE public.notifications
    SET actor_id = _latest
    WHERE recipient_id = _author AND post_id = OLD.post_id
      AND notification_type = 'reaction_batch'
      AND actor_id = OLD.user_id;
  END IF;
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END;
$$;

-- Circles: request on INSERT of a pending row (invite auto-friendships insert
-- as 'accepted' and are skipped); acceptance on the pending→accepted UPDATE.
-- Makes all the inconsistent client paths uniformly correct.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_circle_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.notify_user(NEW.requestee_id, NEW.requester_id, 'circle_request');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_notify_circle_upd() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    PERFORM public.notify_user(NEW.requester_id, NEW.requestee_id, 'circle_accepted');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Quote posts: notify the quoted author when a published post quotes them.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_quote() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _quoted_author uuid;
BEGIN
  SELECT author_id INTO _quoted_author FROM public.posts WHERE id = NEW.quoted_post_id;
  PERFORM public.notify_user(_quoted_author, NEW.author_id, 'quote_post', NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Camp membership: a self-join tells the firekeeper someone arrived; being
-- added by someone else (approval / invite flows) tells the new member.
-- auth.uid() is NULL for service-role writes — notify_user tolerates a NULL
-- actor, and the creator-bootstrap insert is silenced by its self-guard.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_camp_member_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _actor uuid := auth.uid();
  _firekeeper uuid;
BEGIN
  SELECT firekeeper_id INTO _firekeeper FROM public.camps WHERE id = NEW.camp_id;
  IF _actor IS NOT NULL AND _actor = NEW.user_id THEN
    PERFORM public.notify_user(_firekeeper, NEW.user_id, 'camp_member_joined', _camp => NEW.camp_id);
  ELSE
    PERFORM public.notify_user(NEW.user_id, _actor, 'camp_join_accepted', _camp => NEW.camp_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_notify_camp_member_upd() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.notify_user(NEW.user_id, auth.uid(), 'camp_role_changed', _camp => NEW.camp_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Join requests: request → firekeeper; acceptance → requester. No client
-- inserts these yet (the ask-to-join flow is unbuilt) — this is the hook
-- being ready for it. The dedupe guard in notify_user keeps the acceptance
-- from doubling with the camp_members insert the same action performs.
CREATE OR REPLACE FUNCTION public.trg_fn_notify_camp_join_req_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _firekeeper uuid;
BEGIN
  SELECT firekeeper_id INTO _firekeeper FROM public.camps WHERE id = NEW.camp_id;
  PERFORM public.notify_user(_firekeeper, NEW.user_id, 'camp_join_request', _camp => NEW.camp_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_notify_camp_join_req_upd() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    PERFORM public.notify_user(NEW.user_id, auth.uid(), 'camp_join_accepted', _camp => NEW.camp_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.trg_fn_notify_reply(),
  public.trg_fn_notify_reaction_ins(),
  public.trg_fn_notify_reaction_del(),
  public.trg_fn_notify_circle_ins(),
  public.trg_fn_notify_circle_upd(),
  public.trg_fn_notify_quote(),
  public.trg_fn_notify_camp_member_ins(),
  public.trg_fn_notify_camp_member_upd(),
  public.trg_fn_notify_camp_join_req_ins(),
  public.trg_fn_notify_camp_join_req_upd()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_reply ON public.replies;
CREATE TRIGGER trg_notify_reply
  AFTER INSERT ON public.replies
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_reply();

DROP TRIGGER IF EXISTS trg_notify_reaction_ins ON public.reactions;
CREATE TRIGGER trg_notify_reaction_ins
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_reaction_ins();

DROP TRIGGER IF EXISTS trg_notify_reaction_del ON public.reactions;
CREATE TRIGGER trg_notify_reaction_del
  AFTER DELETE ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_reaction_del();

DROP TRIGGER IF EXISTS trg_notify_circle_ins ON public.circles;
CREATE TRIGGER trg_notify_circle_ins
  AFTER INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_circle_ins();

DROP TRIGGER IF EXISTS trg_notify_circle_upd ON public.circles;
CREATE TRIGGER trg_notify_circle_upd
  AFTER UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_circle_upd();

DROP TRIGGER IF EXISTS trg_notify_quote ON public.posts;
CREATE TRIGGER trg_notify_quote
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (NEW.quoted_post_id IS NOT NULL AND NEW.is_published)
  EXECUTE FUNCTION public.trg_fn_notify_quote();

DROP TRIGGER IF EXISTS trg_notify_camp_member_ins ON public.camp_members;
CREATE TRIGGER trg_notify_camp_member_ins
  AFTER INSERT ON public.camp_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_camp_member_ins();

DROP TRIGGER IF EXISTS trg_notify_camp_member_upd ON public.camp_members;
CREATE TRIGGER trg_notify_camp_member_upd
  AFTER UPDATE ON public.camp_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_camp_member_upd();

DROP TRIGGER IF EXISTS trg_notify_camp_join_req_ins ON public.camp_join_requests;
CREATE TRIGGER trg_notify_camp_join_req_ins
  AFTER INSERT ON public.camp_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_camp_join_req_ins();

DROP TRIGGER IF EXISTS trg_notify_camp_join_req_upd ON public.camp_join_requests;
CREATE TRIGGER trg_notify_camp_join_req_upd
  AFTER UPDATE ON public.camp_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_notify_camp_join_req_upd();

-- ---------------------------------------------------------------------------
-- 6. invite_accepted finally gets a producer: the three redemption paths.
--    Each is the LIVE production body re-emitted with one added notify call;
--    the helper swallows its own failures, so signup can never abort on it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cfg jsonb := public.get_security_config();
  _invite_only boolean := COALESCE((_cfg->>'INVITE_ONLY_SIGNUP')::boolean, true);
  _token text := NULLIF(NEW.raw_user_meta_data->>'trail_pass_token', '');
  _legacy_invite_id uuid := NULLIF(NEW.raw_user_meta_data->>'invite_id', '')::uuid;
  _pass public.trail_passes%ROWTYPE;
  _legacy public.invites%ROWTYPE;
BEGIN
  -- Validate the invitation BEFORE creating anything.
  IF _token IS NOT NULL THEN
    SELECT * INTO _pass
    FROM public.trail_passes
    WHERE token_hash = public.hash_invite_token(_token)
    FOR UPDATE;

    IF _pass.id IS NULL OR _pass.status <> 'PENDING' OR _pass.expires_at <= now() THEN
      RAISE EXCEPTION 'signup_invalid_invitation';
    END IF;
    -- Email binding: the pass only opens the gate for the address it was
    -- sent to.
    IF public.normalize_email(NEW.email) IS DISTINCT FROM _pass.invitee_email_normalized THEN
      RAISE EXCEPTION 'signup_invitation_email_mismatch';
    END IF;

  ELSIF _legacy_invite_id IS NOT NULL THEN
    IF NOT COALESCE((_cfg->>'LEGACY_LINK_REDEMPTION_ENABLED')::boolean, true) THEN
      RAISE EXCEPTION 'signup_requires_invitation';
    END IF;

    SELECT * INTO _legacy
    FROM public.invites
    WHERE id = _legacy_invite_id AND is_active = true
    FOR UPDATE;

    IF _legacy.id IS NULL THEN
      RAISE EXCEPTION 'signup_invalid_invitation';
    END IF;
    IF NOT _legacy.is_infinite THEN
      IF _legacy.uses_remaining < 1 THEN
        RAISE EXCEPTION 'signup_invalid_invitation';
      END IF;
      -- Atomic decrement, inside the signup transaction: concurrent
      -- redemptions cannot overspend the link.
      UPDATE public.invites
      SET uses_remaining = uses_remaining - 1,
          is_active = (uses_remaining - 1) > 0
      WHERE id = _legacy.id;
    END IF;

  ELSIF _invite_only
        -- app_metadata can only be set server-side (auth.admin.createUser),
        -- never by a browser signUp call — user_metadata would be forgeable.
        AND COALESCE(NEW.raw_app_meta_data->>'invite_bypass', '') <> 'true' THEN
    RAISE EXCEPTION 'signup_requires_invitation';
  END IF;

  INSERT INTO public.profiles (id, handle, display_name, default_avatar_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Arrival'),
    public.random_creature()
  );

  INSERT INTO public.account_verifications (user_id, email_verified_at)
  VALUES (NEW.id, NEW.email_confirmed_at)
  ON CONFLICT (user_id) DO NOTHING;

  -- Complete redemption now the profile row exists.
  IF _pass.id IS NOT NULL THEN
    UPDATE public.trail_passes
    SET status = 'REDEEMED', redeemed_at = now(), redeemed_by_user_id = NEW.id
    WHERE id = _pass.id;

    INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
    VALUES (NEW.id, _pass.inviter_user_id, _pass.id, 'trail_pass')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
    VALUES (_pass.inviter_user_id, 'INVITE_REDEEMED', 0, 'invite', 'trail_pass', _pass.id);

    -- Tell the inviter their pass was used. notify_user swallows its own
    -- failures — this can never abort a signup.
    PERFORM public.notify_user(_pass.inviter_user_id, NEW.id, 'invite_accepted');

    IF _pass.inviter_user_id <> NEW.id THEN
      INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
      VALUES (_pass.inviter_user_id, NEW.id, 'accepted', now(), now())
      ON CONFLICT DO NOTHING;
      INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
      VALUES (NEW.id, _pass.inviter_user_id, 'accepted', now(), now())
      ON CONFLICT DO NOTHING;
    END IF;

  ELSIF _legacy.id IS NOT NULL THEN
    -- ip_hash keeps the existing per-IP rate limit on open (infinite) links
    -- fed; it is computed server-side by validate-invite and round-tripped
    -- through signup metadata, same trust level as before.
    INSERT INTO public.invite_uses (invite_id, invitee_id, ip_hash)
    VALUES (_legacy.id, NEW.id, NULLIF(NEW.raw_user_meta_data->>'invite_ip_hash', ''));
    PERFORM public.accept_invite_create_circle(_legacy.id, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_trail_pass(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _user_email text;
  _pass public.trail_passes%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  -- Row lock makes concurrent redemption of the same token impossible.
  SELECT * INTO _pass
  FROM public.trail_passes
  WHERE token_hash = public.hash_invite_token(_token)
  FOR UPDATE;

  IF _pass.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _pass.status = 'PENDING' AND _pass.expires_at <= now() THEN
    UPDATE public.trail_passes SET status = 'EXPIRED' WHERE id = _pass.id;
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF _pass.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', lower(_pass.status));
  END IF;

  -- Email binding: the pass only creates an account for the address it was
  -- sent to (spec §12).
  IF public.normalize_email(_user_email) IS DISTINCT FROM _pass.invitee_email_normalized THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
  END IF;

  -- One lineage per account, ever.
  IF EXISTS (SELECT 1 FROM public.user_lineage WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_joined');
  END IF;

  UPDATE public.trail_passes
  SET status = 'REDEEMED', redeemed_at = now(), redeemed_by_user_id = _user_id
  WHERE id = _pass.id;

  INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
  VALUES (_user_id, _pass.inviter_user_id, _pass.id, 'trail_pass')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.trust_events (user_id, event_type, weight, category, source_type, source_id)
  VALUES (_pass.inviter_user_id, 'INVITE_REDEEMED', 0, 'invite', 'trail_pass', _pass.id);

  -- Tell the inviter their pass was used.
  PERFORM public.notify_user(_pass.inviter_user_id, _user_id, 'invite_accepted');

  -- The inviter and invitee start connected, same as the legacy invite flow.
  IF _pass.inviter_user_id <> _user_id THEN
    INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
    VALUES (_pass.inviter_user_id, _user_id, 'accepted', now(), now())
    ON CONFLICT DO NOTHING;
    INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
    VALUES (_user_id, _pass.inviter_user_id, 'accepted', now(), now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'inviter_id', _pass.inviter_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invite_create_circle(_invite_id uuid, _new_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id uuid;
  v_is_root boolean;
BEGIN
  SELECT inviter_id, is_root INTO v_inviter_id, v_is_root
  FROM public.invites
  WHERE id = _invite_id;

  IF v_inviter_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_lineage (user_id, invited_by_user_id, source_invite_id, source_kind)
  VALUES (
    _new_user_id,
    CASE WHEN v_is_root THEN NULL ELSE v_inviter_id END,
    _invite_id,
    CASE WHEN v_is_root THEN 'root_link' ELSE 'legacy_link' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_root OR v_inviter_id = _new_user_id THEN
    RETURN;
  END IF;

  -- Tell the inviter their link was used.
  PERFORM public.notify_user(v_inviter_id, _new_user_id, 'invite_accepted');

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (v_inviter_id, _new_user_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (_new_user_id, v_inviter_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. RLS: clear-all becomes possible; the recipient's UPDATE shrinks to the
--    one column they legitimately write; INSERT shrinks to the two flows
--    that still write client-side.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Column-scoped UPDATE (the profiles precedent): clients only ever flip
-- is_read; is_delivered_in_ember belongs to the service-role Ember function.
REVOKE UPDATE ON public.notifications FROM anon, authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

-- Client-side inserts shrink to the two flows that still do them (the
-- /invites nudge and the camp newsletter fan-out) plus the admin design
-- review, which inserts with a NULL actor. Everything else is trigger- or
-- service-role-written now.
DROP POLICY IF EXISTS "Members can only send notifications as themselves" ON public.notifications;
CREATE POLICY "Members can only send notifications as themselves"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    (actor_id = auth.uid() AND notification_type IN ('smoke_signal', 'camp_newsletter'))
    OR (actor_id IS NULL AND public.is_admin(auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 8. get_boot_state: reactions now count toward the badge. This is the LIVE
--    body with exactly one edit — the reaction_batch exclusion is gone.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_boot_state(_campfires_seen_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'profile', (
      SELECT to_jsonb(t) FROM (
        SELECT p.id, p.display_name, p.handle, p.avatar_url, p.default_avatar_key,
               p.accent_color, p.cabin_mood, p.bio, p.is_pines_plus, p.created_at,
               p.theme, p.messenger_skin, p.onboarding_completed_at,
               p.is_age_verified, p.age_bracket
        FROM public.profiles p
        WHERE p.id = auth.uid()
      ) t
    ),
    'roles', COALESCE(
      (SELECT jsonb_agg(ur.role::text) FROM public.user_roles ur WHERE ur.user_id = auth.uid()),
      '[]'::jsonb
    ),
    'is_admin', public.is_admin(auth.uid()),
    'suspension', (
      SELECT to_jsonb(t) FROM (
        SELECT s.reason, s.suspended_until, s.is_permanent
        FROM public.suspensions s
        WHERE s.user_id = auth.uid()
          AND (s.is_permanent OR (s.suspended_until IS NOT NULL AND s.suspended_until > now()))
      ) t
    ),
    'unread_notifications', (
      SELECT count(*) FROM public.notifications n
      WHERE n.recipient_id = auth.uid()
        AND n.is_read = false
    ),
    'has_unread_messages', EXISTS (
      SELECT 1
      FROM public.campfire_messages m
      JOIN public.campfire_participants cp ON cp.campfire_id = m.campfire_id
      WHERE cp.user_id = auth.uid()
        AND m.sender_id <> auth.uid()
        AND m.created_at > COALESCE(_campfires_seen_at, '-infinity'::timestamptz)
    )
  ) END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Post-apply assertions: fail loudly (rolling everything back) rather
--    than leave a partial overhaul in place.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  _n integer;
  _def text;
BEGIN
  SELECT count(*) INTO _n FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'notifications';
  IF _n <> 4 THEN
    RAISE EXCEPTION 'expected 4 notification policies, found %', _n;
  END IF;

  SELECT count(*) INTO _n FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'notifications'
    AND indexname IN ('notifications_recipient_created_idx', 'notifications_reaction_agg_uq');
  IF _n <> 2 THEN
    RAISE EXCEPTION 'expected both new notification indexes, found %', _n;
  END IF;

  SELECT count(*) INTO _n FROM (
    SELECT 1 FROM public.notifications
    WHERE notification_type = 'reaction_batch'
    GROUP BY recipient_id, post_id HAVING count(*) > 1
  ) d;
  IF _n <> 0 THEN
    RAISE EXCEPTION 'reaction_batch duplicates remain: % groups', _n;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO _def FROM pg_constraint
  WHERE conname = 'notifications_notification_type_check';
  IF _def NOT LIKE '%system%' OR _def NOT LIKE '%camp_member_joined%' THEN
    RAISE EXCEPTION 'notification type constraint missing expected types';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO _def FROM pg_constraint
  WHERE conname = 'reactions_reaction_type_check';
  IF _def NOT LIKE '%moonstruck%' THEN
    RAISE EXCEPTION 'reactions type constraint missing new types';
  END IF;

  SELECT count(*) INTO _n FROM pg_trigger
  WHERE tgname LIKE 'trg_notify_%' AND NOT tgisinternal;
  IF _n <> 10 THEN
    RAISE EXCEPTION 'expected 10 notify triggers, found %', _n;
  END IF;

  IF has_function_privilege('authenticated',
       'public.notify_user(uuid,uuid,text,uuid,uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'notify_user is executable by authenticated';
  END IF;

  SELECT count(*) INTO _n FROM information_schema.column_privileges
  WHERE table_schema = 'public' AND table_name = 'notifications'
    AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
  IF _n <> 1 THEN
    RAISE EXCEPTION 'expected exactly one UPDATE-able column for authenticated, found %', _n;
  END IF;
END;
$$;