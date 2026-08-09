ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS is_root boolean NOT NULL DEFAULT false;

-- Root invites must not auto-create a Circle with the link owner
CREATE OR REPLACE FUNCTION public.accept_invite_create_circle(_invite_id uuid, _new_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id uuid;
  v_is_root boolean;
BEGIN
  SELECT inviter_id, is_root INTO v_inviter_id, v_is_root
  FROM public.invites
  WHERE id = _invite_id;

  IF v_inviter_id IS NULL OR v_is_root THEN
    RETURN;
  END IF;

  IF v_inviter_id = _new_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (v_inviter_id, _new_user_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.circles (requester_id, requestee_id, status, created_at, updated_at)
  VALUES (_new_user_id, v_inviter_id, 'accepted', now(), now())
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Create the open signup link, owned by an admin/founder account
INSERT INTO public.invites (inviter_id, slug, uses_remaining, uses_total, is_infinite, is_active, is_root)
SELECT ur.user_id, 'open-trail', 999999, 999999, true, true, true
FROM public.user_roles ur
WHERE ur.role::text IN ('founder', 'admin')
ORDER BY ur.role::text
LIMIT 1
ON CONFLICT DO NOTHING;