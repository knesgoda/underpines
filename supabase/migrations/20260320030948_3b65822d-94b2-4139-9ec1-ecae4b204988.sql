
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  handle text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text,
  mantra text,
  currently_type text CHECK (currently_type IN ('reading', 'listening', 'thinking')),
  currently_value text,
  zip_code text,
  city text,
  latitude float,
  longitude float,
  accent_color text DEFAULT '#16a34a',
  atmosphere text DEFAULT 'morning-mist',
  layout text DEFAULT 'hearth',
  cabin_mood text DEFAULT 'candle',
  pinned_song_title text,
  pinned_song_artist text,
  pinned_song_preview_url text,
  header_image_url text,
  is_pines_plus boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invites table
CREATE TABLE public.invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid REFERENCES public.profiles(id) NOT NULL,
  slug text UNIQUE NOT NULL,
  uses_remaining integer NOT NULL DEFAULT 3,
  uses_total integer NOT NULL DEFAULT 3,
  is_infinite boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites are viewable by everyone"
  ON public.invites FOR SELECT USING (true);

CREATE POLICY "Users can create their own invites"
  ON public.invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their own invites"
  ON public.invites FOR UPDATE USING (auth.uid() = inviter_id);

-- Invite uses table
CREATE TABLE public.invite_uses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id uuid REFERENCES public.invites(id) NOT NULL,
  invitee_id uuid REFERENCES public.profiles(id) NOT NULL,
  used_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invite_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invite uses viewable by inviter"
  ON public.invite_uses FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invites
      WHERE invites.id = invite_uses.invite_id
      AND invites.inviter_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can record invite use"
  ON public.invite_uses FOR INSERT WITH CHECK (auth.uid() = invitee_id);

-- Seedling periods table
CREATE TABLE public.seedling_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) UNIQUE NOT NULL,
  invited_by uuid REFERENCES public.profiles(id),
  invite_tier text CHECK (invite_tier IN ('founder', 'pines_plus', 'free')),
  period_days integer NOT NULL,
  started_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  skipped boolean DEFAULT false
);

ALTER TABLE public.seedling_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seedling period"
  ON public.seedling_periods FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seedling period"
  ON public.seedling_periods FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cabin widgets table
CREATE TABLE public.cabin_widgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  widget_type text NOT NULL,
  widget_data jsonb,
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cabin_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cabin widgets viewable by everyone"
  ON public.cabin_widgets FOR SELECT USING (true);

CREATE POLICY "Users can manage their own widgets"
  ON public.cabin_widgets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own widgets"
  ON public.cabin_widgets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own widgets"
  ON public.cabin_widgets FOR DELETE USING (auth.uid() = user_id);

-- Cabin visits
CREATE TABLE public.cabin_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) NOT NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_count integer DEFAULT 1,
  UNIQUE (profile_id, visit_date)
);

ALTER TABLE public.cabin_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record visits"
  ON public.cabin_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can increment visits"
  ON public.cabin_visits FOR UPDATE USING (true);

CREATE POLICY "Profile owner can view visits"
  ON public.cabin_visits FOR SELECT USING (auth.uid() = profile_id);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, handle, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Arrival')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for header images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cabin-headers', 'cabin-headers', true);

CREATE POLICY "Header images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'cabin-headers');

CREATE POLICY "Users can upload their own header"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'cabin-headers' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own header"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'cabin-headers' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own header"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'cabin-headers' AND auth.uid()::text = (storage.foldername(name))[1]
  );
