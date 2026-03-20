
-- Platform settings for Grove (message templates, etc.)
CREATE TABLE public.platform_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Seed default message templates
INSERT INTO public.platform_settings (key, value) VALUES
  ('warning_template', 'Your post was removed from Under Pines. We reviewed it carefully and found it inconsistent with our community values. This is a warning — continued violations may result in suspension.'),
  ('suspension_template', 'Your account has been temporarily suspended. Under Pines is built on trust and warmth. Your access returns on [date].'),
  ('ban_template', 'After careful review your account has been permanently removed from Under Pines. This decision was made because [reason]. Under Pines is built on trust and accountability. We wish you well elsewhere.');
