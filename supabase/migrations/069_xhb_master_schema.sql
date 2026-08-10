-- ═══════════════════════════════════════════════════════════════════════════
-- 069: XHB Master Schema — The One Migration
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This migration consolidates XHB into the xhb.* schema:
--   1. Moves core tables from public.* → xhb.* (allowed_users, sessions,
--      questions, answers, plan_items, updates, documents, nudges, episodes)
--   2. Hardens tables: updated_at triggers, deleted_at soft delete,
--      FK ON DELETE RESTRICT, indexes on FK columns
--   3. Adds provenance columns: revealed_by/at, resolved_by on questions
--   4. Adds identity/role columns: tier, is_superadmin, disabled_at
--   5. Creates new tables: decision_revisions, access_log, enrolment_tokens,
--      artifacts, artifact_versions, findings, api_keys
--   6. Rewrites xhb.current_email() and xhb.is_allowed() to use xhb.allowed_users
--   7. Drops old public.* RLS policies, creates new xhb.* policies
--   8. Seeds founders: Momen (founder/superadmin), Mulham (guest, placeholder)
--   9. Converts existing documents to artifacts
--
-- IDEMPOTENT: safe to re-run. Uses IF NOT EXISTS, DO blocks, upserts.
--
-- PREREQUISITE: 012_xhb_schema_content.sql (creates xhb schema)
--               013_xhb_gate_rls.sql (creates gate tables, functions)
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- §0  Drop the hard CHECK from migration 068
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.allowed_users
  DROP CONSTRAINT IF EXISTS allowed_users_momen_only;


-- ═══════════════════════════════════════════════════════════════════════════
-- §1  Helper: updated_at trigger function (shared by all tables)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION xhb.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §2  xhb.allowed_users — identity & roles
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS xhb.allowed_users (
  email          text        PRIMARY KEY,
  phone          text,                                -- E.164, unique where not null
  display_name   text        NOT NULL DEFAULT '',
  tier           text        NOT NULL DEFAULT 'guest'
                             CHECK (tier IN ('founder', 'guest')),
  is_superadmin  boolean     NOT NULL DEFAULT false,
  disabled_at    timestamptz,
  added_at       timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xhb_allowed_users_phone
  ON xhb.allowed_users(phone) WHERE phone IS NOT NULL;

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS trg_allowed_users_updated ON xhb.allowed_users;
CREATE TRIGGER trg_allowed_users_updated
  BEFORE UPDATE ON xhb.allowed_users
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- §3  Core tables — sessions, questions, answers
-- ═══════════════════════════════════════════════════════════════════════════

-- Sessions
CREATE TABLE IF NOT EXISTS xhb.sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  template   text        NOT NULL DEFAULT 'custom',
  status     text        NOT NULL DEFAULT 'active',
  archived   boolean     NOT NULL DEFAULT false,
  created_by text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz                              -- soft delete
);

DROP TRIGGER IF EXISTS trg_sessions_updated ON xhb.sessions;
CREATE TRIGGER trg_sessions_updated
  BEFORE UPDATE ON xhb.sessions
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

-- Questions
CREATE TABLE IF NOT EXISTS xhb.questions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid        NOT NULL REFERENCES xhb.sessions(id) ON DELETE RESTRICT,
  position       int         NOT NULL DEFAULT 0,
  prompt         text        NOT NULL,
  context        text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'sealed',
  outcome        text,
  decision       text        NOT NULL DEFAULT '',
  decision_owner text        NOT NULL DEFAULT '',
  revealed_by    text,                                 -- email of who triggered reveal
  revealed_at    timestamptz,
  resolved_by    text,                                 -- email of who logged the outcome
  resolved_at    timestamptz,
  created_by     text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_xhb_questions_session
  ON xhb.questions(session_id);

DROP TRIGGER IF EXISTS trg_questions_updated ON xhb.questions;
CREATE TRIGGER trg_questions_updated
  BEFORE UPDATE ON xhb.questions
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

-- Answers — the seal is a security boundary
CREATE TABLE IF NOT EXISTS xhb.answers (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid        NOT NULL REFERENCES xhb.questions(id) ON DELETE RESTRICT,
  author_email text        NOT NULL,
  body         text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, author_email)
);

CREATE INDEX IF NOT EXISTS idx_xhb_answers_question
  ON xhb.answers(question_id);

