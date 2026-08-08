-- ═══════════════════════════════════════════════════════════════════════════
-- XHB Access Gate — Parts B + C: Phone identity, gate tables, RLS fix
-- Run after 012_xhb_schema_content.sql (which creates the xhb schema).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS MIGRATION DOES
-- ────────────────────────
-- B.1  Adds phone column to public.allowed_users
-- B.2  Seeds both founders (Mulham + Momen) with placeholder phones
-- B.3  Creates xhb.gate_attempts for OTP rate-limiting (sha256 phone hash)
-- B.4  Creates xhb.gate_log for audit trail
-- C.1  Creates xhb.current_email() — resolves identity from email OR phone JWT
-- C.2  Creates xhb.is_allowed() — routes through current_email()
-- C.3  Rewrites public.is_allowed() and public.jwt_email() as wrappers
-- C.4  Drops and recreates ALL RLS policies to use xhb.is_allowed()
-- C.5  Line-by-line annotation of the three seal policies (answers_*)
--
-- SECURITY NOTE
-- ─────────────
-- The dedicated database role for the edge function is DEFERRED.
-- Supabase edge functions use the service key, not arbitrary PG roles.
-- A scoped role would require direct PG connections (larger change).
-- For now: separate schemas, explicit grant review, and confirmation
-- that NO MomenCrafts edge function queries any xhb.* table.
-- Noted as a later hardening item.
--
-- ═══════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════
-- B.1  Add phone column to allowed_users
-- ═════════════════════════════════════════════════════════════════════════

ALTER TABLE public.allowed_users
  ADD COLUMN IF NOT EXISTS phone text;

-- Unique index: one phone per founder, NULLs allowed (not yet assigned)
CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_users_phone
  ON public.allowed_users(phone) WHERE phone IS NOT NULL;


-- ═════════════════════════════════════════════════════════════════════════
-- B.2  Seed both founders
--      ⚠ REPLACE the +966XXXXXXXXX / +966YYYYYYYYY placeholders with
--        real E.164 phone numbers BEFORE running this migration.
-- ═════════════════════════════════════════════════════════════════════════

-- Mulham — was never seeded; only Momen existed in setup_v2.sql
INSERT INTO public.allowed_users (email, display_name, phone)
VALUES ('mulham@xhb.sa', 'Mulham', '+966XXXXXXXXX')
ON CONFLICT (email) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      phone = COALESCE(public.allowed_users.phone, EXCLUDED.phone);

-- Momen — add phone to existing row
UPDATE public.allowed_users
SET phone = '+966YYYYYYYYY'
WHERE email = 'momen@momencrafts.com'
  AND phone IS NULL;


-- ═════════════════════════════════════════════════════════════════════════
-- B.3  Gate attempts — rate-limiting table (per hashed phone)
--      The edge function writes sha256(phone), never the raw number.
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.gate_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash   text        NOT NULL,             -- sha256(normalised phone)
  attempts     int         NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz                        -- set after 5 attempts/hr
);

CREATE INDEX IF NOT EXISTS idx_gate_attempts_hash
  ON xhb.gate_attempts(phone_hash);

ALTER TABLE xhb.gate_attempts ENABLE ROW LEVEL SECURITY;
-- No public policies — service role only (edge function)


-- ═════════════════════════════════════════════════════════════════════════
-- B.4  Gate log — audit trail
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.gate_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash text        NOT NULL,
  outcome    text        NOT NULL,               -- 'otp_sent','denied','locked','error'
  ip         text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_log_time
  ON xhb.gate_log(created_at DESC);

ALTER TABLE xhb.gate_log ENABLE ROW LEVEL SECURITY;
-- No public policies — service role only (edge function)


-- ═════════════════════════════════════════════════════════════════════════
-- C.1  xhb.current_email() — identity resolver
-- ═════════════════════════════════════════════════════════════════════════
--
-- WHY: Phone-OTP sessions carry a 'phone' claim but no 'email' claim
-- in auth.jwt(). Every downstream check (RLS, sealed answers) needs an
-- email address to compare against. This function resolves:
--   1. If the JWT has an email → return it (email-based auth, magic link)
--   2. If the JWT has a phone → look up the email in allowed_users
--   3. Otherwise → return '' (deny everything)
--
-- SECURITY DEFINER: runs as the function owner (postgres) so it can
-- read allowed_users even when the caller has no RLS policy yet.

CREATE OR REPLACE FUNCTION xhb.current_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Path 1: JWT has an email claim (magic link / email OTP)
    NULLIF(lower(TRIM(auth.jwt() ->> 'email')), ''),
    -- Path 2: JWT has a phone claim (phone OTP) → resolve via allowed_users
    (SELECT lower(a.email)
     FROM public.allowed_users a
     WHERE a.phone IS NOT NULL
       AND a.phone = (auth.jwt() ->> 'phone')
     LIMIT 1),
    -- Path 3: neither → empty string (will fail is_allowed)
    ''
  );
$$;


-- ═════════════════════════════════════════════════════════════════════════
-- C.2  xhb.is_allowed() — allowlist check via current_email()
-- ═════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION xhb.is_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_users a
    WHERE lower(a.email) = xhb.current_email()
  );
$$;


-- ═════════════════════════════════════════════════════════════════════════
-- C.3  Replace public.is_allowed() and public.jwt_email() as thin wrappers
--      so any code still referencing them gets the phone-aware behaviour.
-- ═════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT xhb.is_allowed();
$$;

CREATE OR REPLACE FUNCTION public.jwt_email()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT xhb.current_email();
$$;


