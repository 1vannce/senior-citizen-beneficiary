import { describe, expect, it } from "vitest";
import { checkEligibility } from "@/lib/eligibility";

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
  it("makes no check for an inactive program (T18)", () => {
    expect(
      checkEligibility({ beneficiaryStatus: "ACTIVE", program: { ...program, isActive: false }, lastClaimAt: null, now }),
    ).toMatchObject({ code: "PROGRAM_INACTIVE" });
  });
});
