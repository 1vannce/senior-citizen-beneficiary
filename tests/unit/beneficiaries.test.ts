import { describe, expect, it } from "vitest";
import { isOngoingTransaction, ONGOING_TRANSACTION_MINUTES, searchWhere } from "@/lib/beneficiaries";

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

describe("isOngoingTransaction (T23)", () => {
  const now = new Date("2026-11-03T10:00:00+08:00");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  it("is ongoing for a claim released in the last 10 minutes", () => {
    expect(isOngoingTransaction(minutesAgo(0), now)).toBe(true);
    expect(isOngoingTransaction(minutesAgo(ONGOING_TRANSACTION_MINUTES), now)).toBe(true);
  });
  it("is not ongoing for an older claim or when there is no claim", () => {
    expect(isOngoingTransaction(minutesAgo(ONGOING_TRANSACTION_MINUTES + 1), now)).toBe(false);
    expect(isOngoingTransaction(null, now)).toBe(false);
  });
});
