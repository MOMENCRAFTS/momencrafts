-- 079_admin_auth.sql
-- Real admin identity for admin.momencrafts.com
-- Plan: docs/plan/2026-09-23-fresh-start-console.md, Phase 1 · decisions D1 (Momen only), D3 (second factor)
--
-- admin_users     : who may use the admin panel (Google sign-in + authenticator code, checked by
--                   supabase/functions/_shared/adminAuth.ts). Only the service role reads it.
-- admin_audit_log : what every admin call did. Append-only.
--
-- Idempotent — safe to run twice.

-- ── admin_users ──
CREATE TABLE IF NOT EXISTS admin_users (
  email       text PRIMARY KEY CHECK (email = lower(email)),
  role        text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'viewer')),
  added_by    text,
  added_at    timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_users service role" ON admin_users;
CREATE POLICY "admin_users service role"
  ON admin_users USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- D1: Momen only. A second owner is one INSERT away:
--   INSERT INTO admin_users (email, role, added_by) VALUES ('<email>', 'owner', 'momen');
INSERT INTO admin_users (email, role, added_by)
VALUES ('momen@momencrafts.com', 'owner', 'migration 079 (decision D1, 2026-09-23)')
ON CONFLICT (email) DO NOTHING;

-- ── admin_audit_log ──
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at          timestamptz NOT NULL DEFAULT now(),
  actor_email text,                                   -- NULL when the call was refused before identity
  action      text NOT NULL,                          -- '<function>.<action>', e.g. 'admin-manage-token.revoke'
  app_id      text,                                   -- product id for fresh-start actions (Phase 4), else NULL
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,     -- scrubbed: never codes, keys, tokens or secrets
  outcome     text NOT NULL CHECK (outcome IN ('ok', 'denied', 'failed')),
  ip          text
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_at     ON admin_audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log (action, at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_log service role" ON admin_audit_log;
CREATE POLICY "admin_audit_log service role"
  ON admin_audit_log USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Append-only from the API side: rows are never edited or removed through PostgREST.
REVOKE UPDATE, DELETE ON admin_audit_log FROM anon, authenticated;
