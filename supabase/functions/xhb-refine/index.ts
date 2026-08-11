import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();
    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a writing assistant for a startup founders' alignment workspace called XHB.
Your job is to take raw voice-transcribed text and improve it into a clear, professional annotation.

Rules:
- Preserve the original meaning and intent exactly — do NOT add opinions or change the stance
- Fix grammar, punctuation, and sentence structure
- Remove filler words (um, uh, like, you know, so basically)
- Keep the same language as the input (if Arabic, output Arabic; if English, output English; if mixed, keep mixed)
- Make it concise but complete — every important point should remain
- Use professional but conversational tone (this is between co-founders, not a legal document)
- If the text contains a decision or preference, make it clearly stated
- Output ONLY the improved text, nothing else — no preamble, no quotes, no explanation
${context ? `\nContext about this annotation: ${context}` : ""}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ error: err.error?.message || "OpenAI API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const improved = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(
      JSON.stringify({ original: text, improved, model: "gpt-4o-mini" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
