import { describe, expect, it } from "vitest";
import { searchWhere } from "@/lib/beneficiaries";

const fields = (w: string) => ({
  OR: [
    { firstName: { contains: w } },
    { middleName: { contains: w } },
    { lastName: { contains: w } },
    { referenceNo: { contains: w } },
    { oscaIdNo: { contains: w } },
  ],
});

describe("searchWhere", () => {
  it("matches a single word in any field", () => {
    expect(searchWhere("reyes")).toEqual({ AND: [fields("reyes")] });
  });
  it("needs every word of a full name to match", () => {
    expect(searchWhere("Maria Reyes")).toEqual({ AND: [fields("Maria"), fields("Reyes")] });
  });
  it("ignores extra spaces", () => {
    expect(searchWhere("  Maria   Reyes ")).toEqual({ AND: [fields("Maria"), fields("Reyes")] });
  });
});
