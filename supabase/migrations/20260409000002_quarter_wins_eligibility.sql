-- ============================================================
-- Quarter Wins Eligibility Rules
-- ============================================================
-- Updates award_quarter_win() to gate on:
--   1. Minimum 3 distinct players          (not_enough_players)
--   2. User owns ≤ 25 % of squares         (ownership_too_high)
--   3. At least 50 % of squares selected   (low_fill)
--
-- All checks are server-side (SECURITY DEFINER) — there is
-- no client path that can bypass them.
-- ============================================================

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
  -- eligibility
  v_player_count     INTEGER;
  v_total_selections INTEGER;
  v_user_selections  INTEGER;
  v_fill_pct         NUMERIC;
  v_ownership_pct    NUMERIC;

  -- award
  v_progress         INTEGER;
  v_total_wins       INTEGER;
  v_txn_id           TEXT;
BEGIN
  -- ── Step 1: Load game snapshot for eligibility checks ─────
  SELECT
    -- distinct authenticated players (player_ids is uuid[])
    COALESCE(array_length(player_ids, 1), 0),
    -- total claimed squares
    COALESCE(jsonb_array_length(selections), 0),
    -- squares owned by this user
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM   jsonb_array_elements(COALESCE(selections, '[]'::jsonb)) AS elem
      WHERE  elem->>'userId' = p_user_id::text
    ), 0)
  INTO
    v_player_count,
    v_total_selections,
    v_user_selections
  FROM squares
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RAISE LOG 'award_quarter_win: game not found game=%', p_game_id;
    RETURN jsonb_build_object('status', 'ineligible',
                              'reason', 'game_not_found', 'credited', false);
  END IF;

  -- Percentages (100-square grid is the standard; avoid division by zero)
  v_fill_pct      := CASE WHEN 100 > 0 THEN v_total_selections / 100.0 ELSE 0 END;
  v_ownership_pct := CASE WHEN 100 > 0 THEN v_user_selections  / 100.0 ELSE 0 END;

  -- ── Step 2: Eligibility gates ─────────────────────────────

  -- Rule 1 — minimum 3 distinct players
  IF v_player_count < 3 THEN
    RAISE LOG 'award_quarter_win: ineligible user=% game=% reason=not_enough_players players=%',
      p_user_id, p_game_id, v_player_count;
    RETURN jsonb_build_object('status', 'ineligible',
                              'reason', 'not_enough_players',
                              'credited', false,
                              'player_count', v_player_count);
  END IF;

  -- Rule 2 — user must not own > 25 % of squares
  IF v_ownership_pct > 0.25 THEN
    RAISE LOG 'award_quarter_win: ineligible user=% game=% reason=ownership_too_high pct=%',
      p_user_id, p_game_id, round(v_ownership_pct * 100);
    RETURN jsonb_build_object('status', 'ineligible',
                              'reason', 'ownership_too_high',
                              'credited', false,
                              'ownership_pct', round(v_ownership_pct * 100));
  END IF;

  -- Rule 3 — at least 50 % of squares must be filled
  IF v_fill_pct < 0.50 THEN
    RAISE LOG 'award_quarter_win: ineligible user=% game=% reason=low_fill pct=%',
      p_user_id, p_game_id, round(v_fill_pct * 100);
    RETURN jsonb_build_object('status', 'ineligible',
                              'reason', 'low_fill',
                              'credited', false,
                              'fill_pct', round(v_fill_pct * 100));
  END IF;

  RAISE LOG 'award_quarter_win: eligibility_passed user=% game=% players=% fill=% ownership=%',
    p_user_id, p_game_id, v_player_count,
    round(v_fill_pct * 100), round(v_ownership_pct * 100);

  -- ── Step 3: Idempotent win ledger insert ──────────────────
  -- Rule 4 (one win per quarter per game) is the UNIQUE constraint.
  INSERT INTO user_quarter_wins (user_id, game_id, quarter)
  VALUES (p_user_id, p_game_id, p_quarter)
  ON CONFLICT (user_id, game_id, quarter) DO NOTHING;

  IF NOT FOUND THEN
    RAISE LOG 'award_quarter_win: duplicate_win skipped user=% game=% quarter=%',
      p_user_id, p_game_id, p_quarter;
    RETURN jsonb_build_object('status', 'ineligible',
                              'reason', 'duplicate_win', 'credited', false);
  END IF;

  -- ── Step 4: Ensure leaderboard_stats row exists ──────────
  INSERT INTO leaderboard_stats (user_id, quarters_won, games_played, quarter_wins_progress)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- ── Step 5: Atomically increment (row lock via UPDATE) ────
  UPDATE leaderboard_stats
  SET quarters_won          = quarters_won + 1,
      quarter_wins_progress = quarter_wins_progress + 1
  WHERE user_id = p_user_id
  RETURNING quarter_wins_progress, quarters_won
  INTO v_progress, v_total_wins;

  RAISE LOG 'award_quarter_win: recorded user=% progress=%/4 total=%',
    p_user_id, v_progress, v_total_wins;

  -- ── Step 6: Reward at threshold ──────────────────────────
  IF v_progress >= 4 THEN
    -- Deterministic key — tied to the exact milestone, collision-safe
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

-- signature unchanged — existing GRANT carries over
