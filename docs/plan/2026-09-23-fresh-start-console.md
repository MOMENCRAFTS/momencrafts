# Fresh Start Console — one button per product in the MomenCrafts admin

**Date:** 2026-09-23 · **Status:** PROPOSED — nothing is built yet. Waits for the decisions in
`docs/plan/decisions.md` (D1–D9). · **Owner:** Momen · **Written by:** Claude (user-cleaner role)

---

## 1. What this is, in plain words

Today, when Momen wants an app "fresh" for testing, Claude runs a reviewed SQL script from this PC
through the Supabase CLI: look first, show the counts, get a yes, delete, prove it, write a record.
It works, but it depends on a CLI login that keeps getting revoked, and it depends on Claude.

This plan turns that routine into **one screen in the MomenCrafts admin (admin.momencrafts.com)**:
a card per product (Ummi Wallet, Muscle Hustle, KURAS, RogerAI, RelayBot …). Each card shows how
many test accounts the product holds right now and a **Fresh start** button. Pressing it:

1. shows exactly what would be deleted and what stays (a before-table),
2. asks Momen to type the app's name and a confirmation code that lives for 10 minutes,
3. deletes, inside the app's own database, in one transaction,
4. shows the after-table and saves a record in two audit logs.

MomenCrafts is the owner of all the products, so the admin is the natural place for the button.
But **each app keeps its own delete code and its own keep-list.** The admin only asks; the app
decides and does. That is the single most important design choice in this plan.

## 2. Where we stand today

| App | Backend | Fresh-start script | Who counts as staff (kept) | Ready for a button? |
|---|---|---|---|---|
| Ummi Wallet | Supabase `opkowdluhkocvfevjdoh` | yes — `audit-2026-09-02/WIPE_all_test_data.sql`, run twice on 19 Sep | `operators` table | yes, after Phase 2 |
| Muscle Hustle | Supabase `prguqyjtuueiriasmbyj` | yes — `docs/ops/FRESH_START_wipe.sql` (dry run by default), run 19 Sep | `users.role = 'ADMIN'` | yes, after Phase 3 |
| KURAS | Supabase `sxstsrxysrwazelyudjz` | no | `guardians.role IN ('admin','support','editor')` | needs its script first |
| RogerAI | Supabase `krbfhiupcquddguorowe` | no | nothing in the database — an email list in env, unset in prod | needs a keep-list decision + script |
| RelayBot | Supabase `oocszpdmarjfjbmeckmb` | no | hardcoded admin emails + `mc_admins` | probably nothing to wipe; script is small |
| cliniq.one | Supabase `uabbndansgxpvogteyxc` | no | `users.role IN ('admin','superadmin')` | medical data, ~60 blocking links — CLI only (see D5) |
| momencrafts.com itself | Supabase `isciigqmdfcozrtojqcm` | no | admin = one shared password | its "users" are investor/tester tokens, some with real NDAs — not a wipe target (D6) |
| Sahhaaab | none yet | — | — | nothing to do |

The admin panel today: one shared password (`ADMIN_SECRET_KEY`, sent as `X-Admin-Key`), no
per-person login, no audit log, a browser flag in `sessionStorage`. Five admin edge functions
(`admin-manage-token`, `admin-manage-testers`, `admin-manage-co`, `admin-get-analytics`,
`xhb-manage-access`) all check that one password.

## 3. Rules that never bend

1. **Deletion code lives inside the app that owns the data.** The admin never holds a database
   password or service key of another project. It calls a small function in the app's project,
   and that function runs the app's own reviewed script.
2. **Two steps, always.** Preview → confirmation code → execute. The code lives 10 minutes, works
   once, and is tied to the counts that were shown. If the data changed in between, the execute is
   refused with "data changed, preview again".
3. **Refuse when it looks like real people.** Every app carries a fixed "test-size limit" in its
   code (D4). If the database looks bigger or older than a test set, the button refuses and says
   why. The only way past it is the CLI path with Momen's explicit words, as today.
