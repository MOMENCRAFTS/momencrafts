# Admin sign-in — what Momen sets up, and how to switch on

Plan: `docs/plan/2026-09-23-fresh-start-console.md`, Phase 1. Decisions: D1 (Momen only), D2 (shared
password removed after a transition), D3 (authenticator code required).

The code in this repo is ready and NOT deployed. Nothing below runs until Momen says so.

## 1. Google sign-in — one-time setup in two dashboards (Momen)

1. **Google Cloud** → the project you use for momencrafts.com → APIs & Services → Credentials →
   *Create credentials → OAuth client ID → Web application*.
   - Authorised JavaScript origins: `https://admin.momencrafts.com` and `http://localhost:5173`
   - Authorised redirect URI: `https://isciigqmdfcozrtojqcm.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client secret (keep them in the dashboards only, never in chat or files).
2. **Supabase** → project `isciigqmdfcozrtojqcm` → Authentication → Providers → **Google**: enable,
   paste Client ID + secret, save.
3. Supabase → Authentication → URL Configuration → *Redirect URLs*: add
   `https://admin.momencrafts.com/**` and `http://localhost:5173/**`.
4. Supabase → Authentication → Multi-Factor → make sure **TOTP** (authenticator app) is enabled.
   It is on by default; this is only a check.

## 2. Apply and deploy (Claude, after `npx supabase login` by Momen and his word)

```
npx supabase db query --linked -f supabase/migrations/079_admin_auth.sql
npx supabase functions deploy admin-manage-token admin-manage-testers admin-manage-co admin-get-analytics xhb-manage-access
```
Then deploy the site as usual (Vercel builds from `master`).

## 3. First sign-in (Momen)

1. Open admin.momencrafts.com → **Sign in with Google** → pick momen@momencrafts.com.
2. The screen shows a QR code once. Scan it with Google Authenticator / Authy / 1Password, enter the
   6 digits. From then on every sign-in asks for the 6 digits after Google.
3. The panel loads. Any other Google account is told "not an admin" and signed out.

If Momen ever loses the authenticator: Supabase dashboard → Authentication → Users → his user →
*Factors* → remove the TOTP factor → next sign-in shows the QR again.

## 4. Finishing the transition (D2)

During the transition the old shared password still works (the login screen has a small
"use legacy key" link). When the Google sign-in has worked for Momen for two weeks:

```
npx supabase secrets set ADMIN_LEGACY_KEY_ENABLED=false
```
No redeploy needed. The shared password is then refused everywhere, and the legacy link can be
deleted from `AdminScreen.tsx` in a follow-up.

## 5. Adding a second admin later

```sql
INSERT INTO admin_users (email, role, added_by) VALUES ('<email>', 'owner', 'momen');
```
(`role` = `owner` may run fresh starts later; `viewer` may only look.) To remove: set `disabled_at = now()`.

## 6. What is logged

Every admin call that changes something writes a row in `admin_audit_log` (who, when, which
action, scrubbed details, outcome). Refused calls are logged too, with `outcome = 'denied'`.
Codes, keys and tokens are never written to it.
