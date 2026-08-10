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

const VALID_ANIMAL_TYPES = ["dog", "cat", "rabbit", "bird", "fish", "hamster", "turtle"];

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
    // Auth
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

    // Parse body
    const body = await req.json();
    const { photo_storage_path, pet_name, animal_type, atmosphere } = body;

    if (!photo_storage_path || !pet_name || !animal_type || !atmosphere) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }
    if (!VALID_ANIMAL_TYPES.includes(animal_type)) {
      return new Response(JSON.stringify({ error: "Invalid animal_type" }), { status: 400, headers: corsHeaders });
    }
    if (!ATMOSPHERE_STYLES[atmosphere]) {
      return new Response(JSON.stringify({ error: "Invalid atmosphere" }), { status: 400, headers: corsHeaders });
    }

    // Check Pines+ subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (!subData || subData.length === 0) {
      return new Response(JSON.stringify({
        error: "Pine Pets are a Pines+ feature. Upgrade to bring your pet to life.",
      }), { status: 403, headers: corsHeaders });
    }

    // Rate limit: max 3 generations per day
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("pine_pet_generations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .gte("created_at", todayStart.toISOString());

    const todayCount = count ?? 0;
    if (todayCount >= 3) {
      return new Response(JSON.stringify({
        error: "You've used all your generation attempts for today. Try again tomorrow, or pick from the variations you already have.",
      }), { status: 429, headers: corsHeaders });
    }

    // Download photo from storage
    const { data: photoData, error: photoError } = await supabase.storage
      .from("pine-pets-originals")
      .download(photo_storage_path);

    if (photoError || !photoData) {
      return new Response(JSON.stringify({ error: "Could not download photo" }), { status: 400, headers: corsHeaders });
    }

    const photoBytes = new Uint8Array(await photoData.arrayBuffer());
    const photoBase64 = base64Encode(photoBytes);
    const mimeType = photo_storage_path.endsWith(".png") ? "image/png" : "image/jpeg";

    // Step 1: Claude analysis
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

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
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: photoBase64 },
            },
            {
              type: "text",
              text: `Analyze this photo of a pet ${animal_type}. Return ONLY valid JSON with these fields:
{
  "species": "string",
  "breed": "string (best guess, or 'mixed' if unclear)",
  "coloring": "string (describe coat/feather/scale colors and patterns)",
  "distinctive_features": ["array of notable physical traits"],
  "fur_texture": "string (e.g. short, long, curly, smooth, feathered, scaled)",
  "body_shape": "string (e.g. compact, slender, stocky, round)",
  "size_category": "string (tiny, small, medium, large, extra-large)"
}

If there is no pet visible in the photo, return: {"error": "no_pet_detected"}`,
            },
          ],
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error("Claude API error:", errText);
      return new Response(JSON.stringify({ error: "Pet analysis failed" }), { status: 502, headers: corsHeaders });
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content?.[0]?.text ?? "";

    let analysis: any;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, analysisText];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse Claude response:", analysisText);
      return new Response(JSON.stringify({ error: "Pet analysis returned invalid data" }), { status: 502, headers: corsHeaders });
    }

    if (analysis.error === "no_pet_detected") {
      return new Response(JSON.stringify({
        error: "We couldn't find a pet in that photo. Try a clearer shot?",
      }), { status: 422, headers: corsHeaders });
    }

    // Step 2: Gemini generation (3 variations in parallel)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const styleDesc = ATMOSPHERE_STYLES[atmosphere];
    const illustrationPrompt = `Create an illustrated portrait of a ${analysis.species || animal_type}.
Breed: ${analysis.breed || "unknown"}. Coloring: ${analysis.coloring || "typical"}.
Distinctive features: ${(analysis.distinctive_features || []).join(", ")}.
Fur/texture: ${analysis.fur_texture || "typical"}. Body shape: ${analysis.body_shape || "typical"}. Size: ${analysis.size_category || "medium"}.

Art style: ${styleDesc}

IMPORTANT REQUIREMENTS:
- Transparent background
- Hand-drawn illustrated look, NOT photorealistic
- Cozy woodland/cabin aesthetic
- Relaxed, natural pose (sitting, curled up, or resting)
- Square aspect ratio
- The illustration should feel like it belongs in a storybook about forest cabins`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`;

    const geminiRequests = Array.from({ length: 3 }, () =>
      fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: illustrationPrompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }).then(r => r.json())
    );

    const results = await Promise.allSettled(geminiRequests);
    const timestamp = Date.now();
    const variations: { index: number; preview_url: string; storage_path: string }[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled") {
        console.error(`Variation ${i} failed:`, result.reason);
        continue;
      }

      const parts = result.value?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

      if (!imagePart) {
        console.error(`Variation ${i}: no image in response`);
        continue;
      }

      const imageBytes = Uint8Array.from(atob(imagePart.inlineData.data), c => c.charCodeAt(0));
      const storagePath = `${userId}/${timestamp}_${atmosphere}_v${i + 1}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("pine-pets-sprites")
        .upload(storagePath, imageBytes, { contentType: "image/webp", upsert: true });

      if (uploadError) {
        console.error(`Upload error for variation ${i}:`, uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("pine-pets-sprites")
        .getPublicUrl(storagePath);

      variations.push({
        index: i,
        preview_url: urlData.publicUrl,
        storage_path: storagePath,
      });
    }

    if (variations.length === 0) {
      return new Response(JSON.stringify({ error: "All generation attempts failed. Please try again." }), {
        status: 502, headers: corsHeaders,
      });
    }

    // Log generation attempt
    await supabase.from("pine_pet_generations").insert({
      owner_id: userId,
      attempt_number: todayCount + 1,
      status: "complete",
    });

    const attemptsRemaining = 2 - todayCount; // 3 max, already used todayCount, now using 1 more

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        breed: analysis.breed,
        coloring: analysis.coloring,
        distinctive_features: analysis.distinctive_features,
      },
      variations,
      attempts_remaining: Math.max(0, attemptsRemaining),
      message: `We illustrated your ${analysis.breed || analysis.species || animal_type}! Pick the one that feels most like ${pet_name}.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-pine-pet error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