4. **Keep-lists are fixed in the app's code**, never sent by the caller: staff/operator/admin
   accounts, content, configuration, schema, migrations, buckets. Exactly what the CLI scripts keep.
5. **No secret in the browser.** One secret per app, stored as a Supabase secret in the
   momencrafts project (`FRESH_START_KEY_<APP>`) and as `FRESH_START_KEY` in the app's project.
   Rotating one app's key touches nothing else.
6. **Every preview and every execute writes an audit row in both places**: who, when, which app,
   before/after counts, outcome. The admin gets a History tab that reads it.
7. **Nothing is deployed, applied, committed or pushed without Momen's word** (COMMIT / PUSH /
   "apply" / "deploy"), same as every other repo.
8. **Every wipe function is tested on a local Supabase first** (`supabase start` + seed), run
   twice, with the refusal paths tested too. No staging projects exist, so local is the test bed.
9. **The old shared password disappears** once the real sign-in works (D2). A button that can
   wipe five products must not sit behind one password that several tools already hold.

## 4. How the pieces fit

```
 admin.momencrafts.com  (browser)
   │  Google sign-in (Supabase Auth) → Bearer JWT
   ▼
 momencrafts project ── edge fn  admin-products        ← checks JWT + admin_users allowlist,
   │                          writes admin_audit_log        owner role for execute
   │  X-Fresh-Start-Key: <FRESH_START_KEY_UMMI>  (Supabase secret, per app)
   ▼
 Ummi Wallet project ── edge fn  admin-fresh-start     ← checks key, real-user guard,
   │                          writes internal.fresh_start_runs   confirmation codes
   ▼
 SQL  internal.fresh_start_preview()  /  internal.fresh_start_execute()
      (SECURITY DEFINER, service role only; body = the reviewed wipe script)
```

Same shape for Muscle Hustle, then KURAS, RogerAI, RelayBot. The hub knows the apps from a small
registry (id, display name, function URL, secret name). Adding an app = one registry line + that
app's own function.

## 5. Phases

Order matters: **Phase 1 comes before any wipe button exists.** Phases 2 and 3 can run in parallel
with Phase 1 (they are inside the app repos). Phase 4 needs 1 + at least one of 2/3.

### Phase 0 — Decisions (this week, Momen)
Answer D1–D9 in `docs/plan/decisions.md`. My recommendation is written next to each one; "best for
the final product" takes all the recommendations.

### Phase 1 — Real admin sign-in + audit log (momencrafts repo) · ~1 day
**Goal:** the admin knows *who* is signed in, and everything destructive is written down.
- Migration 079: `admin_users(email pk, role owner|viewer, added_by, added_at, disabled_at)`
  seeded from D1; `admin_audit_log(id, at, actor_email, action, app_id, details jsonb, outcome, ip)`
  with RLS deny-all (service role only).
- Enable the Google provider on the momencrafts Supabase project (Momen, dashboard) with the
  allowed redirect `https://admin.momencrafts.com`.
- `supabase/functions/_shared/adminAuth.ts`: read `Authorization: Bearer <jwt>`, verify with
  `sb.auth.getUser(jwt)`, require the email to be in `admin_users` and not disabled; return
  `{ email, role }`. During a two-week transition also accept the legacy `X-Admin-Key` when the
  secret `ADMIN_LEGACY_KEY_ENABLED=true`; then remove it (D2).
- Switch the five admin functions to `adminAuth`. Optional TOTP second factor for owners (D3).
- **As built (2026-09-23):** the legacy key stays accepted *until* `ADMIN_LEGACY_KEY_ENABLED=false`
  is set (default-on, so deploying cannot lock Momen out before Google is configured). D3 is not
  optional: every admin call needs `aal2`. `xhb-reminder` was switched too (six functions, not
  five); its scheduled run keeps `XHB_ADMIN_KEY` as a *machine key* that outlives the transition,
  because a cron job cannot sign in with Google. Real outcomes are logged by a `withAudit` wrapper
  (2xx ok · 401/403 denied · else failed); read-only actions are logged only when refused.
