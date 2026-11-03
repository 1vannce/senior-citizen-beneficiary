import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { releasedBetween, toCsv } from "@/lib/reports";

describe("releasedBetween", () => {
  it("covers whole days in Manila time", () => {
    const r = releasedBetween("2026-11-03", "2026-11-03");
    expect(r.gte?.toISOString()).toBe("2026-11-02T16:00:00.000Z"); // 3 Nov 00:00 Manila
    expect(r.lt?.toISOString()).toBe("2026-11-03T16:00:00.000Z"); // 4 Nov 00:00 Manila
  });
  it("includes a claim at 7 AM Manila time, which is still the day before in UTC", () => {
    const r = releasedBetween("2026-11-03", "2026-11-03");
    const claim = new Date("2026-11-03T07:00:00+08:00");
    expect(claim >= r.gte! && claim < r.lt!).toBe(true);
  });
  it("leaves out a side that was not picked", () => {
    expect(releasedBetween("", null)).toEqual({});
    expect(Object.keys(releasedBetween(null, "2026-11-03"))).toEqual(["lt"]);
  });
});

describe("toCsv", () => {
  const cols = [
    ["name", "Name"],
    ["barangay", "Barangay"],
  ] as const;

  it("starts with a byte order mark so Excel reads ñ correctly", () => {
    const csv = toCsv([{ name: "Peña, Niño", barangay: "Santo Niño" }], cols);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Peña, Niño");
  });
  it("keeps names with commas and quotes in one cell, with the headers shown on screen", () => {
    const rows = [{ name: 'Cruz, Jose "Pepe"', barangay: "Poblacion" }];
    const parsed = Papa.parse<string[]>(toCsv(rows, cols).slice(1)).data;
    expect(parsed).toEqual([
      ["Name", "Barangay"],
      ['Cruz, Jose "Pepe"', "Poblacion"],
    ]);
  });
  it("stops a value from running as an Excel formula", () => {
    expect(toCsv([{ name: "=HYPERLINK(1)", barangay: "x" }], cols)).not.toMatch(/\n=HYPERLINK/);
  });
  it("writes only the header row when there are no rows", () => {
    expect(toCsv([], cols).trimEnd()).toBe("﻿Name,Barangay");
  });
});
