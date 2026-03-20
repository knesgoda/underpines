-- Security definer function to create bidirectional circle on invite acceptance
CREATE OR REPLACE FUNCTION public.accept_invite_create_circle(_invite_id uuid, _new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id uuid;
BEGIN
  -- Get the inviter from the invite
  SELECT inviter_id INTO v_inviter_id
  FROM public.invites
  WHERE id = _invite_id;

  IF v_inviter_id IS NULL THEN
    RETURN; -- No valid invite, skip silently
  END IF;

  -- Don't circle yourself
  IF v_inviter_id = _new_user_id THEN
    RETURN;
  END IF;

  -- Create bidirectional circle relationship (status = 'accepted', skip if exists)
  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (v_inviter_id, _new_user_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (_new_user_id, v_inviter_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;
END;
$$;