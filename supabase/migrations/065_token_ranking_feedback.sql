-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS — Migration 065
-- 1. Expand token_type CHECK (add STRATEGIC, COFOUNDER, FOUNDER, 3MONTH)
-- 2. Add nda_signed_at column to investor_tokens
-- 3. Create investor_feedback table (tiered feedback system)
-- ═══════════════════════════════════════════════════════════

-- ── 1. Fix token_type CHECK constraint ───────────────────
ALTER TABLE investor_tokens
  DROP CONSTRAINT IF EXISTS investor_tokens_token_type_check;

ALTER TABLE investor_tokens
  ADD CONSTRAINT investor_tokens_token_type_check
  CHECK (token_type IN (
    'HOUR', 'WEEK', 'MONTH', '3MONTH',
    'PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'
  ));

-- ── 2. Add nda_signed_at ────────────────────────────────
ALTER TABLE investor_tokens
  ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMPTZ;

-- ── 3. investor_feedback table ──────────────────────────
-- One row per feedback submission
-- feedback_type: reaction | note | idea | intro | voice | private | ballot
CREATE TABLE IF NOT EXISTS investor_feedback (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id        UUID REFERENCES investor_tokens(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,           -- 'roger', 'cliniq', 'ummi', etc.
  feedback_type   TEXT NOT NULL CHECK (feedback_type IN (
                    'composite','reaction','note','idea','intro','voice','private','ballot'
                  )),
  payload         JSONB DEFAULT '{}',      -- all feedback fields
  token_tier      TEXT,                    -- 'visitor' | 'cofounder'
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_token   ON investor_feedback(token_id);
CREATE INDEX IF NOT EXISTS idx_feedback_product ON investor_feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type    ON investor_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_time    ON investor_feedback(created_at DESC);

ALTER TABLE investor_feedback ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS automatically

-- ── 4. View: feedback summary per product ────────────────
CREATE OR REPLACE VIEW feedback_summary AS
SELECT
  f.product_id,
  COUNT(*)                                                        AS total_submissions,
  COUNT(DISTINCT f.token_id)                                      AS unique_contributors,
  ROUND(AVG((f.payload->>'stars')::numeric) FILTER (WHERE f.payload->>'stars' IS NOT NULL), 1) AS avg_stars,
  COUNT(*) FILTER (WHERE f.payload->>'reaction' = 'love')         AS love_count,
  COUNT(*) FILTER (WHERE f.payload->>'reaction' = 'interesting')  AS interesting_count,
  COUNT(*) FILTER (WHERE f.payload->>'reaction' = 'potential')    AS potential_count,
  COUNT(*) FILTER (WHERE f.payload->>'reaction' = 'pass')         AS pass_count,
  COUNT(*) FILTER (WHERE f.payload->>'idea' IS NOT NULL)          AS idea_count,
  COUNT(*) FILTER (WHERE f.payload->>'intro' IS NOT NULL)         AS intro_count
FROM investor_feedback f
GROUP BY f.product_id
ORDER BY total_submissions DESC;
