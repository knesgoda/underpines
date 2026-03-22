
-- Trigger function: enforce 150-participant cap on bonfire campfires.
-- If at cap, find or create a sub-group bonfire and redirect the insert.
CREATE OR REPLACE FUNCTION public.enforce_bonfire_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _campfire_type text;
  _camp_id uuid;
  _parent_id uuid;
  _participant_count integer;
  _sub_bonfire_id uuid;
  _bonfire_name text;
BEGIN
  -- Look up the campfire being joined
  SELECT campfire_type, camp_id, bonfire_sub_group_of, name
  INTO _campfire_type, _camp_id, _parent_id, _bonfire_name
  FROM public.campfires
  WHERE id = NEW.campfire_id;

  -- Only enforce on bonfire-type campfires
  IF _campfire_type != 'bonfire' THEN
    RETURN NEW;
  END IF;

  -- Count current participants
  SELECT count(*) INTO _participant_count
  FROM public.campfire_participants
  WHERE campfire_id = NEW.campfire_id;

  -- If under cap, allow
  IF _participant_count < 150 THEN
    RETURN NEW;
  END IF;

  -- At cap: find an existing sub-group with room
  SELECT cf.id INTO _sub_bonfire_id
  FROM public.campfires cf
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.campfire_participants cp WHERE cp.campfire_id = cf.id
  ) pc ON true
  WHERE cf.bonfire_sub_group_of = COALESCE(_parent_id, NEW.campfire_id)
    AND cf.campfire_type = 'bonfire'
    AND pc.cnt < 150
  ORDER BY pc.cnt ASC
  LIMIT 1;

  -- If no sub-group with room, create one
  IF _sub_bonfire_id IS NULL THEN
    INSERT INTO public.campfires (
      campfire_type, camp_id, bonfire_sub_group_of, name, firekeeper_id, is_active
    ) VALUES (
      'bonfire',
      _camp_id,
      COALESCE(_parent_id, NEW.campfire_id),
      COALESCE(_bonfire_name, 'Bonfire') || ' (Group 2)',
      (SELECT firekeeper_id FROM public.campfires WHERE id = COALESCE(_parent_id, NEW.campfire_id)),
      true
    )
    RETURNING id INTO _sub_bonfire_id;
  END IF;

  -- Redirect the participant to the sub-group
  NEW.campfire_id := _sub_bonfire_id;
  RETURN NEW;
END;
$function$;

-- Attach trigger BEFORE INSERT on campfire_participants
CREATE TRIGGER trg_enforce_bonfire_cap
  BEFORE INSERT ON public.campfire_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bonfire_cap();
