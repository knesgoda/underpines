-- Postgres grants EXECUTE to PUBLIC by default, which is what still makes these
-- callable by anon. Revoke from PUBLIC and re-grant explicitly.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Pre-auth landing lookups only
GRANT EXECUTE ON FUNCTION public.get_invite_landing(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_trail_pass_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_invite_rate_limit(uuid, text) TO anon;

-- Trigger bodies and internal helpers: not directly callable by members
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile_invite() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_repeated_messages() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_bonfire_cap() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_new_account_rate() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_validate_placement() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.forbid_audit_mutation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_email_verification() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_transfer_trade_item(public.cabin_trade_items, uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._notify_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public._record_ranger_action(uuid, text, uuid, uuid, text, text, jsonb, jsonb, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_append_history(uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_ensure(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cabin_notify(uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.email_hmac(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_invite_create_circle(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_config() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_invite_maturation_for(uuid) FROM authenticated;