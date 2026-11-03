import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { embeddingSchema } from "@/lib/validators";
import { matchFace, summary } from "@/lib/beneficiaries";

type Ctx = { params: Promise<{ id: string }> };

const captureSchema = z.object({
  consent: z.literal(true, { message: "The senior's consent is required." }),
  embedding: embeddingSchema,
});

// Capture Facial Data (UC 2.0) for an existing record: a senior who declined at registration, or whose
// face data was removed, consents later. Same duplicate-face check as registration.
export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = captureSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const b = await db.beneficiary.findUnique({ where: { id }, include: { faceData: true } });
  if (!b) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  if (b.status !== "ACTIVE") return NextResponse.json({ error: "Reactivate the record before capturing face data." }, { status: 409 });
  if (b.faceData) return NextResponse.json({ error: "Face data is already stored for this record." }, { status: 409 });

  const match = await matchFace(parsed.data.embedding);
  if (match.status !== "NO_MATCH") {
    const existing = await db.beneficiary.findUnique({ where: { id: match.best.id } });
    return NextResponse.json(
      { error: "This face is already registered to another record.", code: "DUPLICATE_FACE", existing: existing ? summary(existing) : null },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.faceData.create({
      data: { beneficiaryId: id, embedding: JSON.stringify(parsed.data.embedding), consentGivenAt: new Date(), capturedById: auth.user.id },
    });
    await tx.beneficiary.update({ where: { id }, data: { needsManualVerification: false } });
    await writeAudit(auth.user.id, "CAPTURE_FACE", "Beneficiary", id, "Face data captured with the senior's consent", tx);
  });
  return NextResponse.json({ captured: true }, { status: 201 });
}

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
