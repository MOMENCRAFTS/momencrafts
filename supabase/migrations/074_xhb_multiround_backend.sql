-- ═══════════════════════════════════════════════════════════════════
-- 074 — XHB Multi-Round Backend: is_builder, alignment_history,
--       round column, updated complete_onboarding, escape hatch
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. is_builder flag on allowed_users ──────────────────────────
ALTER TABLE xhb.allowed_users ADD COLUMN IF NOT EXISTS is_builder boolean DEFAULT false;
UPDATE xhb.allowed_users SET is_builder = true WHERE lower(email) = 'momen@momencrafts.com';


-- ── 2. xhb.is_builder() helper ──────────────────────────────────
CREATE OR REPLACE FUNCTION xhb.is_builder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM xhb.allowed_users
    WHERE lower(email) = xhb.current_email()
      AND is_builder = true
      AND disabled_at IS NULL
  );
$$;


-- ── 3. alignment_history — archive table ─────────────────────────
CREATE TABLE IF NOT EXISTS xhb.alignment_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES xhb.alignment_items(id) ON DELETE CASCADE,
  email       text NOT NULL,
  disposition text NOT NULL,
  annotation  text DEFAULT '',
  archived_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xhb.alignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY hist_read ON xhb.alignment_history
  FOR SELECT TO authenticated USING (xhb.is_allowed());

-- Builder can also delete history if needed
CREATE POLICY hist_builder_all ON xhb.alignment_history
  FOR ALL TO authenticated USING (xhb.is_builder())
  WITH CHECK (xhb.is_builder());


-- ── 4. Update body-changed trigger → archive before delete ───────
CREATE OR REPLACE FUNCTION xhb.trg_alignment_item_body_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
BEGIN
  IF NEW.body_md IS DISTINCT FROM OLD.body_md THEN
    -- Archive existing dispositions before deleting
    INSERT INTO xhb.alignment_history (item_id, email, disposition, annotation)
    SELECT item_id, email, disposition, COALESCE(note, '')
    FROM xhb.alignment_dispositions
    WHERE item_id = NEW.id;
    -- Then reset dispositions
    DELETE FROM xhb.alignment_dispositions WHERE item_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists from 073, function replacement is enough


-- ── 5. round column + round_status on alignment_items ────────────
ALTER TABLE xhb.alignment_items ADD COLUMN IF NOT EXISTS round integer DEFAULT 1;
ALTER TABLE xhb.alignment_items ADD COLUMN IF NOT EXISTS round_status text DEFAULT 'published';

-- Backfill existing items
UPDATE xhb.alignment_items SET round = 1, round_status = 'published'
WHERE round IS NULL OR round_status IS NULL;


-- ── 6. Updated complete_onboarding() — builder gate + ignore drafts ──
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

  -- BUILDER GATE: only the builder (Momen) can unlock
  IF NOT xhb.is_builder() THEN
    RAISE EXCEPTION 'Only the builder can complete onboarding' USING ERRCODE = 'P0001';
  END IF;

  -- Only count published items (not drafts)
  SELECT count(*) INTO total_items
    FROM xhb.alignment_items
    WHERE round_status = 'published';

  IF total_items = 0 THEN
    RAISE EXCEPTION 'No alignment items found' USING ERRCODE = 'P0001';
  END IF;

  -- Count active members (should be 2)
  SELECT count(*) INTO member_count
    FROM xhb.allowed_users WHERE disabled_at IS NULL;

  -- Count published items where ALL active members approved
  SELECT count(*) INTO both_approved
  FROM xhb.alignment_items ai
  WHERE ai.round_status = 'published'
    AND (
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
  VALUES ('onboarding', 'en', jsonb_build_object(
    'complete', true,
    'completed_at', now()::text,
    'completed_by', xhb.current_email()
  ))
  ON CONFLICT (key, locale)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

  RETURN true;
END;
$$;


-- ── 7. Escape hatch: unlock_with_unresolved(reason) ──────────────
-- Logged force-unlock for builder only. Visible to partner via access_log.
CREATE TABLE IF NOT EXISTS xhb.access_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  action     text NOT NULL,
  detail     text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xhb.access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY log_read ON xhb.access_log
  FOR SELECT TO authenticated USING (xhb.is_allowed());

CREATE OR REPLACE FUNCTION xhb.unlock_with_unresolved(reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'xhb','public'
AS $$
BEGIN
  IF NOT xhb.is_builder() THEN
    RAISE EXCEPTION 'Only the builder can force-unlock' USING ERRCODE = 'P0001';
  END IF;

  -- Log the override
  INSERT INTO xhb.access_log (email, action, detail)
  VALUES (xhb.current_email(), 'force_unlock', reason);

  -- Write completion flag with force reason
  INSERT INTO xhb.content (key, locale, body)
  VALUES ('onboarding', 'en', jsonb_build_object(
    'complete', true,
    'completed_at', now()::text,
    'completed_by', xhb.current_email(),
    'force_reason', reason
  ))
  ON CONFLICT (key, locale)
  DO UPDATE SET body = EXCLUDED.body, updated_at = now();

  RETURN true;
END;
$$;


-- ── 8. Realtime for alignment_history ────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE xhb.alignment_history;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE xhb.access_log;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after migration)
-- ═══════════════════════════════════════════════════════════════════

-- V1: is_builder column
SELECT email, is_builder FROM xhb.allowed_users;

-- V2: round column on alignment_items
SELECT id, title, round, round_status FROM xhb.alignment_items LIMIT 5;

-- V3: alignment_history table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema='xhb' AND table_name='alignment_history';

-- V4: is_builder() function exists
SELECT proname, prosecdef FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace=n.oid
WHERE n.nspname='xhb' AND p.proname IN ('is_builder','complete_onboarding','unlock_with_unresolved');
