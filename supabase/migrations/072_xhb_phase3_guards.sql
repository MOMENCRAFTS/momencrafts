-- ═══════════════════════════════════════════════════════════════════
-- 072 — XHB Remaster: Phase 3 guard + Phase 2 trigger hardenings
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Concept authorship guard ──────────────────────────────────
-- Extend trg_artifact_versions_lock_check: only the author of a
-- concept artifact may publish versions on it.
CREATE OR REPLACE FUNCTION xhb.trg_artifact_versions_lock_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'xhb', 'public'
AS $function$
DECLARE
  parent_status text;
  parent_kind   text;
  parent_author text;
  caller_email  text := xhb.current_email();
BEGIN
  -- Take a FOR SHARE lock on the parent artifact row.
  -- This blocks until any concurrent UPDATE (e.g., locking) commits.
  SELECT a.status, a.kind, lower(a.created_by)
    INTO parent_status, parent_kind, parent_author
    FROM xhb.artifacts a
   WHERE a.id = NEW.artifact_id
     FOR SHARE;

  IF parent_status = 'locked' THEN
    RAISE EXCEPTION 'Cannot insert a version on a locked artifact'
      USING ERRCODE = 'P0001';
  END IF;

  -- Concept authorship: only the author may publish versions
  IF parent_kind = 'concept' AND parent_author IS DISTINCT FROM caller_email THEN
    RAISE EXCEPTION 'Only the author may publish a version of a concept'
      USING ERRCODE = 'P0001';
  END IF;

  -- Stamp published_by from the session, not client input
  NEW.published_by := caller_email;
  NEW.published_at := COALESCE(NEW.published_at, now());

  RETURN NEW;
END;
$function$;

-- ── 2. Harden trg_artifacts_guard: stamp from session ────────────
-- When verdict or lock columns change, overwrite the _by/_at
-- fields with the authenticated caller's email and current time.
-- This prevents a client from spoofing "verdict_by = other_founder".
CREATE OR REPLACE FUNCTION xhb.trg_artifacts_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'xhb', 'public'
AS $function$
DECLARE
  caller_email text := xhb.current_email();
  caller_is_approver boolean := xhb.is_approver();
BEGIN
  -- ── A: Verdict columns ──
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

    -- Stamp from session — never trust client-supplied values
    NEW.verdict_by := caller_email;
    NEW.verdict_at := now();
  END IF;

  -- ── B: Lock columns ──
  IF (NEW.locked_by IS DISTINCT FROM OLD.locked_by)
     OR (NEW.locked_at IS DISTINCT FROM OLD.locked_at)
     OR (NEW.locked_version IS DISTINCT FROM OLD.locked_version) THEN

    IF NOT caller_is_approver THEN
      RAISE EXCEPTION 'Only the approver may lock or unlock an artifact'
        USING ERRCODE = 'P0001';
    END IF;

    -- Stamp from session
    NEW.locked_by := caller_email;
    NEW.locked_at := now();
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

  -- ── D: Stamp created_by on INSERT (from session, not client) ──
  -- (This is a BEFORE UPDATE trigger, so INSERT is handled by a
  --  separate mechanism if needed. For now, created_by is immutable
  --  on UPDATE via the locked-state guard column list.)

  RETURN NEW;
END;
$function$;

-- ── 3. Add a BEFORE INSERT trigger on artifacts to stamp created_by ──
CREATE OR REPLACE FUNCTION xhb.trg_artifacts_stamp_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'xhb', 'public'
AS $function$
BEGIN
  -- Stamp created_by from the authenticated session
  NEW.created_by := xhb.current_email();
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_artifacts_stamp_author'
    AND tgrelid = 'xhb.artifacts'::regclass
  ) THEN
    CREATE TRIGGER trg_artifacts_stamp_author
      BEFORE INSERT ON xhb.artifacts
      FOR EACH ROW
      EXECUTE FUNCTION xhb.trg_artifacts_stamp_author();
  END IF;
END;
$$;

-- ── 4. Verify ──
SELECT proname, prosecdef,
       array_to_string(proconfig, ', ') AS config
  FROM pg_proc
  JOIN pg_namespace ON pg_namespace.oid = pronamespace
 WHERE nspname = 'xhb'
   AND proname LIKE 'trg_%'
 ORDER BY proname;
