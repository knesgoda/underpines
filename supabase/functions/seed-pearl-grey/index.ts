import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ATMOSPHERE_STYLES: Record<string, string> = {
  morning_mist: "Soft watercolor style. Pale greens, soft whites, gentle outlines, visible paper texture.",
  deep_woods: "Rich ink style. Deep greens, heavy shadows, cross-hatching, dramatic contrast.",
  golden_hour: "Warm amber wash. Long golden shadows, nostalgic grain, sepia-tinted edges.",
  first_snow: "Clean minimal. Cool blues, clean whites, crisp thin lines, lots of white space.",
  wildfire: "Bold brush strokes. Deep oranges, red-amber palette, high contrast.",
  midnight: "Near-monochrome. Silver edges on dark, starlit highlights, deep indigo-black.",
  bloom: "Soft sketchy. Pinks, lavenders, spring greens, loose pencil lines, floral accents.",
  overcast: "Muted pencil. Gray washes, subdued tones, graphite textures.",
};

const PEARL_GREY_ANALYSIS = {
  breed: "Blue Nose American Bully",
  coloring: "Steel blue-grey coat, lighter silver-grey on face, darker slate across back. Prominent white shield-shaped chest patch extending from throat down between front legs. Small white tips on paws.",
  distinctive_features: [
    "broad blocky head with soft forehead wrinkles",
    "natural rose ears that fold back softly",
    "wide expressive smile",
    "warm round brown eyes",
    "muscular stocky build",
    "tongue often peeking out",
  ],
  fur_texture: "short and smooth with a soft sheen",
  body_shape: "stocky and muscular with a broad chest",
  size_category: "medium-large",
};

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
    // Auth — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const targetAtmospheres = body.atmospheres || Object.keys(ATMOSPHERE_STYLES);

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const results: Record<string, string> = {};

    for (const atmosphere of targetAtmospheres) {
      const styleDesc = ATMOSPHERE_STYLES[atmosphere];
      if (!styleDesc) continue;

      const prompt = `Create an illustrated portrait of a Blue Nose American Bully dog.
Breed: ${PEARL_GREY_ANALYSIS.breed}. Coloring: ${PEARL_GREY_ANALYSIS.coloring}.
Distinctive features: ${PEARL_GREY_ANALYSIS.distinctive_features.join(", ")}.
Fur/texture: ${PEARL_GREY_ANALYSIS.fur_texture}. Body shape: ${PEARL_GREY_ANALYSIS.body_shape}. Size: ${PEARL_GREY_ANALYSIS.size_category}.

Art style: ${styleDesc}

IMPORTANT REQUIREMENTS:
- Transparent background
- Hand-drawn illustrated look, NOT photorealistic
- Cozy woodland/cabin aesthetic
- Relaxed, natural pose — sitting on a cabin porch, happy expression, tongue slightly out, tail wagging
- The dog looks joyful, confident, and deeply friendly — the kind of dog that makes everyone smile
- Square aspect ratio
- The illustration should feel like it belongs in a storybook about forest cabins`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`;

      try {
        const geminiResp = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        });

        const geminiResult = await geminiResp.json();
        const parts = geminiResult?.candidates?.[0]?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

        if (!imagePart) {
          console.error(`No image generated for atmosphere: ${atmosphere}`);
          continue;
        }

        const imageBytes = Uint8Array.from(atob(imagePart.inlineData.data), c => c.charCodeAt(0));
        const storagePath = `ambassador/pearl_grey_${atmosphere}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("pine-pets-sprites")
          .upload(storagePath, imageBytes, { contentType: "image/webp", upsert: true });

        if (uploadError) {
          console.error(`Upload error for ${atmosphere}:`, uploadError);
          continue;
        }

        results[atmosphere] = storagePath;
        console.log(`✓ Generated Pearl Grey sprite for ${atmosphere}`);
      } catch (err) {
        console.error(`Generation failed for ${atmosphere}:`, err);
      }
    }

    // Now seed Pearl Grey for founder accounts
    const founderHandles = ["kebnes", "joyo4"];
    const { data: founders } = await supabase
      .from("profiles")
      .select("id, handle")
      .in("handle", founderHandles);

    const seeded: string[] = [];

    for (const founder of (founders || [])) {
      // Check if Pearl Grey already exists for this user
      const { data: existing } = await supabase
        .from("pine_pets")
        .select("id")
        .eq("owner_id", founder.id)
        .eq("is_ambassador", true)
        .eq("name", "Pearl Grey")
        .maybeSingle();

      if (existing) {
        // Update sprite_cache
        await supabase
          .from("pine_pets")
          .update({ sprite_cache: results })
          .eq("id", existing.id);
        seeded.push(`${founder.handle} (updated)`);
      } else {
        await supabase.from("pine_pets").insert({
          owner_id: founder.id,
          name: "Pearl Grey",
          animal_type: "dog",
          is_ambassador: true,
          is_pinned: true,
          is_resting: false,
          is_memorial: false,
          display_order: -1, // Always first
          sprite_cache: results,
          original_photo_path: "ambassador/pearl_grey_original",
        });
        seeded.push(`${founder.handle} (created)`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sprites_generated: Object.keys(results).length,
      sprite_paths: results,
      seeded_for: seeded,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("seed-pearl-grey error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
