-- ═══════════════════════════════════════════════════════════
-- 067 — Add category + linkedin to access_requests
-- ═══════════════════════════════════════════════════════════

ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS linkedin  TEXT;
