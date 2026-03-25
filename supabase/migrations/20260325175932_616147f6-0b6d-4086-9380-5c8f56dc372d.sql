-- Fix replies SELECT policy to respect post visibility (circle-scoped)
-- The current policy only checks the post exists, not that the user can see it.
-- By joining through the posts table with its own RLS, we inherit circle visibility.

-- Create a security definer function to check post visibility
CREATE OR REPLACE FUNCTION public.can_see_post(_post_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
    AND (
      p.author_id = _user_id
      OR EXISTS (
        SELECT 1 FROM public.circles c
        WHERE c.status = 'accepted'
        AND (
          (c.requester_id = _user_id AND c.requestee_id = p.author_id)
          OR (c.requestee_id = _user_id AND c.requester_id = p.author_id)
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = _user_id AND b.blocked_id = p.author_id)
         OR (b.blocker_id = p.author_id AND b.blocked_id = _user_id)
    )
  )
$$;

DROP POLICY IF EXISTS "Users can read replies on visible posts" ON public.replies;
CREATE POLICY "Users can read replies on visible posts"
ON public.replies
FOR SELECT
TO authenticated
USING (public.can_see_post(post_id, auth.uid()));