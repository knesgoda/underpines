-- ============================================================================
-- SECURITY HARDENING — close the pre-publish scanner's critical findings
--
-- These findings predate the trust system; they are addressed here as a
-- focused, reviewed change rather than folded into the feature work. Each
-- fix is additive/idempotent and matches existing visibility exactly so no
-- current behavior regresses.
--
-- Findings (scanner `supabase_lov`, all level: error):
--   1. invites_secret_token_public           — public SELECT exposes secret_token
--   2. post_media_bypasses_post_visibility    — existence-only check
--   3. reactions_bypasses_post_visibility     — existence-only check
--   4. profiles_public_pii_exposure           — anon can read geo/DOB columns
--   5. voice_messages_bucket_overly_permissive— any logged-in user reads any file
--   6. realtime_messages_no_rls               — RLS on, zero policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. invites: stop exposing secret_token / slugs to the public
-- ----------------------------------------------------------------------------
-- The invite landing page runs before the visitor has an account, so it
-- cannot read the table under an authenticated policy. It gets exactly the
-- fields it needs — validity and the inviter's public name — through a
-- SECURITY DEFINER function instead, the same pattern used for Trail Passes
-- (get_trail_pass_status). secret_token, uses counts, and lineage stay
-- server-side.
DROP POLICY IF EXISTS "Invites are viewable by everyone" ON public.invites;

CREATE POLICY "Users can view their own invites"
  ON public.invites FOR SELECT TO authenticated
  USING (inviter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_invite_landing(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.invites%ROWTYPE;
  _name text;
  _handle text;
BEGIN
  SELECT * INTO _invite FROM public.invites WHERE slug = _slug;

  IF _invite.id IS NULL
     OR NOT _invite.is_active
     OR (NOT _invite.is_infinite AND _invite.uses_remaining <= 0) THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF NOT _invite.is_root THEN
    SELECT display_name, handle INTO _name, _handle
    FROM public.profiles WHERE id = _invite.inviter_id;
  END IF;

  -- invite_id is returned because signup passes it back as metadata; the
  -- signup gate re-validates active/uses under a row lock, so the id alone
  -- grants nothing.
  RETURN jsonb_build_object(
    'valid', true,
    'invite_id', _invite.id,
    'is_root', _invite.is_root,
    'inviter_name', _name,
    'inviter_handle', _handle
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_invite_landing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_landing(text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2 & 3. post_media / reactions: honor post visibility, not just existence
-- ----------------------------------------------------------------------------
-- can_see_post() encodes exactly the posts SELECT policy (author OR accepted
-- circle, AND not blocked), so this aligns media/reactions with the post
-- itself — it never hides media for a post the viewer can already see.
DROP POLICY IF EXISTS "Users can read media on visible posts" ON public.post_media;
CREATE POLICY "Users can read media on visible posts"
  ON public.post_media FOR SELECT TO authenticated
  USING (public.can_see_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users can read reactions on visible posts" ON public.reactions;
CREATE POLICY "Users can read reactions on visible posts"
  ON public.reactions FOR SELECT TO authenticated
  USING (public.can_see_post(post_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. profiles: no anonymous reads
-- ----------------------------------------------------------------------------
-- Under Pines is invite-only and fully gated behind auth — there is no
-- logged-out profile browsing. The only pre-auth reader was the invite
-- landing page, now served by get_invite_landing()/get_trail_pass_status().
-- Restricting to authenticated closes the unauthenticated-internet exposure
-- the scanner flags. Authenticated members still read each other's profiles
-- (the product shows another member's city/weather on their Cabin), so no
-- in-app behavior changes.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated members"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 5. voice-messages bucket: only participants of the owning campfire
-- ----------------------------------------------------------------------------
-- Voice objects are stored under the uploader's uid folder and their path is
-- recorded as campfire_messages.media_url. A caller may read an object only
-- when they participate in a campfire that carries a message referencing it.
-- Clients fetch via createSignedUrl (their own JWT), so this policy is
-- enforced at signing time.
DROP POLICY IF EXISTS "Participants can read voice messages" ON storage.objects;
CREATE POLICY "Participants can read voice messages"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND EXISTS (
      SELECT 1
      FROM public.campfire_messages m
      JOIN public.campfire_participants cp ON cp.campfire_id = m.campfire_id
      WHERE cp.user_id = auth.uid()
        AND m.media_url = storage.objects.name
    )
  );

-- ----------------------------------------------------------------------------
-- 6. realtime.messages: add authorization policies
-- ----------------------------------------------------------------------------
-- RLS is enabled on realtime.messages with zero policies. Realtime
-- Authorization only consults this table for channels opened as private
-- ({ config: { private: true } }); this app currently opens only public
-- channels, so these policies change nothing today and pre-authorize private
-- channels correctly for the future. A member may use a channel when:
--   * topic 'presence:*'            — shared global presence, any member
--   * topic 'campfire-<uuid>'       — they participate in that campfire
--   * topic 'camp-<uuid>'           — they are a member of that camp
--   * any other topic               — denied
-- Wrapped in a DO block so a backend that disallows DDL on the managed
-- realtime schema fails this section softly instead of aborting the whole
-- migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
  ) THEN
    BEGIN
      DROP POLICY IF EXISTS "Members can use authorized realtime channels" ON realtime.messages;
      CREATE POLICY "Members can use authorized realtime channels"
        ON realtime.messages FOR SELECT TO authenticated
        USING (
          realtime.topic() LIKE 'presence:%'
          OR EXISTS (
            SELECT 1 FROM public.campfire_participants cp
            WHERE cp.user_id = auth.uid()
              AND realtime.topic() = 'campfire-' || cp.campfire_id::text
          )
          OR EXISTS (
            SELECT 1 FROM public.camp_members cm
            WHERE cm.user_id = auth.uid()
              AND realtime.topic() = 'camp-' || cm.camp_id::text
          )
        );

      DROP POLICY IF EXISTS "Members can broadcast on authorized channels" ON realtime.messages;
      CREATE POLICY "Members can broadcast on authorized channels"
        ON realtime.messages FOR INSERT TO authenticated
        WITH CHECK (
          realtime.topic() LIKE 'presence:%'
          OR EXISTS (
            SELECT 1 FROM public.campfire_participants cp
            WHERE cp.user_id = auth.uid()
              AND realtime.topic() = 'campfire-' || cp.campfire_id::text
          )
          OR EXISTS (
            SELECT 1 FROM public.camp_members cm
            WHERE cm.user_id = auth.uid()
              AND realtime.topic() = 'camp-' || cm.camp_id::text
          )
        );
    EXCEPTION WHEN insufficient_privilege OR undefined_function THEN
      RAISE NOTICE 'Skipping realtime.messages policies: managed-schema DDL not permitted here';
    END;
  END IF;
END;
$$;
