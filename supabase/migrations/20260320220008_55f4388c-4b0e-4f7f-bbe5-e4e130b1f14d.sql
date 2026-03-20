-- Create a function that returns a random creature from the 24 available
CREATE OR REPLACE FUNCTION public.random_creature()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT key FROM (
    VALUES 
      ('red-fox'), ('barn-owl'), ('white-tailed-deer'), ('black-bear'),
      ('river-otter'), ('great-horned-owl'), ('gray-wolf'), ('raccoon'),
      ('snowshoe-hare'), ('bobcat'), ('moose'), ('mountain-lion'),
      ('sasquatch'), ('puckwudgie'), ('loch-ness-monster'), ('banshee'),
      ('witch'), ('ghost'), ('mothman'), ('wendigo'),
      ('black-dog'), ('will-o-the-wisp'), ('jackalope'), ('selkie')
  ) AS creatures(key)
  ORDER BY random()
  LIMIT 1;
$$;

-- Change the default on the column to use the random function
ALTER TABLE public.profiles 
  ALTER COLUMN default_avatar_key SET DEFAULT public.random_creature();

-- Update the handle_new_user trigger to also set a random creature
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, handle, display_name, default_avatar_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Arrival'),
    public.random_creature()
  );
  RETURN NEW;
END;
$function$;

-- Reassign existing users who all have red-fox
UPDATE public.profiles
SET default_avatar_key = public.random_creature()
WHERE default_avatar_key = 'red-fox';