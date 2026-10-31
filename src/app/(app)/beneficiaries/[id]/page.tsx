import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { fullName } from "@/lib/beneficiaries";
import { dateTime, longDate } from "@/lib/format";
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
