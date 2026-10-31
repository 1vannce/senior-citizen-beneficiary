"use client";

import { useState } from "react";
import { CheckCircle2, IdCard, UserCheck } from "lucide-react";
import type { BeneficiarySummary, Verified } from "@/lib/types";
import FaceCamera from "@/components/face/FaceCamera";
import { PersonCard } from "@/components/ui";

type Mode = "face" | "manual" | "representative";

type FaceOutcome =
  | { kind: "match"; beneficiary: BeneficiarySummary; score: number; embedding: number[] }
  | { kind: "ambiguous"; candidates: { score: number; beneficiary: BeneficiarySummary }[] }
  | { kind: "none"; score: number | null }
  | null;

type Props = {
  onVerified: (v: Verified) => void;
  allowRepresentative?: boolean;
};

export default function VerifyIdentity({ onVerified, allowRepresentative }: Props) {
  const [mode, setMode] = useState<Mode>("face");
  const [notice, setNotice] = useState("");
  const [outcome, setOutcome] = useState<FaceOutcome>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<BeneficiarySummary | null>(null);

  function switchMode(m: Mode, why = "") {
    setMode(m);
    setNotice(why);
    setOutcome(null);
    setSelected(null);
  }

  async function onCapture(embedding: number[]) {
    setBusy(true);
    const res = await fetch("/api/face/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      switchMode("manual", "The face service reported an error. Use manual ID verification.");
      return;
    }
    if (body.status === "MATCH") setOutcome({ kind: "match", beneficiary: body.beneficiary, score: body.score, embedding });
    else if (body.status === "AMBIGUOUS") setOutcome({ kind: "ambiguous", candidates: body.candidates });
    else setOutcome({ kind: "none", score: body.score });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
      <section className="card space-y-5 !p-6">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Verification method">
          <Tab active={mode === "face"} onClick={() => switchMode("face")}>
            Face match
          </Tab>
          <Tab active={mode === "manual"} onClick={() => switchMode("manual")}>
            Manual ID
          </Tab>
          {allowRepresentative && (
            <Tab active={mode === "representative"} onClick={() => switchMode("representative")}>
              Representative claim
            </Tab>
          )}
        </div>

        {notice && (
          <p role="alert" className="alert alert-warn">
            {notice}
          </p>
        )}

        {mode === "face" ? (
          <FaceCamera
            actionLabel={busy ? "Matching..." : "Start facial verification"}
            hint="Ask the senior to face the camera and keep still."
            onCapture={onCapture}
            onGiveUp={() => switchMode("manual", "Face capture failed 3 times. Use manual ID verification.")}
            onUnavailable={(why) => switchMode("manual", `${why} Use manual ID verification.`)}
          />
        ) : (
          <ManualSearch representative={mode === "representative"} selected={selected} onSelect={setSelected} />
        )}
      </section>

      <section className="card space-y-5">
        <div>
          <h2 className="card-title">Verification Subject</h2>
          <p className="card-sub">
            {mode === "face" ? "The registered record returned by facial matching appears here." : "Check the physical ID against the selected record."}
          </p>
        </div>

        {mode === "face" && !outcome && <p className="alert alert-info">Waiting for a facial match. Start verification when the senior is ready.</p>}

        {mode === "face" && outcome?.kind === "match" && (
          <>
            <div className="alert alert-success flex items-center gap-3">
              <CheckCircle2 className="size-6 shrink-0" aria-hidden />
              <span>
                <span className="block text-xl font-bold">{(outcome.score * 100).toFixed(1)}%</span>
                <span className="text-sm">Match confidence</span>
              </span>
            </div>
            <RecordCard b={outcome.beneficiary} />
            <dl className="grid grid-cols-2 gap-4 px-2">
              <div>
                <dt className="text-sm text-muted">ID document</dt>
                <dd className="font-bold text-ink">OSCA ID · {outcome.beneficiary.oscaIdNo}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Barangay</dt>
                <dd className="font-bold text-ink">{outcome.beneficiary.barangay}</dd>
              </div>
            </dl>
            <button
              className="btn btn-primary w-full"
              onClick={() => onVerified({ beneficiary: outcome.beneficiary, method: "FACE", embedding: outcome.embedding, score: outcome.score })}
            >
              <UserCheck className="size-5" aria-hidden />
              Confirm verified identity
            </button>
          </>
        )}

        {mode === "face" && outcome?.kind === "ambiguous" && (
          <>
            <p className="alert alert-warn font-bold">More than one record is a close match. Extra verification is required: check the person&apos;s ID.</p>
            <ul className="space-y-2">
              {outcome.candidates.map((c) => (
                <li key={c.beneficiary.id}>
                  <RecordCard b={c.beneficiary} />
                </li>
              ))}
            </ul>
            <button className="btn btn-primary w-full" onClick={() => switchMode("manual")}>
              Verify with ID
            </button>
          </>
        )}

        {mode === "face" && outcome?.kind === "none" && (
          <>
            <p role="alert" className="alert alert-error font-bold">
              No match found{outcome.score != null && ` (best score ${outcome.score.toFixed(2)})`}.
            </p>
            <button className="btn btn-primary w-full" onClick={() => switchMode("manual")}>
              Use manual ID verification
            </button>
          </>
        )}

        {mode !== "face" &&
          (selected ? (
            <ManualConfirm key={selected.id} b={selected} representative={mode === "representative"} onVerified={onVerified} />
          ) : (
            <p className="alert alert-info">Search for the beneficiary, then select the record.</p>
          ))}
      </section>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} className={`btn ${active ? "btn-primary" : "btn-secondary"}`}>
      {children}
    </button>
  );
}

