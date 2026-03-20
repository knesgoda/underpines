
-- Add is_embers column to campfires
ALTER TABLE campfires ADD COLUMN IF NOT EXISTS is_embers boolean DEFAULT false;

-- Campfire log table
CREATE TABLE campfire_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campfire_id uuid REFERENCES campfires(id) NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  content_type text CHECK (content_type IN ('note','link','photo')) NOT NULL,
  content text NOT NULL,
  link_url text,
  photo_url text,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Campfire notification preferences
CREATE TABLE campfire_notification_prefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campfire_id uuid REFERENCES campfires(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  notify_realtime boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(campfire_id, user_id)
);

-- RLS for campfire_log
ALTER TABLE campfire_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read log"
  ON campfire_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campfire_participants
    WHERE campfire_id = campfire_log.campfire_id AND user_id = auth.uid()
  ));

CREATE POLICY "Participants can add to log"
  ON campfire_log FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM campfire_participants
      WHERE campfire_id = campfire_log.campfire_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Firekeeper can delete log items"
  ON campfire_log FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campfires
    WHERE id = campfire_log.campfire_id AND firekeeper_id = auth.uid()
  ));

CREATE POLICY "Firekeeper can update log items"
  ON campfire_log FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM campfires
    WHERE id = campfire_log.campfire_id AND firekeeper_id = auth.uid()
  ));

-- RLS for campfire_notification_prefs
ALTER TABLE campfire_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own prefs"
  ON campfire_notification_prefs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own prefs"
  ON campfire_notification_prefs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own prefs"
  ON campfire_notification_prefs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Allow campfire updates (for embers, name changes, etc.)
CREATE POLICY "Firekeeper can update campfire"
  ON campfires FOR UPDATE TO authenticated
  USING (firekeeper_id = auth.uid());

-- Indexes
CREATE INDEX campfire_log_campfire_id_idx ON campfire_log(campfire_id);

-- Enable realtime for campfire_messages (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE campfire_log;
ALTER PUBLICATION supabase_realtime ADD TABLE campfire_notification_prefs;
