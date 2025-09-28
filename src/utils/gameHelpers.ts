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
