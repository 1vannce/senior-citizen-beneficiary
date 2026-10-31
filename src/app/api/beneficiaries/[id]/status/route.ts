import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { hasOngoingTransaction, ONGOING_TRANSACTION_MINUTES } from "@/lib/beneficiaries";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED"]),
  reason: z.string().trim().min(1, "Reason is required"),
});

// Records are deactivated, never deleted, so past claims stay.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { status, reason } = parsed.data;

  const existing = await db.beneficiary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  if (existing.status === status) {
    return NextResponse.json({ error: `Record is already ${status.toLowerCase()}.` }, { status: 400 });
  }

  if (status === "DEACTIVATED" && (await hasOngoingTransaction(id))) {
    return NextResponse.json(
      {
        error: `This record has a transaction from the last ${ONGOING_TRANSACTION_MINUTES} minutes. Finish or wait for it before deactivating.`,
        code: "ONGOING_TRANSACTION",
      },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.beneficiary.update({ where: { id }, data: { status } });
    await writeAudit(auth.user.id, status === "DEACTIVATED" ? "DEACTIVATE" : "REACTIVATE", "Beneficiary", id, reason, tx);
  });
  return NextResponse.json({ status });
}
