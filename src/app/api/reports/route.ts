import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { fullName } from "@/lib/beneficiaries";
import { isoDate } from "@/lib/format";
import { releasedBetween } from "@/lib/reports";

// Generate Reports (UC 8.0). The masterlist has ACTIVE records, the inactive report the rest.
export async function GET(req: Request) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const barangay = url.searchParams.get("barangay");

  if (type === "masterlist" || type === "inactive") {
    const rows = await db.beneficiary.findMany({
      where: { status: type === "masterlist" ? "ACTIVE" : "DEACTIVATED", ...(barangay ? { barangay } : {}) },
      orderBy: [{ barangay: "asc" }, { lastName: "asc" }],
    });
    return NextResponse.json({
      rows: rows.map((b) => ({
        referenceNo: b.referenceNo,
        name: fullName(b),
        sex: b.sex,
        birthDate: b.birthDate.toISOString().slice(0, 10),
        barangay: b.barangay,
        oscaIdNo: b.oscaIdNo,
        faceRegistered: b.needsManualVerification ? "No" : "Yes",
      })),
    });
  }

  if (type === "claims") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const programId = url.searchParams.get("programId");
    const claims = await db.assistanceClaim.findMany({
      where: {
        ...(programId ? { programId } : {}),
        ...(barangay ? { beneficiary: { barangay } } : {}),
        releasedAt: releasedBetween(from, to),
      },
      include: { program: true, beneficiary: true },
      orderBy: { releasedAt: "desc" },
    });
    return NextResponse.json({
      rows: claims.map((c) => ({
        releasedAt: isoDate(c.releasedAt),
        referenceNo: c.beneficiary.referenceNo,
        beneficiary: fullName(c.beneficiary),
        barangay: c.beneficiary.barangay,
        beneficiaryStatus: c.beneficiary.status,
        program: c.program.name,
        amountOrItems: c.amountOrItems,
        verificationMethod: c.verificationMethod,
      })),
    });
  }

  return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
}
