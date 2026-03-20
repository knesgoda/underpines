import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { reportId } = await req.json();
    if (!reportId) {
      return new Response(JSON.stringify({ error: "reportId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the report
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch reported content
    let contentText = "";
    if (report.reported_post_id) {
      const { data } = await supabase
        .from("posts")
        .select("content, title, post_type")
        .eq("id", report.reported_post_id)
        .single();
      contentText = data ? `[${data.post_type}] ${data.title || ""} ${data.content || ""}` : "Content unavailable";
    } else if (report.reported_camp_post_id) {
      const { data } = await supabase
        .from("camp_posts")
        .select("content, title, post_type")
        .eq("id", report.reported_camp_post_id)
        .single();
      contentText = data ? `[Camp ${data.post_type}] ${data.title || ""} ${data.content || ""}` : "Content unavailable";
    } else if (report.reported_campfire_message_id) {
      const { data } = await supabase
        .from("campfire_messages")
        .select("content, message_type")
        .eq("id", report.reported_campfire_message_id)
        .single();
      contentText = data ? `[Campfire ${data.message_type}] ${data.content || ""}` : "Content unavailable";
    } else if (report.reported_user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, handle")
        .eq("id", report.reported_user_id)
        .single();
      contentText = data ? `[User profile] @${data.handle} "${data.display_name}" Bio: ${data.bio || "none"}` : "Content unavailable";
    }

    // Check if reporter is flagged as serial
    const { data: reporterPattern } = await supabase
      .from("reporter_patterns")
      .select("flagged_as_serial")
      .eq("reporter_id", report.reporter_id)
      .maybeSingle();

    const isSerialReporter = reporterPattern?.flagged_as_serial === true;

    // Call Lovable AI for triage
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: mark as pending_review without AI
      await supabase.from("reports").update({ status: "pending_review" }).eq("id", reportId);
      return new Response(JSON.stringify({ status: "pending_review", ai: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a content moderation assistant for Under Pines, a warm and intentional invite-only social platform. Assess this reported content and recommend an action.

Under Pines values: warmth, trust, safety, authenticity. The community is invite-only and held to a high standard of human decency.

REPORTED CONTENT:
Type: ${report.report_reason}
Reporter context: ${report.reporter_context || "None provided"}
Content: ${contentText}
${isSerialReporter ? "\nNOTE: This reporter has been flagged for a pattern of filing reports that are mostly cleared. Consider downgrading severity by one level." : ""}

Respond in JSON only. No preamble.

{
  "severity": "critical|high|medium|low",
  "category": "string (e.g. harassment, spam, hate_speech, dangerous_content, off_topic, false_report, other)",
  "confidence": 0.0-1.0,
  "recommended_action": "auto_hide|review_urgent|review_today|review_weekly|clear",
  "reasoning": "One sentence explanation",
  "hide_content_immediately": true|false
}

Severity guide:
- critical: CSAM, credible threats, doxxing, calls to violence. Auto-hide + urgent.
- high: Targeted harassment, hate speech, dangerous misinformation. Auto-hide + same day.
- medium: Spam, repeated off-topic, minor violations. Queue for review.
- low: Likely fine, needs context. Monitor only.

When in doubt, escalate severity rather than minimize it.`;

    const aiResponse = await fetch("https://ai.lovable.dev/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      // AI failed, fallback to pending_review
      await supabase.from("reports").update({ status: "pending_review" }).eq("id", reportId);
      return new Response(JSON.stringify({ status: "pending_review", ai: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resultText = aiData.choices?.[0]?.message?.content || "";

    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      await supabase.from("reports").update({ status: "pending_review" }).eq("id", reportId);
      return new Response(JSON.stringify({ status: "pending_review", ai: false, parseError: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update report with AI assessment
    const newStatus = result.recommended_action === "clear" ? "cleared" : "pending_review";
    await supabase
      .from("reports")
      .update({
        ai_severity: result.severity,
        ai_category: result.category,
        ai_confidence: result.confidence,
        ai_recommended_action: result.recommended_action,
        ai_reasoning: result.reasoning,
        status: result.hide_content_immediately ? "auto_hidden" : newStatus,
        content_hidden: result.hide_content_immediately || false,
      })
      .eq("id", reportId);

    // Auto-hide content for critical/high
    if (result.hide_content_immediately || result.severity === "critical" || result.severity === "high") {
      if (report.reported_post_id) {
        await supabase.from("posts").update({ is_published: false }).eq("id", report.reported_post_id);
      }
      if (report.reported_camp_post_id) {
        await supabase.from("camp_posts").update({ is_published: false }).eq("id", report.reported_camp_post_id);
      }
    }

    // Update reporter pattern tracking
    await supabase.rpc("increment_reporter_count", { p_reporter_id: report.reporter_id }).catch(() => {
      // RPC may not exist yet, upsert manually
      supabase
        .from("reporter_patterns")
        .upsert(
          { reporter_id: report.reporter_id, total_reports: 1, last_updated: new Date().toISOString() },
          { onConflict: "reporter_id" }
        )
        .then(() => {});
    });

    // For critical: send urgent notification via email
    if (result.severity === "critical") {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const vapidEmail = Deno.env.get("VAPID_EMAIL");
      if (resendKey && vapidEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Under Pines <alerts@underpines.com>",
            to: [vapidEmail],
            subject: "🔴 Urgent: Critical content report",
            html: `<h2>Critical Content Report</h2>
<p><strong>Severity:</strong> ${result.severity}</p>
<p><strong>Category:</strong> ${result.category}</p>
<p><strong>AI Confidence:</strong> ${Math.round(result.confidence * 100)}%</p>
<p><strong>Reasoning:</strong> ${result.reasoning}</p>
<p><strong>Report ID:</strong> ${reportId}</p>`,
          }),
        }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({ status: newStatus, ai: true, severity: result.severity }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
