-- ═══════════════════════════════════════════════════════════
-- 066 — Self-Service Access Requests
-- Tracks visitors who request a 30-min token via phone OTP
-- ═══════════════════════════════════════════════════════════

-- 1. Expand token_type to include HALF_HOUR
ALTER TABLE investor_tokens
  DROP CONSTRAINT IF EXISTS investor_tokens_token_type_check;

ALTER TABLE investor_tokens
  ADD CONSTRAINT investor_tokens_token_type_check
  CHECK (token_type IN (
    'HALF_HOUR','HOUR','WEEK','MONTH','3MONTH',
    'PERMANENT','STRATEGIC','COFOUNDER','FOUNDER'
  ));

-- 2. Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  company        TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  status         TEXT NOT NULL DEFAULT 'pending_verification'
                   CHECK (status IN (
                     'pending_verification','verified','expired','rejected'
                   )),
  token_id       UUID REFERENCES investor_tokens(id),
  created_at     TIMESTAMPTZ DEFAULT now(),
  verified_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_access_req_phone  ON access_requests(phone);
CREATE INDEX IF NOT EXISTS idx_access_req_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_req_ip     ON access_requests(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_req_time   ON access_requests(created_at DESC);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
-- No public policies — all access via edge functions (service_role)
