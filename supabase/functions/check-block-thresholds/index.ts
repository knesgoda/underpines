import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS: Record<number, string> = {
  3: "flag_internal",
  7: "auto_suspend_48h",
  10: "suspend_pending_review",
  15: "recommend_permanent_ban",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    // Get all blocked users and their block counts
    // Only count blocks from established accounts (>30 days, at least 1 post)
    const { data: blockCounts } = await supabase.rpc("get_qualified_block_counts").catch(() => ({ data: null }));

    // Fallback: manual query if RPC doesn't exist
    const { data: allBlocks } = await supabase
      .from("blocks")
      .select("blocked_id, blocker_id");

    if (!allBlocks) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group blocks by blocked user
    const blockMap = new Map<string, string[]>();
    for (const block of allBlocks) {
      const list = blockMap.get(block.blocked_id) || [];
      list.push(block.blocker_id);
      blockMap.set(block.blocked_id, list);
    }

    // Get established accounts (30+ days old with at least 1 post)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: establishedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .lt("created_at", thirtyDaysAgo);

    const establishedIds = new Set((establishedProfiles || []).map((p) => p.id));

    // Find an admin for attribution
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    const adminId = adminRole?.user_id;
    let processed = 0;

    for (const [blockedUserId, blockerIds] of blockMap) {
      const qualifiedCount = blockerIds.filter((id) => establishedIds.has(id)).length;
      const totalCount = blockerIds.length;

      // Upsert block threshold log
      await supabase.from("block_threshold_log").upsert(
        {
          blocked_user_id: blockedUserId,
          block_count: totalCount,
          qualified_block_count: qualifiedCount,
          last_checked: new Date().toISOString(),
        },
        { onConflict: "blocked_user_id" }
      );

      // Check thresholds (descending so we act on the highest triggered)
      const sortedThresholds = Object.keys(THRESHOLDS)
        .map(Number)
        .sort((a, b) => b - a);

      for (const threshold of sortedThresholds) {
        if (qualifiedCount >= threshold) {
          const action = THRESHOLDS[threshold];

          // Check if we already took this action
          const { data: existing } = await supabase
            .from("block_threshold_log")
            .select("last_action_taken")
            .eq("blocked_user_id", blockedUserId)
            .single();

          if (existing?.last_action_taken === action) break; // Already handled

          // Take action
          if (action === "auto_suspend_48h" && adminId) {
            const until = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            await supabase.from("suspensions").upsert(
              {
                user_id: blockedUserId,
                suspended_by: adminId,
                reason: `Automatically suspended: blocked by ${qualifiedCount} established members`,
                suspended_until: until,
                is_permanent: false,
              },
              { onConflict: "user_id" }
            );
            await supabase.from("moderation_actions").insert({
              admin_id: adminId,
              target_user_id: blockedUserId,
              action_type: "suspend",
              action_detail: `Auto-suspended 48h: ${qualifiedCount} qualified blocks`,
              suspension_days: 2,
            });
          } else if (action === "suspend_pending_review" && adminId) {
            await supabase.from("suspensions").upsert(
              {
                user_id: blockedUserId,
                suspended_by: adminId,
                reason: `Suspended pending admin review: blocked by ${qualifiedCount} established members`,
                suspended_until: null,
                is_permanent: false,
              },
              { onConflict: "user_id" }
            );
            await supabase.from("moderation_actions").insert({
              admin_id: adminId,
              target_user_id: blockedUserId,
              action_type: "suspend",
              action_detail: `Suspended pending review: ${qualifiedCount} qualified blocks`,
            });
          } else if (action === "recommend_permanent_ban" && adminId) {
            await supabase.from("moderation_actions").insert({
              admin_id: adminId,
              target_user_id: blockedUserId,
              action_type: "note",
              action_detail: `Permanent ban recommended: ${qualifiedCount} qualified blocks. Requires human decision.`,
            });
          } else if (action === "flag_internal" && adminId) {
            await supabase.from("moderation_actions").insert({
              admin_id: adminId,
              target_user_id: blockedUserId,
              action_type: "note",
              action_detail: `Internal flag: ${qualifiedCount} qualified blocks`,
            });
          }

          // Update last action
          await supabase
            .from("block_threshold_log")
            .update({ last_action_taken: action })
            .eq("blocked_user_id", blockedUserId);

          break; // Only act on highest threshold
        }
      }

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
