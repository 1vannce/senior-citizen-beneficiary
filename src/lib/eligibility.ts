import { isoDate, longDate } from "./format";

export type EligibilityInput = {
  beneficiaryStatus: string;
  program: { isActive: boolean; restrictedPeriodDays: number } | null;
  lastClaimAt: Date | null;
  now?: Date;
};

export type EligibilityResult =
  | { eligible: true }
  | {
      eligible: false;
      code: "PROGRAM_INACTIVE" | "DEACTIVATED" | "WITHIN_RESTRICTED_PERIOD";
      message: string;
    };

const DAY_MS = 86_400_000;

// The period counts calendar days in Manila time, so a claim on 1 Aug with a 90-day period
// allows the next claim from the start of 30 Oct, whatever the time of the first claim.
export function eligibleAgainOn(lastClaimAt: Date, restrictedPeriodDays: number): Date {
  const claimDay = new Date(`${isoDate(lastClaimAt)}T00:00:00+08:00`); // Manila has no daylight saving
  return new Date(claimDay.getTime() + restrictedPeriodDays * DAY_MS);
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const now = input.now ?? new Date();

  // Alternate course 3a: no check is made for an inactive program
  if (!input.program || !input.program.isActive) {
    return {
      eligible: false,
      code: "PROGRAM_INACTIVE",
      message: "This assistance program is not active. No eligibility check was made.",
    };
  }
  if (input.beneficiaryStatus !== "ACTIVE") {
    return { eligible: false, code: "DEACTIVATED", message: "This beneficiary record is deactivated." };
  }
  if (input.lastClaimAt) {
    const nextDate = eligibleAgainOn(input.lastClaimAt, input.program.restrictedPeriodDays);
    if (now < nextDate) {
      return {
        eligible: false,
        code: "WITHIN_RESTRICTED_PERIOD",
        message: `Last claim was inside the ${input.program.restrictedPeriodDays}-day restricted period. Eligible again on ${longDate(nextDate)}.`,
      };
    }
  }
  return { eligible: true };
}
