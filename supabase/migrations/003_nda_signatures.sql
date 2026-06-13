-- ═══════════════════════════════════════════════════════════
-- MOMENCRAFTS — Migration 003: NDA Signatures & Token Lifecycle
-- Adds digital signature tracking for investor NDAs
-- ═══════════════════════════════════════════════════════════

-- NDA Signatures table
CREATE TABLE IF NOT EXISTS investor_nda_signatures (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id       UUID REFERENCES investor_tokens(id) ON DELETE CASCADE,
  signer_name    TEXT NOT NULL,
  signer_email   TEXT,
  signature_data TEXT,           -- base64 canvas signature or typed name
  signature_type TEXT DEFAULT 'typed' CHECK (signature_type IN ('typed', 'drawn')),
  ip_address     TEXT,
  user_agent     TEXT,
  signed_at      TIMESTAMPTZ DEFAULT now()
);

-- Add NDA tracking columns to investor_tokens
ALTER TABLE investor_tokens ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMPTZ;
ALTER TABLE investor_tokens ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;

-- RLS: public can insert signatures (for signing), admin reads via service key
ALTER TABLE investor_nda_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert for NDA signing"
  ON investor_nda_signatures FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Allow service role full access"
  ON investor_nda_signatures FOR ALL
  USING (true);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_nda_sig_token ON investor_nda_signatures(token_id);
