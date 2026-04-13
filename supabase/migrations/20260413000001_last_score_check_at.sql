-- Add last_score_check_at to throttle HomeScreen stale-game refresh calls.
-- Populated by fetchAndSyncGame (HomeScreen background sync) and by
-- SquareScreen's score-fetch loop so both flows share the same throttle.
--
-- Safe to apply on existing rows: DEFAULT NULL means old rows are treated as
-- "never checked" and will be eligible for a refresh on next HomeScreen focus.
-- No destructive changes — existing data is fully preserved.

ALTER TABLE squares
  ADD COLUMN IF NOT EXISTS last_score_check_at TIMESTAMPTZ DEFAULT NULL;
