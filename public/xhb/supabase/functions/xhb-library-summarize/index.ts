import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, filename } = await req.json();
    if (!text || text.trim().length < 20) {
      return new Response(JSON.stringify({ title: filename || "Untitled", summary: "Document too short for AI summary." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to ~4000 chars for cost efficiency
    const truncated = text.substring(0, 4000);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You are a document librarian for XHB, a venture studio. Given the text extracted from a PDF document, produce:
1. A short, descriptive title (max 10 words, no quotes)
2. A concise summary (2-3 sentences, max 80 words)

Respond in JSON: {"title": "...", "summary": "..."}

If the document is in Arabic, respond in Arabic. If mixed, use the dominant language.`
          },
          {
            role: "user",
            content: `Filename: ${filename || "unknown.pdf"}\n\nExtracted text:\n${truncated}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!completion.ok) {
      const err = await completion.text();
      console.error("OpenAI error:", err);
      return new Response(JSON.stringify({ title: filename || "Untitled", summary: "AI summary unavailable." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await completion.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({
      title: parsed.title || filename || "Untitled",
      summary: parsed.summary || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