DROP TRIGGER IF EXISTS trg_answers_updated ON xhb.answers;
CREATE TRIGGER trg_answers_updated
  BEFORE UPDATE ON xhb.answers
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- §4  Supporting tables — plan_items, updates, documents, nudges, episodes
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.plan_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  detail     text        NOT NULL DEFAULT '',
  phase      text        NOT NULL DEFAULT 'General',
  status     text        NOT NULL DEFAULT 'next',
  owner      text        NOT NULL DEFAULT '',
  due        text        NOT NULL DEFAULT '',
  position   int         NOT NULL DEFAULT 0,
  created_by text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DROP TRIGGER IF EXISTS trg_plan_items_updated ON xhb.plan_items;
CREATE TRIGGER trg_plan_items_updated
  BEFORE UPDATE ON xhb.plan_items
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

CREATE TABLE IF NOT EXISTS xhb.updates (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_email text        NOT NULL,
  body         text        NOT NULL,
  pinned       boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

DROP TRIGGER IF EXISTS trg_updates_updated ON xhb.updates;
CREATE TRIGGER trg_updates_updated
  BEFORE UPDATE ON xhb.updates
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

CREATE TABLE IF NOT EXISTS xhb.documents (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  kind       text        NOT NULL DEFAULT 'other',
  status     text        NOT NULL DEFAULT '',
  url        text        NOT NULL DEFAULT '',
  content    text        NOT NULL DEFAULT '',
  approvals  jsonb       NOT NULL DEFAULT '{}',
  created_by text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DROP TRIGGER IF EXISTS trg_documents_updated ON xhb.documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON xhb.documents
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

CREATE TABLE IF NOT EXISTS xhb.nudges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        REFERENCES xhb.sessions(id) ON DELETE RESTRICT,
  from_email text        NOT NULL,
  to_email   text        NOT NULL,
  message    text        NOT NULL DEFAULT '',
  seen       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_xhb_nudges_session
  ON xhb.nudges(session_id);

CREATE TABLE IF NOT EXISTS xhb.episodes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  url        text        NOT NULL DEFAULT '',
  note       text        NOT NULL DEFAULT '',
  created_by text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DROP TRIGGER IF EXISTS trg_episodes_updated ON xhb.episodes;
CREATE TRIGGER trg_episodes_updated
  BEFORE UPDATE ON xhb.episodes
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- §5  Provenance — decision_revisions (reopening preserves history)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.decision_revisions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       uuid        NOT NULL REFERENCES xhb.questions(id) ON DELETE RESTRICT,
  revision          int         NOT NULL,
  prior_outcome     text,
  prior_decision    text        NOT NULL DEFAULT '',
  prior_owner       text        NOT NULL DEFAULT '',
  prior_resolved_by text,
  prior_resolved_at timestamptz,
  reopened_by       text        NOT NULL,
  reopened_at       timestamptz NOT NULL DEFAULT now(),
  reason            text        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_xhb_revisions_question
  ON xhb.decision_revisions(question_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- §6  Access log — append-only audit trail
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.access_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor      text        NOT NULL,                  -- email or 'system'
  subject    text        NOT NULL DEFAULT '',        -- affected entity (email, token_id, etc.)
  action     text        NOT NULL,                  -- gate_attempt, enrol, revoke, verdict, api_key_create, etc.
  detail     jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xhb_access_log_time
  ON xhb.access_log(created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- §7  Enrolment tokens — guest access tokens issued by superadmin
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.enrolment_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text        NOT NULL UNIQUE,           -- sha256 of plaintext token
  bound_email  text        NOT NULL,
  bound_phone  text        NOT NULL,                   -- E.164
  tier         text        NOT NULL DEFAULT 'guest'
                           CHECK (tier IN ('founder', 'guest')),
  display_name text        NOT NULL DEFAULT '',
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by   text        NOT NULL,                   -- superadmin email
  created_at   timestamptz NOT NULL DEFAULT now(),
  emailed_at   timestamptz,                            -- when auto-email was sent
  redeemed_at  timestamptz,                            -- when token was used
  revoked_at   timestamptz                             -- when token was revoked
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §8  Artifacts — the audit panel
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xhb.artifacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  kind        text        NOT NULL DEFAULT 'note'
                          CHECK (kind IN ('plan', 'report', 'walkthrough',
                                         'decision-brief', 'reference', 'note')),
  status      text        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'under_audit',
                                           'verdict_given', 'closed')),
  verdict     text        CHECK (verdict IS NULL OR verdict IN
                                 ('proceed', 'hold', 'redirect', 'kill')),
  verdict_by  text,
  verdict_at  timestamptz,
  pinned      boolean     NOT NULL DEFAULT false,
  created_by  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

DROP TRIGGER IF EXISTS trg_artifacts_updated ON xhb.artifacts;
CREATE TRIGGER trg_artifacts_updated
  BEFORE UPDATE ON xhb.artifacts
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();

-- Artifact versions — immutable version history
CREATE TABLE IF NOT EXISTS xhb.artifact_versions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES xhb.artifacts(id) ON DELETE RESTRICT,
  version      int         NOT NULL,
  body_md      text        NOT NULL DEFAULT '',
  change_note  text        NOT NULL DEFAULT '',
  published_by text        NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version)
);

