-- ═══════════════════════════════════════════════════════════════════════════
-- XHB Remaster Phase 2 Fixes — S1 through S5 + Q1
-- Idempotent. Run once; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

SET search_path TO xhb, public;

-- ────────────────────────────────────────────────────────────────
-- S3 · Pin search_path to exclude pg_temp on ALL SECURITY DEFINER funcs
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xhb.current_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'xhb', 'public'
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
SET search_path = 'xhb', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM xhb.allowed_users a
    WHERE lower(a.email) = xhb.current_email()
      AND a.disabled_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION xhb.is_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'xhb', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM xhb.allowed_users a
    WHERE lower(a.email) = xhb.current_email()
      AND a.disabled_at IS NULL
      AND a.is_approver = true
  );
$$;


-- ────────────────────────────────────────────────────────────────
-- S2 · FIX: Tighten the unlock escape hatch in trg_artifacts_guard
--      When locked, an approver UPDATE may change ONLY status and
--      the three lock columns. ANY other changed column is rejected.
-- S3 · Pin search_path on trigger function too.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xhb.trg_artifacts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb', 'public'
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

  -- ── C: Locked-state guard (TIGHTENED per S2) ──
  -- While status='locked', ONLY status and lock columns may change.
  -- All other columns (title, kind, verdict, pinned, etc.) are frozen.
  -- Even the approver must unlock first, then edit.
  IF OLD.status = 'locked' THEN
    IF (NEW.title IS DISTINCT FROM OLD.title)
       OR (NEW.kind IS DISTINCT FROM OLD.kind)
       OR (NEW.verdict IS DISTINCT FROM OLD.verdict)
       OR (NEW.verdict_by IS DISTINCT FROM OLD.verdict_by)
       OR (NEW.verdict_at IS DISTINCT FROM OLD.verdict_at)
       OR (NEW.pinned IS DISTINCT FROM OLD.pinned)
       OR (NEW.created_by IS DISTINCT FROM OLD.created_by)
       OR (NEW.created_at IS DISTINCT FROM OLD.created_at)
       OR (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
      RAISE EXCEPTION 'Artifact is locked. Unlock first, then edit. Only status and lock columns may change while locked.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- S3 · Pin search_path on decision revision trigger
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xhb.trg_questions_decision_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb', 'public'
AS $$
BEGIN
  IF OLD.status = 'resolved' AND NEW.status IS DISTINCT FROM 'resolved' THEN
    INSERT INTO xhb.decision_revisions (
      id, question_id, revision,
      prior_outcome, prior_decision, prior_owner,
      prior_resolved_by, prior_resolved_at,
      reopened_by, reopened_at, reason
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


-- ────────────────────────────────────────────────────────────────
-- S4 · BEFORE INSERT trigger on artifact_versions to take a row lock
--      on the parent artifact, preventing the READ COMMITTED race.
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xhb.trg_artifact_versions_lock_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb', 'public'
AS $$
DECLARE
  parent_status text;
BEGIN
  -- Take a FOR SHARE lock on the parent artifact row.
  -- This blocks until any concurrent UPDATE (e.g., locking) commits.
  SELECT a.status INTO parent_status
    FROM xhb.artifacts a
   WHERE a.id = NEW.artifact_id
     FOR SHARE;

  IF parent_status = 'locked' THEN
    RAISE EXCEPTION 'Cannot insert a version on a locked artifact'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_artifact_versions_lock_check ON xhb.artifact_versions;
CREATE TRIGGER trg_artifact_versions_lock_check
  BEFORE INSERT ON xhb.artifact_versions
  FOR EACH ROW
  EXECUTE FUNCTION xhb.trg_artifact_versions_lock_check();


-- ────────────────────────────────────────────────────────────────
-- Q1 · UNIQUE constraint on (question_id, revision)
--      Makes concurrent reopens collide loudly instead of silently.
-- ────────────────────────────────────────────────────────────────

ALTER TABLE xhb.decision_revisions
  DROP CONSTRAINT IF EXISTS decision_revisions_question_revision_key;
ALTER TABLE xhb.decision_revisions
  ADD CONSTRAINT decision_revisions_question_revision_key
  UNIQUE (question_id, revision);


-- ────────────────────────────────────────────────────────────────
-- S1 supplement · alignment_items: protect created_by from mutation
--   (alignment_items body is editable by any allowed user, but
--    created_by is immutable after insert.)
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION xhb.trg_alignment_items_protect_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'xhb', 'public'
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Cannot change the author of an alignment item'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alignment_items_protect_author ON xhb.alignment_items;
CREATE TRIGGER trg_alignment_items_protect_author
  BEFORE UPDATE ON xhb.alignment_items
  FOR EACH ROW
  EXECUTE FUNCTION xhb.trg_alignment_items_protect_author();

