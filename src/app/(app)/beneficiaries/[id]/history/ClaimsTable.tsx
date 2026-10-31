"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";

type Claim = {
  id: string;
  program: string;
  date: string;
  value: string;
  reference: string;
  releasedBy: string;
  verifiedBy: string;
  remarks: string;
};

const columns: ColumnDef<Claim>[] = [
  { accessorKey: "program", header: "Program", cell: ({ getValue }) => <strong className="text-ink">{getValue<string>()}</strong> },
  { accessorKey: "date", header: "Release date" },
  { accessorKey: "value", header: "Released value" },
  { accessorKey: "reference", header: "Reference" },
  { accessorKey: "releasedBy", header: "Released by" },
  { accessorKey: "verifiedBy", header: "Verified by" },
  { accessorKey: "remarks", header: "Remarks" },
];

export default function ClaimsTable({ claims }: { claims: Claim[] }) {
  const [program, setProgram] = useState("");
  const programs = [...new Set(claims.map((c) => c.program))];
  const shown = program ? claims.filter((c) => c.program === program) : claims;

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="card-title !text-[1.75rem]">Assistance claims</h2>
          <p className="card-sub mt-1">{claims.length} stored {claims.length === 1 ? "claim" : "claims"} for this beneficiary.</p>
        </div>
        <label className="w-72">
          <span className="label">Program filter</span>
          <select className="input" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <DataTable data={shown} columns={columns} emptyMessage="No assistance history for this beneficiary." />
    </section>
  );
}
