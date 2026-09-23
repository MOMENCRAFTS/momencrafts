# Fresh Start Console — runbook

Plan: `docs/plan/2026-09-23-fresh-start-console.md`. Screen: admin.momencrafts.com → **Fresh Start**.

## Using it (Momen)
1. Sign in (Google + authenticator code). Open **Fresh Start**. Each card is a product with its live
   count of test logins and a status pill: **ready** · **refuses: looks like real users** ·
   **unreachable** · **secret not set**.
2. **Fresh start…** on a card → Step 1 shows every count with *deleted* / *stays*, the keep-list, and a
   code. Read the numbers. If anything looks like a real person, stop here.
3. Step 2: type the product id exactly (e.g. `ummi-wallet`) and the code, press **Run**. The code works
   once and dies after 10 minutes; if the data changed in between, the run is refused — preview again.
4. Done: before/after table, the check row (zeros left over, kept counts unchanged), files removed, and
   the `adb shell pm clear <package>` line for the test phone. The run is in **History** and in the
   product's own `internal.fresh_start_runs`.

## When it refuses
| Message | Meaning | What to do |
|---|---|---|
| looks like real users | more than 25 test logins, or an old login was active recently, or (Muscle Hustle) a purchase carries a payment receipt | The button will never do this. If it really is test data, Claude runs the CLI script after Momen says so in his own words. |
| data changed | someone used the app between preview and run | Preview again, read the numbers again. |
| code expired / used / invalid | more than 10 minutes, or reused | Preview again. |
| ran less than 10 minutes ago | rate limit | Wait. |
| secret not set | the hub has no key for that product | Set the secrets (below). |
| unreachable | the product's function is down or not deployed | Check the product's Supabase functions page. |

## Secrets — one per product, never displayed
Generated straight into the CLI (the value never appears on screen, in chat or in a file that stays):
```
TMP=$(mktemp -d)
openssl rand -hex 32 | sed 's/^/FRESH_START_KEY=/' > "$TMP/fs.env"
(cd <product repo> && npx supabase secrets set --env-file "$TMP/fs.env")            # product side
sed 's/^FRESH_START_KEY=/FRESH_START_KEY_<APP>=/' "$TMP/fs.env" > "$TMP/hub.env"
(cd <momencrafts repo> && npx supabase secrets set --env-file "$TMP/hub.env")       # hub side
rm -r "$TMP"
```
`<APP>` = `UMMI`, `MH`, … (see `secretEnv` in `supabase/functions/admin-products/index.ts`).
Rotate every 90 days or after any incident: same procedure, new value, both sides, then one preview to confirm.

## Adding a product
1. In the product's repo: a reviewed preview + wipe script first (as Muscle Hustle: `docs/ops/`), tested;
   then the migration with `admin_fresh_start_status/preview/execute` and the `admin-fresh-start`
   function, modelled on Ummi Wallet 139 / Muscle Hustle 081. Keep-list and guard constants live in
   that migration, never in a request.
2. Secrets as above.
3. One line in `APPS` in `supabase/functions/admin-products/index.ts` (id, name, functionUrl, secretEnv,
   Android package) → deploy `admin-products`.
4. First run: preview only, read the numbers, then execute on a seeded test set.

## Admin sign-in and the legacy password (decision D2)
While the shared password is still accepted, the login screen shows a small "use legacy key" link. When
Google sign-in has worked for two weeks:
```
npx supabase secrets set ADMIN_LEGACY_KEY_ENABLED=false
```
No redeploy needed. Add or disable admins with one row in `admin_users` (see `ADMIN_SIGNIN_SETUP.md`).

## Where things are recorded
- Hub: `admin_audit_log` (who, when, action, product, outcome, status, before/after summary; codes and
  keys are scrubbed). The **History** table on the screen reads it.
- Product: `internal.fresh_start_runs` (preview and execute runs with counts) and
  `internal.fresh_start_confirmations` (codes, used/expired).
- Repo records for applies and one-off script runs stay in each repo's `docs/ops/` or `audit-*/`.