CREATE INDEX IF NOT EXISTS idx_xhb_artifact_versions_artifact
  ON xhb.artifact_versions(artifact_id);

-- Findings — audit anchored to heading slugs
CREATE TABLE IF NOT EXISTS xhb.findings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id    uuid        NOT NULL REFERENCES xhb.artifacts(id) ON DELETE RESTRICT,
  version        int         NOT NULL,
  anchor_slug    text        NOT NULL DEFAULT '',     -- heading slug, '' = whole doc
  severity       text        NOT NULL DEFAULT 'minor'
                             CHECK (severity IN ('blocker', 'major', 'minor', 'question')),
  status         text        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'fixed', 'disagree',
                                              'needs_clarification', 'resolved')),
  body           text        NOT NULL DEFAULT '',
  response       text        NOT NULL DEFAULT '',
  raised_by      text        NOT NULL,
  raised_at      timestamptz NOT NULL DEFAULT now(),
  responded_by   text,
  responded_at   timestamptz,
  resolved_at    timestamptz,
  deleted_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_xhb_findings_artifact
  ON xhb.findings(artifact_id);

-- API keys — for external artifact ingestion
CREATE TABLE IF NOT EXISTS xhb.api_keys (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email  text        NOT NULL,
  label        text        NOT NULL DEFAULT '',
  key_hash     text        NOT NULL UNIQUE,           -- sha256 of plaintext key
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,
  last_used_at timestamptz
);


