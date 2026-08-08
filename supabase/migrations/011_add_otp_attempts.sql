-- ═══════════════════════════════════════════════════════════
-- Migration: Add OTP attempt tracking to access_requests
-- Required by verify-phone rate limiting (Phase 2.2)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS otp_attempts integer DEFAULT 0;
