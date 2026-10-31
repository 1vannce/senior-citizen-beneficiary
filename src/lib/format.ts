const TIME_ZONE = "Asia/Manila";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// "Saturday, 24 Oct 2026"
export function longDate(d: Date) {
  const get = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, ...o });
  return `${get({ weekday: "long" })}, ${get({ day: "numeric" })} ${get({ month: "short" })} ${get({ year: "numeric" })}`;
}

// "Oct 26, 2026, 9:14 AM"
export function dateTime(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isoDate(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export function greeting(d: Date) {
  const hour = Number(d.toLocaleString("en-US", { timeZone: TIME_ZONE, hour: "numeric", hour12: false }));
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}

// The data model has no claim number yet, so claims are labelled from their id.
export function claimRef(id: string) {
  return `CLM-${id.slice(-6).toUpperCase()}`;
}
