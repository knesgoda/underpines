import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = userData.user.id;

    const { pet_id, target_atmosphere } = await req.json();
    if (!pet_id || !target_atmosphere) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }
    if (!ATMOSPHERE_STYLES[target_atmosphere]) {
      return new Response(JSON.stringify({ error: "Invalid atmosphere" }), { status: 400, headers: corsHeaders });
    }

    // Fetch pet, must belong to user
    const { data: pet, error: petError } = await supabase
      .from("pine_pets")
      .select("*")
      .eq("id", pet_id)
      .eq("owner_id", userId)
      .single();

    if (petError || !pet) {
      return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404, headers: corsHeaders });
    }

    const spriteCache = (pet.sprite_cache as Record<string, string>) || {};

    // Check cache
    if (spriteCache[target_atmosphere]) {
      const { data: urlData } = supabase.storage
        .from("pine-pets-sprites")
        .getPublicUrl(spriteCache[target_atmosphere]);

      return new Response(JSON.stringify({
        success: true,
        cached: true,
        sprite_url: urlData.publicUrl,
        message: `${pet.name} looks right at home.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Not cached — generate new sprite
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!anthropicKey || !geminiKey) {
      return new Response(JSON.stringify({ error: "API keys not configured" }), { status: 500, headers: corsHeaders });
    }

    // Download original photo
    const { data: photoData, error: photoError } = await supabase.storage
      .from("pine-pets-originals")
      .download(pet.original_photo_path);

    if (photoError || !photoData) {
      return new Response(JSON.stringify({ error: "Could not download original photo" }), { status: 500, headers: corsHeaders });
    }

    const photoBytes = new Uint8Array(await photoData.arrayBuffer());
    const photoBase64 = base64Encode(photoBytes);
    const mimeType = pet.original_photo_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // Claude analysis
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: photoBase64 } },
            {
              type: "text",
              text: `Analyze this pet ${pet.animal_type}. Return ONLY valid JSON: {"species":"","breed":"","coloring":"","distinctive_features":[],"fur_texture":"","body_shape":"","size_category":""}. If no pet visible: {"error":"no_pet_detected"}`,
            },
          ],
        }],
      }),
    });

    if (!claudeResponse.ok) {
      console.error("Claude error:", await claudeResponse.text());
      return new Response(JSON.stringify({ error: "Pet analysis failed" }), { status: 502, headers: corsHeaders });
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content?.[0]?.text ?? "";
    let analysis: any;
    try {
      const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, analysisText];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Parse error:", analysisText);
      return new Response(JSON.stringify({ error: "Analysis parse failed" }), { status: 502, headers: corsHeaders });
    }

    if (analysis.error === "no_pet_detected") {
      return new Response(JSON.stringify({ error: "Could not detect pet in original photo" }), { status: 422, headers: corsHeaders });
    }

    // Gemini generation
    const styleDesc = ATMOSPHERE_STYLES[target_atmosphere];
    const prompt = `Create an illustrated portrait of a ${analysis.species || pet.animal_type}.
Breed: ${analysis.breed || "unknown"}. Coloring: ${analysis.coloring || "typical"}.
Distinctive features: ${(analysis.distinctive_features || []).join(", ")}.
Fur/texture: ${analysis.fur_texture || "typical"}. Body shape: ${analysis.body_shape || "typical"}. Size: ${analysis.size_category || "medium"}.

Art style: ${styleDesc}

IMPORTANT: Transparent background. Hand-drawn illustrated look, NOT photorealistic. Cozy woodland/cabin aesthetic. Relaxed natural pose. Square aspect ratio.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });

    if (!geminiResponse.ok) {
      console.error("Gemini error:", await geminiResponse.text());
      return new Response(JSON.stringify({ error: "Illustration generation failed" }), { status: 502, headers: corsHeaders });
    }

    const geminiResult = await geminiResponse.json();
    const parts = geminiResult?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart) {
      return new Response(JSON.stringify({ error: "No image generated" }), { status: 502, headers: corsHeaders });
    }

    const imageBytes = Uint8Array.from(atob(imagePart.inlineData.data), c => c.charCodeAt(0));
    const storagePath = `${userId}/${pet_id}_${target_atmosphere}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("pine-pets-sprites")
      .upload(storagePath, imageBytes, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to store sprite" }), { status: 500, headers: corsHeaders });
    }

    // Update sprite_cache
    spriteCache[target_atmosphere] = storagePath;
    await supabase
      .from("pine_pets")
      .update({ sprite_cache: spriteCache })
      .eq("id", pet_id);

    const { data: urlData } = supabase.storage
      .from("pine-pets-sprites")
      .getPublicUrl(storagePath);

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      sprite_url: urlData.publicUrl,
      message: `${pet.name} looks right at home.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("regenerate-pine-pet-atmosphere error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
