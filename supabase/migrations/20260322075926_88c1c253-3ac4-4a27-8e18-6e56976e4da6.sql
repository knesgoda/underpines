ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hometown text,
  ADD COLUMN IF NOT EXISTS job text,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interests text,
  ADD COLUMN IF NOT EXISTS how_found text,
  ADD COLUMN IF NOT EXISTS sitting_question text;