import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { fullName } from "@/lib/beneficiaries";
import { PageHeader } from "@/components/ui";
import RecordsTable from "./RecordsTable";

export default async function RecordsPage() {
  await requirePageUser("ADMIN");
  const all = await db.beneficiary.findMany({ orderBy: { lastName: "asc" } });
  const rows = all.map((b) => ({
    id: b.id,
    referenceNo: b.referenceNo,
    name: fullName(b),
    oscaIdNo: b.oscaIdNo,
    barangay: b.barangay,
    status: b.status,
    face: !b.needsManualVerification,
  }));
  return (
    <>
      <PageHeader
        eyebrow="9.0 Manage Senior Citizen Records"
        title="Manage Senior Citizen Records"
        subtitle="Search, review and update beneficiary records. Past claims are always retained."
      />
      <RecordsTable rows={rows} />
    </>
  );
}
