import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ANIMAL_TYPES = ["dog", "cat", "rabbit", "bird", "fish", "hamster", "turtle"];

const OFFENSIVE_PATTERNS = [
  /\bass\b/i, /\bfuck/i, /\bshit/i, /\bdamn/i, /\bbitch/i, /\bcunt/i,
  /\bdick\b/i, /\bcock\b/i, /\bnigger/i, /\bnigga/i, /\bfagg/i,
  /\bretard/i, /\bslut/i, /\bwhore/i, /\bkill/i, /\bdeath/i,
  /\bhitler/i, /\bnazi/i, /\bkike/i, /\bspic\b/i, /\bchink/i,
];

function isOffensiveName(name: string): boolean {
  return OFFENSIVE_PATTERNS.some(p => p.test(name));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { pet_name, animal_type, selected_sprite_path, original_photo_path, atmosphere } = body;

    // Validate inputs
    if (!pet_name || !animal_type || !selected_sprite_path || !original_photo_path || !atmosphere) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }
    if (!VALID_ANIMAL_TYPES.includes(animal_type)) {
      return new Response(JSON.stringify({ error: "Invalid animal_type" }), { status: 400, headers: corsHeaders });
    }

    // Validate pet name
    const trimmedName = pet_name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return new Response(JSON.stringify({ error: "Pet name must be 1-50 characters" }), { status: 422, headers: corsHeaders });
    }
    if (isOffensiveName(trimmedName)) {
      return new Response(JSON.stringify({ error: "That name won't work here. Try another?" }), { status: 422, headers: corsHeaders });
    }

    // Count existing pets for display_order
    const { count: petCount } = await supabase
      .from("pine_pets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId);

    const displayOrder = petCount ?? 0;

    // Count pinned pets to decide auto-pin
    const { count: pinnedCount } = await supabase
      .from("pine_pets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("is_pinned", true);

    const shouldPin = (pinnedCount ?? 0) < 3;

    // Build sprite_cache
    const spriteCache: Record<string, string> = { [atmosphere]: selected_sprite_path };

    // Insert pet
    const { data: pet, error: insertError } = await supabase
      .from("pine_pets")
      .insert({
        owner_id: userId,
        name: trimmedName,
        animal_type,
        original_photo_path,
        sprite_cache: spriteCache,
        is_pinned: shouldPin,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create pet" }), { status: 500, headers: corsHeaders });
    }

    // Get public URL for sprite
    const { data: urlData } = supabase.storage
      .from("pine-pets-sprites")
      .getPublicUrl(selected_sprite_path);

    return new Response(JSON.stringify({
      success: true,
      pet: {
        id: pet.id,
        name: pet.name,
        animal_type: pet.animal_type,
        is_pinned: pet.is_pinned,
        atmosphere,
        sprite_url: urlData.publicUrl,
      },
      message: `${trimmedName} has arrived at your Cabin.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("finalize-pine-pet error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
