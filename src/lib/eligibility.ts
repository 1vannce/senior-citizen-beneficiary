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
    const nextDate = new Date(input.lastClaimAt.getTime() + input.program.restrictedPeriodDays * DAY_MS);
    if (nextDate > now) {
      return {
        eligible: false,
        code: "WITHIN_RESTRICTED_PERIOD",
        message: `Last claim was inside the ${input.program.restrictedPeriodDays}-day restricted period. Eligible again on ${nextDate.toLocaleDateString("en-PH")}.`,
      };
    }
  }
  return { eligible: true };
}
