
-- LEGAL-REVIEW-NEEDED: Age verification schema for COPPA compliance

-- Add age verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_bracket text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS birth_year integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_age_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active';

-- Parental consent requests table
CREATE TABLE IF NOT EXISTS public.parental_consent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_email_hash text NOT NULL,
  consent_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours')
);

ALTER TABLE public.parental_consent_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can read consent requests (via Grove)
CREATE POLICY "Admins can read consent requests"
  ON public.parental_consent_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Age gate audit log (for COPPA compliance)
CREATE TABLE IF NOT EXISTS public.age_gate_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text,
  age_bracket text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.age_gate_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read age audit log"
  ON public.age_gate_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can insert age audit log"
  ON public.age_gate_audit_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
