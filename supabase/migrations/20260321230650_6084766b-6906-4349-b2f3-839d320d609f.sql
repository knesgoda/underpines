
CREATE TABLE public.cabin_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  creature_key text NOT NULL,
  behavior text NOT NULL CHECK (behavior IN ('always_present', 'daily_visit', 'passing_through')),
  active_hours text NOT NULL DEFAULT 'day' CHECK (active_hours IN ('dawn', 'morning', 'afternoon', 'dusk', 'night', 'day', 'all')),
  movement_style text,
  direction text NOT NULL DEFAULT 'random' CHECK (direction IN ('random', 'ltr', 'rtl')),
  priority integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cabin_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own companions"
  ON public.cabin_companions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
