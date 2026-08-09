-- Data API GRANTs for the Trail Trust tables.
-- This backend does not grant privileges on new public-schema tables by
-- default, so every Data API query against these tables fails with a
-- permission error despite correct RLS. RLS still does all row filtering;
-- these grants only make the tables reachable.
-- Deliberately: nothing to anon, and internal_secrets excluded.

GRANT SELECT ON public.security_config       TO authenticated;
GRANT SELECT ON public.user_lineage          TO authenticated;
GRANT SELECT ON public.user_trust            TO authenticated;
GRANT SELECT ON public.trust_events          TO authenticated;
GRANT SELECT ON public.risk_signals          TO authenticated;
GRANT SELECT ON public.trail_passes          TO authenticated;
GRANT SELECT ON public.invite_allowances     TO authenticated;
GRANT SELECT ON public.moderation_cases      TO authenticated;
GRANT SELECT ON public.account_verifications TO authenticated;
GRANT SELECT ON public.appeals               TO authenticated;
GRANT SELECT ON public.admin_audit_log       TO authenticated;

GRANT INSERT ON public.appeals          TO authenticated;
GRANT UPDATE ON public.moderation_cases TO authenticated;

GRANT ALL ON public.security_config       TO service_role;
GRANT ALL ON public.user_lineage          TO service_role;
GRANT ALL ON public.user_trust            TO service_role;
GRANT ALL ON public.trust_events          TO service_role;
GRANT ALL ON public.risk_signals          TO service_role;
GRANT ALL ON public.trail_passes          TO service_role;
GRANT ALL ON public.invite_allowances     TO service_role;
GRANT ALL ON public.moderation_cases      TO service_role;
GRANT ALL ON public.account_verifications TO service_role;
GRANT ALL ON public.appeals               TO service_role;
GRANT ALL ON public.admin_audit_log       TO service_role;