"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { beneficiaryEditSchema } from "@/lib/validators";
import { BARANGAYS, CIVIL_STATUSES, ID_TYPES } from "@/lib/constants";
import { Field, Modal, PageHeader, StatusBadge } from "@/components/ui";
import FaceCamera from "@/components/face/FaceCamera";
import type { z } from "zod";

type EditForm = z.infer<typeof beneficiaryEditSchema>;
type Initial = Omit<EditForm, "reason">;
type Audit = { id: string; date: string; user: string; action: string; reason: string };

type Props = {
  id: string;
  status: string;
  name: string;
  referenceNo: string;
  consentDate: string | null;
  details: { label: string; value: string }[];
  audit: Audit[];
  action?: string;
  initial: Initial;
};

const DEACTIVATE_REASONS = ["Transferred residence", "Deceased", "Other"];

export default function RecordEditor({ id, status, name, referenceNo, consentDate, details, audit, action, initial }: Props) {
  const router = useRouter();
  const active = status === "ACTIVE";
  const [editing, setEditing] = useState(action === "edit" && active);
  const [tab, setTab] = useState<"profile" | "log">("profile");
  const [dialog, setDialog] = useState(action === "deactivate" && active);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [otherDetail, setOtherDetail] = useState("");
  const [statusError, setStatusError] = useState("");
  const [faceDialog, setFaceDialog] = useState(false);
  const [faceReason, setFaceReason] = useState("");
  const [faceError, setFaceError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureConsent, setCaptureConsent] = useState(false);
  const [captureError, setCaptureError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(beneficiaryEditSchema), defaultValues: { ...initial, reason: "" } });

  async function onSave(values: EditForm) {
    setMessage(null);
    const res = await fetch(`/api/beneficiaries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();
    if (res.ok) {
      setMessage({ type: "ok", text: "Record updated and logged." });
      setEditing(false);
      reset({ ...values, reason: "" });
      router.refresh();
    } else setMessage({ type: "error", text: body.error ?? "Update failed." });
  }

  // "Other" needs a description, so the change log says what the reason was
  const needsDetail = active && statusReason === "Other";
  const fullReason = needsDetail ? `Other: ${otherDetail.trim()}` : statusReason;

  async function changeStatus() {
    setStatusError("");
    const res = await fetch(`/api/beneficiaries/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: active ? "DEACTIVATED" : "ACTIVE", reason: fullReason }),
    });
    const body = await res.json();
    if (res.ok) {
      setStatusReason("");
      setOtherDetail("");
      setDialog(false);
      setMessage({ type: "ok", text: `${name} ${active ? "deactivated" : "reactivated"}. The change was logged.` });
      router.refresh();
    } else setStatusError(body.error ?? "Could not change status.");
  }

  async function removeFace() {
    setFaceError("");
    const res = await fetch(`/api/beneficiaries/${id}/face`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: faceReason }),
    });
    const body = await res.json();
    if (res.ok) {
      setFaceReason("");
      setFaceDialog(false);
      setMessage({ type: "ok", text: `Face data of ${name} removed. The record is flagged for manual ID verification.` });
      router.refresh();
    } else setFaceError(body.error ?? "Could not remove face data.");
  }

  function closeCapture() {
    setCapturing(false);
    setCaptureConsent(false);
    setCaptureError("");
  }

  async function captureFace(embedding: number[]) {
    const res = await fetch(`/api/beneficiaries/${id}/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, embedding }),
    });
    const body = await res.json();
    if (res.ok) {
      closeCapture();
      setMessage({ type: "ok", text: `Face data of ${name} captured. The senior can now be verified by face match.` });
      router.refresh();
    } else setCaptureError(body.existing ? `${body.error} (${body.existing.name}, ${body.existing.referenceNo})` : (body.error ?? "Could not save face data."));
  }

  const f = (name: keyof EditForm) => `input ${errors[name] ? "input-error" : ""}`;
  const banner = message && (
    <p role="status" className={`alert mb-6 ${message.type === "ok" ? "alert-success" : "alert-error"}`}>
      {message.text}
    </p>
  );

  if (editing) {
    return (
      <>
        <PageHeader
          eyebrow="9.0 Manage Senior Citizen Records / Edit form"
          title="Edit senior citizen record"
          subtitle={`${name} · ${referenceNo}. Changes are pending until you save.`}
        />
        {banner}
        <form onSubmit={handleSubmit(onSave)} noValidate className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Profile information</h2>
            <p className="text-xs text-muted">* Required fields</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Beneficiary ID">
              <input className="input" readOnly value={referenceNo} />
            </Field>
            <Field label="First name *" error={errors.firstName?.message}>
              <input className={f("firstName")} {...register("firstName")} />
            </Field>
            <Field label="Middle name" error={errors.middleName?.message}>
              <input className={f("middleName")} {...register("middleName")} />
            </Field>
            <Field label="Last name *" error={errors.lastName?.message}>
              <input className={f("lastName")} {...register("lastName")} />
            </Field>
            <Field label="Suffix" error={errors.suffix?.message}>
              <input className={f("suffix")} {...register("suffix")} />
            </Field>
            <Field label="Birth date *" error={errors.birthDate?.message}>
              <input type="date" className={f("birthDate")} {...register("birthDate")} />
            </Field>
            <Field label="Birthplace *" error={errors.birthplace?.message}>
              <input className={f("birthplace")} {...register("birthplace")} />
            </Field>
            <Field label="Sex *" error={errors.sex?.message}>
              <select className={f("sex")} {...register("sex")}>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </Field>
            <Field label="Civil status *" error={errors.civilStatus?.message}>
              <select className={f("civilStatus")} {...register("civilStatus")}>
                <option value="" disabled>
                  Select Civil Status
                </option>
                {CIVIL_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Contact number *" error={errors.contactNo?.message}>
              <input className={f("contactNo")} {...register("contactNo")} />
            </Field>
            <Field label="Email address" error={errors.email?.message}>
              <input className={f("email")} {...register("email")} />
            </Field>
            <Field label="Barangay *" error={errors.barangay?.message}>
              <select className={f("barangay")} {...register("barangay")}>
                {BARANGAYS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Address *" error={errors.address?.message} className="md:col-span-3">
              <input className={f("address")} {...register("address")} />
            </Field>
            <Field label="Emergency contact name *" error={errors.emergencyName?.message}>
              <input className={f("emergencyName")} {...register("emergencyName")} />
            </Field>
            <Field label="Relationship *" error={errors.emergencyRelationship?.message}>
              <input className={f("emergencyRelationship")} {...register("emergencyRelationship")} />
            </Field>
            <Field label="Emergency contact number *" error={errors.emergencyMobile?.message}>
              <input className={f("emergencyMobile")} {...register("emergencyMobile")} />
            </Field>
            <Field label="OSCA ID number *" error={errors.oscaIdNo?.message}>
              <input className={f("oscaIdNo")} {...register("oscaIdNo")} />
            </Field>
            <Field label="ID type *" error={errors.idType?.message}>
              <select className={f("idType")} {...register("idType")}>
                <option value="" disabled>
                  Select ID Type
                </option>
                {ID_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="ID place of issue *" error={errors.placeOfIssue?.message}>
              <input className={f("placeOfIssue")} {...register("placeOfIssue")} />
            </Field>
            <Field label="ID issue date *" error={errors.issueDate?.message}>
              <input type="date" className={f("issueDate")} {...register("issueDate")} />
            </Field>
            <Field label="ID expiry date" error={errors.expiryDate?.message}>
              <input type="date" className={f("expiryDate")} {...register("expiryDate")} />
            </Field>
            <Field label="Reason for change *" error={errors.reason?.message} className="md:col-span-3">
              <input className={f("reason")} {...register("reason")} />
            </Field>
          </div>
          <p className="text-sm text-muted">Your changes and reason will be recorded in the change log.</p>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              Save changes
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                reset({ ...initial, reason: "" });
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="9.0 Manage Senior Citizen Records / Record details" title={name} subtitle="Review the beneficiary profile, consent and retained record history." />
      {banner}
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <Link href="/beneficiaries" className="btn btn-secondary">
          Back to list
        </Link>
        <div className="flex gap-3">
          <Link href={`/beneficiaries/${id}/history`} className="btn btn-secondary">
            Assistance history
          </Link>
          {active && (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setDialog(true)}>
            {active ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>

      <section className="card space-y-5">
        <div className="flex items-center gap-6">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary-soft px-2 text-center text-xs leading-5 text-primary">
            Photo placeholder No photo
          </span>
          <div className="space-y-1">
            <p className="font-bold text-ink">{name}</p>
            <p className="text-sm text-muted">
              {referenceNo} · {initial.barangay}
            </p>
            <StatusBadge status={status} />
          </div>
        </div>

        <div role="tablist" aria-label="Record sections" className="flex gap-6 border-b border-line">
          {(["profile", "log"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px cursor-pointer border-b-2 pb-2.5 text-sm font-bold ${tab === t ? "border-primary text-primary" : "border-transparent text-muted"}`}
            >
              {t === "profile" ? "Profile" : "Change log"}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <dl className="grid gap-5 md:grid-cols-2">
            <Info label="Full name" value={name} />
            <Info label="Beneficiary ID" value={referenceNo} />
            <Info label="Barangay" value={initial.barangay} />
            <Info label="Address" value={initial.address} />
            <Info label="Contact number" value={initial.contactNo || "None"} />
            <Info label="OSCA ID number" value={initial.oscaIdNo} />
            <Info label="Birth date" value={initial.birthDate} />
            <Info label="Sex" value={initial.sex === "F" ? "Female" : "Male"} />
            {details.map((d) => (
              <Info key={d.label} label={d.label} value={d.value} />
            ))}
          </dl>
        ) : (
          <div className="space-y-3">
            {audit.length === 0 ? (
              <p className="text-sm text-muted">No changes recorded.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date and time</th>
                      <th>Changed by</th>
                      <th>Action</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{a.user}</td>
                        <td>{a.action}</td>
                        <td>{a.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-muted">The change log is read-only. Past entries are retained.</p>
          </div>
        )}
      </section>

      <section className="card mt-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="card-title">Facial data</h2>
          {consentDate && (
            <button className="btn btn-secondary" onClick={() => setFaceDialog(true)}>
              Remove face data
            </button>
          )}
          {!consentDate && active && !capturing && (
            <button className="btn btn-secondary" onClick={() => setCapturing(true)}>
              Capture face data
            </button>
          )}
        </div>
        <p className="text-sm text-ink">
          Consent status: {consentDate ? "Granted" : "Not recorded"}
          {consentDate && <span className="ml-6 text-xs text-muted">Consent date: {consentDate}</span>}
        </p>
        {capturing && (
          <div className="space-y-4 border-t border-line pt-4">
            <p className="rounded-xl bg-page p-4 text-sm text-muted">
              Read the facial data privacy notice to the senior first. Only a numeric face template is stored, never a photo,
              and the senior may withdraw consent at any time.
            </p>
            {captureError && (
              <p role="alert" className="alert alert-error">
                {captureError}
              </p>
            )}
            <label className="flex items-center gap-3 font-semibold text-ink">
              <input type="checkbox" className="size-5" checked={captureConsent} onChange={(e) => setCaptureConsent(e.target.checked)} />
              The senior freely gave consent after hearing the privacy notice.
            </label>
            {captureConsent && !captureError && (
              <div className="max-w-lg">
                <FaceCamera
                  actionLabel="Capture facial data"
                  hint="Ask the senior to face the camera and keep still."
                  onCapture={captureFace}
                  onGiveUp={() => setCaptureError("Face capture failed 3 times. The record stays on manual ID verification.")}
                  onUnavailable={(why) => setCaptureError(`${why} The record stays on manual ID verification.`)}
                />
              </div>
            )}
            <button type="button" className="link-action" onClick={closeCapture}>
              Cancel
            </button>
          </div>
        )}
      </section>

      {faceDialog && (
        <Modal
          title={`Remove face data of ${name}?`}
          badge="Consent withdrawal"
          onClose={() => {
            setFaceDialog(false);
            setFaceError("");
          }}
        >
          <p className="rounded-xl bg-page p-4 text-sm text-muted">
            Use this when the senior withdraws consent. The stored face template is deleted and cannot be restored. The senior
            will be verified by manual ID from now on. The record and its past claims are kept.
          </p>
          {faceError && (
            <p role="alert" className="alert alert-error">
              {faceError}
            </p>
          )}
          <Field label="Reason for removal *">
            <input className="input" value={faceReason} onChange={(e) => setFaceReason(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <button className="btn btn-secondary" onClick={() => setFaceDialog(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={!faceReason.trim()} onClick={removeFace}>
              Remove face data
            </button>
          </div>
        </Modal>
      )}

      {dialog && (
        <Modal
          title={`${active ? "Deactivate" : "Reactivate"} ${name}?`}
          badge="Record retention"
          onClose={() => {
            setDialog(false);
            setStatusError("");
          }}
        >
          <p className="rounded-xl bg-page p-4 text-sm text-muted">
            {active
              ? "This record will be deactivated, not deleted. Past claims are retained and the record can still be viewed."
              : "This record will be active again and available for verification and assistance."}
          </p>
          {statusError && (
            <p role="alert" className="alert alert-error">
              {statusError}
            </p>
          )}
          {active ? (
            <>
              <Field label="Reason for deactivation *">
                <select className="input" value={statusReason} onChange={(e) => setStatusReason(e.target.value)}>
                  <option value="">Select a reason</option>
                  {DEACTIVATE_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              {needsDetail && (
                <Field label="Describe the reason *">
                  <input className="input" value={otherDetail} onChange={(e) => setOtherDetail(e.target.value)} />
                </Field>
              )}
            </>
          ) : (
            <Field label="Reason for reactivation *">
              <input className="input" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
            </Field>
          )}
          <div className="flex justify-end gap-3 border-t border-line pt-5">
            <button className="btn btn-secondary" onClick={() => setDialog(false)}>
              Cancel
            </button>
            <button className={`btn ${active ? "btn-danger" : "btn-primary"}`} disabled={!statusReason.trim() || (needsDetail && !otherDetail.trim())} onClick={changeStatus}>
              {active ? "Deactivate record" : "Reactivate record"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
