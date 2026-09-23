# MomenCrafts HQ — one admin app for every product

**Date:** 2026-09-23 · **Status:** PROPOSED — waits for decisions D-HQ-1…8 in `docs/plan/decisions.md`.
**Owner:** Momen · **Written by:** Claude · **Builds on:** `2026-09-23-fresh-start-console.md` (Phases 1–4 live)

---

## 1. The idea in plain words

Today Momen has one admin per product, each with its own address, its own sign-in and its own look.
HQ is **one app**: one sign-in (Google + authenticator, already live), one audit log (already live), one
product switcher. Inside it, for every product:

- the **shared operations** every product needs — accounts (look up, delete one, fresh start),
  feature flags, releases and testers, health — shown the same way for every product;
- a **door into the product's own console** for the deep work (Ummi Wallet's operator console,
  Muscle Hustle's admin app, KURAS's admin pages), opened **without a second login**.

It runs on the web at admin.momencrafts.com and as an **Android app** that wraps it, so the phone has
one icon for all of MomenCrafts. New products plug in by implementing one small standard API.

The fresh-start button built today is the first shared operation and the template for all the others.

## 2. What exists today

| Product | Admin today | Runs where | Sign-in | Admin backend |
|---|---|---|---|---|
| momencrafts.com | admin.momencrafts.com — tokens, testers, CO content, XHB, **Fresh Start** | Vercel (this repo) | Google + authenticator, `admin_users`, `admin_audit_log` | `admin-*` edge functions, `admin-products` hub |
| Ummi Wallet | Operator console `admin/` (Vite/React, 16 screens) **+ its own Capacitor Android build** | not deployed as a site (local build / APK) | Supabase auth of the Ummi project, `operators` table with tiers, authenticator required (`operator-auth.ts`) | `operator-bff` (incl. two-step user delete), `admin-fresh-start` (new) |
| Muscle Hustle | `admin-app/` (Vite/React, 21 files); `admin-web/` is a 195 MB duplicate slated for deletion | not deployed as a site | Supabase auth, `users.role = ADMIN` | Fastify on Railway `/api/v1/admin/*` (delete user, …), RPC `admin_delete_user`, `admin-fresh-start` (new) |
| KURAS | `/admin` inside the Next.js app (families, library, rules, jobs, audit) **+ TWA APK** `com.momencrafts.kuras.admin` | kuras.vercel.app/admin | Supabase auth, `guardians.role` admin / support / editor | Next route handlers with service role |
| RogerAI | Admin screens inside the user app (`UserRegistry`, `IntentRegistry`) | in the app | email list in an env var (unset in prod) | edge fn `admin-users` (partial delete) |
| RelayBot | Admin screens inside the user app (dashboard, devices, firmware) | in the app | two emails hardcoded in `auth.ts`, `mc_admins` | direct table access with the user's session |
| cliniq.one | none (admin UI deleted from the tree) | — | `users.role` admin / superadmin | edge fn `admin-api` |
| Sahhaaab | none yet (no backend) | — | — | — |

Seven different answers to "who is an admin" and "where do I click". That is the problem HQ solves.

## 3. The shape — three layers

```
 ┌─ Layer 1 · THE DOOR ───────────────────────────────────────────────────────────┐
 │ admin.momencrafts.com  (HQ)  ·  Google + authenticator  ·  admin_users  ·  audit │
 │ product switcher · Dashboard (health of all) · per product: Accounts, Fresh start, │
 │ Flags, Releases, Health · "Open console" door                                     │
 └───────────┬──────────────────────────────────────────────┬─────────────────────┘
             │ machine key per product (Supabase secret)     │ same-origin proxy
             ▼                                               ▼
 ┌─ Layer 2 · STANDARD ADMIN API (one per product) ─┐   ┌─ Layer 3 · THE PRODUCT CONSOLES ─────────┐
 │ edge fn admin-console: status · users.list/detail │   │ admin.momencrafts.com/console/ummi/  →   │
 │ users.delete_preview/execute · flags · releases  │   │   Ummi operator console (its own app)    │
 │ fresh_start.* · sso.link                          │   │ /console/muscle-hustle/ → MH admin app    │
 │ decides + logs on its side (internal.*)           │   │ KURAS: kuras.vercel.app/admin (own tab)   │
 └───────────────────────────────────────────────────┘   │ signed in through sso.link, no password  │
                                                         └──────────────────────────────────────────┘
```

