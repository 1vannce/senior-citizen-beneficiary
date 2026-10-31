"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PersonCard } from "@/components/ui";
import type { BeneficiarySummary } from "@/lib/types";

export default function HistorySearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BeneficiarySummary[] | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const res = await fetch(`/api/beneficiaries?q=${encodeURIComponent(q.trim())}`);
    setResults((await res.json()).results);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="card flex items-center gap-3 !p-4">
        <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden />
        <input
          aria-label="Search beneficiary"
          className="w-full bg-transparent text-lg text-ink outline-none placeholder:text-muted"
          placeholder="Search name, beneficiary reference, or ID number"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {results && results.length === 0 && <p className="alert alert-warn">No record found.</p>}
      {results && results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={`/beneficiaries/${r.id}/history`} className="block rounded-xl hover:ring-2 hover:ring-primary">
                <PersonCard name={r.name} detail={`${r.referenceNo} · ${r.age} years old`} status={r.status} manual={r.needsManualVerification} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
