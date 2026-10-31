"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, PackageCheck } from "lucide-react";
import EligibilityChecks, { type Eligibility } from "@/components/EligibilityChecks";
import { Field, PersonCard } from "@/components/ui";
import type { BeneficiarySummary } from "@/lib/types";

type Program = { id: string; name: string; isActive: boolean };

type Props = { people: BeneficiarySummary[]; programs: Program[]; initialId: string };

export default function EligibilityClient({ people, programs, initialId }: Props) {
  const [personId, setPersonId] = useState(people.some((p) => p.id === initialId) ? initialId : "");
  const [programId, setProgramId] = useState("");
  const [result, setResult] = useState<Eligibility | null>(null);
  const [busy, setBusy] = useState(false);

  const person = people.find((p) => p.id === personId);

  async function evaluate() {
    setBusy(true);
    const res = await fetch("/api/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryId: personId, programId }),
    });
    setResult(await res.json());
    setBusy(false);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className="card space-y-5">
        <div>
          <h2 className="card-title !text-[1.75rem]">Eligibility request</h2>
          <p className="card-sub mt-1">Select a verified beneficiary and the requested program.</p>
        </div>
        <Field label="Beneficiary *">
          <select
            className="input"
            value={personId}
            onChange={(e) => {
              setPersonId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">Select a beneficiary...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.referenceNo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assistance program *">
          <select
            className="input"
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setResult(null);
            }}
          >
            <option value="">Select a program...</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.isActive && " - Not configured"}
              </option>
            ))}
          </select>
        </Field>
        {person && <PersonCard name={person.name} detail={`${person.referenceNo} · ${person.age} years old`} status={person.status} manual={person.needsManualVerification} />}
        <button className="btn btn-primary w-full" disabled={!personId || !programId || busy} onClick={evaluate}>
          <ClipboardCheck className="size-5" aria-hidden />
          {busy ? "Evaluating..." : "Evaluate eligibility"}
        </button>
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="card-title !text-[1.75rem]">Eligibility result</h2>
          <p className="card-sub mt-1">Every decision includes its governing checks and reason.</p>
        </div>
        {result && person ? (
          <>
            <EligibilityChecks result={result} beneficiaryStatus={person.status} barangay={person.barangay} />
            {result.eligible && (
              <Link href="/assistance/new" className="btn btn-primary w-full">
                <PackageCheck className="size-5" aria-hidden />
                Continue to record assistance
              </Link>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-10 text-center">
            <p className="font-bold text-ink">Ready to evaluate</p>
            <p className="card-sub">Choose a beneficiary and assistance program to see the decision.</p>
          </div>
        )}
      </section>
    </div>
  );
}
