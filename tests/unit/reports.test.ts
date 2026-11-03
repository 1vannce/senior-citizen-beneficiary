import { describe, expect, it } from "vitest";
import { releasedBetween } from "@/lib/reports";

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