function RecordCard({ b }: { b: BeneficiarySummary }) {
  return <PersonCard name={b.name} detail={`${b.referenceNo} · ${b.age} years old`} status={b.status} manual={b.needsManualVerification} />;
}

function ManualSearch({
  representative,
  selected,
  onSelect,
}: {
  representative: boolean;
  selected: BeneficiarySummary | null;
  onSelect: (b: BeneficiarySummary | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BeneficiarySummary[] | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    onSelect(null);
    const res = await fetch(`/api/beneficiaries?q=${encodeURIComponent(q)}`);
    setResults((await res.json()).results);
  }

  return (
    <div className="space-y-4">
      <p className="alert alert-info">
        {representative
          ? "Representative claim: face verification is skipped. Follow the manual procedure and check the representative's ID and authorization."
          : "Find the beneficiary, then check a valid government-issued ID."}
      </p>

      <form onSubmit={search} className="flex gap-3">
        <input
          aria-label="Search beneficiary"
          className="input"
          placeholder="Name, reference no. or OSCA ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      {results && results.length === 0 && <p className="alert alert-warn">No record found.</p>}
      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className={`w-full cursor-pointer rounded-xl border p-3 text-left ${selected?.id === r.id ? "border-primary bg-primary-soft" : "border-line bg-white"}`}
              >
                <span className="font-bold text-ink">{r.name}</span> · {r.referenceNo} · {r.barangay} ({r.status})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManualConfirm({
  b,
  representative,
  onVerified,
}: {
  b: BeneficiarySummary;
  representative: boolean;
  onVerified: (v: Verified) => void;
}) {
  const [idChecked, setIdChecked] = useState(false);
  const [repName, setRepName] = useState("");
  const canConfirm = idChecked && (!representative || repName.trim().length > 0);

  return (
    <>
      <div className="alert alert-warn">
        <p className="font-bold">Manual ID verification</p>
        <p>Compare the physical ID with the beneficiary record. Facial verification is not being used.</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-page p-4">
        <IdCard className="size-6 text-ink" aria-hidden />
        <span>
          <span className="block font-bold text-ink">Senior Citizen ID</span>
          <span className="block text-sm text-muted">
            {b.oscaIdNo} · {b.name}
          </span>
        </span>
      </div>
      {representative && (
        <label className="block">
          <span className="label">Representative&apos;s full name</span>
          <input className="input" value={repName} onChange={(e) => setRepName(e.target.value)} />
        </label>
      )}
      <label className="flex items-center gap-3 font-semibold text-ink">
        <input type="checkbox" className="size-5" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
        I checked a valid government-issued ID{representative ? " and the authorization letter" : ""}.
      </label>
      <button
        className="btn btn-secondary w-full"
        disabled={!canConfirm}
        onClick={() =>
          onVerified({
            beneficiary: b,
            method: representative ? "REPRESENTATIVE" : "MANUAL_ID",
            representativeName: representative ? repName.trim() : undefined,
          })
        }
      >
        <UserCheck className="size-5" aria-hidden />
        ID checked — confirm identity
      </button>
    </>
  );
}
