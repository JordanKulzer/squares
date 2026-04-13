-- ============================================================
-- Quarter Wins → Free Credit System
-- ============================================================
-- Every 4 unique quarter wins (per user, deduplicated by
-- game + quarter) earns 1 free square credit.
-- The RPC award_quarter_win() is the single authoritative
-- entry point; all paths must go through it.
-- ============================================================

-- 1. Deduplicated win ledger ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."user_quarter_wins" (
  "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "game_id"    UUID        NOT NULL,
  "quarter"    TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, quarter)
);

ALTER TABLE "public"."user_quarter_wins" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quarter wins"
  ON "public"."user_quarter_wins" FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT policy — writes must go through the RPC (SECURITY DEFINER)

CREATE INDEX idx_uqw_user ON "public"."user_quarter_wins" (user_id);

GRANT SELECT ON "public"."user_quarter_wins" TO authenticated;

-- 2. Extend square_credits ────────────────────────────────────
-- Add reason + transaction_id (idempotency key) if not present.
ALTER TABLE "public"."square_credits"
  ADD COLUMN IF NOT EXISTS "reason"         TEXT,
  ADD COLUMN IF NOT EXISTS "transaction_id" TEXT UNIQUE;

-- 3. Extend leaderboard_stats ─────────────────────────────────
-- Add columns that the client already queries (quarters_won,
-- games_played) plus the new progress + reward timestamp.
ALTER TABLE "public"."leaderboard_stats"
  ADD COLUMN IF NOT EXISTS "quarters_won"          INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "games_played"          INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quarter_wins_progress" INTEGER      NOT NULL DEFAULT 0
    CHECK (quarter_wins_progress >= 0 AND quarter_wins_progress <= 3),
  ADD COLUMN IF NOT EXISTS "last_reward_at"        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "badge_wins_offset"     INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "badge_games_offset"    INTEGER      NOT NULL DEFAULT 0;

-- Backfill progress for existing rows so the bar starts
-- at the right position rather than resetting to 0.
UPDATE "public"."leaderboard_stats"
  SET quarter_wins_progress = (quarters_won % 4)
  WHERE quarter_wins_progress = 0
    AND quarters_won > 0;

-- 4. RPC: award_quarter_win ───────────────────────────────────
--
-- Atomically:
--   a) Insert (user_id, game_id, quarter) — UNIQUE constraint
--      prevents double-counting; conflict = silent no-op.
--   b) Increment quarters_won + quarter_wins_progress.
--   c) If progress hits 4, grant a credit and reset to 0.
--
-- Returns: { status, credited, progress }
--   status: "duplicate" | "recorded" | "rewarded"
--
CREATE OR REPLACE FUNCTION award_quarter_win(
  p_user_id UUID,
  p_game_id UUID,
  p_quarter TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress   INTEGER;
  v_total_wins INTEGER;
  v_txn_id     TEXT;
BEGIN
  -- ── Step 1: Idempotent win ledger insert ─────────────────
  INSERT INTO user_quarter_wins (user_id, game_id, quarter)
  VALUES (p_user_id, p_game_id, p_quarter)
  ON CONFLICT (user_id, game_id, quarter) DO NOTHING;

  IF NOT FOUND THEN
    -- Already recorded — listener replay, app reopen, offline retry
    RAISE LOG 'award_quarter_win: duplicate skipped user=% game=% quarter=%',
      p_user_id, p_game_id, p_quarter;
    RETURN jsonb_build_object('status', 'duplicate', 'credited', false);
  END IF;

  -- ── Step 2: Ensure leaderboard_stats row exists ──────────
  INSERT INTO leaderboard_stats (user_id, quarters_won, games_played, quarter_wins_progress)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Step 3: Atomically increment (row-level lock via UPDATE) ─
  UPDATE leaderboard_stats
  SET quarters_won          = quarters_won + 1,
      quarter_wins_progress = quarter_wins_progress + 1
  WHERE user_id = p_user_id
  RETURNING quarter_wins_progress, quarters_won
  INTO v_progress, v_total_wins;

  RAISE LOG 'award_quarter_win: recorded user=% progress=%/4 total=%',
    p_user_id, v_progress, v_total_wins;

  -- ── Step 4: Reward at threshold ──────────────────────────
  IF v_progress >= 4 THEN
    -- Deterministic key: tied to the exact Nth win milestone,
    -- collision-safe even if this block executes twice.
    v_txn_id := 'qr_' || p_user_id::text || '_at_' || v_total_wins::text;

    INSERT INTO square_credits (user_id, reason, transaction_id)
    VALUES (p_user_id, 'quarter_win', v_txn_id)
    ON CONFLICT (transaction_id) DO NOTHING;

    UPDATE leaderboard_stats
    SET quarter_wins_progress = 0,
        last_reward_at        = now()
    WHERE user_id = p_user_id;

    RAISE LOG 'award_quarter_win: credit granted user=% txn=%', p_user_id, v_txn_id;
    RETURN jsonb_build_object('status', 'rewarded', 'credited', true, 'progress', 0,
                              'milestone_id', v_txn_id);
  END IF;

  RETURN jsonb_build_object('status', 'recorded', 'credited', false, 'progress', v_progress);
END;
$$;

GRANT EXECUTE ON FUNCTION award_quarter_win(UUID, UUID, TEXT) TO authenticated;
