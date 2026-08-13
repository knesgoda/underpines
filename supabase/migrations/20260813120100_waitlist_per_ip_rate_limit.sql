-- Pre-beta security hardening (2/3): stop one flooder closing the waitlist.
--
-- join_waitlist() had only a GLOBAL cap (500/hour). On launch day, 500 scripted
-- junk emails burn that budget and every genuine visitor gets "try later". The
-- RPC is called directly via PostgREST, which cannot see the client IP, so the
-- real per-IP gate has to derive the IP in an edge function (join-waitlist) and
-- pass a hash in. We add that parameter, add a per-IP cap, and — importantly —
-- revoke the RPC from anon/authenticated so signups MUST go through the edge
-- function; a direct RPC call can no longer skip the per-IP limit.

ALTER TABLE public.waitlist_signups ADD COLUMN IF NOT EXISTS ip_hash text;
CREATE INDEX IF NOT EXISTS waitlist_signups_ip_hash_recent_idx
  ON public.waitlist_signups (ip_hash, created_at);

-- The old single-argument function is replaced by the two-argument one. Drop it
-- so PostgREST resolves join_waitlist unambiguously to the new signature.
DROP FUNCTION IF EXISTS public.join_waitlist(text);

CREATE OR REPLACE FUNCTION public.join_waitlist(_email text, _ip_hash text DEFAULT NULL)
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

  -- Per-IP throttle — the real gate. A genuine visitor submits once; an IP that
  -- has already left several emails this hour is scripting.
  IF _ip_hash IS NOT NULL AND (
      SELECT count(*) FROM public.waitlist_signups
      WHERE ip_hash = _ip_hash AND created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'try_later');
  END IF;

  -- Global burst valve, per-minute so a flood can't lock the hour. Kept high
  -- enough that a real launch spike sails through.
  IF (SELECT count(*) FROM public.waitlist_signups
      WHERE created_at > now() - interval '1 minute') >= 120 THEN
    RETURN jsonb_build_object('success', false, 'error', 'try_later');
  END IF;

  INSERT INTO public.waitlist_signups (email, email_normalized, ip_hash)
  VALUES (btrim(_email), _norm, _ip_hash)
  ON CONFLICT (email_normalized) DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Only the edge function (service role) may call this now, so the per-IP hash
-- is always present and server-derived. anon/authenticated lose direct access.
REVOKE EXECUTE ON FUNCTION public.join_waitlist(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text) TO service_role;
