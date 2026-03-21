-- Enum for animal types
CREATE TYPE public.animal_type AS ENUM ('dog', 'cat', 'rabbit', 'bird', 'fish', 'hamster', 'turtle');

-- Pine Pets table
CREATE TABLE public.pine_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  animal_type public.animal_type NOT NULL,
  original_photo_path text NOT NULL,
  sprite_cache jsonb NOT NULL DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  is_resting boolean NOT NULL DEFAULT false,
  is_memorial boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pine_pets_owner_id ON public.pine_pets(owner_id);
CREATE INDEX idx_pine_pets_owner_pinned ON public.pine_pets(owner_id) WHERE is_pinned = true;

-- Pinned limit trigger (max 3)
CREATE OR REPLACE FUNCTION public.check_pinned_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pinned_count integer;
BEGIN
  IF NEW.is_pinned = true THEN
    SELECT count(*) INTO pinned_count
    FROM public.pine_pets
    WHERE owner_id = NEW.owner_id
      AND is_pinned = true
      AND id != NEW.id;
    IF pinned_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 pinned pets allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_pinned_limit
  BEFORE INSERT OR UPDATE ON public.pine_pets
  FOR EACH ROW EXECUTE FUNCTION public.check_pinned_limit();

-- Updated_at trigger
CREATE TRIGGER trg_pine_pets_updated_at
  BEFORE UPDATE ON public.pine_pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generation tracking table
CREATE TABLE public.pine_pet_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pine_pets(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on pine_pets
ALTER TABLE public.pine_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view pets"
  ON public.pine_pets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert their own pets"
  ON public.pine_pets FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own pets"
  ON public.pine_pets FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own pets"
  ON public.pine_pets FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS on pine_pet_generations
ALTER TABLE public.pine_pet_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own generations"
  ON public.pine_pet_generations FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own generations"
  ON public.pine_pet_generations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('pine-pets-originals', 'pine-pets-originals', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('pine-pets-sprites', 'pine-pets-sprites', true);

-- Storage RLS: originals (private, owner only)
CREATE POLICY "Owners can upload originals"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pine-pets-originals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can view their originals"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pine-pets-originals' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their originals"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pine-pets-originals' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: sprites (public read, owner write)
CREATE POLICY "Anyone can view sprites"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'pine-pets-sprites');

CREATE POLICY "Owners can upload sprites"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pine-pets-sprites' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete sprites"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pine-pets-sprites' AND (storage.foldername(name))[1] = auth.uid()::text);