- `AdminScreen.tsx`: replace the password box with "Sign in with Google"; `makeApi` sends the
  Bearer token; logout signs out of Supabase. Non-allowlisted Google accounts see "not an admin".
- **Acceptance:** an allowlisted account can use every existing admin tab; a random Google account
  cannot; the old password stops working once the flag is off; each admin call leaves an audit row.

### Phase 2 — Ummi Wallet fresh-start endpoint (ummi-wallet repo) · ~1 day
- Migration 139 (or next free number): schema `internal` if absent; `internal.fresh_start_runs`;
  `internal.fresh_start_confirmations(code, counts_hash, expires_at, used_at)`;
  `internal.fresh_start_preview()` returning the counts the CLI preview shows today (logins to
  delete, operator logins kept, users, families, chat messages, storage files per bucket, global
  lounge tracks); `internal.fresh_start_execute()` whose body is `WIPE_all_test_data.sql` (park
  and restore the global lounge tracks, truncate the rest, delete non-operator logins) ending with
  the same check row. Both SECURITY DEFINER, owned by postgres, `REVOKE ALL` from public, anon,
  authenticated (template: migration 110). Idempotent, safe to run twice.
- Edge function `admin-fresh-start` + `config.toml` stanza (`verify_jwt = false`, auth by key,
  like every function here): actions `preview`, `execute`; header `X-Fresh-Start-Key`; real-user
  guard (D4); storage step — delete objects under deleted users' prefixes in the user buckets
  (chat images, voice notes, documents) before the SQL, so no orphans are left (today's script only
  detaches owners); one execute per 10 minutes; writes `fresh_start_runs`.
- **Acceptance (local `supabase start` + a seeded family of three):** preview shows the seed;
  execute empties it, keeps operators, feature_flags, barakah_content and the 9 global lounge
  tracks; second execute is a no-op with zeros; wrong key → 401; expired or reused code → 400;
  counts changed after preview → 409; seed above the guard → 423 "refused: looks like real users".

### Phase 3 — Muscle Hustle fresh-start endpoint (MHnative repo) · ~0.5 day
- Migration 081: same `internal` tables; `fresh_start_preview()` = `docs/ops/FRESH_START_preview.sql`
  reduced to counts; `fresh_start_execute()` = the DO block of `docs/ops/FRESH_START_wipe.sql`
  (children first, ADMIN kept, refuse if no admin, self-check before commit). Never TRUNCATE here:
  CASCADE would empty `prompt_versions` and `audit_logs`.
- Edge function `admin-fresh-start` as in Phase 2; storage step uses the `USER_BUCKETS` list from
  `backend/src/services/user-deletion.service.ts`. Leaves `kv_store_*` alone.
- **Acceptance:** local run with `scripts/seed-test-fixture.mjs` → preview shows coach + 2 clients →
  execute leaves the 2 admins, 34 audit rows, all content → refusal paths as above.

### Phase 4 — The console (momencrafts repo) · ~1.5 days
- Edge function `admin-products`: registry constant; actions `list` (parallel previews, 5 s
  timeout each, a card degrades to "unreachable" instead of failing the page), `preview(app)`,
  `execute(app, confirm_code, typed_name)`; `execute` needs role `owner`, `typed_name === app.id`;
  writes `admin_audit_log` before the call and after the result.
- Admin screen "Products": one card per app with live counts and a status pill (ok / refused /
  unreachable); Fresh start → preview table (Deleted | Kept) → confirm box (type the app id, paste
  the code) → result panel (before/after, check row, "record saved") → reminder line "clear the
  app on the test phone: `adb shell pm clear <package>`". History tab = `admin_audit_log`
  filtered to `fresh_start.*`. English only, like the rest of the admin.
- Secrets: `FRESH_START_KEY_UMMI`, `FRESH_START_KEY_MH` set on the momencrafts project;
  `FRESH_START_KEY` set on each app project. Generated with `openssl rand -hex 32`, set with
  `npx supabase secrets set`, never pasted in chat or written to a file.
