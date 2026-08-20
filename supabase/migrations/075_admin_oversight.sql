-- ═══════════════════════════════════════════════════════════
-- 075 — Admin oversight: schedule the XHB reminder
--
-- The old xhb-reminder header claimed "triggered by pg_cron daily",
-- but no cron.schedule existed anywhere in supabase/migrations/.
-- It has never run. Given the column bug it carried, that was a mercy.
--
-- WEEKLY, not daily. A co-founder nagged every morning stops reading
-- the sender, and then the mechanism is worth less than nothing.
-- The function additionally caps nudges at one per person per 5 days.
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store the function key in vault rather than inline in the schedule,
-- so it never lands in cron.job (which is world-readable to any admin).
-- Run ONCE, by hand, with the real value:
--
--   select vault.create_secret('<XHB_ADMIN_KEY>', 'xhb_admin_key');
--
-- Then this schedule reads it by name.

DO $mig$
BEGIN
  -- idempotent: drop the job if a previous run created it
  PERFORM cron.unschedule('xhb-reminder-weekly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xhb-reminder-weekly');

  PERFORM cron.schedule(
    'xhb-reminder-weekly',
    '0 6 * * 1',                      -- Mondays 06:00 UTC = 09:00 Riyadh
    $job$
    SELECT net.http_post(
      url     := 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/xhb-reminder',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'X-Admin-Key',  (SELECT decrypted_secret FROM vault.decrypted_secrets
                                    WHERE name = 'xhb_admin_key')
                 ),
      body    := jsonb_build_object('mode', 'pending')
    );
    $job$
  );
END
$mig$;

-- Optional: a fortnightly progress summary to BOTH founders.
-- Uncomment once the weekly nudge has run cleanly at least twice.
--
-- DO $mig2$
-- BEGIN
--   PERFORM cron.unschedule('xhb-progress-fortnightly')
--   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'xhb-progress-fortnightly');
--
--   PERFORM cron.schedule(
--     'xhb-progress-fortnightly',
--     '0 6 1,15 * *',
--     $job2$
--     SELECT net.http_post(
--       url     := 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1/xhb-reminder',
--       headers := jsonb_build_object(
--                    'Content-Type', 'application/json',
--                    'X-Admin-Key',  (SELECT decrypted_secret FROM vault.decrypted_secrets
--                                     WHERE name = 'xhb_admin_key')
--                  ),
--       body    := jsonb_build_object('mode', 'progress')
--     );
--     $job2$
--   );
-- END
-- $mig2$;

-- ── Verify ──
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'xhb-%';
