ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biome text DEFAULT 'default';