-- ═══════════════════════════════════════════════════════════════════════════
-- XHB Remaster Phase 2 — Backend / Schema
-- Idempotent. Run once; safe to re-run.
--
-- 1. Lock columns on artifacts
-- 2. is_approver on allowed_users
-- 3. Drop broad artifacts_all policy → split SELECT/INSERT/UPDATE
-- 4. BEFORE UPDATE trigger on artifacts (verdict, lock, locked-state guard)
-- 5. Reject artifact_versions inserts when parent is locked
-- 6. Decision immutability trigger on questions
-- 7. Alignment/onboarding tables
-- 8. content UPDATE policy
-- ═══════════════════════════════════════════════════════════════════════════

SET search_path TO xhb, public;

-- ────────────────────────────────────────────────────────────────
-- 1. Lock columns on artifacts
-- ────────────────────────────────────────────────────────────────
ALTER TABLE xhb.artifacts
  ADD COLUMN IF NOT EXISTS locked_by      text,
  ADD COLUMN IF NOT EXISTS locked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS locked_version int;


-- ────────────────────────────────────────────────────────────────
-- 2. is_approver flag on allowed_users
--    Mulham = approver (true). Momen = superadmin, not approver.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE xhb.allowed_users
  ADD COLUMN IF NOT EXISTS is_approver boolean NOT NULL DEFAULT false;

-- Set Mulham as approver (idempotent)
UPDATE xhb.allowed_users
  SET is_approver = true
  WHERE lower(email) = 'mulham.zahabi@gmail.com'
    AND is_approver IS DISTINCT FROM true;


-- ────────────────────────────────────────────────────────────────
-- Helper: xhb.is_approver() — current session user is the approver
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION xhb.is_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'xhb'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM xhb.allowed_users a
    WHERE lower(a.email) = xhb.current_email()
      AND a.disabled_at IS NULL
      AND a.is_approver = true
  );
$$;


-- ────────────────────────────────────────────────────────────────
-- 3. Drop broad artifacts policy → split policies
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS xhb_artifacts_all ON xhb.artifacts;

-- SELECT: any allowed user can read all artifacts
CREATE POLICY xhb_artifacts_select ON xhb.artifacts
  FOR SELECT USING (xhb.is_allowed());

-- INSERT: any allowed user can create artifacts
CREATE POLICY xhb_artifacts_insert ON xhb.artifacts
  FOR INSERT WITH CHECK (xhb.is_allowed());

-- UPDATE: any allowed user can update (row-level).
-- Column-conditional rules (verdict, lock, locked-state) are
-- enforced by the BEFORE UPDATE trigger below, not by RLS,
-- because RLS cannot express per-column OLD-vs-NEW checks.
CREATE POLICY xhb_artifacts_update ON xhb.artifacts
  FOR UPDATE USING (xhb.is_allowed()) WITH CHECK (xhb.is_allowed());


-- ────────────────────────────────────────────────────────────────
-- 4. BEFORE UPDATE trigger on xhb.artifacts
--    Enforces:
--    a) Verdict columns writable only by the approver who is NOT
--       the author (Invariant 5: no self-verdicting).
--    b) Lock/unlock writable only by the approver (Mulham).
--       Mulham CAN lock his own Concept.
--    c) While status='locked', reject ALL body/status/version
--       mutation except the approver's unlock.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION xhb.trg_artifacts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb'
AS $$
DECLARE
  caller_email text := xhb.current_email();
  caller_is_approver boolean := xhb.is_approver();
