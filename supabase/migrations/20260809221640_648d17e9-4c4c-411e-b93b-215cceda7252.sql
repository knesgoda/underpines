CREATE TABLE IF NOT EXISTS public.listening_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  provider_account_id text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listening_connections_provider_check
    CHECK (provider IN ('spotify', 'apple', 'youtube'))
);

CREATE UNIQUE INDEX IF NOT EXISTS listening_connections_user_provider_idx
  ON public.listening_connections (user_id, provider);

ALTER TABLE public.listening_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own connections"
  ON public.listening_connections FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.now_playing (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  track_title text NOT NULL,
  artist text NOT NULL,
  album text,
  artwork_url text,
  track_url text,
  duration_ms integer,
  progress_ms integer,
  is_live boolean NOT NULL DEFAULT false,
  is_sharing boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'circles',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT now_playing_provider_check
    CHECK (provider IN ('spotify', 'apple', 'youtube')),
  CONSTRAINT now_playing_audience_check
    CHECK (audience IN ('circles', 'circles_and_camps', 'everyone')),
  CONSTRAINT now_playing_title_length CHECK (char_length(track_title) BETWEEN 1 AND 200),
  CONSTRAINT now_playing_artist_length CHECK (char_length(artist) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS now_playing_updated_idx ON public.now_playing (updated_at DESC);

ALTER TABLE public.now_playing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own now playing"
  ON public.now_playing FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Now playing is readable to the chosen audience"
  ON public.now_playing FOR SELECT
  USING (
    is_sharing = true
    AND (
      audience = 'everyone'
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.circles c
        WHERE c.status = 'accepted'
          AND ((c.requester_id = now_playing.user_id AND c.requestee_id = auth.uid())
            OR (c.requestee_id = now_playing.user_id AND c.requester_id = auth.uid()))
      )
      OR (
        audience = 'circles_and_camps'
        AND EXISTS (
          SELECT 1
          FROM public.camp_members mine
          JOIN public.camp_members theirs ON theirs.camp_id = mine.camp_id
          WHERE mine.user_id = auth.uid() AND theirs.user_id = now_playing.user_id
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = now_playing.user_id AND b.blocked_id = auth.uid())
         OR (b.blocker_id = auth.uid() AND b.blocked_id = now_playing.user_id)
    )
  );

COMMENT ON TABLE public.now_playing IS
  'One row per person: what they are listening to now. Tokens live in listening_connections, never here.';