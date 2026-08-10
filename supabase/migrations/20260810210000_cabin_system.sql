-- ============================================================================
-- CABIN SYSTEM — "People have places, not pages."
--
-- One migration, ten phases of schema:
--   cabins (config + privacy), item catalog / inventory / placements,
--   guestbook / notes / knocks / porch gifts, pantry / recipes / cookbook,
--   trades (atomic), environmental events (server-configurable rarity,
--   kill-switchable, secret-able), cabin history, pet personality columns.
--
-- Authority split: everything ownable or grantable moves ONLY through
-- SECURITY DEFINER RPCs in this file. RLS gives reads; clients never write
-- inventory, pantry, trades, or history directly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helpers
-- ----------------------------------------------------------------------------

-- Mutual block check (either direction blocks the interaction).
CREATE OR REPLACE FUNCTION public.cabin_blocked(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _a AND blocked_id = _b)
       OR (blocker_id = _b AND blocked_id = _a)
  )
$$;

CREATE OR REPLACE FUNCTION public.cabin_friends(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circles c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = _a AND c.requestee_id = _b)
        OR (c.requester_id = _b AND c.requestee_id = _a))
  )
$$;

-- Does _viewer clear a cabin privacy mode set by _owner?
-- Modes: everyone / friends / only_me / off. The owner always clears their own.
CREATE OR REPLACE FUNCTION public.cabin_mode_allows(_owner uuid, _viewer uuid, _mode text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN _viewer IS NULL THEN false
    WHEN _viewer = _owner THEN true
    WHEN public.cabin_blocked(_owner, _viewer) THEN false
    WHEN _mode = 'everyone' THEN true
    WHEN _mode = 'friends' THEN public.cabin_friends(_owner, _viewer)
    ELSE false  -- only_me / off
  END
$$;

-- ----------------------------------------------------------------------------
-- 1. Cabins — one per member, created lazily with a starter kit
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'ranger'
    CHECK (theme IN ('ranger','seventy_nine','ninety_four','fire_lookout','a_frame',
                     'lake_house','snow_lodge','witch','haunted','cozy')),
  biome_key text,                          -- null → falls back to profiles.biome
  weather_source text NOT NULL DEFAULT 'account'
    CHECK (weather_source IN ('account','cabin_location','default')),
  cabin_location_key text,                 -- curated list key (client-side table)
  window_style text NOT NULL DEFAULT 'classic_timber'
    CHECK (window_style IN ('classic_timber','picture','bay','cottage_panes','a_frame_glass',
                            'round','seventies','modern','victorian')),
  curtain_state text NOT NULL DEFAULT 'open' CHECK (curtain_state IN ('open','half','closed')),
  auto_lighting boolean NOT NULL DEFAULT true,
  ambient_audio boolean NOT NULL DEFAULT false,
  presence_visible boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'everyone' CHECK (visibility IN ('everyone','friends','only_me')),
  guestbook_mode text NOT NULL DEFAULT 'everyone' CHECK (guestbook_mode IN ('everyone','friends','only_me','off')),
  notes_mode text NOT NULL DEFAULT 'everyone' CHECK (notes_mode IN ('everyone','friends','off')),
  gifts_mode text NOT NULL DEFAULT 'everyone' CHECK (gifts_mode IN ('everyone','friends','off')),
  knock_mode text NOT NULL DEFAULT 'everyone' CHECK (knock_mode IN ('everyone','friends','off')),
  pets_visibility text NOT NULL DEFAULT 'everyone' CHECK (pets_visibility IN ('everyone','friends','only_me')),
  location_visibility text NOT NULL DEFAULT 'hidden' CHECK (location_visibility IN ('hidden','region','cabin_location')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cabins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cabins owner all" ON public.cabins;
CREATE POLICY "cabins owner all" ON public.cabins
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Visitors read cabin config through get_cabin_view (definer), not the table.

DROP TRIGGER IF EXISTS cabins_updated_at ON public.cabins;
CREATE TRIGGER cabins_updated_at BEFORE UPDATE ON public.cabins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. Item catalog, inventory, placements
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabin_item_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL
    CHECK (category IN ('furniture','lighting','wall_decor','plants','books','trinkets',
                        'outdoor','campfire_gear','pet_items','seasonal','oddities',
                        'photos','collectibles','food')),
  emoji text NOT NULL,
  valid_zones text[] NOT NULL,
  rarity text NOT NULL DEFAULT 'everyday'
    CHECK (rarity IN ('everyday','unusual','hard_to_find','strange','very_strange')),
  tradable boolean NOT NULL DEFAULT true,
  giftable boolean NOT NULL DEFAULT false,   -- true → porch-gift token (no ownership needed)
  availability text NOT NULL DEFAULT 'catalog'
    CHECK (availability IN ('starter','catalog','discovery','seasonal','event','ranger_station')),
  enabled boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 100
);

ALTER TABLE public.cabin_item_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item defs readable" ON public.cabin_item_definitions;
CREATE POLICY "item defs readable" ON public.cabin_item_definitions
  FOR SELECT TO authenticated USING (enabled);

CREATE TABLE IF NOT EXISTS public.user_cabin_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key text NOT NULL REFERENCES public.cabin_item_definitions(key),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  acquisition_source text NOT NULL DEFAULT 'starter'
    CHECK (acquisition_source IN ('starter','discovery','gift','trade','event','recipe','ranger_station')),
  gifted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provenance_note text,
  custom_name text CHECK (char_length(custom_name) <= 60),
  event_key text
);

CREATE INDEX IF NOT EXISTS user_cabin_items_owner_idx ON public.user_cabin_items(owner_id);

ALTER TABLE public.user_cabin_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory owner read" ON public.user_cabin_items;
CREATE POLICY "inventory owner read" ON public.user_cabin_items
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- The owner may rename an item; ownership itself only moves via RPCs.
DROP POLICY IF EXISTS "inventory owner rename" ON public.user_cabin_items;
CREATE POLICY "inventory owner rename" ON public.user_cabin_items
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_user_id uuid NOT NULL REFERENCES public.cabins(user_id) ON DELETE CASCADE,
  user_item_id uuid NOT NULL UNIQUE REFERENCES public.user_cabin_items(id) ON DELETE CASCADE,
  zone text NOT NULL CHECK (zone IN (
    'porch_left','porch_center','porch_right','exterior_sign',
    'window_left_sill','window_center_sill','window_right_sill',
    'left_wall_upper','left_wall_middle','left_wall_lower',
    'right_wall_upper','right_wall_middle','right_wall_lower',
    'fireplace_mantle','desk','bookshelf_top','bookshelf_middle','bookshelf_lower',
    'floor_left','floor_center','floor_right','ceiling','pet_area')),
  slot smallint NOT NULL DEFAULT 0 CHECK (slot BETWEEN 0 AND 3),
  visibility text NOT NULL DEFAULT 'everyone' CHECK (visibility IN ('everyone','friends','only_me')),
  UNIQUE (cabin_user_id, zone, slot)
);

ALTER TABLE public.cabin_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "placements owner all" ON public.cabin_placements;
CREATE POLICY "placements owner all" ON public.cabin_placements
  FOR ALL TO authenticated
  USING (cabin_user_id = auth.uid())
  WITH CHECK (cabin_user_id = auth.uid());

-- Placement sanity: the placed item must belong to the cabin owner, and the
-- zone must be one the definition allows. This is what keeps lamps off the
-- ceiling no matter what the client sends.
CREATE OR REPLACE FUNCTION public.cabin_validate_placement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _item public.user_cabin_items%ROWTYPE;
  _zones text[];
BEGIN
  SELECT * INTO _item FROM public.user_cabin_items WHERE id = NEW.user_item_id;
  IF _item.id IS NULL OR _item.owner_id <> NEW.cabin_user_id THEN
    RAISE EXCEPTION 'placement_item_not_owned';
  END IF;
  SELECT valid_zones INTO _zones FROM public.cabin_item_definitions WHERE key = _item.item_key;
  IF _zones IS NULL OR NOT (NEW.zone = ANY(_zones)) THEN
    RAISE EXCEPTION 'placement_zone_invalid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cabin_placements_validate ON public.cabin_placements;
CREATE TRIGGER cabin_placements_validate
  BEFORE INSERT OR UPDATE ON public.cabin_placements
  FOR EACH ROW EXECUTE FUNCTION public.cabin_validate_placement();

-- ----------------------------------------------------------------------------
-- 3. Social surface: guestbook, notes, knocks, porch gifts
-- ----------------------------------------------------------------------------

-- Definer wrapper so RLS policies can read the owner's mode without being
-- filtered by the cabins table's own owner-only policy.
CREATE OR REPLACE FUNCTION public.cabin_guestbook_visible(_owner uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.cabin_mode_allows(_owner, _viewer,
    COALESCE((SELECT guestbook_mode FROM public.cabins WHERE user_id = _owner), 'everyone'))
$$;

CREATE TABLE IF NOT EXISTS public.cabin_guestbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabin_guestbook_owner_idx ON public.cabin_guestbook_entries(owner_id, created_at DESC);

ALTER TABLE public.cabin_guestbook_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guestbook visible per mode" ON public.cabin_guestbook_entries;
CREATE POLICY "guestbook visible per mode" ON public.cabin_guestbook_entries
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR author_id = auth.uid()
    OR (NOT hidden AND public.cabin_guestbook_visible(owner_id, auth.uid()))
  );

