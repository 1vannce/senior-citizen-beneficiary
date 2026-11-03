import { describe, expect, it } from "vitest";
import { isoDate } from "@/lib/format";

describe("isoDate", () => {
  it("gives the Manila date, which is a day ahead of UTC before 8 AM", () => {
    expect(isoDate(new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-03");
  });
});
