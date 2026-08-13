-- Pre-beta security hardening (1/3): stop members editing server-owned state.
--
-- The profiles SELECT surface was column-locked in 20260813064134, but UPDATE
-- was never narrowed: the March policy "Users can update their own profile"
-- (FOR UPDATE USING (auth.uid() = id)) still let an authenticated member write
-- ANY column of their own row from the browser console — is_pines_plus (free
-- paid tier), is_age_verified / age_bracket / birth_year / account_status
-- (age-gate and parental-consent bypass), applied_design_id (apply designs
-- they never bought), seedling_ends_at (escape new-account limits).
--
-- Fix: revoke UPDATE, then re-grant it column by column to everything EXCEPT
-- the server-owned set — the same deny-list DO-block pattern the SELECT
-- lockdown used. The row policy (own row only) is unchanged. The few columns a
-- legitimate flow still needs to write (age verification, applying a design)
-- move to SECURITY DEFINER RPCs below, which run as owner and so are unaffected
-- by the column grant.

DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles'
    AND column_name NOT IN (
      -- identity / timestamps
      'id', 'created_at', 'updated_at',
      -- billing (Stripe webhook only)
      'is_pines_plus',
      -- age gate / parental consent (set_age_verification RPC only)
      'is_age_verified', 'age_bracket', 'birth_year', 'account_status',
      -- paid cosmetics (apply_cabin_design RPC only)
      'applied_design_id',
      -- anti-abuse / lifecycle (signup + server only)
      'seedling_ends_at', 'last_seen_at', 'last_active_at', 'how_found',
      -- location PII (SELECT already revoked in 20260813075908)
      'latitude', 'longitude', 'zip_code'
    );

  REVOKE UPDATE ON public.profiles FROM authenticated;
  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', cols);
END $$;

GRANT ALL ON public.profiles TO service_role;

-- ---------------------------------------------------------------------------
-- Age verification, decided server-side.
--
-- Replaces the client writing is_age_verified / account_status directly (which
-- let a 13–17 member send account_status:'active' and skip parental consent).
-- Birth year alone can't pin an exact age, so we bound it: anyone who provably
-- cannot be 13 is refused, anyone who provably is under 18 is forced onto the
-- parental-consent path, and the client's claim is only trusted at the 17/18
-- boundary that birth year cannot disambiguate. account_status is derived from
-- the bracket here, never taken from the client, and this RPC will not lift a
-- restricted/disabled account.
CREATE OR REPLACE FUNCTION public.set_age_verification(_birth_year int, _age_bracket text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cur_year int := extract(year from now())::int;
  _min_age int;
  _max_age int;
  _bracket text;
  _status text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _birth_year IS NULL OR _birth_year < 1900 OR _birth_year > _cur_year THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_birth_year');
  END IF;

  _min_age := _cur_year - _birth_year - 1;  -- youngest they could be today
  _max_age := _cur_year - _birth_year;      -- oldest they could be today

  IF _max_age < 13 THEN
    RETURN jsonb_build_object('success', false, 'error', 'under_13');
  END IF;

  IF _min_age >= 18 THEN
    _bracket := '18_plus';
  ELSIF _max_age < 18 THEN
    _bracket := '13_to_17';
  ELSE
    -- 17 or 18: birth year can't tell. Honour a claimed adult, else treat as
    -- a minor so consent isn't skipped.
    _bracket := CASE WHEN _age_bracket = '18_plus' THEN '18_plus' ELSE '13_to_17' END;
  END IF;

  _status := CASE WHEN _bracket = '18_plus' THEN 'active' ELSE 'pending_parental_consent' END;

  UPDATE public.profiles
  SET age_bracket = _bracket,
      birth_year = _birth_year,
      is_age_verified = true,
      account_status = CASE
        WHEN account_status IS NULL OR account_status IN ('active', 'pending_parental_consent')
          THEN _status
        ELSE account_status  -- never override a restricted/disabled status
      END
  WHERE id = _uid;

  RETURN jsonb_build_object('success', true, 'age_bracket', _bracket, 'account_status', _status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_age_verification(int, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_age_verification(int, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Applying a Cabin design, gated on actually owning it.
--
-- applied_design_id is no longer client-writable (above), so this is the only
-- way to set it. Ownership = you created it, it's free, or you have a purchase
-- row. Combined with the design_purchases tightening below, this closes the
-- "apply a paid design you never bought" path.
CREATE OR REPLACE FUNCTION public.apply_cabin_design(_design_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owns boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cabin_designs d
    WHERE d.id = _design_id
      AND (
        d.creator_id = _uid
        OR d.is_free
        OR EXISTS (
          SELECT 1 FROM public.design_purchases p
          WHERE p.design_id = _design_id AND p.buyer_id = _uid
        )
      )
  ) INTO _owns;

  IF NOT _owns THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owned');
  END IF;

  UPDATE public.profiles SET applied_design_id = _design_id WHERE id = _uid;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_cabin_design(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.apply_cabin_design(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- design_purchases: members may only self-record a FREE design's purchase.
--
-- The old policy was WITH CHECK (buyer_id = auth.uid()) with no price check, so
-- a member could insert a $0 purchase row for ANY design — paid ones included —
-- and own it for free. Paid purchases are written by stripe-webhook using the
-- service role, which bypasses RLS, so restricting members to free designs
-- doesn't touch the real payment path.
DROP POLICY IF EXISTS "System can insert purchases" ON public.design_purchases;
CREATE POLICY "Members self-record free-design purchases"
  ON public.design_purchases FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND amount_cents = 0
    AND EXISTS (
      SELECT 1 FROM public.cabin_designs d
      WHERE d.id = design_id AND d.is_free
    )
  );