DROP POLICY IF EXISTS "guestbook owner manage" ON public.cabin_guestbook_entries;
CREATE POLICY "guestbook owner manage" ON public.cabin_guestbook_entries
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "guestbook owner delete" ON public.cabin_guestbook_entries;
CREATE POLICY "guestbook owner delete" ON public.cabin_guestbook_entries
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 600),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabin_notes_owner_idx ON public.cabin_notes(owner_id, created_at DESC);

ALTER TABLE public.cabin_notes ENABLE ROW LEVEL SECURITY;

-- Notes are private: the owner reads them, the author can see what they left.
DROP POLICY IF EXISTS "notes owner read" ON public.cabin_notes;
CREATE POLICY "notes owner read" ON public.cabin_notes
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR author_id = auth.uid());

DROP POLICY IF EXISTS "notes owner manage" ON public.cabin_notes;
CREATE POLICY "notes owner manage" ON public.cabin_notes
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "notes delete" ON public.cabin_notes;
CREATE POLICY "notes delete" ON public.cabin_notes
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_knocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  knocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabin_knocks_owner_idx ON public.cabin_knocks(owner_id, created_at DESC);

ALTER TABLE public.cabin_knocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knocks participant read" ON public.cabin_knocks;
CREATE POLICY "knocks participant read" ON public.cabin_knocks
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR knocker_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_porch_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key text REFERENCES public.cabin_item_definitions(key),
  ingredient_key text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 5),
  message text CHECK (char_length(message) <= 280),
  status text NOT NULL DEFAULT 'on_porch' CHECK (status IN ('on_porch','kept','tossed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (num_nonnulls(item_key, ingredient_key) = 1)
);

CREATE INDEX IF NOT EXISTS cabin_porch_gifts_owner_idx ON public.cabin_porch_gifts(owner_id, status);

ALTER TABLE public.cabin_porch_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gifts participant read" ON public.cabin_porch_gifts;
CREATE POLICY "gifts participant read" ON public.cabin_porch_gifts
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. Campfire: ingredients, pantry, recipes, cookbook
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabin_ingredient_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  category text NOT NULL CHECK (category IN ('hotdog','smore','drink','other')),
  rarity text NOT NULL DEFAULT 'everyday'
    CHECK (rarity IN ('everyday','unusual','hard_to_find','strange','very_strange')),
  giftable boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.cabin_ingredient_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredient defs readable" ON public.cabin_ingredient_definitions;
CREATE POLICY "ingredient defs readable" ON public.cabin_ingredient_definitions
  FOR SELECT TO authenticated USING (enabled);

ALTER TABLE public.cabin_porch_gifts
  DROP CONSTRAINT IF EXISTS cabin_porch_gifts_ingredient_key_fkey;
ALTER TABLE public.cabin_porch_gifts
  ADD CONSTRAINT cabin_porch_gifts_ingredient_key_fkey
  FOREIGN KEY (ingredient_key) REFERENCES public.cabin_ingredient_definitions(key);

CREATE TABLE IF NOT EXISTS public.cabin_pantry (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL REFERENCES public.cabin_ingredient_definitions(key),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (owner_id, ingredient_key)
);

ALTER TABLE public.cabin_pantry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pantry owner read" ON public.cabin_pantry;
CREATE POLICY "pantry owner read" ON public.cabin_pantry
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_recipes (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  emoji text NOT NULL,
  required text[] NOT NULL,          -- ingredient keys; duplicates mean quantity
  optional text[] NOT NULL DEFAULT '{}',
  rarity text NOT NULL DEFAULT 'everyday'
    CHECK (rarity IN ('everyday','unusual','hard_to_find','strange','very_strange')),
  secret boolean NOT NULL DEFAULT false,   -- never shown as a silhouette
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.cabin_recipes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cabin_recipe_book (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_key text NOT NULL REFERENCES public.cabin_recipes(key),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  times_cooked integer NOT NULL DEFAULT 1,
  first_note text,
  PRIMARY KEY (owner_id, recipe_key)
);

ALTER TABLE public.cabin_recipe_book ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cookbook owner read" ON public.cabin_recipe_book;
CREATE POLICY "cookbook owner read" ON public.cabin_recipe_book
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Non-secret recipe names/emoji may render as silhouettes; secret rows stay
-- server-side until discovered (the RPC returns them on discovery).
DROP POLICY IF EXISTS "recipes readable" ON public.cabin_recipes;
CREATE POLICY "recipes readable" ON public.cabin_recipes
  FOR SELECT TO authenticated
  USING (enabled AND (NOT secret OR EXISTS (
    SELECT 1 FROM public.cabin_recipe_book b
    WHERE b.recipe_key = cabin_recipes.key AND b.owner_id = auth.uid()
  )));

-- ----------------------------------------------------------------------------
-- 5. Trades — atomic, currency-free
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabin_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','declined','cancelled')),
  message text CHECK (char_length(message) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (proposer_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS cabin_trades_recipient_idx ON public.cabin_trades(recipient_id, status);
CREATE INDEX IF NOT EXISTS cabin_trades_proposer_idx ON public.cabin_trades(proposer_id, status);

ALTER TABLE public.cabin_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trades participant read" ON public.cabin_trades;
CREATE POLICY "trades participant read" ON public.cabin_trades
  FOR SELECT TO authenticated USING (proposer_id = auth.uid() OR recipient_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.cabin_trade_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.cabin_trades(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('proposer','recipient')),
  ingredient_key text REFERENCES public.cabin_ingredient_definitions(key),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 20),
  user_item_id uuid REFERENCES public.user_cabin_items(id) ON DELETE CASCADE,
  CHECK (num_nonnulls(ingredient_key, user_item_id) = 1)
);

CREATE INDEX IF NOT EXISTS cabin_trade_items_trade_idx ON public.cabin_trade_items(trade_id);

ALTER TABLE public.cabin_trade_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade items participant read" ON public.cabin_trade_items;
CREATE POLICY "trade items participant read" ON public.cabin_trade_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.cabin_trades t
    WHERE t.id = trade_id AND (t.proposer_id = auth.uid() OR t.recipient_id = auth.uid())
  ));

-- ----------------------------------------------------------------------------
-- 6. Environmental events — data-driven, kill-switchable, some secret
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabin_events (
  key text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('discovery','sighting','keepsake')),
  description text,
  emoji text NOT NULL,
  rarity_weight numeric NOT NULL CHECK (rarity_weight > 0 AND rarity_weight <= 1),
  eligible_biomes text[],       -- null = all
  eligible_seasons text[],      -- null = all (spring/summer/autumn/winter)
  eligible_weather text[],      -- null = all (normalized condition strings)
  eligible_times text[],        -- null = all (dawn/morning/afternoon/dusk/night)
  cooldown_hours integer NOT NULL DEFAULT 24,
  reward_item_key text REFERENCES public.cabin_item_definitions(key),
  reward_ingredient_key text REFERENCES public.cabin_ingredient_definitions(key),
  reward_qty integer NOT NULL DEFAULT 1 CHECK (reward_qty BETWEEN 1 AND 5),
  secret boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.cabin_events ENABLE ROW LEVEL SECURITY;

-- Nobody reads the catalog directly — that would be a field guide to the
-- mysteries. The roll RPC returns only what actually happened. Admins may
-- inspect via the is_admin path.
DROP POLICY IF EXISTS "events admin read" ON public.cabin_events;
CREATE POLICY "events admin read" ON public.cabin_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.cabin_event_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_key text NOT NULL REFERENCES public.cabin_events(key),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabin_event_sightings_user_idx ON public.cabin_event_sightings(user_id, event_key, created_at DESC);

ALTER TABLE public.cabin_event_sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sightings own read" ON public.cabin_event_sightings;
CREATE POLICY "sightings own read" ON public.cabin_event_sightings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Roll throttle ledger (one row per attempt; also the abuse backstop).
CREATE TABLE IF NOT EXISTS public.cabin_event_rolls (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_rolled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cabin_event_rolls ENABLE ROW LEVEL SECURITY;
-- definer-only table; no client policies on purpose

-- ----------------------------------------------------------------------------
-- 7. Cabin history — the place remembers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cabin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cabin_created','pet_added','gift_kept','recipe_discovered',
                                     'trade_completed','discovery','sighting','keepsake','item_acquired')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabin_history_owner_idx ON public.cabin_history(owner_id, created_at DESC);

ALTER TABLE public.cabin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history owner read" ON public.cabin_history;
CREATE POLICY "history owner read" ON public.cabin_history
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. Pets — personality on the existing pine_pets
-- ----------------------------------------------------------------------------

ALTER TABLE public.pine_pets
  ADD COLUMN IF NOT EXISTS personality_traits text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS story text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone'
    CHECK (visibility IN ('everyone','friends','only_me')),
  ADD COLUMN IF NOT EXISTS interaction_mode text NOT NULL DEFAULT 'friends'
    CHECK (interaction_mode IN ('everyone','friends','none')),
  ADD COLUMN IF NOT EXISTS memorial_years text CHECK (char_length(memorial_years) <= 40);

-- ----------------------------------------------------------------------------
-- 9. Notifications — warm cabin types
-- ----------------------------------------------------------------------------

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'reaction_batch','reply','quote_post',
    'circle_request','circle_accepted',
    'invite_accepted','smoke_signal',
    'campfire_message','collection_subscriber',
    'cabin_knock','cabin_gift','cabin_guestbook','cabin_note','cabin_trade'
  ));

