"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/DataTable";
import { Field, StatusBadge } from "@/components/ui";

type Row = {
  id: string;
  referenceNo: string;
  name: string;
  oscaIdNo: string;
  barangay: string;
  status: string;
  face: boolean;
};

const columns: ColumnDef<Row>[] = [
  { accessorKey: "referenceNo", header: "Beneficiary ID", cell: ({ getValue }) => <span className="text-xs text-muted">{getValue<string>()}</span> },
  { accessorKey: "name", header: "Name", cell: ({ getValue }) => <strong className="text-ink">{getValue<string>()}</strong> },
  { accessorKey: "barangay", header: "Barangay" },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
  {
    accessorKey: "face",
    header: "Facial data",
    cell: ({ getValue }) => (getValue<boolean>() ? <span className="badge badge-green !text-[#334155]">Registered</span> : <span className="badge badge-amber">None</span>),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const { id, status } = row.original;
      const active = status === "ACTIVE";
      return (
        <div className="flex gap-4">
          <Link className="link-action" href={`/beneficiaries/${id}`}>
            View
          </Link>
          {active ? (
            <>
              <Link className="link-action" href={`/beneficiaries/${id}?action=edit`}>
                Edit
              </Link>
              <Link className="link-danger" href={`/beneficiaries/${id}?action=deactivate`}>
                Deactivate
              </Link>
            </>
          ) : (
            <>
              <span className="link-disabled">Edit</span>
              <span className="link-disabled">Deactivate</span>
            </>
          )}
        </div>
      );
    },
  },
];

export default function RecordsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ q: "", status: "" });

  const needle = applied.q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!applied.status || r.status === applied.status) &&
      (!needle || [r.name, r.referenceNo, r.oscaIdNo].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <div className="space-y-6">
      <form
        className="card flex flex-wrap items-end gap-4 !p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied({ q, status });
        }}
      >
        <Field label="Search by name or beneficiary ID" className="min-w-64 flex-1">
          <input className="input" placeholder="Enter name or beneficiary ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Field label="Status" className="w-60">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DEACTIVATED">Inactive</option>
          </select>
        </Field>
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>
      <div className="rounded-2xl bg-white">
        <DataTable
          data={shown}
          columns={columns}
          noun="records"
          note="Inactive records remain available for viewing."
          emptyMessage="No record found. Check the name or beneficiary ID and search again."
        />
      </div>
    </div>
  );
}