- **Layer 1 — the door.** Already built (Phase 1 + 4 of the console). Grows a product registry, a
  switcher, roles per action, health cards, and generic screens driven by the standard API.
- **Layer 2 — the standard admin API.** Each product gets one edge function `admin-console` (the
  existing `admin-fresh-start` grows into it). Same action names everywhere, so HQ renders every
  product with the same screens. The product keeps the logic: Ummi's delete reuses its
  `userDeletion.ts` engine, Muscle Hustle's calls its Railway backend, and so on. Machine key per
  product, held only by HQ. Everything it does is logged on the product side too.
- **Layer 3 — the consoles under one roof.** The existing admin apps are not rewritten. They are
  served **under HQ's address** (`/console/<product>/`) through Vercel rewrites, so one bookmark and
  one Android app cover them all, and they are entered through a one-time sign-in link that HQ asks
  the product to mint for Momen's email (`sso.link`). Each console keeps its own Supabase session
  (different projects never collide). KURAS is the exception for now: its admin lives inside a
  Next.js app and opens in its own tab until it moves.

## 4. Rules that never bend

1. **One identity at the door.** Google + authenticator, `admin_users`. No product-specific password
   is typed anywhere in HQ.
2. **The product decides.** HQ asks; the product's own function checks, executes, logs. HQ never
   holds a product's database password or service key.
3. **One key per product, minimum power.** The key opens only that product's `admin-console`.
   Rotation is one procedure (`FRESH_START_RUNBOOK.md`), never displayed.
4. **Two steps for anything destructive** (delete a user, fresh start, disable an account): preview
   → typed confirmation → execute, with a one-time code where the product already has one.
5. **Audit on both sides** (`admin_audit_log` in HQ, `internal.*` in the product). Codes, keys and
   tokens are scrubbed. Read actions are logged only when refused.
6. **Products work without HQ.** HQ down means no shared screens for a while; every console still
   opens on its own address with its own login. HQ is a front door, not a dependency.
7. **Nothing applied, deployed, committed or pushed without Momen's word.** Test on empty or seeded
   data before the first real use of any action.

## 5. Phases

### Phase A — HQ shell (this repo) · ~2 days
- Product registry: extend `APPS` in `admin-products` → `PRODUCTS` (id, name, icon, colour, apiUrl,
  secretEnv, consolePath or consoleUrl, Android package, capabilities: which standard actions it
  supports). The registry drives the sidebar and the screens; unsupported actions are simply hidden.
- Sidebar: one section per product (Accounts · Fresh start · Flags · Releases · Health · Open console),
  the existing momencrafts.com tabs become the "momencrafts.com" product.
- Dashboard: a health card per product from `status` (version, counts, last fresh start, errors,
  unreachable in red).
- Generic screens bound to the standard API: **Accounts** (search by masked phone/email, detail,
  two-step delete), **Flags** (list, toggle with confirmation), **Releases** (the tester/APK flow that
  exists for momencrafts today, per product), **Health**. The Fresh Start screen becomes one of them.
- Roles: `owner` may execute; `viewer` sees status, lists and history only. Enforced in the hub
  function per action, mirrored in the UI.
