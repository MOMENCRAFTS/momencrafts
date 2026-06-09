-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS — Investor Portal Database Schema
-- Supabase PostgreSQL
-- ═══════════════════════════════════════════════════════════

-- 1. investor_tokens
-- One row per investor access key
CREATE TABLE IF NOT EXISTS investor_tokens (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token          TEXT NOT NULL UNIQUE,              -- MCR-XXXXXXXX
  label          TEXT NOT NULL,                      -- 'Ahmed Al-Rashidi — STV'
  email          TEXT,                               -- optional
  notes          TEXT,                               -- 'Met at LEAP 2026'
  token_type     TEXT NOT NULL CHECK (token_type IN ('HOUR','WEEK','MONTH','PERMANENT')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  expires_at     TIMESTAMPTZ,                        -- NULL for PERMANENT
  revoked_at     TIMESTAMPTZ,
  revoke_reason  TEXT,
  created_by     TEXT DEFAULT 'admin'                -- future: Google OAuth email
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_tokens_token ON investor_tokens(token);

-- 2. investor_sessions
-- One row per valid token entry (gate → room)
CREATE TABLE IF NOT EXISTS investor_sessions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id       UUID NOT NULL REFERENCES investor_tokens(id) ON DELETE CASCADE,
  session_key    TEXT NOT NULL UNIQUE,               -- random session key
  started_at     TIMESTAMPTZ DEFAULT now(),
  ended_at       TIMESTAMPTZ,
  user_agent     TEXT,
  ip_address     TEXT,
  nda_accepted   BOOLEAN DEFAULT FALSE,
  nda_accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON investor_sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_sessions_key   ON investor_sessions(session_key);

-- 3. investor_events
-- Analytics event log
CREATE TABLE IF NOT EXISTS investor_events (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id     UUID REFERENCES investor_sessions(id) ON DELETE CASCADE,
  token_id       UUID REFERENCES investor_tokens(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL,
  -- Types: room_enter, room_exit, section_view, section_exit,
  --        card_expand, doc_download, cta_click, heartbeat,
  --        focus_lost, focus_returned, print_attempt, shortcut_blocked,
  --        nda_accepted, session_expired
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_session ON investor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_token   ON investor_events(token_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON investor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_time    ON investor_events(created_at DESC);

-- 4. investor_failed_attempts
-- Brute-force / invalid token tracking
CREATE TABLE IF NOT EXISTS investor_failed_attempts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_token TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_ip ON investor_failed_attempts(ip_address);

-- ═══════════════════════════════════════════════════════════
-- VIEWS for Admin Dashboard
-- ═══════════════════════════════════════════════════════════

-- Investor overview: last seen, session count, dwell time
CREATE OR REPLACE VIEW investor_overview AS
SELECT
  t.id AS token_id,
  t.label,
  t.email,
  t.token,
  t.token_type,
  t.created_at AS token_created,
  t.expires_at,
  t.revoked_at,
  COUNT(DISTINCT s.id) AS session_count,
  MAX(s.started_at) AS last_session_at,
  CASE
    WHEN t.revoked_at IS NOT NULL THEN 'revoked'
    WHEN t.expires_at IS NOT NULL AND t.expires_at < now() THEN 'expired'
    WHEN COUNT(s.id) = 0 THEN 'never'
    ELSE 'active'
  END AS status
FROM investor_tokens t
LEFT JOIN investor_sessions s ON s.token_id = t.id
GROUP BY t.id;

-- Section dwell aggregation
CREATE OR REPLACE VIEW section_dwell AS
SELECT
  t.label AS investor,
  e.metadata->>'section_id' AS section_id,
  COUNT(*) AS view_count,
  SUM((e.metadata->>'duration_ms')::int) / 1000.0 AS total_seconds
FROM investor_events e
JOIN investor_sessions s ON s.id = e.session_id
JOIN investor_tokens t ON t.id = s.token_id
WHERE e.event_type = 'section_exit'
  AND e.metadata->>'duration_ms' IS NOT NULL
GROUP BY t.label, e.metadata->>'section_id';

-- Card expand counts
CREATE OR REPLACE VIEW card_expand_counts AS
SELECT
  e.metadata->>'product_id' AS product_id,
  COUNT(*) AS expand_count,
  COUNT(DISTINCT s.token_id) AS unique_investors
FROM investor_events e
JOIN investor_sessions s ON s.id = e.session_id
WHERE e.event_type = 'card_expand'
GROUP BY e.metadata->>'product_id'
ORDER BY expand_count DESC;

-- Today's sessions
CREATE OR REPLACE VIEW sessions_today AS
SELECT
  s.*,
  t.label,
  t.email,
  t.token_type
FROM investor_sessions s
JOIN investor_tokens t ON t.id = s.token_id
WHERE s.started_at >= CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════
-- RLS (Row Level Security) — disabled for edge functions
-- Edge functions use service_role key with --no-verify-jwt
-- ═══════════════════════════════════════════════════════════
ALTER TABLE investor_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_failed_attempts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically
-- No public policies needed — all access is via edge functions
