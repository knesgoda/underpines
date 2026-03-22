
CREATE TABLE public.trail_map_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  pin_type text NOT NULL CHECK (pin_type IN ('been-here', 'want-to-go')),
  note text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trail_map_pins ENABLE ROW LEVEL SECURITY;

-- Anyone in circles can view pins (we'll check circle membership client-side for simplicity; 
-- for now allow authenticated reads on own + others)
CREATE POLICY "Anyone authenticated can read pins"
  ON public.trail_map_pins FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own pins"
  ON public.trail_map_pins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pins"
  ON public.trail_map_pins FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pins"
  ON public.trail_map_pins FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add trail_map_visible toggle to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trail_map_visible boolean DEFAULT true;
