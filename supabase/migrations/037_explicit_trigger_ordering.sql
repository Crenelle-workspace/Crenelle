-- Migration 037: Re-home invitation triggers with explicit numerical ordering
-- ==============================================================================
--
-- Postgres executes triggers on the same event in ASCII alphabetical order by name.
-- Prior trigger names (trg_enforce_single_checkin, trigger_a_..., trigger_b_...)
-- resulted in trg_ sorting ahead of trigger_a_ ('trg' < 'tri').
--
-- This migration drops prior bindings and re-binds all three invitation triggers
-- with explicit, numerical prefixes to guarantee execution order:
--   1. trigger_1_enforce_status_transition (validates valid status transitions)
--   2. trigger_2_enforce_single_checkin (guards against double check-in concurrency)
--   3. trigger_3_enforce_tier_capacity (enforces tier capacity bounds with FOR UPDATE)
-- ==============================================================================

BEGIN;

-- ── Drop prior trigger bindings ──────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_enforce_single_checkin             ON public.invitations;
DROP TRIGGER IF EXISTS trigger_a_enforce_status_transition   ON public.invitations;
DROP TRIGGER IF EXISTS trigger_b_enforce_tier_capacity        ON public.invitations;

-- ── Re-bind with explicit numerical ordering ─────────────────────────────────

-- 1. Status transition check (fires first)
CREATE TRIGGER trigger_1_enforce_status_transition
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_status_transition();

-- 2. Single check-in check (fires second)
CREATE TRIGGER trigger_2_enforce_single_checkin
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_checkin();

-- 3. Tier capacity check (fires third)
CREATE TRIGGER trigger_3_enforce_tier_capacity
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tier_capacity();

COMMIT;
