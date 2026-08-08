# XHB Founders' HQ

Private workspace for the two XHB founders — **Mulham Al Zahabi** (concept originator) and **Momen Pharaon / MomenCrafts** (co-founder & technical lead). One self-contained page: Vision · Plan · sealed Q&A alignment sessions · cross-session Decision register · Updates · Documents (incl. legal drafts with dual approvals) · Podcast (background player) · Ask-XHB, plus a nudge flow to push a session to the other founder.

Deployed as part of the `momencrafts` site (Vercel, static) with Supabase behind it. Lives at `momencrafts.com/xhb/` and optionally `xhb.momencrafts.com`.

## Structure

```
xhb/index.html                     ← the entire app (single file, no build step)
supabase/setup_v2.sql              ← tables + RLS; run once in the Supabase SQL editor
supabase/functions/ask-xhb/index.ts← optional edge function for the Ask-XHB tab
DEPLOY_GUIDE.md                    ← 15-minute go-live steps (Supabase, Vercel, subdomain)
docs/                              ← venture context: assessment & 90-day plan, MOU draft
```

## Quickstart

1. Open `xhb/index.html` in a browser → **demo mode** with sample data, no setup.
2. Go live: run `supabase/setup_v2.sql` (edit `MULHAM_EMAIL_HERE` first), fill the `CONFIG` block at the top of `xhb/index.html` with the Supabase URL + anon key, enable Email magic-link auth. Full steps in `DEPLOY_GUIDE.md`.
3. Drop the `xhb/` folder into the momencrafts repo and push — Vercel serves it.

## Conventions — read before changing code (humans and AI agents)

- **Single file, on purpose.** All CSS/JS lives inline in `xhb/index.html`; one CDN script (supabase-js UMD). No frameworks, no bundler, no npm — do not introduce them without being asked.
- **The sealed-answer rule is enforced in the database**, not just the UI: see the `answers_*` RLS policies in `supabase/setup_v2.sql`. Any change to the Q&A flow must keep that server-side guarantee — partner answers are unreadable while a question's status is `sealed`, and answers freeze (no updates) after reveal.
- **Access model:** two allowlisted emails in `allowed_users`; every table is gated by `is_allowed()`. Keep it that way — this app holds pre-incorporation founder material.
- **No people-scoring, ever** — mirrors the venture's own rule. Evidence/submission quality only.
- **Demo mode** must keep working: with an empty `CONFIG`, the app runs on in-memory seed data (`demoSeed()`), no network needed. Don't use localStorage.
- **Bilingual content:** keep `dir="auto"` on all user text inputs and rendered answers (Arabic + English mix).
- The `VISION` constant at the top of the script is the editable Vision-tab content; the venture's source-of-truth document is the *AI Forest Remastered Master Architecture* (see `docs/` for context).
- Rendering is string-built with `esc()` for all user content — keep escaping on any new render path.
- Background audio (`#bg-audio`, `#player-dock`) lives **outside** `#app` so re-renders don't stop playback. Preserve that separation.

## Ideas queued (ask before building)

Bilingual UI toggle · session archiving · per-question comment threads · cadence/calendar view · Vite/TS conversion into the main site structure.