- Acceptance: a product with only `status` + `fresh_start` (today's two) shows exactly those screens;
  every action leaves an audit row; viewer cannot execute; tsc + deno green; Playwright smoke test.

### Phase B — Standard admin API in Ummi Wallet and Muscle Hustle · ~1.5 days each
- Grow `admin-fresh-start` → `admin-console` (keep the fresh-start actions and the key; the hub's
  registry just changes the URL). Add:
  - `status` (already) + version/build info;
  - `users.list` (masked: name, last 4 digits, role, family/coach, created, last active) and
    `users.detail`;
  - `users.delete_preview` / `users.delete_execute` — Ummi: `buildUserManifest` + `deleteUserCore`
    from `_shared/userDeletion.ts` (the operator console's own two-step, incl. the "mother/lead of a
    family" stop); Muscle Hustle: `deleteUserCompletely` ported into the function, or the Railway route
    called with a machine key (decision at build time — the port removes a hop);
  - `flags.list` / `flags.set` — Ummi `feature_flags`; MH `app_config` / `platform_settings`;
  - `sso.link` — see Phase D.
- Each new destructive action gets its own guard and its own `internal.*` run row.
- Acceptance: live on seeded test accounts, refusal paths, audit on both sides.

### Phase C — The consoles as their own sites, linked from HQ · ~½ day per console
**Decision D-HQ-2 (2026-09-23): own tabs, not one roof.** The admin apps are still being developed and
must keep deploying on their own; nothing in their builds depends on HQ.
- Deploy the Ummi operator console and the MH admin app as their own Vercel projects at their own
  addresses (they are plain Vite apps; no `base` change). Their existing logins keep working.
- HQ's registry holds each console's URL; the "Open console" door opens it in a new tab, signed in
  through the Phase D link. The Android HQ app opens it in a browser tab (Chrome Custom Tab).
- `MHnative/admin-web` (195 MB duplicate) is deleted on Momen's word; the Ummi admin Capacitor APK
  stays useful as long as consoles open outside the HQ app (D-HQ-5).
- Later option, unchanged in design: serve a console under `admin.momencrafts.com/console/<id>/` via
  a Vercel rewrite when Momen wants it inside the HQ app; it costs that console one `base` setting.
- Acceptance: both consoles reachable at their addresses; the door opens them signed in.

### Phase D — SSO into the consoles · ~½ day per product
- `sso.link`: the product checks that the HQ admin's email is one of ITS staff accounts (Ummi:
  `operators`; MH: `users.role = 'ADMIN'`; KURAS: `guardians.role` in admin/support/editor), then
  mints a one-time sign-in link for that email (`auth.admin.generateLink`, magic link, 60 seconds,
  single use) and returns it. HQ opens the console with it; the console completes its own sign-in.
- Second factor: each product keeps its rule (Ummi requires the authenticator for operators) unless
  D-HQ-3 says HQ's code is enough for consoles opened through HQ.
- Acceptance: "Open console" lands signed in; the link cannot be reused; an email that is not staff in
  that product is refused and logged.

### Phase E — Android app "MomenCrafts HQ" · ~½ day
- Trusted Web Activity of admin.momencrafts.com (Bubblewrap, as for KURAS): web manifest for the admin
  host, `.well-known/assetlinks.json`, new keystore `momencrafts-hq-upload.keystore` (passwords stay
  with Momen), package `com.momencrafts.hq`. The app covers every HQ screen (health, accounts, flags,
  releases, fresh start, history); a product console opens from it in a browser tab (D-HQ-2).
  APK + AAB into `Desktop\MomenCrafts\HQ\` and `LATEST-APKS\`.
- Google sign-in and the authenticator work inside (it is Chrome). iOS: "Add to Home Screen".
- The Ummi admin Capacitor APK and the KURAS admin TWA stay as they are (D-HQ-5 with D-HQ-2).

### Phase F — Bring in the other products · ~1–2 days each, in D-HQ-4 order
**Order (D-HQ-4, Momen 2026-09-23): KURAS → cliniq.one → RelayBot → RogerAI**, after Ummi Wallet and
Muscle Hustle; Sahhaaab when its backend exists.
- **KURAS:** `admin-console` as Next route handlers under `/api/hq/*` with the same action names
  (service role; families, children, fresh start per the KURAS mapping incl. the `events` purge
  decision); console door → kuras.vercel.app/admin in a tab (or proxied later with a `basePath`).
- **RogerAI:** an `admin_users`-style table replaces the env email list (nothing in its database
  marks an admin today); `admin-console` edge fn with `status`, `users.*` (keep-list = Momen's own
  account), `fresh_start.*` per the RogerAI mapping (text `user_id` tables, live-only tables, public
  `roger-audio` bucket); the in-app admin screens migrate to HQ over time.
- **RelayBot:** `mc_admins` as the marker; `admin-console` with devices/firmware/status/users; the
  in-app admin screens migrate later.
- **cliniq.one (last, D5):** `admin-api` grows the standard actions; every destructive action takes a
  `pg_dump` backup first and refuses without it; strictest guard.
- **Sahhaaab:** when its backend appears, it is born with `admin-console` — no legacy to migrate.

### Phase G — Operations · ~1 day
- Runbook update, key rotation calendar (90 days), audit retention (keep 2 years, export to the repo
  on demand), health alerts (a red card sends a notification through the existing notify path),
  Playwright smoke tests for the door + one product, D2 cleanup of the legacy password.

## 6. Technical contract, for whoever builds it

**Standard `admin-console` (per product, POST, `X-Console-Key` = that product's key):**

| action | request | response |
|---|---|---|
| `status` | — | `{ app, version, counts, guard, last_fresh_start, errors }` |
| `users.list` | `{ q?, limit?, cursor? }` | `{ users: [ { id, masked, role, group, created_at, last_active } ], next }` — never a full phone/email |
| `users.detail` | `{ id }` | `{ user, owned: { table: count }, warnings: [ "lead of a family", … ] }` |
| `users.delete_preview` | `{ id }` | `{ manifest, warnings, confirm_code, expires_at }` |
| `users.delete_execute` | `{ id, confirm_code }` | `{ deleted, storage_deleted, run_id }` — refuses on warnings unless `acknowledge: [...]` names them |
| `flags.list` / `flags.set` | — / `{ key, value }` | `{ flags }` / `{ flag, previous }` |
| `fresh_start.status/preview/execute` | as today | as today |
| `sso.link` | `{ email }` | `{ url, expires_at }` — only for the product's own staff accounts |

Errors: `{ error: <code> }` with the same HTTP mapping as the fresh start (400 code/input, 403 not
staff, 409 changed, 423 refused, 429 rate, 500 failed-and-rolled-back). Every non-read action writes
`internal.console_runs` (or the existing `fresh_start_runs`) on the product side.

**HQ hub (`admin-products` → `admin-hq`):** `{ product, action, ...payload }` → identity → role check
(`owner` for execute/set/delete/sso, any admin for reads) → forward with the product's key → audit
(`hq.<product>.<action>`, scrubbed) → passthrough status. Registry drives which actions a product
supports; the hub refuses the rest with `unsupported`.

**Same-origin proxy:** `vercel.json` rewrites `/console/<id>/(.*)` → `https://<deployment>/$1`; each
console built with `base: '/console/<id>/'`; the console's Supabase client keeps its default storage key.

**SSO link:** minted product-side with `auth.admin.generateLink({ type: 'magiclink', email })` only if
the email is staff there; returned once; HQ opens it immediately; TTL 60 s (Supabase setting), single
use; never written to any log.

## 7. Risks and what covers them

| Risk | Cover |
|---|---|
| A console breaks under a sub-path (absolute asset URLs) | `base` in its Vite config; smoke test after each console deploy |
| Two Supabase sessions on one origin collide | different project refs → different storage keys; verified in Phase C acceptance |
| SSO link leaks | 60 s, single use, HTTPS, never logged; the product checks staff status every time |
| Authenticator fatigue (HQ + each product) | D-HQ-3; default keeps product rules for money/medical data |
| HQ becomes a single point of failure | products keep their own addresses and logins (rule 6) |
| Key concentration in HQ | one key per product, only `admin-console` accepts it, rotation procedure |
| KURAS cannot be proxied (Next.js) | opens in a tab; moves under the roof later with `basePath` |
| RogerAI / RelayBot admin logic lives in user apps | migrate operations to `admin-console` first, screens later; users never lose their apps |
| Scope creep | registry capabilities: a product ships with only the actions it has; HQ hides the rest |

## 8. Effort and order

| Phase | Effort | Depends on |
|---|---|---|
| A HQ shell | 2 days | D-HQ-1, 6 |
| B Ummi API · MH API | 1.5 + 1.5 days | A (contract) |
| C Same-origin consoles (Ummi, MH) | 1 + 1 day | D-HQ-2 |
| D SSO (Ummi, MH) | ½ + ½ day | B, C, D-HQ-3 |
| E Android "MomenCrafts HQ" | ½ day | C, D-HQ-7 |
| F KURAS · RogerAI · RelayBot · cliniq · Sahhaaab | 1.5 · 2 · 1.5 · 2 · (with its backend) | D-HQ-4 |
| G Operations | 1 day | E |
| **Total** | **≈ 17–19 working days** across six repos | |

Order: A → B (Ummi) → C + D (Ummi) → E → B/C/D (Muscle Hustle) → F (KURAS → cliniq → RelayBot →
RogerAI) → G. Momen gets a usable HQ with Ummi Wallet inside it after A–E for Ummi (~6 days), then
each product adds itself. **Decided 2026-09-23 (D-HQ-8): build A + Ummi through E, then stop for review.**

Workflow as today: Claude builds directly where it is faster and writes prompts for Antigravity where
it is not; Claude verifies by running; Momen decides, logs in, says COMMIT / PUSH / apply / deploy.

## 9. Definition of done

Momen opens one icon on his phone — MomenCrafts HQ — signs in once with Google and the authenticator,
sees every product's health on one screen, can look up and delete a test account or run a fresh start
on any product with the same two steps, and can open Ummi Wallet's or Muscle Hustle's full console
under the same address without typing another password. Every action is in one audit log. The old
per-product admin logins still work as fallbacks, and the shared password is gone.
