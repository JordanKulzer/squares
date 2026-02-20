/**
 * Get the current active quarter/OT the game is in.
 * Returns:
 *   1 = Q1, 2 = Q2, 3 = Q3, 4 = Q4, 5+ = OT periods
 *   null if pre-game or finished
 */
export function getActiveQuarter(game: any): number | null {
  const status = game?.competitions?.[0]?.status ?? game?.status ?? {};
  const state = status?.type?.state?.toLowerCase();
  const period = Number(status?.period || 0);

  if (state === "pre") return null; // not started
  if (state === "post") return null; // finished
  return period > 0 ? period : null;
}

/**
 * Drives-based detection of fully completed quarters.
 * Looks for drives that ended at 0:00 of a period.
 */
export function getCompletedQuartersFromDrives(game: any): number {
  const drives = game?.drives?.previous ?? [];
  if (!Array.isArray(drives) || drives.length === 0) return 0;

  let completed = 0;
  for (const d of drives) {
    const endPeriod = d?.end?.period?.number;
    const endClock = d?.end?.clock?.displayValue;
    if (endPeriod && endClock === "0:00") {
      completed = Math.max(completed, endPeriod);
    }
  }
  return completed;
}

/**
 * Number of quarters fully completed.
 * Uses drives when available, falls back to active quarter - 1.
 */
export function getCompletedQuarters(game: any): number {
  const byDrives = getCompletedQuartersFromDrives(game);
  if (byDrives > 0) return byDrives;

  const active = getActiveQuarter(game);
  if (!active) return 0;
  return active - 1;
}

/**
 * Visible quarter scores = only those that are completed.
 */
export function getVisibleQuarterScores(game: any): any[] {
  const allScores = game?.quarterScores ?? [];
  const completed = getCompletedQuarters(game);
  return allScores.slice(0, completed);
}

/**
 * Determine the winner for each quarter based on final digits of the scores.
 *
 * @param scores - Array of quarter score objects, each with { home, away }
 * @param selections - Array of user selections, each with { x, y, userId }
 * @param xAxis - Array of 10 numbers representing the team2 (away) axis
 * @param yAxis - Array of 10 numbers representing the team1 (home) axis
 * @param isTeam1Home - Whether team1 is the home team (affects digit mapping)
 */
export function determineQuarterWinners(
  scores: { home: number | null; away: number | null; completed?: boolean }[],
  selections: { x: number; y: number; userId: string }[],
  xAxis: number[],
  yAxis: number[],
  isTeam1Home: boolean,
  playerUsernames: Record<string, string> = {}
) {
  if (!Array.isArray(scores) || scores.length === 0) return [];

  return scores.map((score, index) => {
    const { home, away, completed } = score || {};
    // Skip quarters not marked as completed (for manual/custom games)
    if (home == null || away == null || completed === false) {
      return {
        quarter: `Q${index + 1}`,
        username: "No Winner",
        square: ["-", "-"],
      };
    }

    // Determine which side corresponds to X and Y axes
    const team1Score = isTeam1Home ? home : away;
    const team2Score = isTeam1Home ? away : home;

    const xVal = team2Score % 10;
    const yVal = team1Score % 10;

    const xIndex = xAxis.findIndex((v) => Number(v) === xVal);
    const yIndex = yAxis.findIndex((v) => Number(v) === yVal);

    if (xIndex === -1 || yIndex === -1) {
      console.warn(
        `⚠️ Could not find axis index for digits (${xVal}, ${yVal})`
      );
      return {
        quarter: `Q${index + 1}`,
        username: "No Winner",
        square: [xVal, yVal],
      };
    }

    // Find the user selection that matches this (x, y) coordinate
    const matchingSelection = selections.find(
      (sel) => sel.x === xIndex && sel.y === yIndex
    );

    const username = matchingSelection
      ? playerUsernames[matchingSelection.userId] || "Unknown"
      : "No Winner";

    return {
      quarter: `Q${index + 1}`,
      username,
      userId: matchingSelection?.userId || null,
      square: [xAxis[xIndex], yAxis[yIndex]],
    };
  });
}

export const calculatePlayerWinnings = (
  quarterWinners: any[],
  playerUsernames: Record<string, string>,
  pricePerSquare: number,
  totalSquares: number
) => {
  const winningsMap: Record<string, number> = {};

  if (!Array.isArray(quarterWinners) || !pricePerSquare || totalSquares === 0)
    return winningsMap;

  const totalPayout = pricePerSquare * totalSquares;
  const payoutPerQuarter = totalPayout / quarterWinners.length;

  const usernameToUserId: Record<string, string> = {};
  Object.entries(playerUsernames).forEach(([uid, name]) => {
    usernameToUserId[name.trim()] = uid;
  });

  quarterWinners.forEach((w) => {
    if (w?.username && w.username !== "No Winner") {
      const userId = usernameToUserId[w.username.trim()];
      if (userId) {
        winningsMap[userId] = (winningsMap[userId] || 0) + payoutPerQuarter;
      }
    }
  });

  return winningsMap;
};
