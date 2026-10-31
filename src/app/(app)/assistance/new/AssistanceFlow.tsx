"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, PackageCheck } from "lucide-react";
import EligibilityChecks, { type Eligibility } from "@/components/EligibilityChecks";
import VerifyIdentity from "@/components/VerifyIdentity";
import { CompletePanel, Field, PageHeader, PersonCard, Stepper } from "@/components/ui";
import { claimRef, isoDate } from "@/lib/format";
import type { Verified } from "@/lib/types";

type Program = { id: string; name: string; isActive: boolean; restrictedPeriodDays: number };

const METHOD_LABEL = { FACE: "Facial identity verification", MANUAL_ID: "Manual ID", REPRESENTATIVE: "Representative claim" } as const;
const STEPS = ["Identity", "Eligibility", "Release details", "Confirm"];

// UC 5.0 -> 3.0 -> 4.0: verify identity, check eligibility, then record the claim.
export default function AssistanceFlow({ programs, staffName }: { programs: Program[]; staffName: string }) {
  const [verified, setVerified] = useState<Verified | null>(null);
  const [step, setStep] = useState(1);
  const [programId, setProgramId] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [amount, setAmount] = useState("");
  const [voucher, setVoucher] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [claimId, setClaimId] = useState("");
  const [busy, setBusy] = useState(false);

  const program = programs.find((p) => p.id === programId);
  const releaseDate = isoDate(new Date());

  async function pickProgram(id: string) {
    setProgramId(id);
    setEligibility(null);
    setError("");
    if (!id || !verified) return;
    const res = await fetch("/api/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryId: verified.beneficiary.id, programId: id }),
    });
    setEligibility(await res.json());
  }

  async function save() {
    if (!verified) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/assistance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beneficiaryId: verified.beneficiary.id,
        programId,
        amountOrItems: amount,
        // The data model has no voucher column yet, so it is kept with the remarks.
        remarks: [`Voucher ${voucher}`, remarks].filter(Boolean).join(" - "),
        verificationMethod: verified.method,
        embedding: verified.embedding,
        idChecked: verified.method !== "FACE",
        representativeName: verified.representativeName,
      }),
    });
    const body = await res.json();
    setBusy(false);
    if (res.ok) setClaimId(body.claimId);
    else setError(body.error ?? "Could not save the claim.");
  }

  const person = verified && (
    <PersonCard
      name={verified.beneficiary.name}
      detail={`${verified.beneficiary.referenceNo} · ${verified.beneficiary.age} years old`}
      status={verified.beneficiary.status}
      manual={verified.method !== "FACE"}
    />
  );

  if (claimId && verified) {
    return (
      <CompletePanel
        icon={PackageCheck}
        title="Assistance Recorded"
        message="The released assistance now appears in the beneficiary’s history and reporting data."
        refLabel="Claim reference"
        refValue={claimRef(claimId)}
      >
        <div className="mx-auto max-w-3xl text-left">{person}</div>
        <div className="flex justify-center gap-3">
          <Link href={`/beneficiaries/${verified.beneficiary.id}/history`} className="btn btn-primary">
            View assistance history
          </Link>
          <button className="btn btn-secondary" onClick={() => location.reload()}>
            Record another claim
          </button>
        </div>
      </CompletePanel>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="USE CASE 5.0"
        title="Record Assistance"
        subtitle="Verify identity, confirm eligibility, capture release details, and save one accountable claim."
      />
      <Stepper steps={STEPS} current={verified ? step : 0} />

      {!verified && (
        <VerifyIdentity
          allowRepresentative
          onVerified={(v) => {
            setVerified(v);
            setStep(1);
          }}
        />
      )}

      {verified && step === 1 && (
        <section className="card space-y-5">
          <div>
            <h2 className="card-title">Program Eligibility</h2>
            <p className="card-sub mt-1">The system checks current program rules before showing the release form.</p>
          </div>
          <div className="alert alert-success flex items-center gap-3">
            <CircleCheck className="size-6 shrink-0" aria-hidden />
            <span>
              <span className="block font-bold">Identity verified: {verified.beneficiary.name}</span>
              <span className="block text-sm">
                {METHOD_LABEL[verified.method]}
                {verified.representativeName && ` (representative: ${verified.representativeName})`}
              </span>
            </span>
          </div>
          <Field label="Assistance program *">
            <select className="input" value={programId} onChange={(e) => pickProgram(e.target.value)}>
              <option value="">Select a program...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {!p.isActive && " - Not configured"}
                </option>
              ))}
            </select>
          </Field>
          {eligibility && (
            <EligibilityChecks result={eligibility} beneficiaryStatus={verified.beneficiary.status} barangay={verified.beneficiary.barangay} />
          )}
          <Actions
            onBack={() => {
              setVerified(null);
              setEligibility(null);
              setProgramId("");
            }}
            backLabel="Verify a different person"
            onNext={() => setStep(2)}
            disabled={!eligibility?.eligible}
          />
        </section>
      )}

      {verified && step === 2 && (
        <section className="card space-y-5">
          <div>
            <h2 className="card-title">Assistance Details</h2>
            <p className="card-sub mt-1">Record exactly what was released and the supporting document.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Amount released (PHP) *">
              <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount or items" />
            </Field>
            <Field label="Document / voucher number *">
              <input className="input" value={voucher} onChange={(e) => setVoucher(e.target.value)} />
            </Field>
            <Field label="Release date">
              <input className="input" readOnly value={releaseDate} />
            </Field>
            <Field label="Releasing staff">
              <input className="input" readOnly value={staffName} />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <textarea className="input" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
          </div>
          <Actions onBack={() => setStep(1)} onNext={() => setStep(3)} disabled={!amount.trim() || !voucher.trim()} />
        </section>
      )}

      {verified && step === 3 && (
        <section className="card space-y-5">
          <div>
            <h2 className="card-title">Transaction Summary</h2>
            <p className="card-sub mt-1">Confirm that the beneficiary, program, and release details are correct.</p>
          </div>
          {person}
          <dl className="grid gap-3 md:grid-cols-3">
            <Detail label="Program" value={program?.name} />
            <Detail label="Released value" value={amount} />
            <Detail label="Release date" value={releaseDate} />
            <Detail label="Document number" value={voucher} />
            <Detail label="Verification" value={METHOD_LABEL[verified.method]} />
            <Detail label="Releasing staff" value={staffName} />
          </dl>
          <p className="alert alert-info">
            <strong>Final confirmation</strong> Saving this transaction adds it permanently to the beneficiary’s history.
          </p>
          {error && (
            <p role="alert" className="alert alert-error">
              {error}
            </p>
          )}
          <Actions onBack={() => setStep(2)} onNext={save} nextLabel={busy ? "Saving..." : "Save and release"} disabled={busy} />
        </section>
      )}
    </>
  );
}

function Actions({
  onBack,
  backLabel = "Back",
  onNext,
  nextLabel = "Continue",
  disabled,
}: {
  onBack: () => void;
  backLabel?: string;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
      <button type="button" className="link-action" onClick={onBack}>
        {backLabel}
      </button>
      <button type="button" className="btn btn-primary" disabled={disabled} onClick={onNext}>
        <ArrowRight className="size-[1.125rem]" aria-hidden />
        {nextLabel}
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-page p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
