-- ═══════════════════════════════════════════════════════════════════
-- 073 — XHB Remaster: Phase 5 — Onboarding alignment
-- ═══════════════════════════════════════════════════════════════════
-- 1. Fix trg_artifacts_stamp_author (only stamp when session exists)
-- 2. Reset dispositions trigger when body_md changes
-- 3. SECURITY DEFINER function to complete onboarding
-- 4. Seed onboarding content key if missing

-- ── 1. Fix: only stamp created_by when a real session exists ─────
CREATE OR REPLACE FUNCTION xhb.trg_artifacts_stamp_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
BEGIN
  IF xhb.current_email() <> '' THEN
    NEW.created_by := xhb.current_email();
  END IF;
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ── 2. Reset dispositions when an alignment item's body_md changes ──
-- If either founder edits the item text, both approvals are stale
-- and must be re-issued. This prevents a stale "aligned" surviving an edit.
CREATE OR REPLACE FUNCTION xhb.trg_alignment_item_body_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
BEGIN
  IF NEW.body_md IS DISTINCT FROM OLD.body_md THEN
    DELETE FROM xhb.alignment_dispositions
    WHERE item_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_alignment_item_body_changed ON xhb.alignment_items;
CREATE TRIGGER trg_alignment_item_body_changed
  BEFORE UPDATE ON xhb.alignment_items
  FOR EACH ROW
  EXECUTE FUNCTION xhb.trg_alignment_item_body_changed();


-- ── 3. Complete onboarding — SECURITY DEFINER function ───────────
-- Verifies that ALL alignment items have both-approved dispositions.
-- If so: writes completion flag, returns true.
-- If not: raises an exception.
CREATE OR REPLACE FUNCTION xhb.complete_onboarding()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
DECLARE
  total_items int;
  both_approved int;
  member_count int;
BEGIN
  -- Must be an allowed user
  IF NOT xhb.is_allowed() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = 'P0001';
  END IF;

  -- Count alignment items
  SELECT count(*) INTO total_items FROM xhb.alignment_items;
  IF total_items = 0 THEN
    RAISE EXCEPTION 'No alignment items found' USING ERRCODE = 'P0001';
  END IF;

  -- Count members (should be 2)
  SELECT count(*) INTO member_count
    FROM xhb.allowed_users WHERE disabled_at IS NULL;

  -- Count items where ALL active members have disposition = 'approve'
  SELECT count(*) INTO both_approved
  FROM xhb.alignment_items ai
  WHERE (
    SELECT count(*) FROM xhb.alignment_dispositions ad
    WHERE ad.item_id = ai.id
      AND ad.disposition = 'approve'
      AND lower(ad.email) IN (
        SELECT lower(email) FROM xhb.allowed_users WHERE disabled_at IS NULL
      )
  ) >= member_count;

  IF both_approved < total_items THEN
    RAISE EXCEPTION 'Not all alignment items are both-approved (% of % complete)',
      both_approved, total_items
      USING ERRCODE = 'P0001';
  END IF;

  -- Write completion flag
  INSERT INTO xhb.content (key, locale, body)
  VALUES ('onboarding', 'en', '{"complete": true, "completed_at": "' || now()::text || '", "completed_by": "' || xhb.current_email() || '"}'::jsonb)
  ON CONFLICT (key, locale)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

  RETURN true;
END;
$$;


-- ── 4. Seed onboarding key if missing (defaults to incomplete) ───
INSERT INTO xhb.content (key, locale, body)
VALUES ('onboarding', 'en', '{"complete": false}'::jsonb)
ON CONFLICT (key, locale) DO NOTHING;


-- ── 5. Lock content policies: block direct client writes to the onboarding key ──
-- complete_onboarding() runs SECURITY DEFINER (bypasses RLS) — this only
-- removes the direct client path so the flag truly can't be flipped except
-- through the both-approved gate.
DROP POLICY IF EXISTS content_update ON xhb.content;
CREATE POLICY content_update ON xhb.content
  FOR UPDATE USING (xhb.is_allowed() AND key <> 'onboarding')
  WITH CHECK (xhb.is_allowed() AND key <> 'onboarding');

DROP POLICY IF EXISTS content_insert ON xhb.content;
CREATE POLICY content_insert ON xhb.content
  FOR INSERT WITH CHECK (xhb.is_allowed() AND key <> 'onboarding');


-- ── 6. Verify ──
SELECT proname, prosecdef,
       array_to_string(proconfig, ', ') AS config
  FROM pg_proc
  JOIN pg_namespace ON pg_namespace.oid = pronamespace
 WHERE nspname = 'xhb'
   AND proname IN ('trg_artifacts_stamp_author', 'trg_alignment_item_body_changed', 'complete_onboarding')
 ORDER BY proname;
