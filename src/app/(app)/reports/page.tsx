import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  await requirePageUser("ADMIN");
  const programs = await db.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader
        eyebrow="10.0 Generate Reports"
        title="Generate Reports"
        subtitle="Select a report and filters. Reports exclude personal contact details."
      />
      <ReportsClient programs={programs} />
    </>
  );
}
