import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { summary } from "@/lib/beneficiaries";
import { PageHeader, PersonCard } from "@/components/ui";
import { claimRef, isoDate } from "@/lib/format";
import ClaimsTable from "./ClaimsTable";

const METHOD = { FACE: "Face match", MANUAL_ID: "Manual ID", REPRESENTATIVE: "Representative" } as Record<string, string>;

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const b = await db.beneficiary.findUnique({
    where: { id },
    include: {
      claims: { include: { program: true, releasedBy: true }, orderBy: { releasedAt: "desc" } },
    },
  });

  if (!b) {
    return (
      <div className="space-y-3">
        <p className="alert alert-warn">No record found.</p>
        <Link href="/history" className="btn btn-secondary">
          Back to search
        </Link>
      </div>
    );
  }

  const s = summary(b);
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="USE CASE 6.0"
        title="View Assistance History"
        subtitle="Find a beneficiary and review every recorded claim without changing stored information."
      />
      <PersonCard name={s.name} detail={`${s.referenceNo} · ${s.age} years old`} status={s.status} manual={s.needsManualVerification} />
      <ClaimsTable
        claims={b.claims.map((c) => ({
          id: c.id,
          program: c.program.name,
          date: isoDate(c.releasedAt),
          value: c.amountOrItems,
          reference: claimRef(c.id),
          releasedBy: c.releasedBy.fullName,
          verifiedBy: `${METHOD[c.verificationMethod]}${c.representativeName ? ` (${c.representativeName})` : ""}`,
          remarks: c.remarks ?? "",
        }))}
      />
      <Link href="/history" className="btn btn-secondary">
        Back to search
      </Link>
    </div>
  );
}
