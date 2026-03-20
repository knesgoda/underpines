-- Fix search_path on random_creature function
CREATE OR REPLACE FUNCTION public.random_creature()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public'
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