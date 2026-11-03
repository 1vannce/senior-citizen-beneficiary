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
// SQLite `contains` ignores letter case for A-Z only, so a word with Ñ or another letter
// outside A-Z is also tried in lower and upper case: "peña" then finds "PEÑA" and "Peña".
export function searchWhere(q: string): Prisma.BeneficiaryWhereInput {
  const words = q.trim().split(/\s+/).filter(Boolean);
  return {
    AND: words.map((w) => ({
      OR: (/[^\x00-\x7F]/.test(w) ? [w.toLowerCase(), w.toUpperCase()] : [w]).flatMap((v) => [
        { firstName: { contains: v } },
        { middleName: { contains: v } },
        { lastName: { contains: v } },
        { referenceNo: { contains: v } },
        { oscaIdNo: { contains: v } },
      ]),
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

export function isOngoingTransaction(lastReleasedAt: Date | null, now = new Date()) {
  return !!lastReleasedAt && now.getTime() - lastReleasedAt.getTime() <= ONGOING_TRANSACTION_MINUTES * 60_000;
}

export async function hasOngoingTransaction(beneficiaryId: string) {
  const last = await db.assistanceClaim.findFirst({
    where: { beneficiaryId },
    orderBy: { releasedAt: "desc" },
    select: { releasedAt: true },
  });
  return isOngoingTransaction(last?.releasedAt ?? null);
}

// Date-only fields are saved as midnight UTC, so the ISO date is the date that was entered.
const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

// A record in the shape of the edit form (empty text for missing values).
export function editValues(b: Beneficiary) {
  return {
    firstName: b.firstName,
    middleName: b.middleName ?? "",
    lastName: b.lastName,
    suffix: b.suffix ?? "",
    birthDate: dateOnly(b.birthDate),
    birthplace: b.birthplace ?? "",
    sex: b.sex as "M" | "F",
    civilStatus: b.civilStatus ?? "",
    contactNo: b.contactNo ?? "",
    email: b.email ?? "",
    address: b.address,
    barangay: b.barangay,
    emergencyName: b.emergencyName ?? "",
    emergencyRelationship: b.emergencyRelationship ?? "",
    emergencyMobile: b.emergencyMobile ?? "",
    oscaIdNo: b.oscaIdNo,
    idType: b.idType ?? "",
    placeOfIssue: b.idPlaceOfIssue ?? "",
    issueDate: dateOnly(b.idIssueDate),
    expiryDate: dateOnly(b.idExpiryDate),
  };
}
export type EditValues = ReturnType<typeof editValues>;

const FIELD_LABELS: Record<keyof EditValues, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  suffix: "Suffix",
  birthDate: "Birth date",
  birthplace: "Birthplace",
  sex: "Sex",
  civilStatus: "Civil status",
  contactNo: "Contact number",
  email: "Email address",
  address: "Address",
  barangay: "Barangay",
  emergencyName: "Emergency contact name",
  emergencyRelationship: "Emergency contact relationship",
  emergencyMobile: "Emergency contact number",
  oscaIdNo: "OSCA ID number",
  idType: "ID type",
  placeOfIssue: "ID place of issue",
  issueDate: "ID issue date",
  expiryDate: "ID expiry date",
};

// Labels of the fields an edit changes, for the change log. Spaces around a value do not count.
export function changedFields(before: EditValues, after: Partial<Record<keyof EditValues, string>>): string[] {
  return (Object.keys(FIELD_LABELS) as (keyof EditValues)[])
    .filter((k) => (before[k] ?? "").trim() !== (after[k] ?? "").trim())
    .map((k) => FIELD_LABELS[k]);
}
