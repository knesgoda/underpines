
-- Camp newsletters
CREATE TABLE public.camp_newsletters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  frequency text CHECK (frequency IN ('weekly','biweekly','monthly')) NOT NULL,
  status text CHECK (status IN ('draft','scheduled','sent')) DEFAULT 'draft',
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  recipient_count integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.camp_newsletters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Camp members can read sent newsletters"
  ON public.camp_newsletters FOR SELECT
  USING (
    status = 'sent' AND EXISTS (
      SELECT 1 FROM public.camp_members
      WHERE camp_members.camp_id = camp_newsletters.camp_id
      AND camp_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editor can read all newsletters"
  ON public.camp_newsletters FOR SELECT
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.camp_members
      WHERE camp_members.camp_id = camp_newsletters.camp_id
      AND camp_members.user_id = auth.uid()
      AND camp_members.role IN ('firekeeper','trailblazer')
    )
  );

CREATE POLICY "Editor can insert newsletters"
  ON public.camp_newsletters FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.camp_members
      WHERE camp_members.camp_id = camp_newsletters.camp_id
      AND camp_members.user_id = auth.uid()
      AND camp_members.role IN ('firekeeper','trailblazer')
    )
  );

CREATE POLICY "Editor can update newsletters"
  ON public.camp_newsletters FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.camps
      WHERE camps.id = camp_newsletters.camp_id
      AND camps.firekeeper_id = auth.uid()
    )
  );

CREATE POLICY "Editor can delete draft newsletters"
  ON public.camp_newsletters FOR DELETE
  USING (
    status = 'draft' AND (
      author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.camps
        WHERE camps.id = camp_newsletters.camp_id
        AND camps.firekeeper_id = auth.uid()
      )
    )
  );

-- Camp newsletter settings
CREATE TABLE public.camp_newsletter_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) UNIQUE NOT NULL,
  is_enabled boolean DEFAULT false,
  frequency text CHECK (frequency IN ('weekly','biweekly','monthly')) DEFAULT 'weekly',
  send_day text CHECK (send_day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')) DEFAULT 'monday',
  send_time time DEFAULT '08:00:00',
  timezone text DEFAULT 'America/Los_Angeles',
  editor_id uuid REFERENCES public.profiles(id),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.camp_newsletter_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Camp admins can read settings"
  ON public.camp_newsletter_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.camp_members
      WHERE camp_members.camp_id = camp_newsletter_settings.camp_id
      AND camp_members.user_id = auth.uid()
      AND camp_members.role IN ('firekeeper','trailblazer')
    )
  );

CREATE POLICY "Firekeeper can insert settings"
  ON public.camp_newsletter_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.camps
      WHERE camps.id = camp_newsletter_settings.camp_id
      AND camps.firekeeper_id = auth.uid()
    )
  );

CREATE POLICY "Firekeeper can update settings"
  ON public.camp_newsletter_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.camps
      WHERE camps.id = camp_newsletter_settings.camp_id
      AND camps.firekeeper_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX camp_newsletters_camp_id_idx ON public.camp_newsletters(camp_id);
CREATE INDEX camp_newsletters_status_idx ON public.camp_newsletters(status);

-- Add update trigger
CREATE TRIGGER update_camp_newsletters_updated_at
  BEFORE UPDATE ON public.camp_newsletters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
