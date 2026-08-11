# XHB Founders' HQ — Deploy Guide (momencrafts.com)

**v2** — the page is now a full founders' HQ: **Vision · Plan · Q&A sessions · Decision register · Updates · Documents (incl. legal drafts with approvals) · Podcast (background player) · Ask XHB**, plus the **nudge** flow to push a session to Mulham (in-app banner + WhatsApp/email share).

One page, no build step. It matches your existing stack: static HTML on Vercel + Supabase behind it.

## What you have

| File | Purpose |
|---|---|
| `index.html` | The whole app — XHB-branded, single file, works in demo mode immediately |
| `supabase_setup_v2.sql` | All tables + row-level security (sealed answers enforced in the database; safe to run fresh or on top of v1) |
| `ask-xhb-function.ts` | Optional edge function powering the Ask-XHB tab |
| `DEPLOY_GUIDE.md` | This file |

Open `index.html` in a browser right now — it runs in **demo mode** with sample data so you and Mulham can see every area before wiring anything.

## Go live in ~15 minutes

### 1 · Supabase (5 min)
1. Open your Supabase project (or create one — the free tier is plenty for two users).
2. SQL Editor → paste `supabase_setup_v2.sql` → **first edit `MULHAM_EMAIL_HERE` to his real email** → Run.
3. Authentication → Providers → make sure **Email** is enabled (magic link is the default).
4. Authentication → URL Configuration → add the app's future URL(s) to the redirect allowlist:
   - `https://momencrafts.com/xhb/`
   - `https://xhb.momencrafts.com` (if you do the subdomain, step 3)
5. Project Settings → API → copy the **Project URL** and **anon public key**.

### 2 · Configure and deploy (5 min)
1. In `index.html`, fill the `CONFIG` block at the top of the `<script>`:
   ```js
   const CONFIG = {
     SUPABASE_URL: "https://YOURPROJECT.supabase.co",
     SUPABASE_ANON_KEY: "eyJ...",
   };
   ```
   (The anon key is designed to be public — security comes from the RLS policies in the SQL file.)
2. In your `momencrafts` repo, create a folder `xhb/` and drop `index.html` into it.
3. Commit + push. Vercel deploys it automatically → live at **momencrafts.com/xhb/**.

That's a complete, working setup. The subdomain is optional polish:

### 3 · Optional: xhb.momencrafts.com (5 min)
1. Vercel → your project → Settings → Domains → add `xhb.momencrafts.com` (Vercel tells you the DNS record; usually a CNAME to `cname.vercel-dns.com`).
2. Route the subdomain to the folder — add this to your `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/:path*",
         "has": [{ "type": "host", "value": "xhb.momencrafts.com" }],
         "destination": "/xhb/:path*"
       }
     ]
   }
   ```
   (Merge with your existing `vercel.json` keys — don't replace the file if it already has config for cliniq/rogerai routing.)

### 4 · First run
1. Both of you open the URL, enter your emails, click the magic link from your inbox.
2. Anyone not in `allowed_users` can sign in to Supabase but **sees nothing** — every table is gated by the allowlist.
3. Create the first session from the **Founding & Equity** template and start answering.

## How the sealed flow works
1. A question starts **Sealed** — each of you writes independently; neither can see the other's text (enforced by database policy, not just the interface).
2. When both answers are in, **Reveal** unlocks. After reveal, answers freeze (no quiet edits).
3. Discuss, then log the outcome: **Decided**, **Aligned as-is**, or **Divergent — parked**.
4. The **Decision log** tab collects everything and exports to Markdown — paste it straight into your governance documents / the Part III checklist.

This is deliberately the same discipline as XHB's own dual-track sealed review — you're aligning with the method the product is built on.

## The nudge flow ("push to Mulham")
In any session, **Push to Mulham →** opens a prefilled message. "Send nudge" stores it in-app — Mulham sees a banner the next time he opens the HQ, with an "Open session" button. The WhatsApp / Email buttons open a share with the same message plus the link, so you can reach him where he actually is. Nudges disappear when marked Done.

## Legal drafts & approvals
The Documents tab has a **Legal collaboration drafts** group (seeded with the MOU, the Phase 1 SOW, and the future founders' agreement). Each founder can press **Approve this draft** — both approvals show side by side with dates. This records in-app agreement between the two of you; it is a tracking step, **not** an electronic signature — sign the reviewed document itself.

## Podcast (background player)
Add an episode with a direct audio URL (`.mp3`/`.m4a`) and press ▶ — the docked player keeps playing while you move between tabs. Easiest hosting: Supabase Storage → create a public bucket `podcast` → upload MP3 → copy the public URL. Fun starting point: generate audio overviews of the deck and the remaster (NotebookLM-style tools do this well) so you have a founder podcast about your own venture.

## Ask-XHB (optional, 10 min)
1. In your repo: save `ask-xhb-function.ts` as `supabase/functions/ask-xhb/index.ts`.
2. `supabase functions deploy ask-xhb`
3. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (get a key from console.anthropic.com; usage is pay-per-call).
4. Done — the Ask XHB tab now answers from your decision register, plan, updates, and any document text you paste into the `documents.content` column. It cites its sections and answers "Not reliably answerable from the record" rather than guessing — the XHB rule, applied to XHB itself.

Privacy note: questions and the venture record are sent to the model API when you use this tab. Keep anything you consider too sensitive out of `documents.content`.

## Notes
- **Arabic-friendly:** all inputs and answers use `dir="auto"` — Mulham can answer in Arabic, you in English, and both render correctly. Ask-XHB replies in the language of the question.
- **Realtime:** both browsers refresh live during a call (Supabase realtime; the SQL enables it). The ↻ button is the fallback.
- **Privacy:** the page carries `noindex`; add `Disallow: /xhb/` to your `robots.txt` for good measure.
- **Vision content** is edited in the `VISION` constant at the top of the script in `index.html`.
- **Want changes?** Ask me for: bilingual UI, session archiving, comment threads per question, calendar/cadence view, or converting it into your Vite/TS structure.