- **Acceptance:** Playwright test (add Playwright to this repo; KURAS has a working setup to copy):
  sign in as owner → Products → Ummi Wallet preview → execute with the code → History shows the
  run; viewer role cannot execute; wrong typed name is refused client- and server-side.

### Phase 5 — The other apps, one by one · ~0.5–1 day each, in D8 order
Each app first gets its own reviewed preview + wipe script (as Muscle Hustle did), tested locally,
then its `admin-fresh-start` function, then one registry line in the hub. Specifics from the
repo mapping of 2026-09-20:
- **KURAS:** keep `guardians.role IN ('admin','support','editor')` + their families row + login;
  delete every parent family (children, kurases, attempts, credits_ledger, child_devices cascade
  from `families`); `guardians.auth_uid` has no FK to `auth.users` — delete both sides explicitly;
  `waitlist.family_id` is SET NULL and holds parent emails — delete those waitlist rows;
  the `events` log mixes admin rows with parent/child rows that carry child nicknames and consent
  records — purge the rows of removed families, keep admin rows (D-KURAS-1). No storage, no
  triggers. Also: remove the stale `SUPABASE_ACCESS_TOKEN` line from the repo's `.env.local`
  (Momen), otherwise the CLI cannot reach this project.
- **RogerAI:** nothing marks an admin in the database. Keep-list = accounts Momen names (his own
  daily-use account is among the 9 logins). `user_preferences.is_ai_persona` flags synthetic
  accounts — always deletable. ~20 tables link by a text `user_id` with no FK → explicit deletes;
  four tables (`transmissions`, `listening_sessions`, `parked_locations`, `surface_items`) exist
  only live → read the live schema first. Public bucket `roger-audio`, per-user path
  `tts/<userId>/…` → storage step required. Keep intent_registry, feature_flags, platform_stats,
  system_health_*, admin_audit_log, road_hazards (null the reporter).
- **RelayBot:** tables `mc_*`; admins hardcoded in `src/services/auth.ts` + `mc_admins`. Its two
  logins look like the two admins → the script will usually report "nothing to delete".
- **cliniq.one:** *not in the console* (D5). Medical data, ~60 FKs without ON DELETE that block a
  plain delete, phone-keyed tables with no login, a PUBLIC bucket of patient images
  (`wa-intake-uploads`) that is itself a finding. If Momen ever wants it wiped: backup with
  `supabase db dump` to a dated file outside the repo, then a dependency-ordered script run by CLI
  with his explicit words, staff kept via `users.role`.
- **momencrafts.com's own tokens:** *not a wipe target* (D6). Real investors' NDA signatures live
  there. Instead: a per-token "Delete permanently" in the token table (preview → code → execute),
  shown only for revoked/expired tokens, loud warning when an NDA is signed, plus a migration to
  give `access_requests.token_id` an ON DELETE rule (today it would block the delete).

### Phase 6 — Operations · ~0.5 day
- `docs/ops/FRESH_START_RUNBOOK.md` in momencrafts: how to run, what "refused" means and what to
  do (CLI path), how to rotate a key (every 90 days or after any incident), how to add an app.
- Keep the CLI scripts in every repo as the fallback (D7). The console is the routine path; the
  CLI is for anything the guard refuses and for cliniq.one.
- Record files: the audit rows replace the hand-written `WIPE_<date>.md`; a "Download record"
  button exports one run as Markdown for the repo when Momen wants it kept there.

## 6. Technical contract, for whoever builds it

**Per-app function `admin-fresh-start` (POST, JSON):**
- Request: `{ "action": "preview" | "execute", "confirm_code"?: string, "requested_by": string }`
  with header `X-Fresh-Start-Key`. Missing/wrong key → 401 and nothing else happens.
