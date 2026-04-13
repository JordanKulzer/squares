import { supabase } from "../lib/supabase";

export const FREE_MAX_ACTIVE = 3;

/**
 * Badge progress only counts from activity after this date.
 * Run the Supabase SQL migration to snapshot existing users' baselines
 * before deploying this version.
 */
export const BADGE_LAUNCH_DATE = "2026-02-19T00:00:00.000Z";

/** @deprecated Use getActiveSquareCount instead */
export const FREE_MAX_CREATED = FREE_MAX_ACTIVE;

export async function getActiveCreatedCount(userId: string): Promise<number> {
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from("squares")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gt("deadline", now);

  if (error) {
    console.error("Error counting active squares:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Count total active squares the user is in (created + joined).
 * "Active" means deadline hasn't passed.
 */
export async function getActiveSquareCount(userId: string): Promise<number> {
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from("squares")
    .select("id", { count: "exact", head: true })
    .contains("player_ids", [userId])
    .gt("deadline", now);

  if (error) {
    console.error("Error counting active squares:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getAvailableCredits(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("square_credits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);

  if (error) {
    console.error("Error counting credits:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Atomically consume one free square credit via a row-locked RPC.
 * SKIP LOCKED prevents two concurrent calls from claiming the same credit.
 *
 * @returns creditId on success, null if no credit available or on error.
 */
export async function consumeCredit(
  userId: string,
  squareId: string | null = null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("consume_square_credit", {
    p_user_id: userId,
    p_square_id: squareId,
  });

  if (error) {
    console.error("[consumeCredit] RPC error:", error.message);
    return null;
  }

  const result = data as { status: string; credit_id?: string };
  if (result.status !== "ok" || !result.credit_id) {
    console.log(`[consumeCredit] no_credit userId=${userId}`);
    return null;
  }

  console.log(`[freeCredits] free_credit_used userId=${userId} creditId=${result.credit_id}`);
  return result.credit_id;
}

/**
 * Refund a credit whose associated square action failed.
 * Only succeeds within the 5-minute safety window enforced server-side.
 */
export async function refundCredit(
  creditId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc("refund_square_credit", {
    p_credit_id: creditId,
    p_user_id: userId,
  });
  if (error) {
    console.error("[refundCredit] RPC error:", error.message);
  } else {
    console.log(`[freeCredits] free_credit_refunded creditId=${creditId}`);
  }
}

/**
 * Insert one dev-only free square credit for testing.
 * Only callable in __DEV__ builds.
 */
export async function insertDevCredit(userId: string): Promise<boolean> {
  const { error } = await supabase.from("square_credits").insert({
    user_id: userId,
    transaction_id: `dev_${userId}_${Date.now()}`,
  });
  if (error) {
    console.error("[devCredit] Insert error:", error.message);
    return false;
  }
  console.log(`[devCredit] Inserted dev credit for userId=${userId}`);
  return true;
}

/**
 * Check stats and award any badges the user has earned but doesn't have yet.
 */
export async function checkAndAwardBadges(userId: string): Promise<void> {
  try {
    const { data: lbData } = await supabase
      .from("leaderboard_stats")
      .select("quarters_won, games_played, badge_wins_offset, badge_games_offset")
      .eq("user_id", userId)
      .maybeSingle();

    // Net progress since the badge feature launched (existing users have offsets set via SQL)
    const wins = Math.max(0, (lbData?.quarters_won || 0) - (lbData?.badge_wins_offset || 0));
    const games = Math.max(0, (lbData?.games_played || 0) - (lbData?.badge_games_offset || 0));

    // Count sweeps only from games created after badge launch
    const { data: gamesWithWinners } = await supabase
      .from("squares")
      .select("quarter_winners, players")
      .contains("player_ids", [userId])
      .not("quarter_winners", "is", null)
      .gte("created_at", BADGE_LAUNCH_DATE);

    let sweeps = 0;
    (gamesWithWinners || []).forEach((game) => {
      if (!game.quarter_winners || !Array.isArray(game.quarter_winners)) return;
      const playerEntry = (game.players as any[])?.find((p: any) => p.userId === userId);
      if (!playerEntry) return;
      const userWins = game.quarter_winners.filter(
        (qw: any) => qw.username?.trim() === playerEntry.username?.trim() && qw.username !== "No Winner"
      );
      if (userWins.length >= 4) sweeps++;
    });

    // Only count credits earned after badge launch
    const { count: credits } = await supabase
      .from("square_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", BADGE_LAUNCH_DATE);

    const statsMap: Record<string, number> = {
      wins,
      games,
      sweeps,
      credits: credits || 0,
    };

    const COUNTABLE_BADGES: { type: string; key: string; target: number }[] = [
      { type: "first_public_win", key: "wins", target: 1 },
      { type: "5_wins", key: "wins", target: 5 },
      { type: "10_public_wins", key: "wins", target: 10 },
      { type: "25_public_wins", key: "wins", target: 25 },
      { type: "50_public_wins", key: "wins", target: 50 },
      { type: "100_public_wins", key: "wins", target: 100 },
      { type: "first_public_game", key: "games", target: 1 },
      { type: "3_games", key: "games", target: 3 },
      { type: "social_butterfly", key: "games", target: 10 },
      { type: "20_games", key: "games", target: 20 },
      { type: "50_games", key: "games", target: 50 },
      { type: "sweep", key: "sweeps", target: 1 },
      { type: "double_sweep", key: "sweeps", target: 2 },
      { type: "5_sweeps", key: "sweeps", target: 5 },
      { type: "credit_earner", key: "credits", target: 1 },
    ];

    const { data: existingBadges } = await supabase
      .from("badges")
      .select("badge_type")
      .eq("user_id", userId);

    const earnedSet = new Set((existingBadges || []).map((b) => b.badge_type));

    const newBadges = COUNTABLE_BADGES.filter(
      (b) => !earnedSet.has(b.type) && statsMap[b.key] >= b.target
    );

    if (newBadges.length > 0) {
      await supabase.from("badges").insert(
        newBadges.map((b) => ({
          user_id: userId,
          badge_type: b.type,
          earned_at: new Date().toISOString(),
        }))
      );
    }
  } catch (err) {
    console.error("Error checking/awarding badges:", err);
  }
}

/**
 * Award a single badge to a user if they don't already have it.
 */
export async function awardBadgeIfNew(userId: string, badgeType: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_type", badgeType)
      .maybeSingle();
    if (!data) {
      await supabase.from("badges").insert({
        user_id: userId,
        badge_type: badgeType,
        earned_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Error awarding badge:", err);
  }
}

/**
 * Record a quarter win for a user via the idempotent `award_quarter_win` RPC.
 *
 * Deduplication is enforced by a UNIQUE (user_id, game_id, quarter) constraint
 * in the database — duplicate calls for the same quarter are silently ignored.
 * A free credit is granted automatically every 4 unique wins.
 *
 * @param userId      - the winning user's ID
 * @param gameId      - the square/game ID (gridId from SquareScreen)
 * @param quarter     - quarter identifier, e.g. "1", "2", "Q1", "OT1"
 * @param playerCount - min 2 players required for the win to count
 * @returns { credited, progress, milestoneId, reason }
 *   credited:    true when a free square credit was granted
 *   progress:    current 0–3 win progress, or -1 if skipped/ineligible
 *   milestoneId: unique reward key (use for UI deduplication) — set only when credited
 *   reason:      set only on ineligible outcomes
 */
export async function recordQuarterWin(
  userId: string,
  gameId: string,
  quarter: string,
  playerCount: number,
): Promise<{ credited: boolean; progress: number; milestoneId?: string; reason?: string }> {
  // Hard client-side floor: saves a round-trip for obvious cases.
  // The RPC enforces ≥ 3 players server-side; this just avoids the call.
  if (playerCount < 3) {
    console.log(`[quarterWin] Skipped client-side: playerCount=${playerCount} < 3`);
    return { credited: false, progress: -1, reason: "not_enough_players" };
  }

  const { data, error } = await supabase.rpc("award_quarter_win", {
    p_user_id: userId,
    p_game_id: gameId,
    p_quarter: quarter,
  });

  if (error) {
    console.error("[quarterWin] RPC error:", error.message);
    throw error;
  }

  const result = data as {
    status: "recorded" | "rewarded" | "ineligible";
    credited: boolean;
    progress?: number;
    milestone_id?: string;
    reason?: string;
    player_count?: number;
    ownership_pct?: number;
    fill_pct?: number;
  };

  if (result.status === "ineligible") {
    // reason is one of: duplicate_win | not_enough_players |
    //                   ownership_too_high | low_fill | game_not_found
    console.log(`[quarterWin] Ineligible user=${userId} game=${gameId} q=${quarter} reason=${result.reason}`);
    return { credited: false, progress: -1, reason: result.reason };
  }

  if (result.status === "rewarded") {
    const milestoneId = result.milestone_id;
    console.log(`[quarterWin] reward_granted user=${userId} milestone=${milestoneId}`);
    checkAndAwardBadges(userId).catch(console.error);
    return { credited: true, progress: 0, milestoneId };
  }

  // status === "recorded"
  const progress = result.progress ?? 0;
  console.log(`[quarterWin] Recorded user=${userId} game=${gameId} q=${quarter} progress=${progress}/4`);
  checkAndAwardBadges(userId).catch(console.error);
  return { credited: false, progress };
}

/**
 * Record that a user joined/created a game. Increments games_played in leaderboard_stats.
 */
export async function recordGameJoin(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("leaderboard_stats")
    .select("id, games_played")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("leaderboard_stats")
      .update({ games_played: (existing.games_played || 0) + 1 })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("leaderboard_stats")
      .insert({ user_id: userId, quarters_won: 0, games_played: 1 });
  }

  // Check and award any new badges
  checkAndAwardBadges(userId).catch(console.error);
}
