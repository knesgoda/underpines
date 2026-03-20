
-- Voice message columns
ALTER TABLE campfire_messages
  ADD COLUMN IF NOT EXISTS voice_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS voice_waveform_data jsonb,
  ADD COLUMN IF NOT EXISTS voice_mime_type text;

-- Voice messages storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-messages', 'voice-messages', false, 10485760, ARRAY['audio/webm', 'audio/mp4', 'audio/ogg'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own voice messages
CREATE POLICY "Users can upload voice messages"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Campfire participants can download voice messages
CREATE POLICY "Participants can read voice messages"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-messages'
    AND auth.uid() IS NOT NULL
  );
