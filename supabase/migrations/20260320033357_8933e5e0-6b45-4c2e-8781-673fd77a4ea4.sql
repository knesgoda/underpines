
-- Posts
create table posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) not null,
  post_type text check (post_type in ('spark','story','ember')) not null,
  content text,
  title text,
  is_published boolean default true,
  is_quote_post boolean default false,
  quoted_post_id uuid references posts(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Post media
create table post_media (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) not null,
  media_type text check (media_type in ('photo','video')) not null,
  url text not null,
  position integer not null,
  created_at timestamp with time zone default now()
);

-- Reactions
create table reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) not null,
  user_id uuid references profiles(id) not null,
  reaction_type text check (reaction_type in (
    'fire','grounded','warmth','laughed',
    'noted','present','heavy','delight'
  )) not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

-- Replies
create table replies (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) not null,
  parent_reply_id uuid references replies(id),
  author_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Circles (mutual follows)
create table circles (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) not null,
  requestee_id uuid references profiles(id) not null,
  status text check (
    status in ('pending','accepted','declined')
  ) default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(requester_id, requestee_id)
);

-- Campfires
create table campfires (
  id uuid default gen_random_uuid() primary key,
  campfire_type text check (
    campfire_type in ('one_on_one','group','flicker')
  ) not null,
  name text,
  vibe text,
  firekeeper_id uuid references profiles(id),
  is_active boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Campfire participants
create table campfire_participants (
  id uuid default gen_random_uuid() primary key,
  campfire_id uuid references campfires(id) not null,
  user_id uuid references profiles(id) not null,
  joined_at timestamp with time zone default now(),
  unique(campfire_id, user_id)
);

-- Campfire messages
create table campfire_messages (
  id uuid default gen_random_uuid() primary key,
  campfire_id uuid references campfires(id) not null,
  sender_id uuid references profiles(id) not null,
  content text,
  message_type text check (
    message_type in ('text','photo','voice','cross_post')
  ) default 'text',
  media_url text,
  cross_post_id uuid references posts(id),
  is_faded boolean default false,
  created_at timestamp with time zone default now()
);

-- Campfire message reactions
create table campfire_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references campfire_messages(id) not null,
  user_id uuid references profiles(id) not null,
  reaction_type text check (reaction_type in (
    'fire','grounded','warmth','laughed',
    'noted','present','heavy','delight'
  )) not null,
  created_at timestamp with time zone default now(),
  unique(message_id, user_id)
);

-- Collections
create table collections (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references profiles(id) not null,
  title text not null,
  description text,
  cover_image_url text,
  is_paid boolean default false,
  price_cents integer,
  price_type text check (price_type in ('monthly','one_time')),
  is_published boolean default true,
  created_at timestamp with time zone default now()
);

-- Collection posts (junction)
create table collection_posts (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) not null,
  post_id uuid references posts(id) not null,
  position integer not null,
  added_at timestamp with time zone default now()
);

-- Collection subscriptions
create table collection_subscriptions (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) not null,
  subscriber_id uuid references profiles(id) not null,
  stripe_subscription_id text,
  status text check (
    status in ('active','cancelled','past_due')
  ) default 'active',
  started_at timestamp with time zone default now(),
  ends_at timestamp with time zone
);

-- Collection waitlist
create table collection_waitlist (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) not null,
  user_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(collection_id, user_id)
);

-- Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references profiles(id) not null,
  notification_type text check (notification_type in (
    'reaction_batch','reply','quote_post',
    'circle_request','circle_accepted',
    'invite_accepted','smoke_signal',
    'campfire_message','collection_subscriber'
  )) not null,
  actor_id uuid references profiles(id),
  post_id uuid references posts(id),
  campfire_id uuid references campfires(id),
  collection_id uuid references collections(id),
  is_read boolean default false,
  is_delivered_in_ember boolean default false,
  created_at timestamp with time zone default now()
);

-- Pines+ subscriptions
create table pines_plus_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) unique not null,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique not null,
  plan text check (plan in ('monthly','annual')) not null,
  status text check (
    status in ('active','cancelled','past_due')
  ) default 'active',
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Blocks
create table blocks (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references profiles(id) not null,
  blocked_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(blocker_id, blocked_id)
);

-- Mutes
create table mutes (
  id uuid default gen_random_uuid() primary key,
  muter_id uuid references profiles(id) not null,
  muted_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(muter_id, muted_id)
);

-- Indexes for performance
create index posts_author_id_idx on posts(author_id);
create index posts_created_at_idx on posts(created_at desc);
create index reactions_post_id_idx on reactions(post_id);
create index replies_post_id_idx on replies(post_id);
create index circles_requester_id_idx on circles(requester_id);
create index circles_requestee_id_idx on circles(requestee_id);
create index campfire_messages_campfire_id_idx on campfire_messages(campfire_id);
create index notifications_recipient_id_idx on notifications(recipient_id);
create index notifications_is_read_idx on notifications(is_read);
create index post_media_post_id_idx on post_media(post_id);
create index campfire_participants_campfire_id_idx on campfire_participants(campfire_id);
create index campfire_participants_user_id_idx on campfire_participants(user_id);
create index collection_posts_collection_id_idx on collection_posts(collection_id);
create index blocks_blocker_id_idx on blocks(blocker_id);
create index blocks_blocked_id_idx on blocks(blocked_id);
create index mutes_muter_id_idx on mutes(muter_id);

-- Enable realtime for campfire messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.campfire_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
