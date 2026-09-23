# Deployed: `admin-products` (Fresh Start Console hub) — 23 Sep 2026

Phase 4 of `docs/plan/2026-09-23-fresh-start-console.md`. Momen confirmed "deploy the hub" in chat.
Project `isciigqmdfcozrtojqcm`.

- `supabase/functions/admin-products` deployed (`--no-verify-jwt`; stanza in config.toml). Identity via
  `_shared/adminAuth.ts` (Google + authenticator session on `admin_users`; owner role for `execute`),
  audit via `withAudit` (`list`/`history` are read actions and log only when refused).
- Registry: `ummi-wallet` → `FRESH_START_KEY_UMMI`, `muscle-hustle` → `FRESH_START_KEY_MH`. Both secrets
  are set (values generated into the CLI, never displayed) and match the products' `FRESH_START_KEY`.
- Probe without a session: 401 `Unauthorized` (logged as denied).
- The **Fresh Start** tab (`src/components/AdminProductsPanel.tsx`) is in the repo, staged; it reaches the
  site only after COMMIT + PUSH (Vercel builds `master`). Momen's first run through the tab is the
  end-to-end proof of the console: both products already passed their own live tests today
  (ummi-wallet `APPLIED_139_2026-09-23.md`, MHnative `docs/ops/APPLIED_081_2026-09-23.md`).
- Runbook: `docs/ops/FRESH_START_RUNBOOK.md`.
