-- Security fixes (2026-08-13 scanner findings):
--
-- 1. (Critical) rotate_invite_link(_user_id) verified is_admin(_user_id) but
--    never checked that the CALLER is that user — any authenticated member
--    could pass an admin's id and invalidate/regenerate that admin's founder
--    invite link. The function now only ever operates on auth.uid(); the
--    _user_id parameter is kept for client compatibility but must match the
--    caller. Also fixed while here: the UPDATE now excludes the root
--    open-signup link ('open-trail', is_root = true), which the founder also
--    owns — previously rotation tried to give BOTH infinite invites the same
--    new slug and died on the slug UNIQUE constraint (and would have silently
--    renamed the site-wide open link if it hadn't).
--
-- 2. (Warning) collection_stripe_prices SELECT was USING (true) TO public,
--    exposing stripe_price_id / stripe_product_id / amount_cents for every
--    collection (drafts included) to anonymous internet users. SELECT is now
--    authenticated-only and scoped to published collections or the author's
--    own, matching the collections table's own visibility. INSERT moves from
--    public to authenticated (same author check).

CREATE OR REPLACE FUNCTION public.rotate_invite_link(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _handle text;
  _new_token text;
  _new_slug text;
BEGIN
  -- The caller may only rotate their own link, and must be an admin.
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT handle INTO _handle FROM public.profiles WHERE id = auth.uid();
  _new_token := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  _new_slug := _handle || '-' || _new_token;

  UPDATE public.invites
  SET slug = _new_slug,
      secret_token = _new_token
  WHERE inviter_id = auth.uid()
    AND is_infinite = true
    AND is_root IS NOT TRUE;

  RETURN _new_slug;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rotate_invite_link(uuid) FROM anon;

DROP POLICY "Anyone can read collection prices" ON public.collection_stripe_prices;

CREATE POLICY "Members can read prices for visible collections"
  ON public.collection_stripe_prices FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_stripe_prices.collection_id
      AND (c.is_published = true OR c.author_id = auth.uid())
  ));

DROP POLICY "Authors can insert prices" ON public.collection_stripe_prices;

CREATE POLICY "Authors can insert prices"
  ON public.collection_stripe_prices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_stripe_prices.collection_id
      AND c.author_id = auth.uid()
  ));
