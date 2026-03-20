
-- Full-text search indexes for Search feature
CREATE INDEX IF NOT EXISTS posts_content_fts_idx ON posts USING gin(
  to_tsvector('english', coalesce(content,'') || ' ' || coalesce(title,''))
);

CREATE INDEX IF NOT EXISTS camp_posts_content_fts_idx ON camp_posts USING gin(
  to_tsvector('english', coalesce(content,'') || ' ' || coalesce(title,''))
);

CREATE INDEX IF NOT EXISTS profiles_search_fts_idx ON profiles USING gin(
  to_tsvector('english', display_name || ' ' || handle)
);

CREATE INDEX IF NOT EXISTS camps_name_idx ON camps(name);

CREATE INDEX IF NOT EXISTS campfire_messages_content_fts_idx ON campfire_messages USING gin(
  to_tsvector('english', coalesce(content,''))
);