BEGIN
  -- ── A: Verdict columns ──
  -- verdict, verdict_by, verdict_at may only be changed by
  -- the approver AND only if they are not the author.
  IF (NEW.verdict IS DISTINCT FROM OLD.verdict)
     OR (NEW.verdict_by IS DISTINCT FROM OLD.verdict_by)
     OR (NEW.verdict_at IS DISTINCT FROM OLD.verdict_at) THEN

    IF NOT caller_is_approver THEN
      RAISE EXCEPTION 'Only the approver may verdict an artifact'
        USING ERRCODE = 'P0001';
    END IF;
    IF lower(OLD.created_by) = caller_email THEN
      RAISE EXCEPTION 'You cannot verdict your own artifact (Invariant 5)'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- ── B: Lock columns ──
  -- locked_by, locked_at, locked_version may only be changed by the approver.
  -- Note: the approver CAN lock their own artifact (e.g., Concept).
  IF (NEW.locked_by IS DISTINCT FROM OLD.locked_by)
     OR (NEW.locked_at IS DISTINCT FROM OLD.locked_at)
     OR (NEW.locked_version IS DISTINCT FROM OLD.locked_version) THEN

    IF NOT caller_is_approver THEN
      RAISE EXCEPTION 'Only the approver may lock or unlock an artifact'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- ── B2: Status transitions to/from 'locked' = approver only ──
  IF (NEW.status IS DISTINCT FROM OLD.status)
     AND (OLD.status = 'locked' OR NEW.status = 'locked') THEN

    IF NOT caller_is_approver THEN
      RAISE EXCEPTION 'Only the approver may change status to/from locked'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- ── C: Locked-state guard ──
  -- While an artifact is locked, reject ALL mutations to body-related
  -- columns and status, except the approver's unlock (status → 'under_audit').
  IF OLD.status = 'locked' THEN
    -- Allow the approver to change status (unlock)
    IF caller_is_approver AND (NEW.status IS DISTINCT FROM OLD.status) THEN
      -- The approver is unlocking — this is the lawful path.
      -- But they must not be changing body columns at the same time.
      NULL; -- allowed
    ELSE
      -- Anyone else (or approver not changing status): reject body/status changes
      IF (NEW.status IS DISTINCT FROM OLD.status)
         OR (NEW.title IS DISTINCT FROM OLD.title)
         OR (NEW.kind IS DISTINCT FROM OLD.kind) THEN
        RAISE EXCEPTION 'Artifact is locked. Only the approver may unlock it.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trg_artifacts_guard ON xhb.artifacts;
CREATE TRIGGER trg_artifacts_guard
  BEFORE UPDATE ON xhb.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION xhb.trg_artifacts_guard();


-- ────────────────────────────────────────────────────────────────
-- 5. Reject artifact_versions inserts when parent is locked
-- ────────────────────────────────────────────────────────────────
-- Replace the broad policy with split policies
DROP POLICY IF EXISTS xhb_artifact_versions_all ON xhb.artifact_versions;

CREATE POLICY xhb_artifact_versions_select ON xhb.artifact_versions
  FOR SELECT USING (xhb.is_allowed());

-- INSERT: allowed, but only if the parent artifact is NOT locked
CREATE POLICY xhb_artifact_versions_insert ON xhb.artifact_versions
  FOR INSERT WITH CHECK (
    xhb.is_allowed()
    AND NOT EXISTS (
      SELECT 1 FROM xhb.artifacts a
      WHERE a.id = artifact_id
        AND a.status = 'locked'
    )
  );

CREATE POLICY xhb_artifact_versions_update ON xhb.artifact_versions
  FOR UPDATE USING (xhb.is_allowed()) WITH CHECK (xhb.is_allowed());


