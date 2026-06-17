-- ═══════════════════════════════════════════════════════════
-- 067 — Add extended fields to access_requests
-- ═══════════════════════════════════════════════════════════

ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS category        TEXT,
  ADD COLUMN IF NOT EXISTS linkedin         TEXT,
  ADD COLUMN IF NOT EXISTS company          TEXT,
  ADD COLUMN IF NOT EXISTS job_title        TEXT,
  ADD COLUMN IF NOT EXISTS referral_source  TEXT,
  ADD COLUMN IF NOT EXISTS message          TEXT;
