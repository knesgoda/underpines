
-- Add is_ambassador column to pine_pets
ALTER TABLE public.pine_pets
ADD COLUMN is_ambassador boolean NOT NULL DEFAULT false;

-- Update the pinned limit trigger to exclude ambassadors
CREATE OR REPLACE FUNCTION public.check_pinned_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  pinned_count integer;
BEGIN
  IF NEW.is_pinned = true AND NEW.is_ambassador = false THEN
    SELECT count(*) INTO pinned_count
    FROM public.pine_pets
    WHERE owner_id = NEW.owner_id
      AND is_pinned = true
      AND is_ambassador = false
      AND id != NEW.id;
    IF pinned_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 pinned pets allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