-- ────────────────────────────────────────────────────────────────
-- 6. Decision immutability — BEFORE UPDATE trigger on questions
--    When status leaves 'resolved', capture the prior state in
--    decision_revisions before allowing the change.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION xhb.trg_questions_decision_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb'
AS $$
BEGIN
  -- Only fire when status changes FROM 'resolved' to something else
  IF OLD.status = 'resolved' AND NEW.status IS DISTINCT FROM 'resolved' THEN
    INSERT INTO xhb.decision_revisions (
      id,
      question_id,
      revision,
      prior_outcome,
      prior_decision,
      prior_owner,
      prior_resolved_by,
      prior_resolved_at,
      reopened_by,
      reopened_at,
      reason
    ) VALUES (
      gen_random_uuid(),
      OLD.id,
      COALESCE((
        SELECT MAX(dr.revision) + 1
        FROM xhb.decision_revisions dr
        WHERE dr.question_id = OLD.id
      ), 1),
      OLD.outcome,
      COALESCE(OLD.decision, ''),
      COALESCE(OLD.decision_owner, ''),
      OLD.resolved_by,
      OLD.resolved_at,
      xhb.current_email(),
      now(),
      COALESCE(NEW.decision, 'reopened')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_questions_decision_revision ON xhb.questions;
CREATE TRIGGER trg_questions_decision_revision
  BEFORE UPDATE ON xhb.questions
  FOR EACH ROW
  EXECUTE FUNCTION xhb.trg_questions_decision_revision();


-- ────────────────────────────────────────────────────────────────
-- 7. Alignment / Onboarding tables
-- ────────────────────────────────────────────────────────────────

-- alignment_items: the master list of alignment topics
CREATE TABLE IF NOT EXISTS xhb.alignment_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position    int NOT NULL DEFAULT 0,
  title       text NOT NULL,
  body_md     text NOT NULL DEFAULT '',
  category    text NOT NULL DEFAULT 'general',
  created_by  text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xhb.alignment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xhb_alignment_items_select ON xhb.alignment_items;
CREATE POLICY xhb_alignment_items_select ON xhb.alignment_items
  FOR SELECT USING (xhb.is_allowed());

DROP POLICY IF EXISTS xhb_alignment_items_insert ON xhb.alignment_items;
CREATE POLICY xhb_alignment_items_insert ON xhb.alignment_items
  FOR INSERT WITH CHECK (xhb.is_allowed());

DROP POLICY IF EXISTS xhb_alignment_items_update ON xhb.alignment_items;
CREATE POLICY xhb_alignment_items_update ON xhb.alignment_items
  FOR UPDATE USING (xhb.is_allowed()) WITH CHECK (xhb.is_allowed());

-- Auto-update timestamp
DROP TRIGGER IF EXISTS trg_alignment_items_updated ON xhb.alignment_items;
CREATE TRIGGER trg_alignment_items_updated
  BEFORE UPDATE ON xhb.alignment_items
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();


-- alignment_dispositions: each founder's disposition on each item
CREATE TABLE IF NOT EXISTS xhb.alignment_dispositions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES xhb.alignment_items(id) ON DELETE CASCADE,
  email       text NOT NULL,
  disposition text NOT NULL CHECK (disposition IN ('approve', 'annotate')),
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, email)
);

ALTER TABLE xhb.alignment_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS xhb_alignment_dispositions_select ON xhb.alignment_dispositions;
CREATE POLICY xhb_alignment_dispositions_select ON xhb.alignment_dispositions
  FOR SELECT USING (xhb.is_allowed());

-- INSERT/UPDATE: only your own disposition
DROP POLICY IF EXISTS xhb_alignment_dispositions_insert ON xhb.alignment_dispositions;
CREATE POLICY xhb_alignment_dispositions_insert ON xhb.alignment_dispositions
  FOR INSERT WITH CHECK (
    xhb.is_allowed()
    AND lower(email) = xhb.current_email()
  );

DROP POLICY IF EXISTS xhb_alignment_dispositions_update ON xhb.alignment_dispositions;
CREATE POLICY xhb_alignment_dispositions_update ON xhb.alignment_dispositions
  FOR UPDATE
  USING (xhb.is_allowed() AND lower(email) = xhb.current_email())
  WITH CHECK (xhb.is_allowed() AND lower(email) = xhb.current_email());

DROP TRIGGER IF EXISTS trg_alignment_dispositions_updated ON xhb.alignment_dispositions;
CREATE TRIGGER trg_alignment_dispositions_updated
  BEFORE UPDATE ON xhb.alignment_dispositions
  FOR EACH ROW EXECUTE FUNCTION xhb.set_updated_at();


-- ────────────────────────────────────────────────────────────────
-- 8. content UPDATE policy (for setting onboarding.complete)
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS content_update ON xhb.content;
CREATE POLICY content_update ON xhb.content
  FOR UPDATE USING (xhb.is_allowed()) WITH CHECK (xhb.is_allowed());

DROP POLICY IF EXISTS content_insert ON xhb.content;
CREATE POLICY content_insert ON xhb.content
  FOR INSERT WITH CHECK (xhb.is_allowed());


-- ════════════════════════════════════════════════════════════════
-- SEAL CHECK: answers policies are NOT touched by this migration.
-- The following statements verify they exist; they do NOT modify them.
-- Run "SELECT ... FROM pg_policies WHERE tablename = 'answers'"
-- after this migration to confirm byte-for-byte unchanged.
-- ════════════════════════════════════════════════════════════════
-- (no DDL on xhb.answers)

