import { describe, expect, it } from "vitest";
import { isoDate, verifiedBy } from "@/lib/format";

describe("verifiedBy", () => {
  it("reads as words, with the representative's name when there is one", () => {
    expect(verifiedBy("MANUAL_ID")).toBe("Manual ID");
    expect(verifiedBy("FACE", null)).toBe("Face match");
    expect(verifiedBy("REPRESENTATIVE", "Ana Cruz")).toBe("Representative (Ana Cruz)");
  });
});

describe("isoDate", () => {
  it("gives the Manila date, which is a day ahead of UTC before 8 AM", () => {
    expect(isoDate(new Date("2026-11-02T23:30:00Z"))).toBe("2026-11-03");
  });
});
