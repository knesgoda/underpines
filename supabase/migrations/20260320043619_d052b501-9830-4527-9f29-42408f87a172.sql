
-- Camps
CREATE TABLE public.camps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  cover_image_url text,
  visibility text DEFAULT 'open' NOT NULL,
  firekeeper_id uuid REFERENCES public.profiles(id) NOT NULL,
  member_count integer DEFAULT 1,
  health_status text DEFAULT 'healthy',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Camp members
CREATE TABLE public.camp_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  scout_ends_at timestamp with time zone,
  UNIQUE(camp_id, user_id)
);

-- Camp join requests
CREATE TABLE public.camp_join_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  requested_at timestamp with time zone DEFAULT now(),
  UNIQUE(camp_id, user_id)
);

-- Camp posts (Firepit)
CREATE TABLE public.camp_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  post_type text NOT NULL,
  content text,
  title text,
  is_pinned boolean DEFAULT false,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Camp post media
CREATE TABLE public.camp_post_media (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_post_id uuid REFERENCES public.camp_posts(id) NOT NULL,
  media_type text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Camp post replies
CREATE TABLE public.camp_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_post_id uuid REFERENCES public.camp_posts(id) NOT NULL,
  parent_reply_id uuid REFERENCES public.camp_replies(id),
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Camp Lodge items
CREATE TABLE public.camp_lodge_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  author_id uuid REFERENCES public.profiles(id) NOT NULL,
  title text NOT NULL,
  content text,
  item_type text DEFAULT 'note' NOT NULL,
  link_url text,
  link_preview jsonb,
  is_pinned boolean DEFAULT false,
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Camp invites
CREATE TABLE public.camp_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id uuid REFERENCES public.camps(id) NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) NOT NULL,
  invited_user_id uuid REFERENCES public.profiles(id),
  invite_link text UNIQUE,
  uses_remaining integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Add camp_id and bonfire_sub_group_of to campfires
ALTER TABLE public.campfires ADD COLUMN camp_id uuid REFERENCES public.camps(id);
ALTER TABLE public.campfires ADD COLUMN bonfire_sub_group_of uuid REFERENCES public.campfires(id);

-- Add camp_id to notifications
ALTER TABLE public.notifications ADD COLUMN camp_id_ref uuid REFERENCES public.camps(id);

-- Indexes
CREATE INDEX camp_posts_camp_id_idx ON public.camp_posts(camp_id);
CREATE INDEX camp_posts_created_at_idx ON public.camp_posts(created_at DESC);
CREATE INDEX camp_members_user_id_idx ON public.camp_members(user_id);
CREATE INDEX camp_members_camp_id_idx ON public.camp_members(camp_id);
CREATE INDEX camp_join_requests_camp_id_idx ON public.camp_join_requests(camp_id);

-- Storage bucket for camp covers
INSERT INTO storage.buckets (id, name, public) VALUES ('camp-covers', 'camp-covers', true);
CREATE POLICY "Anyone can read camp covers" ON storage.objects FOR SELECT USING (bucket_id = 'camp-covers');
CREATE POLICY "Authenticated users can upload camp covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'camp-covers' AND auth.uid() IS NOT NULL);

-- ===== RLS POLICIES =====

-- Camps
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open camps visible to all authenticated" ON public.camps FOR SELECT TO authenticated
  USING (
    is_active = true AND (
      visibility = 'open'
      OR EXISTS (SELECT 1 FROM public.camp_members WHERE camp_id = camps.id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Ember camps visible to authenticated" ON public.camps FOR SELECT TO authenticated
  USING (
    is_active = true AND visibility = 'ember'
  );

CREATE POLICY "Authenticated users can create camps" ON public.camps FOR INSERT TO authenticated
  WITH CHECK (firekeeper_id = auth.uid());

CREATE POLICY "Firekeeper can update camp" ON public.camps FOR UPDATE TO authenticated
  USING (firekeeper_id = auth.uid());

-- Camp members
ALTER TABLE public.camp_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read camp members" ON public.camp_members FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_members.camp_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "System can insert camp members" ON public.camp_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_members.camp_id AND cm.user_id = auth.uid() AND cm.role IN ('firekeeper', 'trailblazer')
  ));

CREATE POLICY "Firekeeper can update members" ON public.camp_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_members.camp_id AND cm.user_id = auth.uid() AND cm.role = 'firekeeper'));

