import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { summary } from "@/lib/beneficiaries";
import { PageHeader } from "@/components/ui";
import EligibilityClient from "./EligibilityClient";

export default async function EligibilityPage({ searchParams }: { searchParams: Promise<{ beneficiary?: string }> }) {
  await requirePageUser();
  const { beneficiary } = await searchParams;
  const [people, programs] = await Promise.all([
    db.beneficiary.findMany({ orderBy: { lastName: "asc" } }),
    db.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="USE CASE 4.0"
        title="Check assistance eligibility"
        subtitle="Evaluate beneficiary status, program rules, barangay coverage, and previous claims with a transparent decision."
      />
      <EligibilityClient people={people.map(summary)} programs={programs} initialId={beneficiary ?? ""} />
    </>
  );
}
