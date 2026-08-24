-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS — Migration 076: Tester Portal
--
-- Adds the data a gated tester portal needs on top of the existing
-- co_downloads registry, plus a download audit trail.
--
-- Design notes:
--   • co_downloads already carries app_id / name / version / status /
--     apk_url / testflight, so the tester portal reuses it rather than
--     introducing a second source of truth for "what apps exist".
--   • `visible` stays the investor-portal flag. `tester_visible` is a
--     SEPARATE flag so an app can be shown to testers without appearing
--     in the investor Test & Shape section, and vice versa.
--   • apk_path is the object path inside the PRIVATE storage bucket. The
--     tester-apk edge function mints short-lived signed URLs from it.
--     apk_url (public link) is left untouched for the investor flow.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. co_downloads: tester-facing columns ───────────────
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS tester_visible BOOLEAN DEFAULT FALSE;
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS apk_path       TEXT;      -- object path in the private bucket
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS guide_url      TEXT;      -- user guide / release notes
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS build_date     DATE;
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS min_android    TEXT;      -- e.g. 'Android 9+'
ALTER TABLE co_downloads ADD COLUMN IF NOT EXISTS test_stage     TEXT
  CHECK (test_stage IS NULL OR test_stage IN ('alpha','beta','rc','stable'));

COMMENT ON COLUMN co_downloads.tester_visible IS
  'Show this app in the /tester portal. Independent of `visible` (investor portal).';
COMMENT ON COLUMN co_downloads.apk_path IS
  'Object path inside the private tester-apks bucket. Signed on demand by the tester-apk function.';

-- ─── 2. Download audit trail ──────────────────────────────
-- One row per signed URL issued. This is the point of gating: you can see
-- who pulled which build and when, and revoking a token stops future pulls.
CREATE TABLE IF NOT EXISTS tester_downloads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id    UUID REFERENCES investor_tokens(id) ON DELETE CASCADE,
  app_id      TEXT NOT NULL,
  version     TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tester_dl_token ON tester_downloads(token_id);
CREATE INDEX IF NOT EXISTS idx_tester_dl_app   ON tester_downloads(app_id, created_at DESC);

ALTER TABLE tester_downloads ENABLE ROW LEVEL SECURITY;
-- Service role only. No public policy: the edge function is the sole writer,
-- and nothing client-side should ever read this table.
CREATE POLICY "tester_downloads service role"
  ON tester_downloads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 3. Separate testing terms from the investor NDA ──────
ALTER TABLE investor_nda_signatures
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'NDA';

COMMENT ON COLUMN investor_nda_signatures.doc_type IS
  'NDA for investors, TESTING_TERMS for app testers. Same audit table, different document.';

CREATE INDEX IF NOT EXISTS idx_nda_sig_doc_type ON investor_nda_signatures(doc_type);

-- ─── 4. Seed: which apps testers currently see ────────────
-- Ummi Wallet, RelayBot, RogerAI and Cliniq are in active testing.
UPDATE co_downloads SET tester_visible = TRUE
 WHERE app_id IN (
   'ummi', 'ummi-admin',
   'relaybot',
   'rogerai',
   'cliniq-patient', 'cliniq-doctor'
 );

-- The Ummi admin panel is a second APK that the investor registry never had.
INSERT INTO co_downloads (app_id, name, name_ar, version, status, emoji, size, description, sort_order, visible, tester_visible)
VALUES (
  'ummi-admin', 'Ummi Wallet — Admin', 'محفظة أمي — لوحة الإدارة',
  'v3.1.0', 'beta', '🛠️', '48 MB',
  'Parent/admin panel for Ummi Wallet — pockets, allowances and household controls.',
  60, FALSE, TRUE
)
ON CONFLICT (app_id) DO UPDATE SET tester_visible = TRUE;

-- Sensible defaults so cards do not render half-empty before you fill them in.
UPDATE co_downloads
   SET test_stage = COALESCE(test_stage, CASE status
         WHEN 'live' THEN 'stable'
         WHEN 'beta' THEN 'beta'
         ELSE 'alpha' END)
 WHERE tester_visible = TRUE;
