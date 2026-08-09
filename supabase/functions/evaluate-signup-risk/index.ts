// Centralized signup risk evaluation (spec §31-§33).
//
// Called by the client right after account creation, authenticated as the
// new user. All evaluation happens server-side; the client receives only the
// resulting UX state ("nothing" or "additional verification needed") — never
// scores, signals, or thresholds (spec §34).
//
// Everything written here is reconstructible: each signal lands in
// risk_signals with an explanation and the active policy version.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  COMMON_FREEMAIL_DOMAINS,
  emailDomain,
  isDisposableDomain,
  isValidEmailSyntax,
  scoreSignupRisk,
  type RiskSignal,
} from "../_shared/trust-core.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
    const user = userData.user;
    const email = user.email ?? "";

    let turnstileToken: string | null = null;
    try {
      const body = await req.json();
      turnstileToken = body?.turnstile_token ?? null;
    } catch (_) {
      // no body is fine
    }

    // Active security policy (version + config).
    const { data: policyRow } = await supabase
      .from("security_config")
      .select("version, config")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const cfg = (policyRow?.config ?? {}) as Record<string, unknown>;
    const policyVersion = policyRow?.version ?? "unknown";

    const signals: RiskSignal[] = [];
    const domain = emailDomain(email);

    // ---- Email signals -----------------------------------------------------
    if (cfg["EMAIL_RISK_ENABLED"] !== false) {
      if (!isValidEmailSyntax(email)) {
        signals.push({
          type: "EMAIL_INVALID_SYNTAX",
          severity: "high",
          explanation: "Signup email fails basic syntax validation",
        });
      } else {
        const extra = Array.isArray(cfg["disposable_domains"])
          ? (cfg["disposable_domains"] as string[])
          : [];
        if (isDisposableDomain(domain, extra)) {
          signals.push({
            type: "EMAIL_DISPOSABLE_DOMAIN",
            severity: "high",
            confidence: 0.9,
            observed: { domain },
            explanation: `Email domain ${domain} is a known disposable/temporary inbox provider`,
          });
        }

        // Mail capability: does the domain accept mail at all?
        try {
          const mx = await Deno.resolveDns(domain, "MX");
          if (!mx || mx.length === 0) {
            signals.push({
              type: "EMAIL_DOMAIN_NO_MX",
              severity: "medium",
              observed: { domain },
              explanation: `Email domain ${domain} has no MX records`,
            });
          }
        } catch (_dnsErr) {
          // NXDOMAIN or resolver failure — only treat hard NXDOMAIN-ish
          // failures as a signal; resolver hiccups shouldn't punish anyone.
          try {
            await Deno.resolveDns(domain, "A");
          } catch (_aErr) {
            signals.push({
              type: "EMAIL_DOMAIN_UNRESOLVABLE",
              severity: "high",
              observed: { domain },
              explanation: `Email domain ${domain} does not resolve`,
            });
          }
        }

        // Domain velocity: many recent invitations to one obscure domain
        // (spec §24). Mainstream providers are exempt — volume is normal.
        const { count: domainCount } = await supabase
          .from("trail_passes")
          .select("id", { count: "exact", head: true })
          .like("invitee_email_normalized", `%@${domain}`)
          .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
        if ((domainCount ?? 0) >= 10 && !COMMON_FREEMAIL_DOMAINS.has(domain)) {
          signals.push({
            type: "EMAIL_DOMAIN_VELOCITY",
            severity: "medium",
            observed: { domain, invites_last_7d: domainCount },
            explanation: `${domainCount} recent invitations target the uncommon domain ${domain}`,
          });
        }
      }
    }

    // ---- Invitation lineage signals ---------------------------------------
    const { data: lineage } = await supabase
      .from("user_lineage")
      .select("invited_by_user_id, source_kind")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lineage?.invited_by_user_id) {
      const inviterId = lineage.invited_by_user_id;

      const { data: inviterTrust } = await supabase
        .from("user_trust")
        .select("invite_trust_score, moderation_state, risk_level")
        .eq("user_id", inviterId)
        .maybeSingle();

      if (inviterTrust && inviterTrust.invite_trust_score < 50) {
        signals.push({
          type: "INVITER_LOW_INVITE_TRUST",
          severity: "medium",
          explanation: "The inviter's invitation history shows repeated problems",
        });
      }
      if (inviterTrust && ["HIGH", "CRITICAL"].includes(inviterTrust.risk_level)) {
        signals.push({
          type: "INVITER_HIGH_RISK",
          severity: "high",
          explanation: "The inviting account is itself under high-risk review",
        });
      }

      // Sibling health: how many accounts from this same inviter are
      // suspended or banned?
      const { data: siblings } = await supabase
        .from("user_lineage")
        .select("user_id")
        .eq("invited_by_user_id", inviterId)
        .neq("user_id", user.id);
      if (siblings && siblings.length > 0) {
        const { count: badSiblings } = await supabase
          .from("user_trust")
          .select("user_id", { count: "exact", head: true })
          .in("user_id", siblings.map((s) => s.user_id))
          .in("moderation_state", ["SUSPENDED", "BANNED"]);
        if ((badSiblings ?? 0) >= 2) {
          signals.push({
            type: "LINEAGE_SIBLING_BANS",
            severity: "high",
            observed: { suspended_or_banned_siblings: badSiblings },
            explanation: `${badSiblings} other accounts invited by the same person were suspended or banned`,
          });
        }
      }
    } else if (lineage?.source_kind === "root_link") {
      signals.push({
        type: "ROOT_LINK_SIGNUP",
        severity: "low",
        explanation: "Account joined through the open root link rather than a personal invitation",
      });
    }

    // ---- Challenge signals -------------------------------------------------
    if (cfg["TURNSTILE_ENABLED"] === true) {
      const remoteIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
      const turnstile = await verifyTurnstile(turnstileToken, remoteIp);
      if (turnstile.configured && !turnstile.success) {
        if (turnstile.errorCodes.includes("provider-unreachable")) {
          // Fail safe, not closed (spec §120): provider outage is logged as a
          // low signal, never a lockout.
          signals.push({
            type: "CHALLENGE_PROVIDER_UNAVAILABLE",
            severity: "low",
            explanation: "Bot challenge provider was unreachable during signup",
          });
        } else {
          signals.push({
            type: "CHALLENGE_FAILED",
            severity: "high",
            observed: { error_codes: turnstile.errorCodes },
            explanation: "Signup bot challenge was missing or failed server-side validation",
          });
        }
      }
    }

    // ---- Score + persist ---------------------------------------------------
    const thresholds = {
      phoneStepUpScore: Number(cfg["risk_phone_stepup_score"] ?? 60),
      reviewScore: Number(cfg["risk_review_score"] ?? 80),
      rejectScore: Number(cfg["risk_reject_score"] ?? 95),
    };
    const assessment = scoreSignupRisk(signals, thresholds);

    let caseId: string | null = null;
    if (["HIGH", "CRITICAL"].includes(assessment.level)) {
      const { data: existingCase } = await supabase
        .from("moderation_cases")
        .select("id")
        .eq("subject_user_id", user.id)
        .neq("status", "CLOSED")
        .in("case_type", ["BOT_SUSPECTED", "SPAM"])
        .limit(1)
        .maybeSingle();
      if (existingCase) {
        caseId = existingCase.id;
      } else {
        const { data: newCase } = await supabase
          .from("moderation_cases")
          .insert({
            case_type: "BOT_SUSPECTED",
            subject_user_id: user.id,
            status: "NEW",
            priority: assessment.level === "CRITICAL" ? "HIGH" : "MEDIUM",
            summary: "Elevated signup risk detected automatically",
            risk_score_at_creation: assessment.score,
            auto_generated: true,
          })
          .select("id")
          .single();
        caseId = newCase?.id ?? null;
      }
    }

    if (signals.length > 0) {
      await supabase.from("risk_signals").insert(
        signals.map((s) => ({
          user_id: user.id,
          signal_type: s.type,
          severity: s.severity,
          confidence: s.confidence ?? null,
          observed_value: s.observed ?? null,
          explanation: s.explanation,
          source: "signup",
          case_id: caseId,
          policy_version: policyVersion,
          // Signup-time signals fade: they should not haunt an account
          // forever (spec §89).
          expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
        })),
      );
    }

    await supabase
      .from("user_trust")
      .update({
        risk_level: assessment.level,
        risk_updated_at: new Date().toISOString(),
        policy_version: policyVersion,
      })
      .eq("user_id", user.id);

    // Phone step-up (spec §27): only when the flag is on AND risk warrants it.
    let nextStep: "none" | "verify_phone" = "none";
    if (
      cfg["PHONE_STEP_UP_ENABLED"] === true &&
      assessment.score >= thresholds.phoneStepUpScore
    ) {
      nextStep = "verify_phone";
      await supabase
        .from("account_verifications")
        .upsert(
          { user_id: user.id, reverification_required_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      await supabase
        .from("user_trust")
        .update({ moderation_state: "VERIFICATION_REQUIRED" })
        .eq("user_id", user.id)
        .eq("moderation_state", "NONE");
    }

    // Automated trail freeze (spec §40): containment only — the inviter's
    // account keeps working, a case is opened, and the action is audited.
    if (cfg["AUTO_TRAIL_FREEZE_ENABLED"] === true && lineage?.invited_by_user_id) {
      const inviterId = lineage.invited_by_user_id;
      const minSuspicious = Number(cfg["auto_freeze_min_suspicious_descendants"] ?? 3);

      const { data: descendants } = await supabase
        .from("user_lineage")
        .select("user_id")
        .eq("invited_by_user_id", inviterId);
      if (descendants && descendants.length >= minSuspicious) {
        const { count: suspicious } = await supabase
          .from("user_trust")
          .select("user_id", { count: "exact", head: true })
          .in("user_id", descendants.map((d) => d.user_id))
          .in("risk_level", ["HIGH", "CRITICAL"]);

        if ((suspicious ?? 0) >= minSuspicious) {
          const { data: allowance } = await supabase
            .from("invite_allowances")
            .select("invites_frozen_at")
            .eq("user_id", inviterId)
            .maybeSingle();

          if (allowance && !allowance.invites_frozen_at) {
            await supabase
              .from("invite_allowances")
              .update({
                invites_frozen_at: new Date().toISOString(),
                frozen_reason_code: "AUTO_SUSPICIOUS_DESCENDANTS",
              })
              .eq("user_id", inviterId);
            await supabase
              .from("trail_passes")
              .update({ status: "PAUSED", paused_at: new Date().toISOString() })
              .eq("inviter_user_id", inviterId)
              .eq("status", "PENDING");
            const { data: freezeCase } = await supabase
              .from("moderation_cases")
              .insert({
                case_type: "INVITE_ABUSE",
                subject_user_id: inviterId,
                status: "NEW",
                priority: "HIGH",
                summary: `Invitations frozen automatically: ${suspicious} recent invitees show high-risk signals`,
                auto_generated: true,
              })
              .select("id")
              .single();
            await supabase.from("admin_audit_log").insert({
              actor_admin_id: null, // system action
              action_type: "auto_freeze_invites",
              target_type: "user",
              target_id: inviterId,
              case_id: freezeCase?.id ?? null,
              reason_code: "AUTO_SUSPICIOUS_DESCENDANTS",
              after_state: { invites_frozen: true, suspicious_descendants: suspicious },
            });
            await supabase.from("notifications").insert({
              recipient_id: inviterId,
              notification_type: "system",
            });
          }
        }
      }
    }

    // Client gets UX state only — no scores, signals, or thresholds.
    return jsonResponse({ status: "ok", next: nextStep });
  } catch (err) {
    console.error("evaluate-signup-risk error:", err);
    // Risk service failure must not reject the user (spec §120).
    return jsonResponse({ status: "ok", next: "none" });
  }
});
