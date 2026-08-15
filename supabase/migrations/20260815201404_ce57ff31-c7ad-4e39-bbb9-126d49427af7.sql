ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS place_name text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS place_lat numeric,
  ADD COLUMN IF NOT EXISTS place_lng numeric;

ALTER TABLE public.camp_posts
  ADD COLUMN IF NOT EXISTS place_name text,
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS place_lat numeric,
  ADD COLUMN IF NOT EXISTS place_lng numeric;

-- Clients render places; they never write them. Revoke the new columns from
-- direct UPDATE so every place write goes through attach_post_place().
REVOKE UPDATE (place_name, place_id, place_lat, place_lng) ON public.posts FROM authenticated;
REVOKE UPDATE (place_name, place_id, place_lat, place_lng) ON public.camp_posts FROM authenticated;
REVOKE INSERT (place_name, place_id, place_lat, place_lng) ON public.posts FROM authenticated;
REVOKE INSERT (place_name, place_id, place_lat, place_lng) ON public.camp_posts FROM authenticated;

CREATE OR REPLACE FUNCTION public.attach_post_place(
  _post_id uuid,
  _place_name text,
  _place_id text,
  _lat numeric,
  _lng numeric,
  _is_camp_post boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _lat_r numeric;
  _lng_r numeric;
  _owner uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;

  _name := btrim(coalesce(_place_name, ''));
  IF _name = '' OR length(_name) > 160 THEN
    RAISE EXCEPTION 'place name must be 1-160 characters' USING ERRCODE = '22023';
  END IF;

  IF _lat IS NULL OR _lng IS NULL
     OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN
    RAISE EXCEPTION 'coordinates out of range' USING ERRCODE = '22023';
  END IF;

  -- ~100m of precision: a place, never a doorstep.
  _lat_r := round(_lat, 3);
  _lng_r := round(_lng, 3);

  IF _is_camp_post THEN
    SELECT author_id INTO _owner FROM camp_posts WHERE id = _post_id;
  ELSE
    SELECT author_id INTO _owner FROM posts WHERE id = _post_id;
  END IF;

  IF _owner IS NULL OR _owner <> _uid THEN
    RAISE EXCEPTION 'not your post' USING ERRCODE = '42501';
  END IF;

  IF _is_camp_post THEN
    UPDATE camp_posts
       SET place_name = _name,
           place_id = nullif(btrim(coalesce(_place_id, '')), ''),
           place_lat = _lat_r,
           place_lng = _lng_r
     WHERE id = _post_id;
  ELSE
    UPDATE posts
       SET place_name = _name,
           place_id = nullif(btrim(coalesce(_place_id, '')), ''),
           place_lat = _lat_r,
           place_lng = _lng_r
     WHERE id = _post_id;
  END IF;

  -- Reuse a nearby pin rather than stacking duplicates.
  IF NOT EXISTS (
    SELECT 1 FROM trail_map_pins
     WHERE user_id = _uid
       AND pin_type = 'been-here'
       AND abs(lat - _lat_r) < 0.005
       AND abs(lng - _lng_r) < 0.005
  ) THEN
    INSERT INTO trail_map_pins (user_id, pin_type, lat, lng, note)
    VALUES (_uid, 'been-here', _lat_r, _lng_r, _name);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_post_place(uuid, text, text, numeric, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_post_place(uuid, text, text, numeric, numeric, boolean) TO authenticated;