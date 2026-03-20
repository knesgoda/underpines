
-- Seasonal events table
CREATE TABLE public.seasonal_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  event_type text CHECK (event_type IN ('solstice','equinox','season_start','new_year','custom')) NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  illustration_key text NOT NULL,
  prompt_text text,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active events"
  ON public.seasonal_events FOR SELECT
  USING (is_active = true OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage events"
  ON public.seasonal_events FOR ALL
  USING (is_admin(auth.uid()));

-- Event responses table
CREATE TABLE public.event_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES public.seasonal_events(id) NOT NULL,
  user_id uuid NOT NULL,
  response_text text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own responses"
  ON public.event_responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own responses"
  ON public.event_responses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own responses"
  ON public.event_responses FOR UPDATE
  USING (user_id = auth.uid());

-- Platform settings table for Grove templates (if not exists)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now()
);
