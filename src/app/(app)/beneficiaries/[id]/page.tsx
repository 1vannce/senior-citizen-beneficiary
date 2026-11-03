import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { fullName } from "@/lib/beneficiaries";
import { dateTime, isoDate, longDate } from "@/lib/format";
import RecordEditor from "./RecordEditor";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ action?: string }> };

export default async function RecordPage({ params, searchParams }: Props) {
  await requirePageUser("ADMIN");
  const { id } = await params;
  const { action } = await searchParams;
  const b = await db.beneficiary.findUnique({ where: { id }, include: { faceData: true } });
  if (!b) notFound();

  const audit = await db.auditLog.findMany({
    where: { entity: "Beneficiary", entityId: id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <RecordEditor
      id={b.id}
      status={b.status}
      name={fullName(b)}
      referenceNo={b.referenceNo}
      consentDate={b.faceData ? longDate(b.faceData.consentGivenAt) : null}
      details={[
        { label: "Birthplace", value: b.birthplace },
        { label: "Civil status", value: b.civilStatus },
        { label: "Email address", value: b.email },
        { label: "Emergency contact", value: [b.emergencyName, b.emergencyRelationship].filter(Boolean).join(", ") },
        { label: "Emergency contact number", value: b.emergencyMobile },
        { label: "ID type", value: b.idType },
        { label: "ID place of issue", value: b.idPlaceOfIssue },
        { label: "ID issue date", value: b.idIssueDate && isoDate(b.idIssueDate) },
        { label: "ID expiry date", value: b.idExpiryDate ? isoDate(b.idExpiryDate) : b.idIssueDate && "No expiry" },
      ].map((d) => ({ label: d.label, value: d.value || "Not recorded" }))}
      audit={audit.map((a) => ({
        id: a.id,
        date: dateTime(a.createdAt),
        user: a.user.fullName,
        action: a.action,
        reason: a.reason ?? "",
      }))}
      action={action}
      initial={{
        firstName: b.firstName,
        middleName: b.middleName ?? "",
        lastName: b.lastName,
        birthDate: b.birthDate.toISOString().slice(0, 10),
        sex: b.sex as "M" | "F",
        address: b.address,
        barangay: b.barangay,
        contactNo: b.contactNo ?? "",
        oscaIdNo: b.oscaIdNo,
      }}
    />
  );
}