-- ----------------------------------------------------------------------------
-- 10. Starter kit + lazy cabin creation
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cabin_append_history(_owner uuid, _kind text, _detail jsonb)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.cabin_history (owner_id, kind, detail) VALUES (_owner, _kind, _detail)
$$;

CREATE OR REPLACE FUNCTION public.cabin_notify(_recipient uuid, _actor uuid, _type text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_id, actor_id, notification_type)
  VALUES (_recipient, _actor, _type);
EXCEPTION WHEN others THEN
  NULL;  -- a failed notification never fails the action it decorates
END;
$$;

-- Creates the cabin row, starter inventory, placements, and pantry exactly once.
CREATE OR REPLACE FUNCTION public.cabin_ensure(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _created integer := 0;
  _item_id uuid;
  _starter record;
BEGIN
  INSERT INTO public.cabins (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS _created = ROW_COUNT;
  IF _created = 0 THEN
    RETURN;
  END IF;

  -- Starter decor, pre-placed so a brand-new cabin already looks like home.
  FOR _starter IN
    SELECT * FROM (VALUES
      ('wool_rug',        'floor_center'::text),
      ('worn_armchair',   'floor_left'),
      ('table_lamp',      'desk'),
      ('potted_fern',     'window_center_sill'),
      ('stack_of_books',  'bookshelf_middle'),
      ('firewood_basket', 'floor_right'),
      ('enamel_mug',      'fireplace_mantle'),
      ('trail_map_print', 'left_wall_middle'),
      ('string_lights',   'ceiling'),
      ('carved_bear',     'bookshelf_top')
    ) AS s(item_key, zone)
  LOOP
    INSERT INTO public.user_cabin_items (owner_id, item_key, acquisition_source, provenance_note)
    VALUES (_user_id, _starter.item_key, 'starter', 'Came with the cabin')
    RETURNING id INTO _item_id;
    INSERT INTO public.cabin_placements (cabin_user_id, user_item_id, zone)
    VALUES (_user_id, _item_id, _starter.zone);
  END LOOP;

  -- Enough pantry for a first hot dog, a s'more, and something warm (§116).
  INSERT INTO public.cabin_pantry (owner_id, ingredient_key, quantity)
  VALUES
    (_user_id, 'hot_dog', 2), (_user_id, 'bun', 2), (_user_id, 'mustard', 1),
    (_user_id, 'marshmallow', 4), (_user_id, 'graham_cracker', 4), (_user_id, 'chocolate', 2),
    (_user_id, 'cocoa', 2), (_user_id, 'coffee', 2)
  ON CONFLICT (owner_id, ingredient_key) DO NOTHING;

  PERFORM public.cabin_append_history(_user_id, 'cabin_created', '{}'::jsonb);
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. get_cabin_view — the one read for the whole page
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_cabin_view(_handle text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _p public.profiles%ROWTYPE;
  _c public.cabins%ROWTYPE;
  _is_owner boolean;
  _friends boolean;
  _presence text;
  _lat numeric; _lng numeric;
  _placements jsonb;
  _pets jsonb;
  _pets_ok boolean;
BEGIN
  IF _viewer IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE handle = _handle;
  IF _p.id IS NULL OR public.cabin_blocked(_p.id, _viewer) THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  _is_owner := (_p.id = _viewer);
  _friends := _is_owner OR public.cabin_friends(_p.id, _viewer);

  SELECT * INTO _c FROM public.cabins WHERE user_id = _p.id;
  IF _c.user_id IS NULL THEN
    IF _is_owner THEN
      PERFORM public.cabin_ensure(_p.id);
      SELECT * INTO _c FROM public.cabins WHERE user_id = _p.id;
    ELSE
      -- Un-set-up cabin: render defaults, nothing personal to protect yet.
      _c.user_id := _p.id;
      _c.theme := 'ranger'; _c.biome_key := NULL;
      _c.weather_source := 'default'; _c.cabin_location_key := NULL;
      _c.window_style := 'classic_timber'; _c.curtain_state := 'open';
      _c.auto_lighting := true; _c.ambient_audio := false; _c.presence_visible := true;
      _c.visibility := 'everyone'; _c.guestbook_mode := 'everyone';
      _c.notes_mode := 'everyone'; _c.gifts_mode := 'everyone'; _c.knock_mode := 'everyone';
      _c.pets_visibility := 'everyone'; _c.location_visibility := 'hidden';
    END IF;
  END IF;

  -- Cabin-level visibility gate for visitors.
  IF NOT _is_owner AND NOT public.cabin_mode_allows(_p.id, _viewer, _c.visibility) THEN
    RETURN jsonb_build_object(
      'found', true, 'restricted', true,
      'profile', jsonb_build_object(
        'id', _p.id, 'handle', _p.handle, 'display_name', _p.display_name,
        'avatar_url', _p.avatar_url, 'default_avatar_key', _p.default_avatar_key));
  END IF;

  -- Presence, mapped to environment (porch light / chimney smoke client-side).
  IF NOT _c.presence_visible AND NOT _is_owner THEN
    _presence := 'hidden';
  ELSIF _p.last_seen_at IS NOT NULL AND _p.last_seen_at > now() - interval '15 minutes' THEN
    _presence := 'active';
  ELSIF _p.last_seen_at IS NOT NULL AND _p.last_seen_at > now() - interval '24 hours' THEN
    _presence := 'today';
  ELSE
    _presence := 'away';
  END IF;

  -- Weather coordinates: never hand a visitor precise account coordinates.
  IF _c.weather_source = 'account' AND _p.latitude IS NOT NULL AND _p.longitude IS NOT NULL THEN
    IF _is_owner THEN
      _lat := _p.latitude; _lng := _p.longitude;
    ELSE
      _lat := round(_p.latitude / 0.5) * 0.5;   -- ~50 km grid
      _lng := round(_p.longitude / 0.5) * 0.5;
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pl.id, 'zone', pl.zone, 'slot', pl.slot, 'visibility', pl.visibility,
      'user_item_id', ui.id, 'item_key', ui.item_key,
      'custom_name', ui.custom_name, 'acquired_at', ui.acquired_at,
      'acquisition_source', ui.acquisition_source,
      'provenance_note', ui.provenance_note,
      'gifted_by_name', gp.display_name,
      'name', d.name, 'emoji', d.emoji, 'category', d.category,
      'description', d.description, 'rarity', d.rarity
    ) ORDER BY pl.zone, pl.slot), '[]'::jsonb)
  INTO _placements
  FROM public.cabin_placements pl
  JOIN public.user_cabin_items ui ON ui.id = pl.user_item_id
  JOIN public.cabin_item_definitions d ON d.key = ui.item_key
  LEFT JOIN public.profiles gp ON gp.id = ui.gifted_by
  WHERE pl.cabin_user_id = _p.id
    AND d.enabled
    AND (_is_owner
         OR pl.visibility = 'everyone'
         OR (pl.visibility = 'friends' AND _friends));

  _pets_ok := _is_owner OR public.cabin_mode_allows(_p.id, _viewer, _c.pets_visibility);
  IF _pets_ok THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pp.id, 'name', pp.name, 'animal_type', pp.animal_type,
        'sprite_cache', pp.sprite_cache, 'is_memorial', pp.is_memorial,
        'is_resting', pp.is_resting, 'created_at', pp.created_at,
        'personality_traits', pp.personality_traits, 'story', pp.story,
        'memorial_years', pp.memorial_years,
        'can_interact', (_is_owner OR public.cabin_mode_allows(_p.id, _viewer,
          CASE pp.interaction_mode WHEN 'none' THEN 'off' ELSE pp.interaction_mode END))
      ) ORDER BY pp.display_order), '[]'::jsonb)
    INTO _pets
    FROM public.pine_pets pp
    WHERE pp.owner_id = _p.id
      AND (_is_owner
           OR pp.visibility = 'everyone'
           OR (pp.visibility = 'friends' AND _friends));
  ELSE
    _pets := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'is_owner', _is_owner,
    'relationship', CASE WHEN _is_owner THEN 'self' WHEN _friends THEN 'friends' ELSE 'member' END,
    'profile', jsonb_build_object(
      'id', _p.id, 'handle', _p.handle, 'display_name', _p.display_name,
      'avatar_url', _p.avatar_url, 'default_avatar_key', _p.default_avatar_key,
      'bio', _p.bio, 'mantra', _p.mantra, 'created_at', _p.created_at,
      'atmosphere', _p.atmosphere, 'biome', _p.biome, 'cabin_mood', _p.cabin_mood,
      'zip_code', CASE WHEN _is_owner THEN _p.zip_code END,
      'country_code', _p.country_code),
    'cabin', jsonb_build_object(
      'theme', _c.theme, 'biome_key', _c.biome_key,
      'weather_source', _c.weather_source,
      'cabin_location_key', CASE
        WHEN _is_owner OR _c.location_visibility = 'cabin_location' THEN _c.cabin_location_key END,
      'location_visibility', _c.location_visibility,
      'window_style', _c.window_style, 'curtain_state', _c.curtain_state,
      'auto_lighting', _c.auto_lighting, 'ambient_audio', _c.ambient_audio,
      'presence_visible', _c.presence_visible,
      'visibility', _c.visibility, 'guestbook_mode', _c.guestbook_mode,
      'notes_mode', _c.notes_mode, 'gifts_mode', _c.gifts_mode,
      'knock_mode', _c.knock_mode, 'pets_visibility', _c.pets_visibility),
    -- For 'account': coordinates only, rounded to a ~50 km grid for visitors.
    -- For 'cabin_location': the curated key itself — the location is fictional
    -- by definition, so sharing it is safe; whether its *name* is displayed is
    -- governed separately by location_visibility above.
    'weather_hint', CASE
      WHEN _c.weather_source = 'cabin_location' AND _c.cabin_location_key IS NOT NULL
        THEN jsonb_build_object('location_key', _c.cabin_location_key)
      WHEN _lat IS NOT NULL
        THEN jsonb_build_object('lat', _lat, 'lng', _lng)
      END,
    'presence', _presence,
    'placements', _placements,
    'pets', _pets,
    'permissions', jsonb_build_object(
      'sign_guestbook', NOT _is_owner AND public.cabin_mode_allows(_p.id, _viewer, _c.guestbook_mode),
      'leave_note',     NOT _is_owner AND public.cabin_mode_allows(_p.id, _viewer, _c.notes_mode),
      'knock',          NOT _is_owner AND public.cabin_mode_allows(_p.id, _viewer, _c.knock_mode),
      'leave_gift',     NOT _is_owner AND public.cabin_mode_allows(_p.id, _viewer, _c.gifts_mode),
      'trade',          NOT _is_owner)
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. Social RPCs (each enforces privacy mode, blocks, and rate limits)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cabin_sign_guestbook(_owner uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _mode text;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _viewer = _owner THEN RETURN jsonb_build_object('success', false, 'error', 'own_cabin'); END IF;
  PERFORM public.cabin_ensure(_owner);
  SELECT guestbook_mode INTO _mode FROM public.cabins WHERE user_id = _owner;
  IF NOT public.cabin_mode_allows(_owner, _viewer, COALESCE(_mode, 'everyone')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;
  IF (SELECT count(*) FROM public.cabin_guestbook_entries
      WHERE owner_id = _owner AND author_id = _viewer
        AND created_at > now() - interval '1 day') >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  INSERT INTO public.cabin_guestbook_entries (owner_id, author_id, content)
  VALUES (_owner, _viewer, btrim(_content));
  PERFORM public.cabin_notify(_owner, _viewer, 'cabin_guestbook');
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_leave_note(_owner uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _mode text;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _viewer = _owner THEN RETURN jsonb_build_object('success', false, 'error', 'own_cabin'); END IF;
  PERFORM public.cabin_ensure(_owner);
  SELECT notes_mode INTO _mode FROM public.cabins WHERE user_id = _owner;
  IF NOT public.cabin_mode_allows(_owner, _viewer, COALESCE(_mode, 'everyone')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;
  IF (SELECT count(*) FROM public.cabin_notes
      WHERE owner_id = _owner AND author_id = _viewer
        AND created_at > now() - interval '1 day') >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  INSERT INTO public.cabin_notes (owner_id, author_id, content)
  VALUES (_owner, _viewer, btrim(_content));
  PERFORM public.cabin_notify(_owner, _viewer, 'cabin_note');
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_knock(_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _mode text;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _viewer = _owner THEN RETURN jsonb_build_object('success', false, 'error', 'own_cabin'); END IF;
  PERFORM public.cabin_ensure(_owner);
  SELECT knock_mode INTO _mode FROM public.cabins WHERE user_id = _owner;
  IF NOT public.cabin_mode_allows(_owner, _viewer, COALESCE(_mode, 'everyone')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;
  IF EXISTS (SELECT 1 FROM public.cabin_knocks
             WHERE owner_id = _owner AND knocker_id = _viewer
               AND created_at > now() - interval '1 hour') THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  INSERT INTO public.cabin_knocks (owner_id, knocker_id) VALUES (_owner, _viewer);
  PERFORM public.cabin_notify(_owner, _viewer, 'cabin_knock');
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_leave_gift(
  _owner uuid, _item_key text DEFAULT NULL, _ingredient_key text DEFAULT NULL,
  _qty integer DEFAULT 1, _message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _mode text;
  _have integer;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _viewer = _owner THEN RETURN jsonb_build_object('success', false, 'error', 'own_cabin'); END IF;
  IF num_nonnulls(_item_key, _ingredient_key) <> 1 OR _qty < 1 OR _qty > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'bad_request');
  END IF;
  PERFORM public.cabin_ensure(_owner);
  SELECT gifts_mode INTO _mode FROM public.cabins WHERE user_id = _owner;
  IF NOT public.cabin_mode_allows(_owner, _viewer, COALESCE(_mode, 'everyone')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;
  IF (SELECT count(*) FROM public.cabin_porch_gifts
      WHERE owner_id = _owner AND sender_id = _viewer
        AND created_at > now() - interval '1 day') >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  IF _item_key IS NOT NULL THEN
    -- Token gifts: small approved objects anyone can leave (a pinecone, a
    -- flower). Must be flagged giftable in the catalog; quantity is 1.
    IF NOT EXISTS (SELECT 1 FROM public.cabin_item_definitions
                   WHERE key = _item_key AND giftable AND enabled) THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_giftable');
    END IF;
    _qty := 1;
  ELSE
    -- Ingredient gifts come out of the sender's own pantry.
    SELECT quantity INTO _have FROM public.cabin_pantry
    WHERE owner_id = _viewer AND ingredient_key = _ingredient_key FOR UPDATE;
    IF COALESCE(_have, 0) < _qty THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_enough');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cabin_ingredient_definitions
                   WHERE key = _ingredient_key AND giftable AND enabled) THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_giftable');
    END IF;
    UPDATE public.cabin_pantry SET quantity = quantity - _qty
    WHERE owner_id = _viewer AND ingredient_key = _ingredient_key;
  END IF;

  INSERT INTO public.cabin_porch_gifts (owner_id, sender_id, item_key, ingredient_key, quantity, message)
  VALUES (_owner, _viewer, _item_key, _ingredient_key, _qty, NULLIF(btrim(COALESCE(_message,'')), ''));
  PERFORM public.cabin_notify(_owner, _viewer, 'cabin_gift');
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_respond_gift(_gift_id uuid, _keep boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _g public.cabin_porch_gifts%ROWTYPE;
  _sender_name text;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO _g FROM public.cabin_porch_gifts WHERE id = _gift_id FOR UPDATE;
  IF _g.id IS NULL OR _g.owner_id <> _viewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _g.status <> 'on_porch' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_resolved');
  END IF;

  IF _keep THEN
    SELECT display_name INTO _sender_name FROM public.profiles WHERE id = _g.sender_id;
    IF _g.item_key IS NOT NULL THEN
      INSERT INTO public.user_cabin_items
        (owner_id, item_key, acquisition_source, gifted_by, provenance_note)
      VALUES (_viewer, _g.item_key, 'gift', _g.sender_id,
              'Left on the porch by ' || COALESCE(_sender_name, 'a friend') ||
              ' · ' || to_char(_g.created_at, 'FMMonth YYYY'));
    ELSE
      INSERT INTO public.cabin_pantry (owner_id, ingredient_key, quantity)
      VALUES (_viewer, _g.ingredient_key, _g.quantity)
      ON CONFLICT (owner_id, ingredient_key)
      DO UPDATE SET quantity = public.cabin_pantry.quantity + EXCLUDED.quantity;
    END IF;
    PERFORM public.cabin_append_history(_viewer, 'gift_kept', jsonb_build_object(
      'from', _sender_name, 'item_key', _g.item_key,
      'ingredient_key', _g.ingredient_key, 'quantity', _g.quantity));
  END IF;

  UPDATE public.cabin_porch_gifts
  SET status = CASE WHEN _keep THEN 'kept' ELSE 'tossed' END, resolved_at = now()
  WHERE id = _gift_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 13. Cooking — server-validated recipe discovery
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cabin_cook(_ingredients text[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _key text;
  _need record;
  _have integer;
  _r public.cabin_recipes%ROWTYPE;
  _best public.cabin_recipes%ROWTYPE;
  _best_size integer := -1;
  _ok boolean;
  _newly boolean := false;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _ingredients IS NULL OR array_length(_ingredients, 1) IS NULL
     OR array_length(_ingredients, 1) > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'bad_request');
  END IF;
  PERFORM public.cabin_ensure(_viewer);

  -- Verify the pantry actually holds everything offered to the fire.
  FOR _need IN
    SELECT unnest AS ing, count(*) AS n FROM unnest(_ingredients) GROUP BY 1
  LOOP
    SELECT quantity INTO _have FROM public.cabin_pantry
    WHERE owner_id = _viewer AND ingredient_key = _need.ing;
    IF COALESCE(_have, 0) < _need.n THEN
      RETURN jsonb_build_object('success', false, 'error', 'not_enough', 'ingredient', _need.ing);
    END IF;
  END LOOP;

  -- Find the largest enabled recipe whose requirements are covered and whose
  -- required+optional set covers everything offered (no stray ingredients).
  FOR _r IN SELECT * FROM public.cabin_recipes WHERE enabled LOOP
    _ok := true;
    -- every required ingredient (with multiplicity) present in offered
    FOR _need IN SELECT unnest AS ing, count(*) AS n FROM unnest(_r.required) GROUP BY 1 LOOP
      IF (SELECT count(*) FROM unnest(_ingredients) u WHERE u = _need.ing) < _need.n THEN
        _ok := false; EXIT;
      END IF;
    END LOOP;
    -- every offered ingredient allowed by the recipe
    IF _ok THEN
      FOREACH _key IN ARRAY _ingredients LOOP
        IF NOT (_key = ANY(_r.required) OR _key = ANY(_r.optional)) THEN
          _ok := false; EXIT;
        END IF;
      END LOOP;
    END IF;
    IF _ok AND array_length(_r.required, 1) > _best_size THEN
      _best := _r; _best_size := array_length(_r.required, 1);
    END IF;
  END LOOP;

  IF _best.key IS NULL THEN
    -- Nothing came together. The fire is forgiving: nothing is consumed.
    RETURN jsonb_build_object('success', true, 'matched', false);
  END IF;

  -- Consume what was offered.
  FOR _need IN SELECT unnest AS ing, count(*) AS n FROM unnest(_ingredients) GROUP BY 1 LOOP
    UPDATE public.cabin_pantry SET quantity = quantity - _need.n
    WHERE owner_id = _viewer AND ingredient_key = _need.ing;
  END LOOP;

  _newly := NOT EXISTS (SELECT 1 FROM public.cabin_recipe_book
                        WHERE owner_id = _viewer AND recipe_key = _best.key);
  INSERT INTO public.cabin_recipe_book (owner_id, recipe_key)
  VALUES (_viewer, _best.key)
  ON CONFLICT (owner_id, recipe_key)
  DO UPDATE SET times_cooked = public.cabin_recipe_book.times_cooked + 1;

  IF _newly THEN
    PERFORM public.cabin_append_history(_viewer, 'recipe_discovered',
      jsonb_build_object('recipe_key', _best.key, 'name', _best.name));
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'matched', true, 'newly_discovered', _newly,
    'recipe', jsonb_build_object(
      'key', _best.key, 'name', _best.name, 'emoji', _best.emoji,
      'description', _best.description, 'rarity', _best.rarity));
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. Trades — atomic exchange with re-verification at accept time
-- ----------------------------------------------------------------------------

-- _offer / _ask: [{"ingredient_key": "chili", "quantity": 2} | {"user_item_id": "<uuid>"}]
CREATE OR REPLACE FUNCTION public.cabin_propose_trade(
  _recipient uuid, _message text, _offer jsonb, _ask jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _trade_id uuid;
  _row jsonb;
  _have integer;
  _item public.user_cabin_items%ROWTYPE;
  _n integer := 0;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF _recipient IS NULL OR _recipient = _viewer OR public.cabin_blocked(_viewer, _recipient) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;
  IF jsonb_array_length(COALESCE(_offer, '[]'::jsonb)) = 0
     AND jsonb_array_length(COALESCE(_ask, '[]'::jsonb)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_trade');
  END IF;
  IF jsonb_array_length(COALESCE(_offer, '[]'::jsonb)) > 6
     OR jsonb_array_length(COALESCE(_ask, '[]'::jsonb)) > 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;
  IF (SELECT count(*) FROM public.cabin_trades
      WHERE proposer_id = _viewer AND status = 'open') >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_open');
  END IF;

  INSERT INTO public.cabin_trades (proposer_id, recipient_id, message)
  VALUES (_viewer, _recipient, NULLIF(btrim(COALESCE(_message,'')), ''))
  RETURNING id INTO _trade_id;

  FOR _row IN SELECT * FROM jsonb_array_elements(COALESCE(_offer, '[]'::jsonb)) LOOP
    IF _row ? 'ingredient_key' THEN
      SELECT quantity INTO _have FROM public.cabin_pantry
      WHERE owner_id = _viewer AND ingredient_key = _row->>'ingredient_key';
      IF COALESCE(_have, 0) < COALESCE((_row->>'quantity')::integer, 1) THEN
        RAISE EXCEPTION 'offer_not_owned';
      END IF;
      INSERT INTO public.cabin_trade_items (trade_id, side, ingredient_key, quantity)
      VALUES (_trade_id, 'proposer', _row->>'ingredient_key', COALESCE((_row->>'quantity')::integer, 1));
    ELSE
      SELECT * INTO _item FROM public.user_cabin_items WHERE id = (_row->>'user_item_id')::uuid;
      IF _item.id IS NULL OR _item.owner_id <> _viewer THEN
        RAISE EXCEPTION 'offer_not_owned';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.cabin_item_definitions
                     WHERE key = _item.item_key AND tradable AND enabled) THEN
        RAISE EXCEPTION 'offer_not_tradable';
      END IF;
      INSERT INTO public.cabin_trade_items (trade_id, side, user_item_id)
      VALUES (_trade_id, 'proposer', _item.id);
    END IF;
    _n := _n + 1;
  END LOOP;

  FOR _row IN SELECT * FROM jsonb_array_elements(COALESCE(_ask, '[]'::jsonb)) LOOP
    IF _row ? 'ingredient_key' THEN
      INSERT INTO public.cabin_trade_items (trade_id, side, ingredient_key, quantity)
      VALUES (_trade_id, 'recipient', _row->>'ingredient_key', COALESCE((_row->>'quantity')::integer, 1));
    ELSE
      SELECT * INTO _item FROM public.user_cabin_items WHERE id = (_row->>'user_item_id')::uuid;
      IF _item.id IS NULL OR _item.owner_id <> _recipient THEN
        RAISE EXCEPTION 'ask_not_owned';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.cabin_item_definitions
                     WHERE key = _item.item_key AND tradable AND enabled) THEN
        RAISE EXCEPTION 'ask_not_tradable';
      END IF;
      INSERT INTO public.cabin_trade_items (trade_id, side, user_item_id)
      VALUES (_trade_id, 'recipient', _item.id);
    END IF;
  END LOOP;

  PERFORM public.cabin_notify(_recipient, _viewer, 'cabin_trade');
  RETURN jsonb_build_object('success', true, 'trade_id', _trade_id);
EXCEPTION WHEN raise_exception THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_transfer_trade_item(
  _ti public.cabin_trade_items, _from uuid, _to uuid, _other_name text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _have integer;
BEGIN
  IF _ti.ingredient_key IS NOT NULL THEN
    SELECT quantity INTO _have FROM public.cabin_pantry
    WHERE owner_id = _from AND ingredient_key = _ti.ingredient_key FOR UPDATE;
    IF COALESCE(_have, 0) < _ti.quantity THEN
      RAISE EXCEPTION 'trade_item_missing';
    END IF;
    UPDATE public.cabin_pantry SET quantity = quantity - _ti.quantity
    WHERE owner_id = _from AND ingredient_key = _ti.ingredient_key;
    INSERT INTO public.cabin_pantry (owner_id, ingredient_key, quantity)
    VALUES (_to, _ti.ingredient_key, _ti.quantity)
    ON CONFLICT (owner_id, ingredient_key)
    DO UPDATE SET quantity = public.cabin_pantry.quantity + EXCLUDED.quantity;
  ELSE
    -- Re-verify ownership at execution time; the proposal is a promise,
    -- this is the escrow check.
    PERFORM 1 FROM public.user_cabin_items
    WHERE id = _ti.user_item_id AND owner_id = _from FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'trade_item_missing';
    END IF;
    DELETE FROM public.cabin_placements WHERE user_item_id = _ti.user_item_id;
    UPDATE public.user_cabin_items
    SET owner_id = _to,
        acquisition_source = 'trade',
        gifted_by = _from,
        provenance_note = 'Traded from ' || COALESCE(_other_name, 'a friend') ||
                          ' · ' || to_char(now(), 'FMMonth YYYY')
    WHERE id = _ti.user_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_respond_trade(_trade_id uuid, _accept boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _t public.cabin_trades%ROWTYPE;
  _ti public.cabin_trade_items%ROWTYPE;
  _proposer_name text;
  _recipient_name text;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO _t FROM public.cabin_trades WHERE id = _trade_id FOR UPDATE;
  IF _t.id IS NULL OR _t.recipient_id <> _viewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _t.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_resolved');
  END IF;

  IF NOT _accept THEN
    UPDATE public.cabin_trades SET status = 'declined', resolved_at = now() WHERE id = _trade_id;
    RETURN jsonb_build_object('success', true, 'status', 'declined');
  END IF;

  SELECT display_name INTO _proposer_name FROM public.profiles WHERE id = _t.proposer_id;
  SELECT display_name INTO _recipient_name FROM public.profiles WHERE id = _t.recipient_id;

  -- Both directions transfer inside this one transaction; any missing item
  -- raises and rolls the whole thing back. No half-trades, ever.
  FOR _ti IN SELECT * FROM public.cabin_trade_items WHERE trade_id = _trade_id AND side = 'proposer' LOOP
    PERFORM public.cabin_transfer_trade_item(_ti, _t.proposer_id, _t.recipient_id, _proposer_name);
  END LOOP;
  FOR _ti IN SELECT * FROM public.cabin_trade_items WHERE trade_id = _trade_id AND side = 'recipient' LOOP
    PERFORM public.cabin_transfer_trade_item(_ti, _t.recipient_id, _t.proposer_id, _recipient_name);
  END LOOP;

  UPDATE public.cabin_trades SET status = 'accepted', resolved_at = now() WHERE id = _trade_id;
  PERFORM public.cabin_append_history(_t.proposer_id, 'trade_completed',
    jsonb_build_object('with', _recipient_name, 'trade_id', _trade_id));
  PERFORM public.cabin_append_history(_t.recipient_id, 'trade_completed',
    jsonb_build_object('with', _proposer_name, 'trade_id', _trade_id));
  PERFORM public.cabin_notify(_t.proposer_id, _viewer, 'cabin_trade');
  RETURN jsonb_build_object('success', true, 'status', 'accepted');
EXCEPTION WHEN raise_exception THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.cabin_cancel_trade(_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _t public.cabin_trades%ROWTYPE;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO _t FROM public.cabin_trades WHERE id = _trade_id FOR UPDATE;
  IF _t.id IS NULL OR _t.proposer_id <> _viewer THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _t.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_resolved');
  END IF;
  UPDATE public.cabin_trades SET status = 'cancelled', resolved_at = now() WHERE id = _trade_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- ----------------------------------------------------------------------------
-- 15. Environmental event roll — server decides what the forest does
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cabin_roll_event(
  _biome text, _weather text, _time_of_day text, _season text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _last timestamptz;
  _e public.cabin_events%ROWTYPE;
  _roll numeric;
  _reward jsonb := NULL;
  _item_id uuid;
BEGIN
  IF _viewer IS NULL THEN RETURN jsonb_build_object('event', NULL); END IF;

  -- One roll per five minutes, quietly.
  SELECT last_rolled_at INTO _last FROM public.cabin_event_rolls WHERE user_id = _viewer;
  IF _last IS NOT NULL AND _last > now() - interval '5 minutes' THEN
    RETURN jsonb_build_object('event', NULL);
  END IF;
  INSERT INTO public.cabin_event_rolls (user_id) VALUES (_viewer)
  ON CONFLICT (user_id) DO UPDATE SET last_rolled_at = now();

  -- Walk eligible events in random order; first one to clear its weight wins.
  FOR _e IN
    SELECT * FROM public.cabin_events e
    WHERE e.enabled
      AND (e.eligible_biomes IS NULL OR _biome = ANY(e.eligible_biomes))
      AND (e.eligible_seasons IS NULL OR _season = ANY(e.eligible_seasons))
      AND (e.eligible_weather IS NULL OR _weather = ANY(e.eligible_weather))
      AND (e.eligible_times IS NULL OR _time_of_day = ANY(e.eligible_times))
      AND NOT EXISTS (
        SELECT 1 FROM public.cabin_event_sightings s
        WHERE s.user_id = _viewer AND s.event_key = e.key
          AND s.created_at > now() - (e.cooldown_hours || ' hours')::interval)
    ORDER BY random()
  LOOP
    _roll := random();
    IF _roll < _e.rarity_weight THEN
      INSERT INTO public.cabin_event_sightings (user_id, event_key) VALUES (_viewer, _e.key);

      IF _e.reward_item_key IS NOT NULL THEN
        INSERT INTO public.user_cabin_items
          (owner_id, item_key, acquisition_source, provenance_note, event_key)
        VALUES (_viewer, _e.reward_item_key,
                CASE WHEN _e.kind = 'keepsake' THEN 'event' ELSE 'discovery' END,
                _e.name || ' · ' || to_char(now(), 'FMMonth DD, YYYY'), _e.key)
        RETURNING id INTO _item_id;
        _reward := jsonb_build_object('type', 'item', 'item_key', _e.reward_item_key, 'user_item_id', _item_id);
      ELSIF _e.reward_ingredient_key IS NOT NULL THEN
        INSERT INTO public.cabin_pantry (owner_id, ingredient_key, quantity)
        VALUES (_viewer, _e.reward_ingredient_key, _e.reward_qty)
        ON CONFLICT (owner_id, ingredient_key)
        DO UPDATE SET quantity = public.cabin_pantry.quantity + EXCLUDED.quantity;
        _reward := jsonb_build_object('type', 'ingredient',
          'ingredient_key', _e.reward_ingredient_key, 'quantity', _e.reward_qty);
      END IF;

      PERFORM public.cabin_append_history(_viewer,
        CASE _e.kind WHEN 'discovery' THEN 'discovery'
                     WHEN 'keepsake' THEN 'keepsake' ELSE 'sighting' END,
        jsonb_build_object('event_key', _e.key, 'name', _e.name));

      RETURN jsonb_build_object('event', jsonb_build_object(
        'key', _e.key, 'kind', _e.kind, 'name', _e.name,
        'description', _e.description, 'emoji', _e.emoji,
        'secret', _e.secret, 'reward', _reward));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('event', NULL);
END;
$$;

-- ----------------------------------------------------------------------------
-- 16. Seeds — catalog, ingredients, recipes, events
-- ----------------------------------------------------------------------------

INSERT INTO public.cabin_item_definitions
  (key, name, description, category, emoji, valid_zones, rarity, tradable, giftable, availability, sort) VALUES
  -- Starter kit
  ('wool_rug','Wool Rug','Scratchy in the right way.','furniture','🟫','{floor_left,floor_center,floor_right}','everyday',true,false,'starter',10),
  ('worn_armchair','Worn Armchair','It has already accepted your shape.','furniture','🪑','{floor_left,floor_center,floor_right}','everyday',true,false,'starter',11),
  ('table_lamp','Table Lamp','Warm amber circle.','lighting','💡','{desk,bookshelf_top,bookshelf_middle,window_left_sill,window_right_sill}','everyday',true,false,'starter',12),
  ('potted_fern','Potted Fern','Forgiving of neglect.','plants','🪴','{window_left_sill,window_center_sill,window_right_sill,desk,bookshelf_top,floor_left,floor_right,porch_left,porch_right}','everyday',true,false,'starter',13),
  ('stack_of_books','Stack of Books','Half of them half-read.','books','📚','{bookshelf_top,bookshelf_middle,bookshelf_lower,desk,floor_left}','everyday',true,false,'starter',14),
  ('firewood_basket','Firewood Basket','Split and stacked.','campfire_gear','🧺','{floor_left,floor_right,porch_left,porch_right}','everyday',true,false,'starter',15),
  ('enamel_mug','Enamel Mug','Chipped exactly once.','trinkets','☕','{fireplace_mantle,desk,window_left_sill,window_right_sill,bookshelf_middle}','everyday',true,false,'starter',16),
  ('trail_map_print','Trail Map Print','Somewhere you have been.','wall_decor','🗺️','{left_wall_upper,left_wall_middle,left_wall_lower,right_wall_upper,right_wall_middle,right_wall_lower}','everyday',true,false,'starter',17),
  ('string_lights','String Lights','Tiny warm constellation.','lighting','✨','{ceiling,window_left_sill,window_center_sill,window_right_sill,porch_center}','everyday',true,false,'starter',18),
  ('carved_bear','Carved Bear','Somebody whittled this badly, with love.','trinkets','🐻','{bookshelf_top,bookshelf_middle,fireplace_mantle,desk}','everyday',true,false,'starter',19),
  -- Catalog decor
  ('lava_lamp','Lava Lamp','Slow orange thoughts.','lighting','🫙','{desk,bookshelf_top,bookshelf_middle,window_left_sill,window_right_sill}','unusual',true,false,'catalog',30),
  ('reading_lantern','Reading Lantern','Hiss of white gas, glow of a small sun.','lighting','🏮','{desk,fireplace_mantle,porch_center,floor_right}','everyday',true,false,'catalog',31),
  ('candle_cluster','Candle Cluster','Three heights, one match.','lighting','🕯️','{fireplace_mantle,desk,window_left_sill,window_center_sill,window_right_sill}','everyday',true,false,'catalog',32),
  ('neon_pine','Neon Pine Sign','Buzzes faintly. Extremely 1994.','lighting','🌲','{left_wall_upper,right_wall_upper}','hard_to_find',true,false,'catalog',33),
  ('rocking_chair','Rocking Chair','Creaks in iambic pentameter.','furniture','🪑','{floor_left,floor_right,porch_left,porch_right}','unusual',true,false,'catalog',34),
  ('bean_bag','Bean Bag','A 1979 original.','furniture','🟤','{floor_left,floor_center,floor_right}','unusual',true,false,'catalog',35),
  ('record_crate','Record Crate','Alphabetized, then abandoned.','trinkets','📦','{floor_left,floor_right,bookshelf_lower}','unusual',true,false,'catalog',36),
  ('crt_computer','Beige CRT','It dials up. To what, nobody knows.','oddities','🖥️','{desk}','hard_to_find',true,false,'catalog',37),
  ('vhs_stack','VHS Stack','Be kind. Rewind.','trinkets','📼','{bookshelf_lower,bookshelf_middle,floor_right}','unusual',true,false,'catalog',38),
  ('analog_clock','Analog Clock','Ticks like rain on tin.','wall_decor','🕰️','{left_wall_upper,right_wall_upper,fireplace_mantle}','everyday',true,false,'catalog',39),
  ('pressed_flowers','Pressed Flowers','Summer, archived.','wall_decor','🌼','{left_wall_middle,right_wall_middle,left_wall_lower,right_wall_lower}','everyday',true,false,'catalog',40),
  ('herb_bundles','Herb Bundles','Hung to dry. Smells like a spell.','plants','🌿','{ceiling,fireplace_mantle,left_wall_lower,right_wall_lower}','unusual',true,false,'catalog',41),
  ('old_grimoire','Old Grimoire','The bookmark never moves on its own. Probably.','books','📖','{bookshelf_top,bookshelf_middle,desk}','strange',true,false,'catalog',42),
  ('crystal_jar','Crystal Jar','Catches light that isn''t there.','oddities','🔮','{window_left_sill,window_center_sill,window_right_sill,bookshelf_top}','strange',true,false,'catalog',43),
  ('quilt_throw','Quilt Throw','Four generations of patches.','furniture','🧶','{floor_left,floor_center,floor_right}','unusual',true,false,'catalog',44),
  ('cuckoo_clock','Cuckoo Clock','The bird is ten minutes fast, always.','wall_decor','🐦','{left_wall_upper,right_wall_upper}','hard_to_find',true,false,'catalog',45),
  ('ship_in_bottle','Ship in a Bottle','How? Nobody asks anymore.','oddities','⛵','{bookshelf_middle,fireplace_mantle,desk,window_center_sill}','hard_to_find',true,false,'catalog',46),
  ('cast_iron_pan','Cast Iron Pan','Seasoned since before you were born.','campfire_gear','🍳','{fireplace_mantle,left_wall_lower,right_wall_lower}','everyday',true,false,'catalog',47),
  ('fishing_rod','Fishing Rod','For the lake you keep meaning to visit.','outdoor','🎣','{porch_left,porch_right,left_wall_lower,right_wall_lower}','everyday',true,false,'catalog',48),
  ('welcome_mat','Welcome Mat','Says nothing. Means it warmly.','outdoor','🚪','{porch_center}','everyday',true,false,'catalog',49),
  ('wind_chimes','Wind Chimes','The porch''s voice.','outdoor','🎐','{porch_left,porch_center,porch_right}','everyday',true,false,'catalog',50),
  ('bird_feeder','Bird Feeder','The morning show.','outdoor','🐤','{porch_left,porch_right,exterior_sign}','everyday',true,false,'catalog',51),
  ('hanging_planter','Hanging Planter','Trails past the eaves.','plants','🌱','{ceiling,porch_left,porch_right}','everyday',true,false,'catalog',52),
  ('polaroid_wall','Polaroid Wall','A summer per square.','photos','📸','{left_wall_middle,right_wall_middle,left_wall_upper,right_wall_upper}','everyday',true,false,'catalog',53),
  ('framed_photo','Framed Photo','Someone you love, mid-laugh.','photos','🖼️','{desk,fireplace_mantle,bookshelf_middle,left_wall_middle,right_wall_middle}','everyday',true,false,'catalog',54),
  ('pet_cushion','Pet Cushion','The most contested seat in the house.','pet_items','🛏️','{pet_area,floor_left,floor_right}','everyday',true,false,'catalog',55),
  ('feather_wand','Feather Wand','Held together by tape and duty.','pet_items','🪶','{pet_area,floor_center}','everyday',true,false,'catalog',56),
  ('antler_shed','Antler Shed','Found, not taken.','trinkets','🦌','{fireplace_mantle,bookshelf_top,exterior_sign}','unusual',true,false,'catalog',57),
  ('canoe_paddle','Canoe Paddle','Lake house standard issue.','outdoor','🛶','{left_wall_upper,right_wall_upper,porch_left,porch_right}','unusual',true,false,'catalog',58),
  ('snowshoes','Snowshoes','Crossed above the mantle, as is law.','outdoor','❄️','{left_wall_upper,right_wall_upper,porch_left}','unusual',true,false,'catalog',59),
  -- Porch-gift tokens (giftable, nobody needs to own them first)
  ('wildflower','Wildflower','Picked on the way over.','trinkets','🌸','{window_left_sill,window_center_sill,window_right_sill,desk,fireplace_mantle}','everyday',true,true,'catalog',70),
  ('pinecone','Pinecone','A perfectly good pinecone.','trinkets','🌰','{fireplace_mantle,bookshelf_top,bookshelf_middle,desk,window_left_sill,window_right_sill,porch_left,porch_right}','everyday',true,true,'catalog',71),
  ('smooth_stone','Smooth Stone','River-made. Pocket-sized.','trinkets','🪨','{desk,window_left_sill,window_center_sill,window_right_sill,bookshelf_middle,fireplace_mantle}','everyday',true,true,'catalog',72),
  ('acorn','Acorn','Contains one entire oak, eventually.','trinkets','🌰','{desk,window_left_sill,window_right_sill,bookshelf_middle}','everyday',true,true,'catalog',73),
  ('garden_gnome','Garden Gnome','Ridiculous. Non-negotiable.','oddities','🧙','{porch_left,porch_center,porch_right,fireplace_mantle,exterior_sign}','unusual',true,true,'catalog',74),
  ('paper_crane','Paper Crane','Folded while thinking of you.','trinkets','🕊️','{desk,window_left_sill,window_center_sill,window_right_sill,bookshelf_top}','everyday',true,true,'catalog',75),
  ('lucky_penny','Lucky Penny','Heads up when it landed.','trinkets','🪙','{desk,window_left_sill,window_right_sill,fireplace_mantle}','everyday',true,true,'catalog',76),
  -- Discovery / event rewards
  ('strange_pinecone','Strange Pinecone','The scales spiral the wrong way.','oddities','🌀','{fireplace_mantle,bookshelf_top,desk,window_center_sill}','strange',true,false,'discovery',90),
  ('lucky_mushroom','Lucky Mushroom','Do not eat. Do admire.','oddities','🍄','{window_left_sill,window_center_sill,window_right_sill,bookshelf_top,desk}','unusual',true,false,'discovery',91),
  ('fallen_feather','Fallen Feather','Owl, probably. Hopefully.','trinkets','🪶','{desk,bookshelf_middle,window_left_sill,window_right_sill}','unusual',true,false,'discovery',92),
  ('creek_stone','Creek Stone','Still cold from the water.','trinkets','💧','{window_left_sill,window_center_sill,window_right_sill,desk}','everyday',true,false,'discovery',93),
  ('snow_globe','First Snow Globe','It was snowing when you found it.','collectibles','🌨️','{fireplace_mantle,desk,bookshelf_top,window_center_sill}','hard_to_find',false,false,'event',94),
  ('meteor_fragment','Meteor Fragment','Warm for no reason.','collectibles','☄️','{desk,fireplace_mantle,bookshelf_top}','very_strange',false,false,'event',95)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.cabin_ingredient_definitions (key, name, emoji, category, rarity) VALUES
  ('hot_dog','Hot Dog','🌭','hotdog','everyday'),
  ('bun','Bun','🥖','hotdog','everyday'),
  ('mustard','Mustard','🟡','hotdog','everyday'),
  ('ketchup','Ketchup','🔴','hotdog','everyday'),
  ('relish','Relish','🟢','hotdog','everyday'),
  ('onions','Onions','🧅','hotdog','everyday'),
  ('chili','Chili','🥣','hotdog','unusual'),
  ('cheese','Cheese','🧀','hotdog','everyday'),
  ('jalapeno','Jalapeño','🌶️','hotdog','unusual'),
  ('sauerkraut','Sauerkraut','🥬','hotdog','unusual'),
  ('hot_sauce','Hot Sauce','🔥','hotdog','unusual'),
  ('cream_cheese','Cream Cheese','🥯','hotdog','unusual'),
  ('marshmallow','Marshmallow','🤍','smore','everyday'),
  ('graham_cracker','Graham Cracker','🟫','smore','everyday'),
  ('chocolate','Chocolate','🍫','smore','everyday'),
  ('peanut_butter_cup','Peanut Butter Cup','🥜','smore','unusual'),
  ('caramel','Caramel','🍮','smore','unusual'),
  ('fancy_chocolate','Fancy Chocolate','✨','smore','hard_to_find'),
  ('cocoa','Cocoa','🍫','drink','everyday'),
  ('coffee','Coffee','☕','drink','everyday'),
  ('tea','Tea','🍵','drink','everyday'),
  ('honey','Honey','🍯','drink','unusual'),
  ('popcorn','Popcorn Kernels','🍿','other','everyday'),
  ('bread','Bread','🍞','other','everyday'),
  ('butter','Butter','🧈','other','everyday'),
  ('potato','Potato','🥔','other','everyday'),
  ('berries','Wild Berries','🫐','other','unusual')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.cabin_recipes (key, name, description, emoji, required, optional, rarity, secret) VALUES
  ('classic_hot_dog','Classic Hot Dog','The reference implementation.','🌭',
    '{hot_dog,bun}','{mustard,ketchup,relish,onions}','everyday',false),
  ('perfectly_normal_hot_dog','Perfectly Normal Hot Dog','Nothing to see here.','🌭',
    '{hot_dog,bun,ketchup,mustard}','{}','everyday',false),
  ('ranger_dog','Ranger Dog','Standard issue at the station.','🌭',
    '{hot_dog,bun,chili,cheese}','{onions}','unusual',false),
  ('questionable_ranger_dog','The Questionable Ranger Dog','The ranger has questions too.','🌶️',
    '{hot_dog,bun,chili,cheese,jalapeno}','{onions,hot_sauce}','hard_to_find',false),
  ('five_alarm_dog','Five Alarm Dog','You signed the waiver.','🚨',
    '{hot_dog,bun,jalapeno,hot_sauce}','{chili,onions}','hard_to_find',false),
  ('seattle_dog','Seattle Dog','Cream cheese. Trust the process.','🌧️',
    '{hot_dog,bun,cream_cheese,onions}','{jalapeno}','unusual',false),
  ('classic_smore','Classic S''more','The reason fires were invented.','🔥',
    '{marshmallow,graham_cracker,chocolate}','{}','everyday',false),
  ('pb_smore','Peanut Butter S''more','An upgrade nobody regrets.','🥜',
    '{marshmallow,graham_cracker,peanut_butter_cup}','{}','unusual',false),
  ('caramel_smore','Caramel S''more','Sticks around.','🍮',
    '{marshmallow,graham_cracker,chocolate,caramel}','{}','unusual',false),
  ('midnight_cocoa','Midnight Cocoa','Best consumed after everyone else is asleep.','🌙',
    '{cocoa,marshmallow}','{honey}','everyday',false),
  ('campfire_coffee','Campfire Coffee','Tastes 40% better outside.','☕',
    '{coffee}','{honey}','everyday',false),
  ('forest_tea','Forest Tea','Steam and pine resin.','🍵',
    '{tea,honey}','{berries}','everyday',false),
  ('campfire_popcorn','Campfire Popcorn','Sixty seconds of drama.','🍿',
    '{popcorn,butter}','{}','everyday',false),
  ('grilled_cheese','Fireside Grilled Cheese','Crispier than it has a right to be.','🧀',
    '{bread,cheese,butter}','{}','everyday',false),
  ('ember_potatoes','Ember Potatoes','Buried, forgotten, perfect.','🥔',
    '{potato,butter}','{cheese,onions}','everyday',false),
  ('berry_mash','Trailside Berry Mash','Half foraging, half dessert.','🫐',
    '{berries,honey}','{graham_cracker}','unusual',false),
  ('sasquatch_smore','Sasquatch S''more','Three marshmallows. Footprint optional.','🦶',
    '{marshmallow,marshmallow,marshmallow,graham_cracker,chocolate,chocolate}','{}','strange',true),
  ('the_wet_sock','The Wet Sock','Someone had to discover it. It was you.','🧦',
    '{sauerkraut,marshmallow}','{}','very_strange',true),
  ('campfire_disaster','Campfire Disaster','Every ingredient made it worse.','💥',
    '{hot_dog,chocolate,marshmallow,cheese}','{}','strange',true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.cabin_events
  (key, name, kind, description, emoji, rarity_weight, eligible_biomes, eligible_seasons,
   eligible_weather, eligible_times, cooldown_hours, reward_item_key, reward_ingredient_key,
   reward_qty, secret) VALUES
  ('strange_pinecone','A Strange Pinecone','discovery','You found a strange pinecone.','🌀',
    0.20, NULL, NULL, NULL, NULL, 48, 'strange_pinecone', NULL, 1, false),
  ('lucky_mushroom','A Lucky Mushroom','discovery','Growing where nothing should.','🍄',
    0.15, NULL, '{spring,autumn}', '{light-rain,heavy-rain,fog,overcast}', NULL, 72,
    'lucky_mushroom', NULL, 1, false),
  ('fallen_feather','A Fallen Feather','discovery','Drifted down from somewhere quiet.','🪶',
    0.18, NULL, NULL, NULL, NULL, 48, 'fallen_feather', NULL, 1, false),
  ('creek_stone','A Creek Stone','discovery','Round as a held breath.','💧',
    0.15, NULL, NULL, NULL, NULL, 48, 'creek_stone', NULL, 1, false),
  ('wild_berry_patch','Wild Berries','discovery','Enough to carry home.','🫐',
    0.12, NULL, '{summer,autumn}', NULL, '{morning,afternoon}', 48, NULL, 'berries', 2, false),
  ('dropped_marshmallow','A Dropped Marshmallow','discovery','Pristine. Suspiciously pristine.','🤍',
    0.08, NULL, NULL, NULL, NULL, 96, NULL, 'marshmallow', 1, false),
  ('meteor','A Meteor','sighting','Something crossed the sky and did not ask permission.','☄️',
    0.02, NULL, NULL, '{clear,partly-cloudy}', '{night}', 168, NULL, NULL, 1, false),
  ('meteor_fragment','Meteor Fragment','keepsake','It landed close. Too close.','🌠',
    0.002, NULL, NULL, '{clear}', '{night}', 8760, 'meteor_fragment', NULL, 1, true),
  ('first_snow','First Snow','keepsake','The season''s first snow, kept.','🌨️',
    0.30, NULL, '{winter}', '{light-snow,heavy-snow}', NULL, 2160, 'snow_globe', NULL, 1, false),
  ('owl_calls','An Owl, Calling','sighting','Twice, then nothing.','🦉',
    0.05, NULL, NULL, NULL, '{night,dusk}', 72, NULL, NULL, 1, false),
  ('unusually_still_deer','An Unusually Still Deer','sighting','It watched you first.','🦌',
    0.015, NULL, NULL, NULL, '{dawn,dusk}', 168, NULL, NULL, 1, true),
  ('strange_light','A Strange Light','sighting','Between the far trees. Gone now.','🔦',
    0.008, NULL, NULL, NULL, '{night}', 336, NULL, NULL, 1, true),
  ('distant_lantern','A Distant Lantern','sighting','Nobody lives out that way.','🏮',
    0.006, NULL, NULL, '{fog,overcast,light-rain}', '{night,dusk}', 336, NULL, NULL, 1, true),
  ('sasquatch_footprint','A Footprint','sighting','One. Only one.','🦶',
    0.005, NULL, NULL, '{light-rain,heavy-rain,fog,light-snow,heavy-snow}',
    '{dawn,dusk,night}', 336, NULL, NULL, 1, true),
  ('sasquatch_treeline','Something at the Treeline','sighting','Tall. Unhurried. Certain you saw it.','🌲',
    0.002, NULL, NULL, NULL, '{dusk,night,dawn}', 720, NULL, NULL, 1, true),
  ('window_knock','A Knock','sighting','From the window side. There is no porch there.','🪟',
    0.001, NULL, NULL, NULL, '{night}', 1440, NULL, NULL, 1, true)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Done. Expected counts for verification:
--   cabin_item_definitions: 53   cabin_ingredient_definitions: 27
--   cabin_recipes: 19            cabin_events: 16
--   policies: cabins 1, defs 1, user_cabin_items 2, placements 1, guestbook 3,
--             notes 3, knocks 1, gifts 1, ingredient defs 1, pantry 1,
--             recipes 1, recipe_book 1, trades 1, trade_items 1, events 1,
--             sightings 1, history 1
-- ----------------------------------------------------------------------------
