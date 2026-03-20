
-- Enable RLS on all new tables
alter table posts enable row level security;
alter table post_media enable row level security;
alter table reactions enable row level security;
alter table replies enable row level security;
alter table circles enable row level security;
alter table campfires enable row level security;
alter table campfire_participants enable row level security;
alter table campfire_messages enable row level security;
alter table campfire_reactions enable row level security;
alter table collections enable row level security;
alter table collection_posts enable row level security;
alter table collection_subscriptions enable row level security;
alter table collection_waitlist enable row level security;
alter table notifications enable row level security;
alter table pines_plus_subscriptions enable row level security;
alter table blocks enable row level security;
alter table mutes enable row level security;

-- POSTS: visible to author + their circle members
create policy "Users can read posts from their circles"
  on posts for select to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from circles
      where status = 'accepted'
      and (
        (requester_id = auth.uid() and requestee_id = posts.author_id)
        or (requestee_id = auth.uid() and requester_id = posts.author_id)
      )
    )
  );
create policy "Users can insert their own posts"
  on posts for insert to authenticated
  with check (author_id = auth.uid());
create policy "Users can update their own posts"
  on posts for update to authenticated
  using (author_id = auth.uid());
create policy "Users can delete their own posts"
  on posts for delete to authenticated
  using (author_id = auth.uid());

-- POST MEDIA: same as posts
create policy "Users can read media on visible posts"
  on post_media for select to authenticated
  using (exists (select 1 from posts where posts.id = post_media.post_id));
create policy "Users can insert media on their posts"
  on post_media for insert to authenticated
  with check (exists (select 1 from posts where posts.id = post_media.post_id and posts.author_id = auth.uid()));
create policy "Users can delete media on their posts"
  on post_media for delete to authenticated
  using (exists (select 1 from posts where posts.id = post_media.post_id and posts.author_id = auth.uid()));

-- REACTIONS
create policy "Users can read reactions on visible posts"
  on reactions for select to authenticated
  using (exists (select 1 from posts where posts.id = reactions.post_id));
create policy "Users can insert their own reactions"
  on reactions for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users can delete their own reactions"
  on reactions for delete to authenticated
  using (user_id = auth.uid());

-- REPLIES
create policy "Users can read replies on visible posts"
  on replies for select to authenticated
  using (exists (select 1 from posts where posts.id = replies.post_id));
create policy "Users can insert replies"
  on replies for insert to authenticated
  with check (author_id = auth.uid());
create policy "Users can delete their own replies"
  on replies for delete to authenticated
  using (author_id = auth.uid());

-- CIRCLES
create policy "Users can read their own circles"
  on circles for select to authenticated
  using (requester_id = auth.uid() or requestee_id = auth.uid());
create policy "Users can create circle requests"
  on circles for insert to authenticated
  with check (requester_id = auth.uid());
create policy "Users can update circles they are part of"
  on circles for update to authenticated
  using (requester_id = auth.uid() or requestee_id = auth.uid());

-- CAMPFIRES
create policy "Participants can read their campfires"
  on campfires for select to authenticated
  using (exists (select 1 from campfire_participants where campfire_id = campfires.id and user_id = auth.uid()));
create policy "Users can create campfires"
  on campfires for insert to authenticated
  with check (firekeeper_id = auth.uid());

-- CAMPFIRE PARTICIPANTS
create policy "Participants can read participants"
  on campfire_participants for select to authenticated
  using (exists (select 1 from campfire_participants cp where cp.campfire_id = campfire_participants.campfire_id and cp.user_id = auth.uid()));
create policy "Firekeeper can add participants"
  on campfire_participants for insert to authenticated
  with check (exists (select 1 from campfires where campfires.id = campfire_participants.campfire_id and campfires.firekeeper_id = auth.uid()) or user_id = auth.uid());

-- CAMPFIRE MESSAGES
create policy "Participants can read campfire messages"
  on campfire_messages for select to authenticated
  using (exists (select 1 from campfire_participants where campfire_id = campfire_messages.campfire_id and user_id = auth.uid()));
create policy "Participants can send messages"
  on campfire_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from campfire_participants where campfire_id = campfire_messages.campfire_id and user_id = auth.uid()));

-- CAMPFIRE REACTIONS
create policy "Participants can read campfire reactions"
  on campfire_reactions for select to authenticated
  using (exists (select 1 from campfire_messages cm join campfire_participants cp on cp.campfire_id = cm.campfire_id where cm.id = campfire_reactions.message_id and cp.user_id = auth.uid()));
create policy "Users can add campfire reactions"
  on campfire_reactions for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users can remove campfire reactions"
  on campfire_reactions for delete to authenticated
  using (user_id = auth.uid());

-- COLLECTIONS
create policy "Anyone can read published collections"
  on collections for select to authenticated
  using (is_published = true or author_id = auth.uid());
create policy "Authors can insert collections"
  on collections for insert to authenticated
  with check (author_id = auth.uid());
create policy "Authors can update their collections"
  on collections for update to authenticated
  using (author_id = auth.uid());
create policy "Authors can delete their collections"
  on collections for delete to authenticated
  using (author_id = auth.uid());

-- COLLECTION POSTS
create policy "Users can read collection posts"
  on collection_posts for select to authenticated
  using (exists (select 1 from collections where collections.id = collection_posts.collection_id and (collections.is_published = true or collections.author_id = auth.uid())));
create policy "Authors can manage collection posts"
  on collection_posts for insert to authenticated
  with check (exists (select 1 from collections where collections.id = collection_posts.collection_id and collections.author_id = auth.uid()));
create policy "Authors can delete collection posts"
  on collection_posts for delete to authenticated
  using (exists (select 1 from collections where collections.id = collection_posts.collection_id and collections.author_id = auth.uid()));

-- COLLECTION SUBSCRIPTIONS
create policy "Users can read their subscriptions"
  on collection_subscriptions for select to authenticated
  using (subscriber_id = auth.uid() or exists (select 1 from collections where collections.id = collection_subscriptions.collection_id and collections.author_id = auth.uid()));
create policy "Users can subscribe"
  on collection_subscriptions for insert to authenticated
  with check (subscriber_id = auth.uid());

-- COLLECTION WAITLIST
create policy "Users can read their waitlist entries"
  on collection_waitlist for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from collections where collections.id = collection_waitlist.collection_id and collections.author_id = auth.uid()));
create policy "Users can join waitlist"
  on collection_waitlist for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users can leave waitlist"
  on collection_waitlist for delete to authenticated
  using (user_id = auth.uid());

-- NOTIFICATIONS
create policy "Users can read their own notifications"
  on notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy "Users can update their own notifications"
  on notifications for update to authenticated
  using (recipient_id = auth.uid());
create policy "System can insert notifications"
  on notifications for insert to authenticated
  with check (true);

-- PINES PLUS SUBSCRIPTIONS
create policy "Users can read their own subscription"
  on pines_plus_subscriptions for select to authenticated
  using (user_id = auth.uid());

-- BLOCKS
create policy "Users can read their own blocks"
  on blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy "Users can insert blocks"
  on blocks for insert to authenticated
  with check (blocker_id = auth.uid());
create policy "Users can delete their own blocks"
  on blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- MUTES
create policy "Users can read their own mutes"
  on mutes for select to authenticated
  using (muter_id = auth.uid());
create policy "Users can insert mutes"
  on mutes for insert to authenticated
  with check (muter_id = auth.uid());
create policy "Users can delete their own mutes"
  on mutes for delete to authenticated
  using (muter_id = auth.uid());
