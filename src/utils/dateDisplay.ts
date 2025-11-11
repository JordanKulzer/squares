// utils/dateDisplay.ts
export const formatKickoff = (iso: string) => {
  if (!iso) return "TBD";

  const dt = new Date(iso);

  const dateStr = dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeStr = dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateStr} • ${timeStr}`;
};
