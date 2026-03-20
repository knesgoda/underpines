
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- User roles table (secure pattern - NOT on profiles)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Convenience: check if user is any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

-- RLS for user_roles: admins can read, only admins can manage
CREATE POLICY "Admins can read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) NOT NULL,
  reported_user_id uuid REFERENCES public.profiles(id),
  reported_post_id uuid REFERENCES public.posts(id),
  reported_camp_post_id uuid REFERENCES public.camp_posts(id),
  reported_campfire_message_id uuid REFERENCES public.campfire_messages(id),
  reported_camp_id uuid REFERENCES public.camps(id),
  report_reason text NOT NULL CHECK (report_reason IN (
    'harmful_dangerous', 'spam_fake', 'wrong_camp', 'other'
  )),
  reporter_context text,
  ai_severity text CHECK (ai_severity IN ('critical','high','medium','low')),
  ai_category text,
  ai_confidence float,
  ai_recommended_action text,
  ai_reasoning text,
  status text DEFAULT 'pending_ai' CHECK (status IN (
    'pending_ai','pending_review','cleared','warned','suspended','banned','auto_hidden'
  )),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  reviewer_note text,
  content_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can see own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can file reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ MODERATION ACTIONS ============
CREATE TABLE public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id),
  report_id uuid REFERENCES public.reports(id),
  action_type text NOT NULL CHECK (action_type IN (
    'warn','suspend','ban','clear','hide_content','restore_content','adjust_invites','note'
  )),
  action_detail text,
  suspension_days integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read moderation actions" ON public.moderation_actions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert moderation actions" ON public.moderation_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- ============ SUSPENSIONS ============
CREATE TABLE public.suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) UNIQUE NOT NULL,
  suspended_by uuid REFERENCES public.profiles(id) NOT NULL,
  reason text NOT NULL,
  suspended_until timestamptz,
  is_permanent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own suspension" ON public.suspensions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all suspensions" ON public.suspensions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert suspensions" ON public.suspensions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update suspensions" ON public.suspensions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete suspensions" ON public.suspensions
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ REPORTER PATTERNS ============
CREATE TABLE public.reporter_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) UNIQUE NOT NULL,
  total_reports integer DEFAULT 0,
  cleared_reports integer DEFAULT 0,
  flagged_as_serial boolean DEFAULT false,
  last_updated timestamptz DEFAULT now()
);
ALTER TABLE public.reporter_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read reporter patterns" ON public.reporter_patterns
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can manage reporter patterns" ON public.reporter_patterns
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ BLOCK THRESHOLD LOG ============
CREATE TABLE public.block_threshold_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_user_id uuid REFERENCES public.profiles(id) UNIQUE NOT NULL,
  block_count integer DEFAULT 0,
  qualified_block_count integer DEFAULT 0,
  last_action_taken text,
  last_checked timestamptz DEFAULT now()
);
ALTER TABLE public.block_threshold_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read block thresholds" ON public.block_threshold_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can manage block thresholds" ON public.block_threshold_log
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));
