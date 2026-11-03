import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { beneficiaryEditSchema } from "@/lib/validators";
import { changedFields, editValues, summary } from "@/lib/beneficiaries";

type Ctx = { params: Promise<{ id: string }> };

// Update Senior Citizen Record (UC 7.0): Admin only, reason required, audited.
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const existing = await db.beneficiary.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = beneficiaryEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { reason, ...data } = parsed.data;
  const changes = changedFields(editValues(existing), data);
  if (changes.length === 0) return NextResponse.json({ error: "No changes to save." }, { status: 400 });

  if (data.oscaIdNo !== existing.oscaIdNo) {
    const dup = await db.beneficiary.findUnique({ where: { oscaIdNo: data.oscaIdNo } });
    if (dup) {
      return NextResponse.json(
        { error: "This OSCA ID number belongs to another record.", code: "DUPLICATE_OSCA", existing: summary(dup) },
        { status: 409 },
      );
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.beneficiary.update({
      where: { id },
      data: {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        birthDate: new Date(data.birthDate),
        sex: data.sex,
        address: data.address,
        barangay: data.barangay,
        contactNo: data.contactNo || null,
        oscaIdNo: data.oscaIdNo,
        suffix: data.suffix || null,
        birthplace: data.birthplace,
        civilStatus: data.civilStatus,
        email: data.email || null,
        emergencyName: data.emergencyName,
        emergencyRelationship: data.emergencyRelationship,
        emergencyMobile: data.emergencyMobile,
        idType: data.idType,
        idPlaceOfIssue: data.placeOfIssue,
        idIssueDate: new Date(data.issueDate),
        idExpiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });
    await writeAudit(auth.user.id, "UPDATE", "Beneficiary", id, `${reason} (changed: ${changes.join(", ")})`, tx);
    return b;
  });
  return NextResponse.json({ beneficiary: summary(updated) });
}