-- ═══════════════════════════════════════════════════════════════════════════
-- §9  Rewrite identity functions to use xhb.allowed_users
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION xhb.current_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = xhb
AS $$
  SELECT COALESCE(
    NULLIF(lower(TRIM(auth.jwt() ->> 'email')), ''),
    (SELECT lower(a.email)
     FROM xhb.allowed_users a
     WHERE a.phone IS NOT NULL
       AND a.phone = (auth.jwt() ->> 'phone')
       AND a.disabled_at IS NULL
     LIMIT 1),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION xhb.is_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = xhb
AS $$
  SELECT EXISTS (
    SELECT 1 FROM xhb.allowed_users a
    WHERE lower(a.email) = xhb.current_email()
      AND a.disabled_at IS NULL
  );
$$;

-- Keep public wrappers for backward compatibility
CREATE OR REPLACE FUNCTION public.is_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT xhb.is_allowed();
$$;

CREATE OR REPLACE FUNCTION public.jwt_email()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT xhb.current_email();
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §10  Migrate data: public.* → xhb.* (idempotent — skips if target has data)
-- ═══════════════════════════════════════════════════════════════════════════

-- Migrate allowed_users (add new columns)
INSERT INTO xhb.allowed_users (email, phone, display_name, tier, is_superadmin, added_at)
  SELECT email, phone, display_name,
         CASE WHEN email = 'momen@momencrafts.com' THEN 'founder' ELSE 'guest' END,
         CASE WHEN email = 'momen@momencrafts.com' THEN true ELSE false END,
         added_at
  FROM public.allowed_users
ON CONFLICT (email) DO NOTHING;

-- Migrate sessions
INSERT INTO xhb.sessions (id, title, template, status, created_by, created_at)
  SELECT id, title, template, status, created_by, created_at
  FROM public.sessions
ON CONFLICT (id) DO NOTHING;

-- Migrate questions
INSERT INTO xhb.questions (id, session_id, position, prompt, context, status,
                           outcome, decision, decision_owner, resolved_at,
                           created_by, created_at)
  SELECT q.id, q.session_id, q.position, q.prompt, q.context, q.status,
         q.outcome, q.decision, q.decision_owner, q.resolved_at,
         q.created_by, q.created_at
  FROM public.questions q
  WHERE EXISTS (SELECT 1 FROM xhb.sessions s WHERE s.id = q.session_id)
ON CONFLICT (id) DO NOTHING;

-- Migrate answers
INSERT INTO xhb.answers (id, question_id, author_email, body, updated_at)
  SELECT a.id, a.question_id, a.author_email, a.body, a.updated_at
  FROM public.answers a
  WHERE EXISTS (SELECT 1 FROM xhb.questions q WHERE q.id = a.question_id)
ON CONFLICT (id) DO NOTHING;

-- Migrate plan_items
INSERT INTO xhb.plan_items (id, title, detail, phase, status, owner, due,
                            position, created_by, created_at)
  SELECT id, title, detail, phase, status, owner, due, position,
         created_by, created_at
  FROM public.plan_items
ON CONFLICT (id) DO NOTHING;

-- Migrate updates
INSERT INTO xhb.updates (id, author_email, body, pinned, created_at)
  SELECT id, author_email, body, pinned, created_at
  FROM public.updates
ON CONFLICT (id) DO NOTHING;

-- Migrate documents
INSERT INTO xhb.documents (id, title, kind, status, url, content, approvals,
                           created_by, created_at)
  SELECT id, title, kind, status, url, content, approvals, created_by, created_at
  FROM public.documents
ON CONFLICT (id) DO NOTHING;

-- Migrate nudges
INSERT INTO xhb.nudges (id, session_id, from_email, to_email, message, seen, created_at)
  SELECT n.id, n.session_id, n.from_email, n.to_email, n.message, n.seen, n.created_at
  FROM public.nudges n
  WHERE n.session_id IS NULL
     OR EXISTS (SELECT 1 FROM xhb.sessions s WHERE s.id = n.session_id)
ON CONFLICT (id) DO NOTHING;

-- Migrate episodes
INSERT INTO xhb.episodes (id, title, url, note, created_by, created_at)
  SELECT id, title, url, note, created_by, created_at
  FROM public.episodes
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- §11  Seed founders (upsert — never overwrites confirmed data)
-- ═══════════════════════════════════════════════════════════════════════════

-- Momen — founder, superadmin
-- ⚠ PLACEHOLDER PHONE: replace +966YYYYYYYYY with real E.164 number
INSERT INTO xhb.allowed_users (email, phone, display_name, tier, is_superadmin)
VALUES ('momen@momencrafts.com', '+966YYYYYYYYY', 'Momen', 'founder', true)
ON CONFLICT (email) DO UPDATE SET
  tier = 'founder',
  is_superadmin = true
WHERE xhb.allowed_users.tier IS DISTINCT FROM 'founder'
   OR xhb.allowed_users.is_superadmin IS DISTINCT FROM true;

-- Mulham — guest (placeholder contact info — Momen confirms before enrolment)
-- ⚠ UNCONFIRMED EMAIL: mulham.zahabi@gmail.com — verify with Mulham
-- ⚠ UNCONFIRMED PHONE: +966XXXXXXXXX — verify with Mulham
INSERT INTO xhb.allowed_users (email, phone, display_name, tier, is_superadmin)
VALUES ('mulham.zahabi@gmail.com', '+966XXXXXXXXX', 'Mulham Al Zahabi', 'guest', false)
ON CONFLICT (email) DO NOTHING;  -- never overwrite if Momen already confirmed


-- ═══════════════════════════════════════════════════════════════════════════
-- §12  RLS on all xhb.* tables
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE xhb.allowed_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.plan_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.updates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.nudges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.episodes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.decision_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.access_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.enrolment_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.artifacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.findings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE xhb.api_keys          ENABLE ROW LEVEL SECURITY;

-- ── Policies: allowlist read ────────────────────────────────────────────
DROP POLICY IF EXISTS xhb_allowed_read ON xhb.allowed_users;
CREATE POLICY xhb_allowed_read ON xhb.allowed_users
  FOR SELECT TO authenticated USING (xhb.is_allowed());

-- ── Policies: shared tables — full CRUD for allowlisted founders ────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sessions','questions','plan_items','updates',
    'documents','nudges','episodes','decision_revisions',
    'artifacts','artifact_versions','findings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS xhb_%I_all ON xhb.%I', t, t);
    EXECUTE format(
      'CREATE POLICY xhb_%I_all ON xhb.%I '
      'FOR ALL TO authenticated '
      'USING (xhb.is_allowed()) '
      'WITH CHECK (xhb.is_allowed())',
      t, t
    );
  END LOOP;
END $$;

