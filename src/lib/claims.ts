import { db } from "./db";
import { checkEligibility } from "./eligibility";

export async function evaluateEligibility(beneficiaryId: string, programId: string) {
  const [beneficiary, program] = await Promise.all([
    db.beneficiary.findUnique({ where: { id: beneficiaryId } }),
    db.program.findUnique({ where: { id: programId } }),
  ]);
  if (!beneficiary) return null;

  const last = program
    ? await db.assistanceClaim.findFirst({
        where: { beneficiaryId, programId },
        orderBy: { releasedAt: "desc" },
        select: { releasedAt: true },
      })
    : null;

  return {
    beneficiary,
    program,
    result: checkEligibility({
      beneficiaryStatus: beneficiary.status,
      program,
      lastClaimAt: last?.releasedAt ?? null,
    }),
  };
}
