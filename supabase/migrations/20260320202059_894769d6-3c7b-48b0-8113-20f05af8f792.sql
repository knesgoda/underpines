CREATE TABLE public.privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campfire_visibility text NOT NULL DEFAULT 'circles',
  cabin_visibility text NOT NULL DEFAULT 'circles',
  collections_visibility text NOT NULL DEFAULT 'circles',
  show_weather boolean NOT NULL DEFAULT true,
  show_city boolean NOT NULL DEFAULT false,
  cabin_visit_mode text NOT NULL DEFAULT 'anonymous_count',
  read_receipts boolean NOT NULL DEFAULT false,
  message_requests boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own privacy settings"
  ON public.privacy_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own privacy settings"
  ON public.privacy_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own privacy settings"
  ON public.privacy_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());