# Decisions — momencrafts.com repo

Momen answers here (or in chat; Claude records it here). "Best for the final product" = take the
recommendation. Every row stays until answered.

## Fresh Start Console (plan: 2026-09-23-fresh-start-console.md)

| # | Question | Recommendation | Momen's answer | Date |
|---|---|---|---|---|
| D1 | Who can sign in to the admin? | Owners: momen@momencrafts.com and docpharaon@gmail.com. Add viewers later if needed. | **Momen only** — seed `admin_users` with momen@momencrafts.com alone. Lock-out risk accepted; a second owner is one INSERT away. | 2026-09-23 |
| D2 | Remove the shared admin password after the Google sign-in works? | Yes, after a two-week transition. A wipe button must not sit behind one shared password. | taken by recommendation | 2026-09-23 |
| D3 | Second factor (authenticator app code) for owners? | Yes — it is what a pro admin has, and it costs one screen. | **Yes** (Supabase TOTP, `aal2` required for every admin call) | 2026-09-23 |
| D4 | Test-size limit where the button refuses? | Refuse if more than 25 non-staff logins, or any non-staff login older than 60 days that signed in within 14 days, or any payment with a receipt. No override in the UI; the CLI path with Momen's words is the override. | taken by recommendation | 2026-09-23 |
| D5 | Include cliniq.one in the console? | No. Medical data, blocking links, a public patient-image bucket. CLI + backup only, if ever. | **Yes, include it** — against the recommendation. Consequences: it goes LAST in the order; its `execute` first takes a full `pg_dump` backup to the app's private storage and refuses if the dump fails; its guard is the strictest (any consultation, intake or WhatsApp row with a real phone number → refuse); its script needs the ~60 blocking FKs handled in dependency order and must be read from the LIVE schema, not the broken migrations folder. Adds ≈1.5 days. | 2026-09-23 |
| D6 | Include momencrafts.com's own investor/tester tokens as a wipe? | No. Real NDA signatures live there. Build a per-token "Delete permanently" instead, later. | taken by recommendation | 2026-09-23 |
| D7 | Keep the CLI scripts after the console exists? | Yes, as fallback and for anything the guard refuses. | taken by recommendation | 2026-09-23 |
| D8 | Order of apps after Ummi Wallet and Muscle Hustle? | KURAS → RogerAI → RelayBot. | taken by recommendation, then cliniq.one last (D5) | 2026-09-23 |
| D9 | Who builds? | Claude writes prompts + reviews, Antigravity executes, Claude verifies by running; Claude builds directly where faster. Momen: decisions, logins, COMMIT/PUSH/apply/deploy. | **Start Phase 1 now**, Claude builds directly in the momencrafts repo; staged, not committed, not deployed until Momen says so. | 2026-09-23 |
| D-KURAS-1 | When KURAS families are deleted, purge their rows from the `events` log (child nicknames, consent records)? | Yes — purge the removed families' rows, keep admin rows. | taken by recommendation | 2026-09-23 |
| D-ROGER-1 | Which RogerAI accounts are the keep-list? | Momen names them from a masked list once the CLI can read that database. | pending | |

## Sahhaaab card + page (plan: 2026-09-23-sahhaaab-card.md)

