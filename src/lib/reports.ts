const DAY_MS = 86_400_000;

// A "From" and "To" date picked on the report screen cover whole days in Manila time (UTC+8, no daylight saving).
export function releasedBetween(from?: string | null, to?: string | null): { gte?: Date; lt?: Date } {
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00+08:00`) } : {}),
    ...(to ? { lt: new Date(new Date(`${to}T00:00:00+08:00`).getTime() + DAY_MS) } : {}),
  };
}