-- ═════════════════════════════════════════════════════════════════════════
-- C.4  Drop and recreate ALL RLS policies
-- ═════════════════════════════════════════════════════════════════════════

-- ── Drop existing policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS allowed_read    ON public.allowed_users;
DROP POLICY IF EXISTS sessions_all    ON public.sessions;
DROP POLICY IF EXISTS questions_all   ON public.questions;
DROP POLICY IF EXISTS plan_items_all  ON public.plan_items;
DROP POLICY IF EXISTS updates_all     ON public.updates;
DROP POLICY IF EXISTS documents_all   ON public.documents;
DROP POLICY IF EXISTS nudges_all      ON public.nudges;
DROP POLICY IF EXISTS episodes_all    ON public.episodes;
DROP POLICY IF EXISTS answers_select  ON public.answers;
DROP POLICY IF EXISTS answers_insert  ON public.answers;
DROP POLICY IF EXISTS answers_update  ON public.answers;

-- Drop Part A content policies (will recreate with xhb.is_allowed)
DROP POLICY IF EXISTS content_read    ON xhb.content;
DROP POLICY IF EXISTS templates_read  ON xhb.question_templates;

-- ── Allowlist table ─────────────────────────────────────────────────────
CREATE POLICY allowed_read ON public.allowed_users
  FOR SELECT TO authenticated
  USING (xhb.is_allowed());

-- ── Shared tables: full CRUD for allowlisted founders ───────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sessions','questions','plan_items','updates',
    'documents','nudges','episodes'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I_all ON public.%I '
      'FOR ALL TO authenticated '
      'USING (xhb.is_allowed()) '
      'WITH CHECK (xhb.is_allowed())',
      t, t
    );
  END LOOP;
END $$;

-- ── Content tables (xhb schema) ────────────────────────────────────────
CREATE POLICY content_read ON xhb.content
  FOR SELECT TO authenticated USING (xhb.is_allowed());

CREATE POLICY templates_read ON xhb.question_templates
  FOR SELECT TO authenticated USING (xhb.is_allowed());


-- ═════════════════════════════════════════════════════════════════════════
-- C.5  Seal policies — line-by-line annotation
-- ═════════════════════════════════════════════════════════════════════════
--
-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_select                                                      │
-- │                                                                     │
-- │ PURPOSE: A founder can read their own sealed answers at any time.   │
-- │ They can read the partner's answer ONLY after the question status   │
-- │ moves past 'sealed' (i.e. 'revealed' or 'resolved').               │
-- │                                                                     │
-- │ CHANGE: public.is_allowed() → xhb.is_allowed()                     │
-- │         public.jwt_email()  → xhb.current_email()                  │
-- │                                                                     │
-- │ WHY: Phone-OTP sessions have no email in the JWT. Without this     │
-- │ change, a phone-authenticated founder would see zero answers.       │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE POLICY answers_select ON public.answers
  FOR SELECT TO authenticated
  USING (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND (
      author_email = xhb.current_email()          -- always see your own answers
      OR EXISTS (                                  -- see partner's answer only when
        SELECT 1 FROM public.questions q           --   the question has been revealed
        WHERE q.id = question_id                   --   or resolved (status <> 'sealed')
          AND q.status <> 'sealed'
      )
    )
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_insert                                                      │
-- │                                                                     │
-- │ PURPOSE: A founder can only insert answers attributed to their own  │
-- │ email address. Prevents impersonation.                              │
-- │                                                                     │
-- │ CHANGE: public.is_allowed() → xhb.is_allowed()                     │
-- │         public.jwt_email()  → xhb.current_email()                  │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE POLICY answers_insert ON public.answers
  FOR INSERT TO authenticated
  WITH CHECK (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND author_email = xhb.current_email()        -- can only write as yourself
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_update                                                      │
-- │                                                                     │
-- │ PURPOSE: A founder can update their own answer ONLY while the       │
-- │ question is still sealed. Once revealed, answers are frozen.        │
-- │                                                                     │
-- │ CHANGE: public.is_allowed() → xhb.is_allowed()   (USING clause)    │
-- │         public.jwt_email()  → xhb.current_email() (USING clause)   │
-- │         public.jwt_email()  → xhb.current_email() (WITH CHECK)     │
-- │                                                                     │
-- │ INVARIANT PRESERVED: The sealed-only guard remains identical.       │
-- │ "exists (... q.status = 'sealed')" is unchanged.                    │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE POLICY answers_update ON public.answers
  FOR UPDATE TO authenticated
  USING (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND author_email = xhb.current_email()        -- can only edit your own answer
    AND EXISTS (                                   -- ONLY while the question is sealed
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
        AND q.status = 'sealed'
    )
  )
  WITH CHECK (
    author_email = xhb.current_email()            -- row must still be attributed to you
  );


-- ═════════════════════════════════════════════════════════════════════════
-- DONE — Parts B + C applied.
--
-- VERIFICATION CHECKLIST:
--   ✓ xhb.current_email() returns email for email-JWT sessions
--   ✓ xhb.current_email() resolves phone→email for phone-JWT sessions
--   ✓ xhb.is_allowed() works for both auth paths
--   ✓ answers_select: own sealed answer visible, partner's answer hidden
--   ✓ answers_insert: can only insert as yourself
--   ✓ answers_update: can only edit own answer while question is sealed
--   ✓ No existing answers_select/insert/update invariant was weakened
--   ✓ Gate tables (gate_attempts, gate_log) are service-role only
-- ═════════════════════════════════════════════════════════════════════════
