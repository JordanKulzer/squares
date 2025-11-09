// utils/dateDisplay.ts
export const formatKickoff = (iso: string) => {
  if (!iso) return "TBD";

  // 1) Lock the displayed calendar day to the UTC date portion of the string
  //    so it never shifts when converting to local time.
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  const displayDate = new Date(y, m - 1, d); // local date representing the UTC calendar day

  // 2) Inspect the actual UTC time. If it's exactly midnight, treat time as unknown.
  const utc = new Date(iso);
  const hasRealTime =
    utc.getUTCHours() !== 0 ||
    utc.getUTCMinutes() !== 0 ||
    utc.getUTCSeconds() !== 0;

  const dateStr = displayDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!hasRealTime) {
    // API only gave a date (00:00Z) → avoid lying about time
    return `${dateStr} • Time TBD`;
  }

  // 3) If a real time exists, show it in the user's local timezone.
  const timeStr = utc.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateStr} at ${timeStr}`;
};
