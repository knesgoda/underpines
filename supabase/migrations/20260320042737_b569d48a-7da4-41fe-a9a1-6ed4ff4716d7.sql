
-- Add quiet_mode and ember_unsubscribed to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS quiet_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ember_unsubscribed boolean DEFAULT false;

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  quiet_mode boolean DEFAULT false,
  ember_delivery_time time DEFAULT '07:00:00',
  ember_timezone text DEFAULT 'America/Los_Angeles',
  notify_circle_requests boolean DEFAULT true,
  notify_invite_accepted boolean DEFAULT true,
  notify_smoke_signals boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own prefs"
ON public.notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own prefs"
ON public.notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own prefs"
ON public.notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add nudge_sent tracking to prevent duplicate nudges
CREATE TABLE public.inactive_nudges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  inactive_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(inviter_id, inactive_user_id)
);

ALTER TABLE public.inactive_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own nudges"
ON public.inactive_nudges FOR SELECT
TO authenticated
USING (inviter_id = auth.uid());

CREATE POLICY "System can insert nudges"
ON public.inactive_nudges FOR INSERT
TO authenticated
WITH CHECK (true);
