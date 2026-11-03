import Papa from "papaparse";

const DAY_MS = 86_400_000;

// A "From" and "To" date picked on the report screen cover whole days in Manila time (UTC+8, no daylight saving).
export function releasedBetween(from?: string | null, to?: string | null): { gte?: Date; lt?: Date } {
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00+08:00`) } : {}),
    ...(to ? { lt: new Date(new Date(`${to}T00:00:00+08:00`).getTime() + DAY_MS) } : {}),
  };
}

// CSV text for Excel: a byte order mark so Excel reads ñ and other letters as UTF-8, values with
// commas or quotes quoted, and values starting with = + - @ escaped so Excel does not run them as formulas.
export function toCsv(rows: Record<string, string>[], cols: readonly (readonly [string, string])[]): string {
  const data = rows.map((r) => cols.map(([key]) => r[key] ?? ""));
  return "﻿" + Papa.unparse({ fields: cols.map(([, header]) => header), data }, { escapeFormulae: true });
}
