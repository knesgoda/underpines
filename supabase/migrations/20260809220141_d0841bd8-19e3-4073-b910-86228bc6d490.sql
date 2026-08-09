-- Ranger Station roles.
--
-- The enum gets its own migration because ALTER TYPE ... ADD VALUE cannot be
-- used in the same transaction that references the new values, and each
-- migration file runs in one transaction.
--
-- Existing roles map onto the new ladder without data changes:
--   moderator          -> ranger-level access
--   admin / founder    -> head-ranger-level access
-- The new values exist so future grants can be made at the intended level
-- instead of overloading 'admin'.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ranger';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'senior_ranger';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'head_ranger';