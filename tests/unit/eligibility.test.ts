import { describe, expect, it } from "vitest";
import { checkEligibility, eligibleAgainOn } from "@/lib/eligibility";

const now = new Date("2026-10-31T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const program = { isActive: true, restrictedPeriodDays: 90 };

describe("checkEligibility", () => {
  it("allows an active beneficiary with no prior claim", () => {
    expect(checkEligibility({ beneficiaryStatus: "ACTIVE", program, lastClaimAt: null, now }).eligible).toBe(true);
  });
  it("blocks a claim inside the restricted period (T16)", () => {
    const r = checkEligibility({ beneficiaryStatus: "ACTIVE", program, lastClaimAt: daysAgo(20), now });
    expect(r).toMatchObject({ eligible: false, code: "WITHIN_RESTRICTED_PERIOD" });
  });
  it("allows a claim after the restricted period", () => {
    expect(checkEligibility({ beneficiaryStatus: "ACTIVE", program, lastClaimAt: daysAgo(91), now }).eligible).toBe(true);
  });
  it("blocks a deactivated beneficiary (T17)", () => {
    expect(checkEligibility({ beneficiaryStatus: "DEACTIVATED", program, lastClaimAt: null, now })).toMatchObject({
      code: "DEACTIVATED",
    });
  });
  describe("restricted period boundary (Manila calendar days)", () => {
    // Claim at 3 PM on 1 Aug 2026, Manila time; 1 Aug + 90 days = 30 Oct
    const claim = new Date("2026-08-01T15:00:00+08:00");
    const at = (iso: string) => checkEligibility({ beneficiaryStatus: "ACTIVE", program, lastClaimAt: claim, now: new Date(iso) });

    it("is ineligible on the last day of the period", () => {
      const r = at("2026-10-29T23:59:00+08:00");
      expect(r).toMatchObject({ eligible: false, code: "WITHIN_RESTRICTED_PERIOD" });
      expect(r.eligible || r.message).toContain("Friday, 30 Oct 2026");
    });
    it("is eligible from the start of the next day, even before the time of the first claim", () => {
      expect(at("2026-10-30T00:00:00+08:00").eligible).toBe(true);
      expect(at("2026-10-30T09:00:00+08:00").eligible).toBe(true);
    });
    it("counts a claim late in the UTC evening on the Manila date it happened", () => {
      // 20:00 UTC on 31 Jul is 4 AM on 1 Aug in Manila
      const late = new Date("2026-07-31T20:00:00Z");
      expect(eligibleAgainOn(late, 90).toISOString()).toBe("2026-10-29T16:00:00.000Z"); // 30 Oct 00:00 Manila
    });
  });
  it("makes no check for an inactive program (T18)", () => {
    expect(
      checkEligibility({ beneficiaryStatus: "ACTIVE", program: { ...program, isActive: false }, lastClaimAt: null, now }),
    ).toMatchObject({ code: "PROGRAM_INACTIVE" });
  });
});