-- ── Seal policies on xhb.answers — line-by-line annotated ───────────────
--
-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_select                                                      │
-- │ A founder can read their own sealed answers at any time.            │
-- │ They can read the partner's answer ONLY after the question status   │
-- │ moves past 'sealed' (i.e. 'revealed' or 'resolved').               │
-- │ This is THE SEAL — the security boundary. Never work around it.    │
-- └─────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS xhb_answers_select ON xhb.answers;
CREATE POLICY xhb_answers_select ON xhb.answers
  FOR SELECT TO authenticated
  USING (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND (
      author_email = xhb.current_email()          -- always see your own answers
      OR EXISTS (                                  -- see partner's answer only when
        SELECT 1 FROM xhb.questions q              --   the question has been revealed
        WHERE q.id = question_id                   --   or resolved (status <> 'sealed')
          AND q.status <> 'sealed'
      )
    )
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_insert                                                      │
-- │ A founder can only insert answers attributed to their own email.    │
-- │ Prevents impersonation.                                            │
-- └─────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS xhb_answers_insert ON xhb.answers;
CREATE POLICY xhb_answers_insert ON xhb.answers
  FOR INSERT TO authenticated
  WITH CHECK (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND author_email = xhb.current_email()        -- can only write as yourself
  );

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ answers_update                                                      │
-- │ A founder can update their own answer ONLY while the question is    │
-- │ still sealed. Once revealed, answers FREEZE. This is invariant 2.  │
-- └─────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS xhb_answers_update ON xhb.answers;
CREATE POLICY xhb_answers_update ON xhb.answers
  FOR UPDATE TO authenticated
  USING (
    xhb.is_allowed()                              -- caller is an allowed founder
    AND author_email = xhb.current_email()        -- can only edit your own answer
    AND EXISTS (                                   -- ONLY while the question is sealed
      SELECT 1 FROM xhb.questions q
      WHERE q.id = question_id
        AND q.status = 'sealed'
    )
  )
  WITH CHECK (
    author_email = xhb.current_email()            -- row must still be attributed to you
  );

-- ── Service-role only tables (no authenticated policies) ────────────────
-- xhb.access_log — append-only, read by admin only (service role)
-- xhb.enrolment_tokens — managed by edge functions (service role)
-- xhb.api_keys — managed by edge functions (service role)
-- xhb.gate_attempts — managed by xhb-gate-request (service role)
-- xhb.gate_log — managed by xhb-gate-request (service role)
-- (RLS is enabled but no policies = service-role access only)

-- ── Superadmin-only policy for api_keys (view own keys) ─────────────────
DROP POLICY IF EXISTS xhb_api_keys_select ON xhb.api_keys;
CREATE POLICY xhb_api_keys_select ON xhb.api_keys
  FOR SELECT TO authenticated
  USING (
    xhb.is_allowed()
    AND owner_email = xhb.current_email()
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- §13  Realtime — add xhb.* tables to publication
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sessions','questions','answers','plan_items','updates',
    'documents','nudges','episodes','artifacts','artifact_versions','findings'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE xhb.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- §14  Convert existing documents to artifacts
-- ═══════════════════════════════════════════════════════════════════════════
-- Mapping: source → reference, legal → decision-brief, derived → report, other → note

INSERT INTO xhb.artifacts (title, kind, status, created_by, created_at)
  SELECT
    d.title,
    CASE d.kind
      WHEN 'source'  THEN 'reference'
      WHEN 'legal'   THEN 'decision-brief'
      WHEN 'derived' THEN 'report'
      ELSE 'note'
    END,
    'draft',
    COALESCE(NULLIF(d.created_by, ''), 'momen@momencrafts.com'),
    d.created_at
  FROM xhb.documents d
  WHERE d.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM xhb.artifacts a WHERE a.title = d.title
    );


-- ═══════════════════════════════════════════════════════════════════════════
-- §15  Verification queries (informational — run manually)
-- ═══════════════════════════════════════════════════════════════════════════
-- After running, verify:
--   SELECT email, tier, is_superadmin, disabled_at FROM xhb.allowed_users;
--   SELECT count(*) FROM xhb.sessions;
--   SELECT count(*) FROM xhb.questions;
--   SELECT count(*) FROM xhb.answers;
--   SELECT count(*) FROM xhb.artifacts;
--   SELECT schemaname, tablename, policyname FROM pg_policies
--     WHERE schemaname = 'xhb' ORDER BY tablename, policyname;
--
-- Confirm no portal function reads xhb.* tables:
--   grep -r "xhb\." supabase/functions/ --include="*.ts" | grep -v xhb-gate
--   → should only return xhb-gate-request (which is an XHB function)
-- ═══════════════════════════════════════════════════════════════════════════