| # | Question | Recommendation | Momen's answer | Date |
|---|---|---|---|---|
| D-SAH-1 | Where does the card sit and with which stage? | Card 10, DEV pill, right after KURAS; the three WhatsApp cards become 11-13 and XHB becomes 14. Product 14 in every counter. | taken by recommendation | 2026-09-23 |
| D-SAH-2 | Count games as a new industry (6 to 7) and add "games" to the studio sentence? | Yes. Edge Tack and DART are hardware; Sahhaaab is the studio's first game. | taken by recommendation | 2026-09-23 |
| D-SAH-3 | Say on the site that the genre's classic died in 2016 (never naming it)? | Yes, unnamed, in the investor blurb only. It is the strongest market line the game has; the name never appears anywhere on the site. | taken by recommendation | 2026-09-23 |
| D-SAH-4 | Hero art for the /sahhaaab page? | The Old Damascus opening scene (scene-dam-opening.png, portrait) in a phone-shaped frame. Alternative: the aiming duelist cut-out. Both are original studio art. | taken by recommendation | 2026-09-23 |
| D-SAH-5 | Revenue line: "cosmetics and energy, never pay-to-win"? | Yes. The game log calls this stance "leaning"; the site states it plainly, and it is the line that answers the genre's biggest complaint. | taken by recommendation | 2026-09-23 |
| D-SAH-6 | Journal entry "Sahhaaab joins the portfolio - product 14", pinned, plus a live co_journal row? | Yes. Fallback entry in the build; the live row goes in through the admin Journal tab after PUSH (or Claude inserts it on Momen's OK, as with KURAS). | taken by recommendation | 2026-09-23 |
| D-SAH-7 | Who builds, and when? | Claude builds directly in this repo on "go": staged, not committed, not pushed until Momen writes COMMIT / PUSH. One session, same size as KURAS. Nothing is written to the Sahhaaab repo. | taken by recommendation | 2026-09-23 |

## MomenCrafts HQ (plan: 2026-09-23-momencrafts-hq.md)

| # | Question | Recommendation | Momen's answer | Date |
|---|---|---|---|---|
| D-HQ-1 | Name of the one admin app? | "MomenCrafts HQ" (browser title, Android app name); admin.momencrafts.com stays the address. | taken by recommendation | 2026-09-23 |
| D-HQ-2 | Put the product consoles under one roof (admin.momencrafts.com/console/<product>/) or open each in its own tab? | One roof. One bookmark, one Android app, one audit trail; the consoles are not rewritten, only served under HQ. KURAS opens in a tab until it can move. | **Own tabs.** Momen: the admin apps are still being developed and will keep changing; nothing in their builds should depend on HQ. HQ links out with the one-time sign-in link; the consoles deploy on their own. The Android HQ app opens them in a browser tab. Revisit later if wanted. | 2026-09-23 |
| D-HQ-3 | When a console is opened through HQ, is HQ's authenticator code enough, or does each product still ask its own? | Keep each product's own rule for now (Ummi Wallet handles money data). Revisit after a month of use. | **Each product keeps its own rule.** | 2026-09-23 |
| D-HQ-4 | Order of products? | Ummi Wallet, then Muscle Hustle, then KURAS, RogerAI, RelayBot, cliniq.one last; Sahhaaab when its backend exists. | **Ummi Wallet → Muscle Hustle → KURAS → cliniq.one → RelayBot → RogerAI** (Momen's order; cliniq keeps its backup-first rule from D5). Sahhaaab when its backend exists. | 2026-09-23 |
| D-HQ-5 | Retire the separate Ummi admin Android build and the KURAS admin TWA once the HQ app covers them? | Yes, fewer apps and signing keys to look after. | taken by recommendation — but with D-HQ-2 the HQ app opens consoles in a browser tab, so the Ummi admin APK stays useful until Momen decides otherwise. | 2026-09-23 |
| D-HQ-6 | Roles inside HQ? | Start with owner (can change things) and viewer (can look). Per-product roles like KURAS support/editor map onto these later. | taken by recommendation | 2026-09-23 |
| D-HQ-7 | Android packaging? | Trusted Web Activity (as KURAS), package com.momencrafts.hq, sideload + Play internal testing; iOS through "Add to Home Screen". | taken by recommendation | 2026-09-23 |
| D-HQ-8 | Who builds, and how far before the first review? | Claude builds Phase A and Ummi Wallet through Phase E (~6 days of work), stops for Momen's review with a usable HQ; then the other products one by one. Same words as always: COMMIT / PUSH / apply / deploy. | **Build Phase A + Ummi Wallet end to end, then review.** | 2026-09-23 |
