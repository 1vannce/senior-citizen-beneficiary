"use client";

import { useState } from "react";
import Papa from "papaparse";
import { ChartColumn } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";
import { Field } from "@/components/ui";
import { BARANGAYS } from "@/lib/constants";

type Program = { id: string; name: string };
type Row = Record<string, string>;
type Kind = "masterlist" | "claims" | "inactive";

const KINDS: { value: Kind; label: string }[] = [
  { value: "masterlist", label: "Beneficiary masterlist by barangay" },
  { value: "claims", label: "Assistance released by program" },
  { value: "inactive", label: "Inactive beneficiaries" },
];

const MASTER_COLS = [
  ["referenceNo", "Reference No."],
  ["name", "Name"],
  ["sex", "Sex"],
  ["birthDate", "Birth date"],
  ["barangay", "Barangay"],
  ["oscaIdNo", "OSCA ID"],
  ["faceRegistered", "Face registered"],
] as const;

const CLAIM_COLS = [
  ["releasedAt", "Date"],
  ["referenceNo", "Reference No."],
  ["beneficiary", "Beneficiary"],
  ["barangay", "Barangay"],
  ["program", "Program"],
  ["amountOrItems", "Amount / items"],
  ["verifiedBy", "Verified by"],
] as const;

// Amounts are free text: "PHP 1,000" adds up, anything else ("122 packs") counts as items.
function totalReleased(rows: Row[]) {
  let php = 0;
  let items = 0;
  for (const r of rows) {
    const m = /^(?:php|₱)?\s*([\d,]+(?:\.\d+)?)$/i.exec(r.amountOrItems.trim());
    if (m) php += Number(m[1].replace(/,/g, ""));
    else items++;
  }
  return [php ? `PHP ${php.toLocaleString("en-US")}` : "", items ? `${items} item releases` : ""].filter(Boolean).join(" + ");
}

function countBy(rows: Row[], key: string) {
  const counts = new Map<string, Row[]>();
  for (const r of rows) counts.set(r[key], [...(counts.get(r[key]) ?? []), r]);
  return [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
}

export default function ReportsClient({ programs }: { programs: Program[] }) {
  const [kind, setKind] = useState<Kind>("claims");
  const [barangay, setBarangay] = useState("");
  const [programId, setProgramId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [shownKind, setShownKind] = useState<Kind>("claims");
  const [error, setError] = useState("");

  const badRange = kind === "claims" && !!from && !!to && to < from;

  async function generate() {
    setError("");
    if (badRange) return;
    const params = new URLSearchParams({ type: kind });
    if (barangay) params.set("barangay", barangay);
    if (kind === "claims") {
      if (programId) params.set("programId", programId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    const res = await fetch(`/api/reports?${params}`);
    const body = await res.json();
    if (!res.ok) return setError(body.error ?? "Could not generate the report.");
    const out = body.rows as Row[];
    setRows(kind === "claims" && status ? out.filter((r) => r.beneficiaryStatus === status) : out);
    setShownKind(kind);
  }

  const isClaims = shownKind === "claims";
  const cols = isClaims ? CLAIM_COLS : MASTER_COLS;
  const columns: ColumnDef<Row>[] = cols.map(([key, header]) => ({ accessorKey: key, header }));
  const title = KINDS.find((k) => k.value === shownKind)?.label;

  function exportCsv() {
    if (!rows) return;
    // Same rows and column order as the table on screen
    const data = rows.map((r) => Object.fromEntries(cols.map(([k, h]) => [h, r[k]])));
    const blob = new Blob([Papa.unparse(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scbvs-${shownKind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const groups = rows ? countBy(rows, isClaims ? "program" : "barangay") : [];
  const max = Math.max(1, ...groups.map(([, g]) => g.length));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[19.5rem_1fr]">
      <div className="space-y-5">
        <section className="card space-y-3">
          <h2 className="card-title">Report type</h2>
          {KINDS.map((k) => (
            <label
              key={k.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                kind === k.value ? "border-2 border-primary bg-primary-soft/50 font-bold text-primary" : "border-divider text-ink"
              }`}
            >
              <input type="radio" name="report" className="size-4" checked={kind === k.value} onChange={() => setKind(k.value)} />
              {k.label}
            </label>
          ))}
        </section>

        <section className="card space-y-4">
          <h2 className="card-title">Filters</h2>
          {kind === "claims" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date from">
                <input type="date" className="input !px-2" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="Date to" error={badRange ? "Date to must not be earlier than Date from." : undefined}>
                <input type="date" className={`input !px-2 ${badRange ? "input-error" : ""}`} value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Barangay">
            <select className="input" value={barangay} onChange={(e) => setBarangay(e.target.value)}>
              <option value="">All barangays</option>
              {BARANGAYS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </Field>
          {kind === "claims" && (
            <>
              <Field label="Program">
                <select className="input" value={programId} onChange={(e) => setProgramId(e.target.value)}>
                  <option value="">All programs</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Beneficiary status">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DEACTIVATED">Inactive</option>
                </select>
              </Field>
            </>
          )}
          <button className="btn btn-primary w-full" onClick={generate}>
            Generate report
          </button>
        </section>
      </div>

      <section className="card min-h-[38rem]">
        {error && (
          <p role="alert" className="alert alert-error mb-4">
            {error}
          </p>
        )}
        {!rows ? (
          <Placeholder title="No report yet. Pick a report type, set the filters, then press Generate report." />
        ) : rows.length === 0 ? (
          <Placeholder title="No matching records." hint="Adjust the filters and generate the report again." />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="card-title">{title}</h2>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  Print
                </button>
                <button className="btn btn-secondary" onClick={() => window.print()}>
                  Export PDF
                </button>
                <button className="btn btn-primary" onClick={exportCsv}>
                  Export Excel
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {isClaims ? (
                <>
                  <Metric label="Claims released" value={rows.length} />
                  <Metric label="Programs" value={groups.length} />
                  <Metric label="Beneficiaries served" value={new Set(rows.map((r) => r.referenceNo)).size} />
                </>
              ) : (
                <>
                  <Metric label={shownKind === "inactive" ? "Inactive beneficiaries" : "Beneficiaries"} value={rows.length} />
                  <Metric label="Barangays" value={groups.length} />
                  <Metric label="With facial data" value={rows.filter((r) => r.faceRegistered === "Yes").length} />
                </>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-ink">{isClaims ? "Claims released by program" : "Beneficiaries by barangay"}</p>
              {groups.map(([name, g]) => (
                <div key={name} className="flex items-center gap-4 text-sm text-ink">
                  <span className="w-32 shrink-0">{name}</span>
                  <span className="h-2.5 flex-1 rounded-full bg-page">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(g.length / max) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right font-bold">{g.length}</span>
                </div>
              ))}
            </div>

            {isClaims ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th className="text-right">Claims</th>
                      <th className="text-right">Beneficiaries</th>
                      <th className="text-right">Total released</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([name, g]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td className="text-right">{g.length}</td>
                        <td className="text-right">{new Set(g.map((r) => r.referenceNo)).size}</td>
                        <td className="text-right">{totalReleased(g)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <DataTable key={shownKind} data={rows} columns={columns} noun="records" />
            )}
            <p className="text-xs text-muted">Contact numbers and addresses are not included in reports.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Placeholder({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto flex h-full min-h-[34rem] max-w-md flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <ChartColumn className="size-7" aria-hidden />
      </span>
      <p className="font-bold text-ink">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-page p-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-[2rem] leading-10 font-bold text-ink">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
