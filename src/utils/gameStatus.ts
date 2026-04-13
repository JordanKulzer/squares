/**
 * gameStatus.ts
 *
 * Single source of truth for game completion detection and HomeScreen sync.
 *
 * Architecture contract:
 *  - `game_completed` (DB column) is always the authoritative "completed" signal.
 *    Nothing in this file sets game_completed from a heuristic alone.
 *  - `determineGameCompletion` is the one place that decides whether an API
 *    response proves a game is over. Both HomeScreen sync AND SquareScreen must
 *    call this function — never inline the logic elsewhere.
 *  - `maybeUpdateLastScoreCheckAt` is the one place that writes
 *    last_score_check_at. Call it instead of calling supabase directly.
 *  - "finalizing" is a pure display state (deadline + expected window elapsed,
 *    but DB not yet confirmed). It never triggers game_completed = true.
 *  - Custom / manual games (no event_id) and unsupported leagues skip sync
 *    entirely and never enter "finalizing".
 */

import { supabase } from "../lib/supabase";
import { API_BASE_URL } from "./apiConfig";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GameStatus = "upcoming" | "live" | "finalizing" | "completed";

/** Minimal shape of the score API response used for completion detection. */
export type ApiScoreResponse = {
  id?: string | null;
  completed?: boolean | null;
  quarterScores?: { home: number | null; away: number | null }[] | null;
  completedQuarters?: number | null;
  team2_abbr?: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Leagues that have working API score endpoints.
 * Only these are eligible for HomeScreen stale-game sync.
 * Anything not in this set is treated as a custom/manual game and skipped.
 */
const SUPPORTED_API_LEAGUES = new Set(["NFL", "NCAAF", "NBA", "NCAAB"]);

/**
 * Expected maximum game duration in ms after the deadline/kick-off.
 * Used ONLY for the live → finalizing display transition.
 * Intentionally generous to account for overtime and delays.
 * Never used to mark a game completed.
 */
const EXPECTED_GAME_DURATION_MS: Record<string, number> = {
  NFL: 4 * 60 * 60 * 1000,     // 4 h
  NCAAF: 4 * 60 * 60 * 1000,   // 4 h
  NBA: 3.5 * 60 * 60 * 1000,   // 3.5 h
  NCAAB: 3.5 * 60 * 60 * 1000, // 3.5 h
};

/**
 * Minimum gap between last_score_check_at writes.
 * Used by `maybeUpdateLastScoreCheckAt` to prevent SquareScreen's 30-second
 * polling loop from issuing a DB write on every tick.
 */
export const LAST_CHECK_WRITE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

// ─── isSupportedApiLeague ─────────────────────────────────────────────────────

/**
 * Returns true only for leagues that have working score API endpoints.
 * Pass any value — null, undefined, and unknown strings all return false safely.
 */
export function isSupportedApiLeague(league: string | null | undefined): boolean {
  if (!league) return false;
  return SUPPORTED_API_LEAGUES.has(league.toUpperCase());
}

// ─── determineGameCompletion ─────────────────────────────────────────────────

/**
 * THE single source of truth for completion detection from an API response.
 *
 * A game is complete when EITHER:
 *  a) The API explicitly flags `completed: true`, OR
 *  b) All 4 regulation quarters have final scores AND the deadline was
 *     more than 1 hour ago (prevents false-positives on a game in Q4).
 *
 * IMPORTANT: Both HomeScreen sync (fetchAndSyncGame) and SquareScreen's
 * polling loop must call this function. Do not inline this logic anywhere else.
 */
export function determineGameCompletion(
  apiResponse: ApiScoreResponse,
  deadlineValue: Date,
): boolean {
  const isApiCompleted = apiResponse.completed ?? false;

  const apiScores = apiResponse.quarterScores ?? [];
  const allRegulationQuartersDone =
    apiScores.length >= 4 &&
    apiScores
      .slice(0, 4)
      .every((q) => q.home !== null && q.away !== null);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const gameStartedOverOneHourAgo = deadlineValue.getTime() < oneHourAgo;
  const inferredCompleted = allRegulationQuartersDone && gameStartedOverOneHourAgo;

  return isApiCompleted || inferredCompleted;
}

// ─── deriveGameStatus ─────────────────────────────────────────────────────────

/**
 * Pure function. Maps stored game fields to a display-level status.
 *
 *  completed  → game_completed is true in DB
 *  upcoming   → deadline is in the future (or missing / unparseable)
 *  finalizing → deadline passed, not completed, expected play window also elapsed
 *               for a known API-backed league
 *  live       → deadline passed, not completed, still within expected window
 *               (or custom/unsupported-league game — no API heuristic)
 */
export function deriveGameStatus(game: {
  deadline?: string | null;
  game_completed?: boolean | null;
  event_id?: string | null;
  league?: string | null;
}): GameStatus {
  if (game.game_completed) return "completed";

  const deadline = game.deadline ? new Date(game.deadline) : null;
  if (!deadline || isNaN(deadline.getTime())) {
    if (game.deadline) {
      // String was present but not parseable — log for debugging
      console.warn(
        `[gameStatus] deriveGameStatus: unparseable deadline "${game.deadline}" — treating as upcoming`,
      );
    }
    return "upcoming";
  }

  const nowMs = Date.now();
  if (deadline.getTime() > nowMs) return "upcoming";

  const league = (game.league || "").toUpperCase();
  const durationMs = EXPECTED_GAME_DURATION_MS[league];

  // No expected duration means custom / unsupported-league: stay "live" forever
  if (!durationMs || !game.event_id) return "live";

  const expectedEndMs = deadline.getTime() + durationMs;
  return nowMs > expectedEndMs ? "finalizing" : "live";
}

// ─── isEligibleForRefresh ─────────────────────────────────────────────────────

/**
 * Guards HomeScreen stale-game sync. Returns false (with a reason log) if any
 * of these are true:
 *  - already completed
 *  - no event_id (custom / manual game)
 *  - league is not in SUPPORTED_API_LEAGUES
 *  - no deadline string
 *  - deadline string is not parseable (separate log from "upcoming")
 *  - deadline hasn't passed yet
 *  - last_score_check_at is within throttleMs
 */
export function isEligibleForRefresh(
  game: {
    id: string;
    game_completed?: boolean | null;
    event_id?: string | null;
    league?: string | null;
    deadline?: string | null;
    last_score_check_at?: string | null;
  },
  nowMs: number,
  throttleMs = 3 * 60 * 1000,
): boolean {
  if (game.game_completed) {
    console.log(`[gameStatus] skip id=${game.id} reason=already_completed`);
    return false;
  }
  if (!game.event_id) {
    console.log(`[gameStatus] skip id=${game.id} reason=no_event_id`);
    return false;
  }
  if (!isSupportedApiLeague(game.league)) {
    console.log(
      `[gameStatus] skip id=${game.id} reason=unsupported_league ` +
      `league=${game.league ?? "null"}`,
    );
    return false;
  }
  if (!game.deadline) {
    console.log(`[gameStatus] skip id=${game.id} reason=no_deadline`);
    return false;
  }
  const deadlineMs = new Date(game.deadline).getTime();
  if (isNaN(deadlineMs)) {
    console.warn(
      `[gameStatus] skip id=${game.id} reason=invalid_deadline ` +
      `value="${game.deadline}"`,
    );
    return false;
  }
  if (deadlineMs > nowMs) {
    console.log(`[gameStatus] skip id=${game.id} reason=upcoming`);
    return false;
  }
  if (game.last_score_check_at) {
    const lastCheck = new Date(game.last_score_check_at).getTime();
    if (!isNaN(lastCheck) && nowMs - lastCheck < throttleMs) {
      const secAgo = Math.round((nowMs - lastCheck) / 1000);
      console.log(
        `[gameStatus] skip id=${game.id} reason=recently_checked (${secAgo}s ago)`,
      );
      return false;
    }
  }
  console.log(`[gameStatus] eligible id=${game.id}`);
  return true;
}

// ─── maybeUpdateLastScoreCheckAt ─────────────────────────────────────────────

/**
 * Writes last_score_check_at to the DB only if the previous write was at least
 * `thresholdMs` ago. Use this everywhere instead of calling supabase directly.
 *
 * Pass `lastWrittenAtMs = 0` to always write (e.g. the first call after mount).
 *
 * Returns the timestamp (ms) of the write if it happened, or null if skipped.
 * Callers should store the return value in a ref to pass on the next call:
 *
 *   const written = await maybeUpdateLastScoreCheckAt(id, lastWrittenRef.current);
 *   if (written !== null) lastWrittenRef.current = written;
 */
export async function maybeUpdateLastScoreCheckAt(
  squareId: string,
  lastWrittenAtMs: number,
  thresholdMs = LAST_CHECK_WRITE_THRESHOLD_MS,
): Promise<number | null> {
  const nowMs = Date.now();
  if (nowMs - lastWrittenAtMs < thresholdMs) {
    return null; // too soon — skip the DB write
  }

  const { error } = await supabase
    .from("squares")
    .update({ last_score_check_at: new Date(nowMs).toISOString() })
    .eq("id", squareId);

  if (error) {
    console.warn(
      `[gameStatus] maybeUpdateLastScoreCheckAt failed id=${squareId}: ${error.message}`,
    );
    return null;
  }

  return nowMs;
}

// ─── fetchAndSyncGame ─────────────────────────────────────────────────────────

/**
 * Fetches the score API for one game and persists the completion state.
 *
 * Intentionally narrow — this only determines completion status.
 * It does NOT save quarter_scores, isTeam1Home, or trigger winner logic.
 * SquareScreen owns that full detail flow.
 *
 * Returns true if the game is now confirmed completed.
 */
export async function fetchAndSyncGame(game: {
  id: string;
  event_id: string;
  deadline: string;
  league?: string | null;
  team1?: string | null;
  team2?: string | null;
}): Promise<boolean> {
  // Reject unsupported leagues explicitly — no silent fallback to "NFL"
  if (!isSupportedApiLeague(game.league)) {
    console.warn(
      `[gameStatus] fetchAndSyncGame called with unsupported league="${game.league}" ` +
      `id=${game.id} — skipping`,
    );
    return false;
  }

  const league = game.league!.toUpperCase();
  const deadlineValue = new Date(game.deadline);

  if (isNaN(deadlineValue.getTime())) {
    console.warn(
      `[gameStatus] fetchAndSyncGame invalid deadline="${game.deadline}" id=${game.id} — skipping`,
    );
    return false;
  }

  if (deadlineValue.getTime() > Date.now()) {
    // Defensive guard — isEligibleForRefresh should have blocked this already
    console.log(`[gameStatus] fetchAndSyncGame deadline not passed id=${game.id} — skipping`);
    return false;
  }

  const startDate = deadlineValue.toISOString().split("T")[0];
  const isBasketball = league === "NBA" || league === "NCAAB";
  const scoresUrl = isBasketball
    ? `${API_BASE_URL}/apisports/basketball/scores?eventId=${game.event_id}&league=${league}`
    : `${API_BASE_URL}/apisports/scores?eventId=${game.event_id}&league=${league}` +
      `&startDate=${startDate}&team1=${game.team1 ?? ""}&team2=${game.team2 ?? ""}`;

  let isNowCompleted = false;

  try {
    const res = await fetch(scoresUrl);
    const text = await res.text();

    if (text.trimStart().startsWith("<")) {
      throw new Error("Received HTML instead of JSON — backend returning error page");
    }

    let apiResponse: ApiScoreResponse;
    try {
      apiResponse = JSON.parse(text) as ApiScoreResponse;
    } catch {
      throw new Error(`Non-JSON API response for id=${game.id}`);
    }

    if (!apiResponse?.id) {
      throw new Error(`API response missing 'id' field for id=${game.id}`);
    }

    // Use the single shared completion function — not inline logic
    isNowCompleted = determineGameCompletion(apiResponse, deadlineValue);

    if (isNowCompleted) {
      console.log(
        `[gameStatus] confirmed completed id=${game.id} ` +
        `apiCompleted=${apiResponse.completed ?? false}`,
      );
    } else {
      console.log(
        `[gameStatus] not yet completed id=${game.id} ` +
        `quarters=${apiResponse.quarterScores?.length ?? 0}`,
      );
    }
  } catch (e) {
    console.warn(
      `[gameStatus] fetch failed id=${game.id}:`,
      e instanceof Error ? e.message : e,
    );
    // Never mark completed on error. Still write last_score_check_at below so
    // HomeScreen doesn't retry on every focus while the API is degraded.
  }

  // Always persist last_score_check_at after a fetch attempt (success or failure).
  // fetchAndSyncGame is only called after isEligibleForRefresh confirms the
  // throttle window has elapsed, so writing unconditionally here is correct.
  const updatePayload: Record<string, unknown> = {
    last_score_check_at: new Date().toISOString(),
  };
  if (isNowCompleted) {
    updatePayload.game_completed = true;
  }

  const { error: updateError } = await supabase
    .from("squares")
    .update(updatePayload)
    .eq("id", game.id);

  if (updateError) {
    console.warn(
      `[gameStatus] DB update failed id=${game.id}: ${updateError.message}`,
    );
  }

  return isNowCompleted;
}

// ─── syncStaleGames ───────────────────────────────────────────────────────────

/**
 * Filters eligible games and runs fetchAndSyncGame for each in batches.
 * Returns IDs of games confirmed completed by this sync run.
 */
export async function syncStaleGames(
  games: Array<{
    id: string;
    game_completed?: boolean | null;
    event_id?: string | null;
    league?: string | null;
    deadline?: string | null;
    team1?: string | null;
    team2?: string | null;
    last_score_check_at?: string | null;
  }>,
  concurrency = 3,
): Promise<string[]> {
  const nowMs = Date.now();
  const eligible = games.filter((g) => isEligibleForRefresh(g, nowMs));

  if (eligible.length === 0) {
    console.log("[gameStatus] syncStaleGames — no eligible games");
    return [];
  }

  console.log(`[gameStatus] syncStaleGames — checking ${eligible.length} game(s)`);

  const completedIds: string[] = [];

  for (let i = 0; i < eligible.length; i += concurrency) {
    const batch = eligible.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((g) =>
        fetchAndSyncGame({
          id: g.id,
          event_id: g.event_id!,
          deadline: g.deadline!,
          league: g.league,
          team1: g.team1,
          team2: g.team2,
        }),
      ),
    );

    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value === true) {
        completedIds.push(batch[idx].id);
      }
    });
  }

  if (completedIds.length > 0) {
    console.log(
      `[gameStatus] syncStaleGames — confirmed completed: ${completedIds.join(", ")}`,
    );
  }

  return completedIds;
}
