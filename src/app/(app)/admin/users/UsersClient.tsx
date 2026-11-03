"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import type { z } from "zod";
import DataTable from "@/components/DataTable";
import { Field, Modal, PageHeader } from "@/components/ui";
import { userCreateSchema } from "@/lib/validators";

type Row = { id: string; username: string; fullName: string; role: "STAFF" | "ADMIN"; isActive: boolean; locked: boolean };
type LogRow = { id: string; date: string; by: string; account: string; change: string };
type CreateForm = z.infer<typeof userCreateSchema>;
type View = "list" | "create" | "log";

export default function UsersClient({ rows, log, meId }: { rows: Row[]; log: LogRow[]; meId: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirming, setConfirming] = useState<Row | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function patch(u: Row, changes: Partial<Row> & { password?: string; unlock?: boolean }) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: u.fullName, role: u.role, isActive: u.isActive, ...changes }),
    });
    const body = await res.json();
    setConfirming(null);
    setFieldErrors(body.fields ?? {});
    if (res.ok) {
      setNotice({ type: "ok", text: "Account updated." });
      setEditing(null);
      router.refresh();
    } else setNotice({ type: "error", text: body.error ?? "Update failed." });
  }

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "username", header: "Username" },
    { accessorKey: "fullName", header: "Full name", cell: ({ getValue }) => <strong className="text-ink">{getValue<string>()}</strong> },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ getValue }) =>
        getValue<string>() === "ADMIN" ? <span className="badge badge-blue">Administrator</span> : <span className="badge badge-grey">Staff</span>,
    },
    {
      id: "state",
      header: "Status",
      accessorFn: (u) => (!u.isActive ? "Inactive" : u.locked ? "Locked" : "Active"),
      cell: ({ getValue }) => {
        const s = getValue<string>();
        return <span className={`badge ${s === "Active" ? "badge-green" : s === "Locked" ? "badge-amber" : "badge-rose"}`}>{s}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-wrap gap-4">
            <button className="link-action" onClick={() => setEditing(u)}>
              Edit
            </button>
            {u.locked && (
              <button className="link-action" onClick={() => patch(u, { unlock: true })}>
                Unlock
              </button>
            )}
            {u.isActive ? (
              <button className="link-danger" onClick={() => setConfirming(u)}>
                Deactivate
              </button>
            ) : (
              <button className="link-action" onClick={() => patch(u, { isActive: true })}>
                Activate
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const banner = notice && (
    <p role="status" className={`alert mb-6 ${notice.type === "ok" ? "alert-success" : "alert-error"}`}>
      {notice.text}
    </p>
  );

  if (editing) {
    return (
      <EditUser
        key={editing.id}
        u={editing}
        isSelf={editing.id === meId}
        banner={banner}
        errors={fieldErrors}
        onCancel={() => {
          setEditing(null);
          setNotice(null);
          setFieldErrors({});
        }}
        onSave={(c) => patch(editing, c)}
      />
    );
  }

  if (view === "create") {
    return (
      <CreateUser
        onCancel={() => setView("list")}
        onDone={() => {
          setView("list");
          setNotice({ type: "ok", text: "Account created." });
          router.refresh();
        }}
      />
    );
  }

  if (view === "log") {
    return (
      <>
        <PageHeader eyebrow="8.0 Manage User Accounts / Account change log" title="Account change log" subtitle="Every account change is recorded. Past entries are retained." />
        <div className="card space-y-4">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date and time</th>
                  <th>Changed by</th>
                  <th>Account</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id}>
                    <td>{l.date}</td>
                    <td>{l.by}</td>
                    <td>{l.account}</td>
                    <td>{l.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {log.length === 0 && <p className="p-6 text-center text-sm text-muted">No account changes recorded.</p>}
          </div>
          <button className="btn btn-secondary" onClick={() => setView("list")}>
            Back to accounts
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Manage User Accounts"
        subtitle="Create, update, or deactivate accounts. Accounts are deactivated, never deleted."
        action={
          <button className="btn btn-primary" onClick={() => setView("create")}>
            Create account
          </button>
        }
      />
      {banner}
      <section className="card space-y-4">
        <div className="text-right">
          <button className="link-action" onClick={() => setView("log")}>
            View change log
          </button>
        </div>
        <DataTable data={rows} columns={columns} noun="accounts" note="Accounts are deactivated, never deleted." />
      </section>

      {confirming && (
        <Modal title={`Deactivate ${confirming.fullName}?`} onClose={() => setConfirming(null)}>
          <p className="rounded-xl bg-page p-4 text-sm text-muted">This account will lose access immediately. It is deactivated, not deleted, and can be activated again.</p>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <button className="btn btn-secondary" onClick={() => setConfirming(null)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={() => patch(confirming, { isActive: false })}>
              Deactivate account
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function CreateUser({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(userCreateSchema), defaultValues: { role: "STAFF" } });

  async function submit(values: CreateForm) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) return onDone();
    const body = await res.json();
    if (body.fields?.username) setError("username", { message: body.fields.username[0] });
    else setError("root", { message: body.error ?? "Could not create the account." });
  }

  const cls = (e: unknown) => `input ${e ? "input-error" : ""}`;
  return (
    <>
      <PageHeader eyebrow="8.0 Manage User Accounts / Create account" title="Create account" subtitle="Enter the account information, then save." />
      <form onSubmit={handleSubmit(submit)} noValidate className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Account information</h2>
          <p className="text-xs text-muted">* Required fields</p>
        </div>
        {errors.root && (
          <p role="alert" className="alert alert-error">
            {errors.root.message}
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name *" error={errors.fullName?.message}>
            <input className={cls(errors.fullName)} {...register("fullName")} />
          </Field>
          <Field label="Username *" error={errors.username?.message}>
            <input className={cls(errors.username)} {...register("username")} />
          </Field>
          <Field label="Role *">
            <select className="input" {...register("role")}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Administrator</option>
            </select>
            <span className="mt-1 block text-xs text-muted">Available roles: Staff, Administrator.</span>
          </Field>
          <Field label="Password *" error={errors.password?.message}>
            <input type="password" className={cls(errors.password)} {...register("password")} />
          </Field>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" type="submit">
            Save account
          </button>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

function EditUser({
  u,
  isSelf,
  banner,
  errors,
  onCancel,
  onSave,
}: {
  u: Row;
  isSelf: boolean;
  banner: React.ReactNode;
  errors: Record<string, string[]>;
  onCancel: () => void;
  onSave: (c: Partial<Row> & { password?: string }) => void;
}) {
  const [fullName, setFullName] = useState(u.fullName);
  const [role, setRole] = useState(u.role);
  const [password, setPassword] = useState("");
  return (
    <>
      <PageHeader eyebrow="8.0 Manage User Accounts / Edit account" title={`Edit ${u.username}`} subtitle="Update the account information, then save." />
      {banner}
      <div className="card space-y-5">
        <h2 className="card-title">Account information</h2>
        {isSelf && <p className="alert alert-info">You are editing your own account. You cannot remove your own Admin role or deactivate it.</p>}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Full name *" error={errors.fullName?.[0]}>
            <input className={`input ${errors.fullName ? "input-error" : ""}`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Username">
            <input className="input" readOnly value={u.username} />
          </Field>
          <Field label="Role *">
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Row["role"])}>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </Field>
          <Field label="New password (optional)" error={errors.password?.[0]}>
            <input type="password" className={`input ${errors.password ? "input-error" : ""}`} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => onSave({ fullName, role, password })}>
            Save changes
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
