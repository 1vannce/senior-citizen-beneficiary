import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { beneficiarySchema, embeddingSchema } from "@/lib/validators";
import { matchFace, nextReferenceNo, searchWhere, summary } from "@/lib/beneficiaries";

// Search by name, reference number or OSCA ID. `osca` does an exact OSCA ID lookup.
export async function GET(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const osca = url.searchParams.get("osca")?.trim();
  const q = url.searchParams.get("q")?.trim();

  if (osca) {
    const found = await db.beneficiary.findUnique({ where: { oscaIdNo: osca } });
    return NextResponse.json({ results: found ? [summary(found)] : [] });
  }
  if (!q) return NextResponse.json({ results: [] });

  const found = await db.beneficiary.findMany({
    where: searchWhere(q),
    orderBy: { lastName: "asc" },
    take: 50,
  });
  return NextResponse.json({ results: found.map(summary) });
}

// Register Senior Citizen (UC 1.0) + Capture Facial Data (UC 2.0)
export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = beneficiarySchema.safeParse(body?.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const dupOsca = await db.beneficiary.findUnique({ where: { oscaIdNo: data.oscaIdNo } });
  if (dupOsca) {
    return NextResponse.json(
      { error: "This OSCA ID number is already registered.", code: "DUPLICATE_OSCA", existing: summary(dupOsca) },
      { status: 409 },
    );
  }

  // Face data is only stored with consent and a valid embedding; otherwise the record is flagged.
  let embedding: number[] | null = null;
  if (body.consent === true && body.embedding) {
    const e = embeddingSchema.safeParse(body.embedding);
    if (!e.success) return NextResponse.json({ error: "Invalid face data." }, { status: 400 });
    embedding = e.data;

    const match = await matchFace(embedding);
    if (match.status !== "NO_MATCH") {
      const existing = await db.beneficiary.findUnique({ where: { id: match.best.id } });
      return NextResponse.json(
        {
          error: "This face is already registered.",
          code: "DUPLICATE_FACE",
          score: match.best.score,
          existing: existing ? summary(existing) : null,
        },
        { status: 409 },
      );
    }
  }

  const referenceNo = await nextReferenceNo();
  const created = await db.$transaction(async (tx) => {
    const b = await tx.beneficiary.create({
      data: {
        referenceNo,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        birthDate: new Date(data.birthDate),
        sex: data.sex,
        address: data.address,
        barangay: data.barangay,
        contactNo: data.contactNo || null,
        oscaIdNo: data.oscaIdNo,
        needsManualVerification: !embedding,
        createdById: user.id,
      },
    });
    if (embedding) {
      await tx.faceData.create({
        data: {
          beneficiaryId: b.id,
          embedding: JSON.stringify(embedding),
          consentGivenAt: new Date(),
          capturedById: user.id,
        },
      });
    }
    await writeAudit(
      user.id,
      "REGISTER",
      "Beneficiary",
      b.id,
      embedding ? "Registered with face data" : "Registered without face data (manual verification)",
      tx,
    );
    return b;
  });

  return NextResponse.json({ beneficiary: summary(created), hasFace: !!embedding }, { status: 201 });
}
