// ============================================================
// XHB Founders' HQ — "Ask XHB" Supabase Edge Function
// Answers questions grounded ONLY in the venture's own record:
// decisions, plan, updates, and stored document text.
//
// Install:
//   1. Save this file as  supabase/functions/ask-xhb/index.ts
//   2. supabase functions deploy ask-xhb
//   3. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// (SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY are provided
//  automatically to edge functions.)
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-4-5"; // adjust to your available model if needed

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return json({ error: "No question provided." }, 400, cors);
    }

    // --- 1. Identify the caller from their JWT
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    const email = userData?.user?.email?.toLowerCase() ?? "";
    if (!email) return json({ error: "Not signed in." }, 401, cors);

    // --- 2. Allowlist check with the service role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: allowed } = await admin.from("allowed_users").select("email");
    if (!(allowed ?? []).some((r) => r.email.toLowerCase() === email)) {
      return json({ error: "Not on the allowlist." }, 403, cors);
    }

    // --- 3. Assemble the venture record (the grounding corpus)
    const [decisions, plan, updates, docs] = await Promise.all([
      admin.from("questions").select("prompt, outcome, decision, decision_owner, resolved_at").eq("status", "resolved"),
      admin.from("plan_items").select("title, detail, phase, status, owner, due"),
      admin.from("updates").select("author_email, body, created_at").order("created_at", { ascending: false }).limit(20),
      admin.from("documents").select("title, kind, status, content"),
    ]);

    const corpus = [
      "## DECISION REGISTER",
      ...(decisions.data ?? []).map((d) => `- [${d.outcome}] ${d.prompt} => ${d.decision} (owner: ${d.decision_owner}; ${d.resolved_at ?? ""})`),
      "\n## PLAN",
      ...(plan.data ?? []).map((p) => `- [${p.phase}/${p.status}] ${p.title} — ${p.detail} (owner: ${p.owner}; due: ${p.due})`),
      "\n## RECENT UPDATES",
      ...(updates.data ?? []).map((u) => `- ${u.created_at?.slice(0, 10)} ${u.author_email}: ${u.body}`),
      "\n## DOCUMENTS",
      ...(docs.data ?? []).map((d) => `- [${d.kind}] ${d.title} — status: ${d.status}${d.content ? "\n  CONTENT: " + d.content.slice(0, 8000) : ""}`),
    ].join("\n").slice(0, 60000);

    // --- 4. Ask the model, XHB-style: grounded, cited, abstains when unsure
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ error: "ANTHROPIC_API_KEY secret is not set." }, 500, cors);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system:
          "You are Ask-XHB, the internal assistant of the XHB founders' HQ (founders: Mulham — concept originator; Momen — co-founder & technical lead). " +
          "Answer ONLY from the venture record provided. Cite which section supports each claim (Decision register / Plan / Updates / Documents). " +
          "If the record does not contain the answer, say plainly: 'Not reliably answerable from the record' and state what is missing — never guess. " +
          "Answer in the language of the question (English or Arabic). Be concise.",
        messages: [{ role: "user", content: "VENTURE RECORD:\n\n" + corpus + "\n\nQUESTION: " + question }],
      }),
    });
    const out = await res.json();
    if (!res.ok) return json({ error: out?.error?.message ?? "Model call failed." }, 500, cors);
    const answer = (out.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
    return json({ answer }, 200, cors);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500, cors);
  }
});

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
