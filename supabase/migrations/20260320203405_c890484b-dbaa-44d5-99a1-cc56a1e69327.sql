
-- Create cabin_suggestions table
CREATE TABLE public.cabin_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

-- Add constraint for content length
ALTER TABLE public.cabin_suggestions ADD CONSTRAINT cabin_suggestions_content_length CHECK (char_length(content) <= 500);

-- Enable RLS
ALTER TABLE public.cabin_suggestions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert suggestions (not on their own cabin)
CREATE POLICY "Users can insert suggestions"
  ON public.cabin_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND auth.uid() != cabin_owner_id
  );

-- Only admins (founder) can read suggestions
CREATE POLICY "Admins can read suggestions"
  ON public.cabin_suggestions
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Authors can read their own suggestions (for rate limit checks)
CREATE POLICY "Authors can read own suggestions"
  ON public.cabin_suggestions
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());
