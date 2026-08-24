-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS — Migration 077: Selective tester access
--
-- 076 gated downloads on investor_tokens.project_access, where an
-- EMPTY array means "all apps". That is the right default for an
-- investor and the wrong one for a tester: a TESTER token created
-- without a selection would see every build in testing.
--
-- This migration replaces that with explicit assignment, and adds a
-- discovery path so a tester can ask to join a programme they can see
-- but have not been given.
--
-- Visibility becomes three states per app:
--   tester_visible = false                     → not in testing, nobody sees it
--   tester_visible = true,  open_enrolment = false → assigned testers only (private)
--   tester_visible = true,  open_enrolment = true  → listed to every tester as joinable
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Discovery flag ────────────────────────────────────
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS open_enrolment BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN co_downloads.open_enrolment IS
  'List this programme to every tester as joinable. Requires tester_visible. Joining still needs approval.';

-- ─── 2. Explicit assignment ───────────────────────────────
-- One row per (tester, app). No implicit "all" — an unassigned app is
-- simply not downloadable, and the table doubles as the grant audit.
CREATE TABLE IF NOT EXISTS tester_assignments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id    UUID NOT NULL REFERENCES investor_tokens(id) ON DELETE CASCADE,
  app_id      TEXT NOT NULL REFERENCES co_downloads(app_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by TEXT,                       -- 'admin' | 'request-approval'
  note        TEXT,
  UNIQUE (token_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_tester_assign_token ON tester_assignments(token_id);
CREATE INDEX IF NOT EXISTS idx_tester_assign_app   ON tester_assignments(app_id);

ALTER TABLE tester_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tester_assignments service role"
  ON tester_assignments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 3. Join requests ─────────────────────────────────────
-- A tester asks for an open-enrolment programme; approval creates the
-- assignment row above. Partial unique index so one pending request
-- per (tester, app) is possible while history is preserved.
CREATE TABLE IF NOT EXISTS tester_join_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id    UUID NOT NULL REFERENCES investor_tokens(id) ON DELETE CASCADE,
  app_id      TEXT NOT NULL REFERENCES co_downloads(app_id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'denied')),
  message     TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  decided_at  TIMESTAMPTZ,
  decided_by  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tester_req_one_pending
  ON tester_join_requests(token_id, app_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tester_req_status ON tester_join_requests(status, created_at DESC);

ALTER TABLE tester_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tester_join_requests service role"
  ON tester_join_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 4. Carry over 076's implicit grants ──────────────────
-- Any TESTER token that already relied on project_access keeps exactly
-- the apps it could reach before, so nobody loses access on deploy.
INSERT INTO tester_assignments (token_id, app_id, assigned_by, note)
SELECT t.id, d.app_id, 'migration-077', 'carried over from project_access'
  FROM investor_tokens t
  CROSS JOIN co_downloads d
 WHERE t.token_type = 'TESTER'
   AND d.tester_visible = TRUE
   AND (
        COALESCE(array_length(t.project_access, 1), 0) = 0   -- empty meant "all"
        OR d.app_id = ANY (t.project_access)
       )
ON CONFLICT (token_id, app_id) DO NOTHING;

-- ─── 5. Open the programmes that are safe to advertise ────
-- Cliniq and RelayBot are fine to list publicly to testers. Ummi stays
-- private — it handles real household money, so it is invitation only.
UPDATE co_downloads SET open_enrolment = TRUE
 WHERE app_id IN ('cliniq-patient', 'cliniq-doctor', 'relaybot', 'rogerai')
   AND tester_visible = TRUE;
