import type { Beneficiary, Prisma } from "@prisma/client";
import { db } from "./db";
import { findMatch, type MatchResult } from "./face";
import { ageOn } from "./validators";

export function fullName(b: Pick<Beneficiary, "firstName" | "middleName" | "lastName"> & { suffix?: string | null }) {
  return [b.firstName, b.middleName, b.lastName, b.suffix].filter(Boolean).join(" ");
}

export function summary(b: Beneficiary) {
  return {
    id: b.id,
    referenceNo: b.referenceNo,
    name: fullName(b),
    barangay: b.barangay,
    oscaIdNo: b.oscaIdNo,
    age: ageOn(b.birthDate),
    status: b.status,
    needsManualVerification: b.needsManualVerification,
  };
}

// Every word must appear in some field, so "Maria Reyes" finds "Maria Santos Reyes".
// SQLite `contains` ignores letter case for A-Z.
export function searchWhere(q: string): Prisma.BeneficiaryWhereInput {
  const words = q.trim().split(/\s+/).filter(Boolean);
  return {
    AND: words.map((w) => ({
      OR: [
        { firstName: { contains: w } },
        { middleName: { contains: w } },
        { lastName: { contains: w } },
        { referenceNo: { contains: w } },
        { oscaIdNo: { contains: w } },
      ],
    })),
  };
}

export async function nextReferenceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SCBVS-${year}-`;
  const last = await db.beneficiary.findFirst({
    where: { referenceNo: { startsWith: prefix } },
    orderBy: { referenceNo: "desc" },
    select: { referenceNo: true },
  });
  const n = last ? Number(last.referenceNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export async function matchFace(embedding: number[]): Promise<MatchResult> {
  const faces = await db.faceData.findMany({ select: { beneficiaryId: true, embedding: true } });
  return findMatch(
    embedding,
    faces.map((f) => ({ id: f.beneficiaryId, embedding: JSON.parse(f.embedding) as number[] })),
  );
}

// A claim released in this window counts as a transaction still being handled at the counter.
export const ONGOING_TRANSACTION_MINUTES = 10;

export async function hasOngoingTransaction(beneficiaryId: string) {
  const since = new Date(Date.now() - ONGOING_TRANSACTION_MINUTES * 60_000);
  const count = await db.assistanceClaim.count({
    where: { beneficiaryId, releasedAt: { gte: since } },
  });
  return count > 0;
}
