import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractMeta(html: string, property: string): string | null {
  // Try og: first, then twitter:, then name=
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PineBot/1.0)",
        Accept: "text/html",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    // Only read first 50KB to keep it fast
    const reader = res.body?.getReader();
    let html = "";
    const decoder = new TextDecoder();
    if (reader) {
      let totalBytes = 0;
      while (totalBytes < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        totalBytes += value.length;
      }
      reader.cancel();
    }

    const ogTitle = extractMeta(html, "og:title") || extractMeta(html, "twitter:title") || extractTitle(html);
    const ogDescription = extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractMeta(html, "description");
    const ogImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");

    // Resolve relative image URLs
    let imageUrl = ogImage;
    if (ogImage && !ogImage.startsWith("http")) {
      try {
        imageUrl = new URL(ogImage, url).href;
      } catch {
        imageUrl = null;
      }
    }

    const domain = new URL(url).hostname.replace(/^www\./, "");

    return new Response(
      JSON.stringify({
        title: ogTitle || null,
        description: ogDescription || null,
        image: imageUrl || null,
        domain,
        url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OG fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch metadata" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