- `preview` → 200 `{ app, counts: {...}, keep: {...}, guard: { refused: bool, reasons: [] },
  confirm_code, expires_at }`. The code is 8 random chars stored in `internal.fresh_start_confirmations`
  with a hash of `counts`; one per 10 minutes per app.
- `execute` → requires an unused, unexpired code whose counts hash equals the current counts
  (else 409); refuses when `guard.refused` (423); runs `fresh_start_execute()` in one transaction;
  200 `{ before, after, check_row, storage_deleted: {bucket: n}, run_id }`; marks the code used;
  writes `fresh_start_runs`. Any SQL error → 500 with the state ("nothing changed" — the
  transaction rolled back) and the run row says `failed`.
- Real-user guard defaults (D4): refuse if non-staff logins > 25, or any non-staff login created
  more than 60 days ago signed in within the last 14 days, or any payment row with a receipt.
  Constants in the function's source, not in the request.

**Hub function `admin-products` (momencrafts):** Bearer JWT → `adminAuth` → role check → forwards
to the app with the app's key from `Deno.env.get(secretName)` → audit row → returns the app's
response plus `{ actor, app }`. Never logs request bodies that contain a code.

**Audit tables:** momencrafts `admin_audit_log` (above); per app `internal.fresh_start_runs
(id, at, requested_by, action, before jsonb, after jsonb, outcome, code_id)`. Both RLS deny-all.

**Testing:** per app, a `supabase/tests/fresh_start.sql` (pgTAP or plain asserts) run in CI where CI
exists (KURAS has runner-local Supabase; Ummi Wallet and MH have jest/CI — add a db step), and a
manual local checklist in the runbook where it does not.

## 7. Risks and what covers them

| Risk | Cover |
|---|---|
| One shared admin password today | Phase 1 first; password removed after the transition (D2) |
| A real environment wiped by mistake | real-user guard, typed app id, owner role, one-time code, audit in two places |
| Live schema differs from the repo (RogerAI, cliniq) | read the live FK map before writing any script; never trust migration files alone |
| CASCADE surprises (MH: TRUNCATE would empty config) | targeted deletes; the only TRUNCATE script (Ummi Wallet) parks and restores its content rows |
| Orphaned files in storage | storage step by user prefix before the SQL; leftovers reported in the result |
| Confirmation code leaked in logs | codes never logged; hub strips them from audit details |
| Test phones keep stale sessions | result panel shows the `adb shell pm clear` line for the app |
| CLI login keeps getting revoked | routine wipes no longer need it; deploys still do (Momen logs in on the day) |
| Key concentration in the hub | one key per app, minimum power (the app's function does only this), rotation in the runbook |

## 8. Effort and order

| Phase | Effort | Depends on |
|---|---|---|
| 0 Decisions | Momen, minutes | — |
| 1 Sign-in + audit | 1 day | D1–D3 |
| 2 Ummi Wallet endpoint | 1 day | D4 (can run alongside 1) |
| 3 Muscle Hustle endpoint | 0.5 day | D4 (alongside 1) |
| 4 Console | 1.5 days | 1 + (2 or 3) |
| 5 KURAS / RogerAI / RelayBot | 1 / 1 / 0.5 day | their scripts, D8 |
| 6 Operations | 0.5 day | 4 |
| **Total** | **≈ 6–7 working days** across four repos | |

Workflow as in the other repos: Claude writes the prompts and reviews the result, Antigravity
executes them, Claude verifies by running (tests, local Supabase), Momen decides, logs in, and says
COMMIT / PUSH / apply / deploy. Claude may build directly where that is faster (as with the
Muscle Hustle scripts), still with the same words from Momen before anything leaves the PC.

## 9. Definition of done

Momen opens admin.momencrafts.com, signs in with Google, opens Products, sees Ummi Wallet and
Muscle Hustle cards with live counts, runs a fresh start on one of them with preview + code, sees
the after-counts, and finds the run in History and in the app's own `fresh_start_runs`. The old
password no longer works. Both apps' local test checklists pass, including every refusal path. The
runbook exists. Nothing in any repo was committed or pushed without his word.
