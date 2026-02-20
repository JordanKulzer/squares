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

export async function consumeCredit(
  userId: string,
  squareId: string,
): Promise<boolean> {
  const { data: creditData } = await supabase
    .from("square_credits")
    .select("id")
    .eq("user_id", userId)
    .is("used_at", null)
    .limit(1)
    .single();

  if (!creditData) return false;

  const { error } = await supabase
    .from("square_credits")
    .update({
      used_on_square_id: squareId,
      used_at: new Date().toISOString(),
    })
    .eq("id", creditData.id);

  return !error;
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

const WINS_PER_CREDIT = 4;

/**
 * Record a quarter win for a user. Increments their win count
 * and awards a credit every WINS_PER_CREDIT wins.
 * Only counts if the square has at least 2 players.
 */
export async function recordQuarterWin(
  userId: string,
  playerCount: number,
): Promise<void> {
  if (playerCount < 2) return;

  // Upsert leaderboard_stats: increment quarters_won
  const { data: existing } = await supabase
    .from("leaderboard_stats")
    .select("id, quarters_won")
    .eq("user_id", userId)
    .maybeSingle();

  let newTotal: number;

  if (existing) {
    newTotal = (existing.quarters_won || 0) + 1;
    await supabase
      .from("leaderboard_stats")
      .update({ quarters_won: newTotal })
      .eq("id", existing.id);
  } else {
    newTotal = 1;
    await supabase
      .from("leaderboard_stats")
      .insert({ user_id: userId, quarters_won: 1 });
  }

  // Award a credit every WINS_PER_CREDIT wins
  if (newTotal % WINS_PER_CREDIT === 0) {
    await supabase
      .from("square_credits")
      .insert({ user_id: userId, reason: "quarter_win" });
  }

  // Check and award any new badges
  checkAndAwardBadges(userId).catch(console.error);
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
