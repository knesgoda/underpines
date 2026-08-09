-- ============================================================================
-- Table-level grants for the Human Trust tables.
--
-- This backend does not grant privileges on newly created public tables by
-- default, and the Data API checks table privileges before RLS — so without
-- these GRANTs every read/write against the new tables fails with a
-- permission error even though the RLS policies are correct. (The same gap
-- was observed when the phase 2/3 tables were applied.)
--
-- RLS remains the authority on which ROWS are visible; these grants only
-- open the table to the policy check. anon gets nothing: the only
-- pre-authentication surface is the get_trail_pass_status() RPC, which is
-- SECURITY DEFINER. internal_secrets is deliberately excluded — it must stay
-- reachable only from definer functions and the service role.
-- ============================================================================

GRANT SELECT ON public.trail_passes TO authenticated;
GRANT SELECT ON public.invite_allowances TO authenticated;
GRANT SELECT ON public.user_lineage TO authenticated;
GRANT SELECT ON public.user_trust TO authenticated;
GRANT SELECT ON public.trust_events TO authenticated;
GRANT SELECT ON public.risk_signals TO authenticated;
-- Rangers triage/assign cases directly under the "Rangers can update cases"
-- policy; enforcement actions still go through the audited RPCs.
GRANT SELECT, UPDATE ON public.moderation_cases TO authenticated;
GRANT SELECT ON public.account_verifications TO authenticated;
-- Users file their own appeals under the "Users can file their own appeals"
-- policy; review happens through ranger_review_appeal().
GRANT SELECT, INSERT ON public.appeals TO authenticated;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT SELECT ON public.security_config TO authenticated;
