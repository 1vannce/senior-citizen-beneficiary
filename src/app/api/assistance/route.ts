import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { embeddingSchema } from "@/lib/validators";
import { matchFace } from "@/lib/beneficiaries";
import { evaluateEligibility } from "@/lib/claims";

const schema = z.object({
  beneficiaryId: z.string().min(1),
  programId: z.string().min(1, "Select a program"),
  amountOrItems: z.string().trim().min(1, "Amount or items is required"),
  remarks: z.string().trim().optional(),
  verificationMethod: z.enum(["FACE", "MANUAL_ID", "REPRESENTATIVE"]),
  // FACE: the live embedding is re-matched here so the server never trusts the browser's word.
  embedding: z.unknown().optional(),
  // MANUAL_ID / REPRESENTATIVE: staff confirms a government ID was checked
  idChecked: z.boolean().optional(),
  representativeName: z.string().trim().optional(),
});

// Record Assistance (UC 5.0): saved only when identity and eligibility both pass.
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;

  // 1. Identity
  if (d.verificationMethod === "FACE") {
    const e = embeddingSchema.safeParse(d.embedding);
    if (!e.success) return NextResponse.json({ error: "Face verification is missing." }, { status: 403 });
    const m = await matchFace(e.data);
    if (m.status !== "MATCH" || m.best.id !== d.beneficiaryId) {
      return NextResponse.json({ error: "Face verification does not match this beneficiary." }, { status: 403 });
    }
  } else if (!d.idChecked) {
    return NextResponse.json({ error: "Identity is not verified. Confirm the ID was checked." }, { status: 403 });
  }
  if (d.verificationMethod === "REPRESENTATIVE" && !d.representativeName) {
    return NextResponse.json({ error: "Representative name is required." }, { status: 400 });
  }

  // 2. Eligibility, checked in the same transaction as the save so two requests at once cannot both pass
  const saved = await db.$transaction(async (tx) => {
    const out = await evaluateEligibility(d.beneficiaryId, d.programId, tx);
    if (!out) return { error: NextResponse.json({ error: "Beneficiary not found." }, { status: 404 }) };
    if (!out.result.eligible) {
      return { error: NextResponse.json({ error: out.result.message, code: out.result.code }, { status: 409 }) };
    }
    const c = await tx.assistanceClaim.create({
      data: {
        beneficiaryId: d.beneficiaryId,
        programId: d.programId,
        amountOrItems: d.amountOrItems,
        remarks: d.remarks || null,
        verificationMethod: d.verificationMethod,
        representativeName: d.verificationMethod === "REPRESENTATIVE" ? d.representativeName : null,
        releasedById: user.id,
      },
    });
    await writeAudit(user.id, "RELEASE_ASSISTANCE", "AssistanceClaim", c.id, `${out.program?.name}: ${d.amountOrItems} (${d.verificationMethod})`, tx);
    return { claim: c };
  });
  if ("error" in saved) return saved.error;

  return NextResponse.json({ claimId: saved.claim.id, releasedAt: saved.claim.releasedAt }, { status: 201 });
}
