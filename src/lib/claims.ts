import { db } from "./db";
import { checkEligibility } from "./eligibility";

type Tx = Pick<typeof db, "beneficiary" | "program" | "assistanceClaim">;

// Pass the transaction client when the check must hold until a claim is saved.
export async function evaluateEligibility(beneficiaryId: string, programId: string, client: Tx = db) {
  const [beneficiary, program] = await Promise.all([
    client.beneficiary.findUnique({ where: { id: beneficiaryId } }),
    client.program.findUnique({ where: { id: programId } }),
  ]);
  if (!beneficiary) return null;

  const last = program
    ? await client.assistanceClaim.findFirst({
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
