"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import VerifyIdentity from "@/components/VerifyIdentity";
import { CompletePanel, PageHeader, PersonCard } from "@/components/ui";
import type { Verified } from "@/lib/types";

export default function VerifyClient() {
  const [done, setDone] = useState<Verified | null>(null);

  if (done) {
    const b = done.beneficiary;
    return (
      <CompletePanel
        icon={CircleCheck}
        title="Identity verified"
        message={`Verified by ${done.method === "FACE" ? "face match" : "manual ID"}. Proceed to eligibility.`}
        refLabel="Beneficiary reference"
        refValue={b.referenceNo}
      >
        <div className="mx-auto max-w-3xl text-left">
          <PersonCard name={b.name} detail={`${b.referenceNo} · ${b.age} years old`} status={b.status} manual={b.needsManualVerification} />
        </div>
        <div className="flex justify-center gap-3">
          <Link href={`/eligibility?beneficiary=${b.id}`} className="btn btn-primary">
            Check eligibility
          </Link>
          <button className="btn btn-secondary" onClick={() => setDone(null)}>
            Verify another person
          </button>
        </div>
      </CompletePanel>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="USE CASE 3.0"
        title="Verify Senior Citizen Identity"
        subtitle="Compare a live capture with registered facial data, or follow the controlled manual ID path."
      />
      <VerifyIdentity onVerified={setDone} />
    </>
  );
}
