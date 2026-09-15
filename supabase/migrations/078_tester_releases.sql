-- 078_tester_releases.sql
-- Per-release changelog + notification audit log

-- ── co_releases: one row per app+version ──
CREATE TABLE IF NOT EXISTS co_releases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      text NOT NULL REFERENCES co_downloads(app_id) ON DELETE CASCADE,
  version     text NOT NULL,
  changelog   text,
  released_at timestamptz DEFAULT now(),
  notified_at timestamptz,
  UNIQUE (app_id, version)
);
CREATE INDEX IF NOT EXISTS idx_co_releases_app
  ON co_releases(app_id, released_at DESC);

ALTER TABLE co_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "co_releases service role"
  ON co_releases USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── tester_notifications: audit trail + duplicate guard ──
CREATE TABLE IF NOT EXISTS tester_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id     text NOT NULL REFERENCES co_downloads(app_id) ON DELETE CASCADE,
  version    text NOT NULL,
  token_id   uuid REFERENCES investor_tokens(id) ON DELETE CASCADE,
  sent_to    text NOT NULL,
  sent_at    timestamptz DEFAULT now(),
  UNIQUE (app_id, version, token_id)
);

ALTER TABLE tester_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tester_notifications service role"
  ON tester_notifications USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed a release row for any app that already has a build
INSERT INTO co_releases (app_id, version)
SELECT app_id, version FROM co_downloads WHERE apk_path IS NOT NULL
ON CONFLICT (app_id, version) DO NOTHING;
