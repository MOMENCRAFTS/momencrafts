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
