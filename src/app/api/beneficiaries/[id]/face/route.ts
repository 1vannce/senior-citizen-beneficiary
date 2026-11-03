import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ reason: z.string().trim().min(1, "Reason is required") });

// Withdrawal of consent (RA 10173): the face template is deleted and the senior is verified by manual ID.
// The record and its past claims stay.
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const face = await db.faceData.findUnique({ where: { beneficiaryId: id } });
  if (!face) return NextResponse.json({ error: "No face data is stored for this record." }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.faceData.delete({ where: { beneficiaryId: id } });
    await tx.beneficiary.update({ where: { id }, data: { needsManualVerification: true } });
    await writeAudit(auth.user.id, "REMOVE_FACE", "Beneficiary", id, parsed.data.reason, tx);
  });
  return NextResponse.json({ removed: true });
}
