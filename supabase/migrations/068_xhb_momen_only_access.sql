-- ═══════════════════════════════════════════════════════════════════════════
-- 068: Restrict XHB access to momen@momencrafts.com ONLY
-- ═══════════════════════════════════════════════════════════════════════════
-- Removes all other users from the allowed_users table and adds a CHECK
-- constraint to prevent anyone else from being added.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Remove everyone except Momen
DELETE FROM public.allowed_users
WHERE email <> 'momen@momencrafts.com';

-- 2. Add a CHECK constraint so only momen@momencrafts.com can ever be inserted
-- (prevents accidental re-addition of other users via SQL or service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'allowed_users'
      AND constraint_name = 'allowed_users_momen_only'
  ) THEN
    ALTER TABLE public.allowed_users
      ADD CONSTRAINT allowed_users_momen_only
      CHECK (email = 'momen@momencrafts.com');
  END IF;
END $$;

-- 3. Verify
SELECT email, display_name, phone FROM public.allowed_users;