CREATE POLICY "Members can leave camp" ON public.camp_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_members.camp_id AND cm.user_id = auth.uid() AND cm.role = 'firekeeper'
  ));

-- Camp join requests
ALTER TABLE public.camp_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests" ON public.camp_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Relevant users can read requests" ON public.camp_join_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_join_requests.camp_id AND cm.user_id = auth.uid() AND cm.role IN ('firekeeper', 'trailblazer')
    )
  );

CREATE POLICY "Admins can update requests" ON public.camp_join_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camp_members cm WHERE cm.camp_id = camp_join_requests.camp_id AND cm.user_id = auth.uid() AND cm.role IN ('firekeeper', 'trailblazer')
  ));

-- Camp posts
ALTER TABLE public.camp_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Camp members can read posts" ON public.camp_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camp_members WHERE camp_id = camp_posts.camp_id AND user_id = auth.uid()));

CREATE POLICY "Non-scout members can post" ON public.camp_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.camp_members WHERE camp_id = camp_posts.camp_id AND user_id = auth.uid() AND role != 'scout'
    )
  );

CREATE POLICY "Authors can update own posts" ON public.camp_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authors and mods can delete posts" ON public.camp_posts FOR DELETE TO authenticated
  USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.camp_members WHERE camp_id = camp_posts.camp_id AND user_id = auth.uid() AND role IN ('firekeeper', 'trailblazer')
    )
  );

-- Camp post media
ALTER TABLE public.camp_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read camp post media" ON public.camp_post_media FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camp_posts cp JOIN public.camp_members cm ON cm.camp_id = cp.camp_id
    WHERE cp.id = camp_post_media.camp_post_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Authors can insert media" ON public.camp_post_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.camp_posts WHERE id = camp_post_media.camp_post_id AND author_id = auth.uid()
  ));

-- Camp replies
ALTER TABLE public.camp_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read camp replies" ON public.camp_replies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camp_posts cp JOIN public.camp_members cm ON cm.camp_id = cp.camp_id
    WHERE cp.id = camp_replies.camp_post_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert camp replies" ON public.camp_replies FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.camp_posts cp JOIN public.camp_members cm ON cm.camp_id = cp.camp_id
      WHERE cp.id = camp_replies.camp_post_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete camp replies" ON public.camp_replies FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Camp lodge items
ALTER TABLE public.camp_lodge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read lodge" ON public.camp_lodge_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camp_members WHERE camp_id = camp_lodge_items.camp_id AND user_id = auth.uid()));

CREATE POLICY "Trailblazers can write lodge" ON public.camp_lodge_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.camp_members WHERE camp_id = camp_lodge_items.camp_id AND user_id = auth.uid() AND role IN ('firekeeper', 'trailblazer')
  ));

CREATE POLICY "Trailblazers can update lodge" ON public.camp_lodge_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camp_members WHERE camp_id = camp_lodge_items.camp_id AND user_id = auth.uid() AND role IN ('firekeeper', 'trailblazer')
  ));

CREATE POLICY "Trailblazers can delete lodge" ON public.camp_lodge_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.camp_members WHERE camp_id = camp_lodge_items.camp_id AND user_id = auth.uid() AND role IN ('firekeeper', 'trailblazer')
  ));

-- Camp invites
ALTER TABLE public.camp_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites readable by camp members" ON public.camp_invites FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.camp_members WHERE camp_id = camp_invites.camp_id AND user_id = auth.uid()));

CREATE POLICY "Trailblazers can create invites" ON public.camp_invites FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.camp_members WHERE camp_id = camp_invites.camp_id AND user_id = auth.uid() AND role IN ('firekeeper', 'trailblazer')
    )
  );

-- Enable realtime for camp_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.camp_posts;
