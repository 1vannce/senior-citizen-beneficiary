"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleCheck, Fingerprint, Lightbulb, ShieldCheck, UserCheck, EyeOff, Info } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validators";
import { BARANGAYS } from "@/lib/constants";
import type { BeneficiarySummary } from "@/lib/types";
import FaceCamera from "@/components/face/FaceCamera";
import { CompletePanel, Field, PageHeader, PersonCard, Stepper } from "@/components/ui";

const STEPS = ["Personal", "Contact & address", "Identification", "Consent & capture", "Review"];

const STEP_FIELDS: (keyof RegisterInput)[][] = [
  ["firstName", "middleName", "lastName", "suffix", "birthDate", "birthplace", "sex", "civilStatus"],
  ["contactNo", "email", "address", "barangay", "city", "province", "emergencyName", "emergencyRelationship", "emergencyMobile"],
  ["idType", "oscaIdNo", "placeOfIssue", "issueDate", "expiryDate"],
];

type Done = { referenceNo: string; hasFace: boolean; beneficiary: BeneficiarySummary };

export default function RegisterFlow() {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [cameraProblem, setCameraProblem] = useState("");
  const [gaveUp, setGaveUp] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<BeneficiarySummary | null>(null);
  const [blockedMsg, setBlockedMsg] = useState("");
  const [result, setResult] = useState<Done | null>(null);

  const {
    register,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), defaultValues: { city: "Cebu City", province: "Cebu" } });

  async function next() {
    if (!(await trigger(STEP_FIELDS[step], { shouldFocus: true }))) return;
    setNotice("");
    if (step === 2) {
      // Catch a duplicate OSCA ID before asking for consent and a face scan.
      const res = await fetch(`/api/beneficiaries?osca=${encodeURIComponent(getValues("oscaIdNo"))}`);
      const { results } = (await res.json()) as { results: BeneficiarySummary[] };
      if (results.length) {
        setError("oscaIdNo", { message: "This OSCA ID number is already registered." });
        setExisting(results[0]);
        setBlockedMsg("This OSCA ID number is already registered.");
        return;
      }
      setExisting(null);
      setBlockedMsg("");
    }
    setStep(step + 1);
  }

  async function save() {
    const v = getValues();
    setSaving(true);
    setNotice("");
    const res = await fetch("/api/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { ...v, address: [v.address, v.city, v.province].filter(Boolean).join(", ") },
        consent: consent === true,
        embedding: consent ? embedding : undefined,
      }),
    });
    const body = await res.json();
    setSaving(false);

    if (res.status === 201) {
      setResult({ referenceNo: body.beneficiary.referenceNo, hasFace: body.hasFace, beneficiary: body.beneficiary });
    } else if (res.status === 409) {
      setExisting(body.existing);
      setBlockedMsg(
        body.code === "DUPLICATE_FACE"
          ? "Registration blocked: this face is already registered."
          : "Registration blocked: this OSCA ID number is already registered.",
      );
    } else {
      setNotice(body.error ?? "Could not save the record.");
    }
  }

  if (result) {
    const b = result.beneficiary;
    return (
      <CompletePanel
        icon={CircleCheck}
        title="Registration Complete"
        message="The active beneficiary record is now available across verification, eligibility, and assistance workflows."
        refLabel="Beneficiary reference"
        refValue={result.referenceNo}
      >
        <div className="mx-auto max-w-3xl space-y-3 text-left">
          <PersonCard name={b.name} detail={`${b.referenceNo} · ${b.age} years old`} status={b.status} manual={!result.hasFace} />
          {!result.hasFace && <p className="alert alert-warn">No face data was saved. This record is flagged for manual ID verification.</p>}
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/verify" className="btn btn-primary">
            <Fingerprint className="size-5" aria-hidden />
            Verify identity
          </Link>
          <button className="btn btn-secondary" onClick={() => location.reload()}>
            Register another senior
          </button>
        </div>
      </CompletePanel>
    );
  }

  const v = getValues();
  const canLeaveConsent = consent === false || !!embedding;

  return (
    <>
      <PageHeader
        eyebrow="USE CASE 1.0 + 2.0"
        title="Register Senior Citizen"
        subtitle="Create one complete beneficiary record, obtain consent, and capture facial data for future verification."
      />
      <Stepper steps={STEPS} current={step} />

      <form onSubmit={(e) => e.preventDefault()} noValidate className="card space-y-6">
        {notice && (
          <p role="alert" className="alert alert-error">
            {notice}
          </p>
        )}
        {blockedMsg && (
          <div role="alert" className="alert alert-error space-y-2">
            <p className="font-bold">{blockedMsg}</p>
            {existing && (
              <p className="text-ink">
                {existing.name} · {existing.referenceNo} · OSCA {existing.oscaIdNo} · {existing.barangay} ({existing.status})
              </p>
            )}
          </div>
        )}

        <div className={step === 0 ? "space-y-6" : "hidden"}>
          <Heading title="Personal Details" text="Enter the applicant’s legal and personal information." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Text label="First name *" placeholder="Enter First Name" error={errors.firstName?.message} {...register("firstName")} />
            <Text label="Middle name" placeholder="Enter Middle Name" error={errors.middleName?.message} {...register("middleName")} />
            <Text label="Last name *" placeholder="Enter Last Name" error={errors.lastName?.message} {...register("lastName")} />
            <Text label="Suffix" placeholder="Jr., Sr." {...register("suffix")} />
            <Text label="Birth date *" type="date" error={errors.birthDate?.message} {...register("birthDate")} />
            <Text label="Birthplace *" placeholder="Enter Birthplace" error={errors.birthplace?.message} {...register("birthplace")} />
            <Field label="Sex *" error={errors.sex?.message}>
              <select className={cls(errors.sex)} defaultValue="" {...register("sex")}>
                <option value="" disabled>
                  Select Sex
                </option>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </Field>
            <Field label="Civil status *" error={errors.civilStatus?.message}>
              <select className={cls(errors.civilStatus)} defaultValue="" {...register("civilStatus")}>
                <option value="" disabled>
                  Select Civil Status
                </option>
                {["Single", "Married", "Widowed", "Separated"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className={step === 1 ? "space-y-6" : "hidden"}>
          <Heading title="Contact and Address" text="Record where and how the beneficiary or a trusted contact can be reached." />
          <div className="grid gap-5 md:grid-cols-3">
            <Text label="Mobile number *" placeholder="Enter Mobile Number" error={errors.contactNo?.message} {...register("contactNo")} />
            <Text label="Email address" placeholder="Enter Email Address" {...register("email")} />
            <Text label="House / street *" placeholder="Enter House / Street" error={errors.address?.message} {...register("address")} />
            <Field label="Barangay *" error={errors.barangay?.message}>
              <select className={cls(errors.barangay)} defaultValue="" {...register("barangay")}>
                <option value="" disabled>
                  Select Barangay
                </option>
                {BARANGAYS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Text label="City / municipality *" placeholder="Enter City / Municipality" error={errors.city?.message} {...register("city")} />
            <Text label="Province *" placeholder="Enter Province" error={errors.province?.message} {...register("province")} />
          </div>
          <div className="border-t border-line pt-5">
            <h3 className="mb-4 font-inter text-xl text-ink">Emergency contact</h3>
            <div className="grid gap-5 md:grid-cols-3">
              <Text label="Contact name *" placeholder="Enter Contact Name" error={errors.emergencyName?.message} {...register("emergencyName")} />
              <Text label="Relationship *" placeholder="Enter Relationship" error={errors.emergencyRelationship?.message} {...register("emergencyRelationship")} />
              <Text label="Mobile number *" placeholder="Enter Mobile Number" error={errors.emergencyMobile?.message} {...register("emergencyMobile")} />
            </div>
          </div>
        </div>

        <div className={step === 2 ? "space-y-6" : "hidden"}>
          <Heading title="Identification" text="Registration requires a valid Senior Citizen or OSCA identification document." />
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="ID type *" error={errors.idType?.message}>
              <select className={cls(errors.idType)} defaultValue="" {...register("idType")}>
                <option value="" disabled>
                  Select ID Type
                </option>
                <option>OSCA ID</option>
                <option>Senior Citizen ID</option>
              </select>
            </Field>
            <Text label="ID number *" placeholder="Enter ID Number" error={errors.oscaIdNo?.message} {...register("oscaIdNo")} />
            <Text label="Place of issue *" placeholder="Enter Place of Issue" error={errors.placeOfIssue?.message} {...register("placeOfIssue")} />
            <Text label="Issue date *" type="date" error={errors.issueDate?.message} {...register("issueDate")} />
            <div>
              <Text label="Expiry date" type="date" {...register("expiryDate")} />
              <p className="mt-1 text-sm text-muted">Leave blank if the ID has no expiry.</p>
            </div>
          </div>
          <div className="alert alert-info">
            <p className="font-bold">Duplicate protection</p>
            <p>The system checks the applicant’s ID number and facial data before saving.</p>
          </div>
        </div>

        {step === 3 && (
          <div className="space-y-5">
            <Heading title="Privacy consent and facial capture" text="Consent is required before facial data can be captured and linked to the beneficiary." />
            <div className="alert alert-info flex items-center gap-4">
              <ShieldCheck className="size-10 shrink-0" strokeWidth={1.25} aria-hidden />
              <div>
                <p className="font-bold">Facial data privacy notice</p>
                <p>
                  SCBVS will create a facial reference used only to verify identity during assistance transactions. Access is
                  restricted to authorized OSCA users. Only a numeric face template is stored, never a photo.
                </p>
              </div>
            </div>

            <fieldset>
              <legend className="label">Did the senior citizen consent to facial-data capture?</legend>
              <div className="flex flex-wrap gap-3">
                <Consent checked={consent === true} onChange={() => setConsent(true)}>
                  Yes, consent was freely given
                </Consent>
                <Consent
                  checked={consent === false}
                  onChange={() => {
                    setConsent(false);
                    setEmbedding(null);
                  }}
                >
                  No, continue with manual verification
                </Consent>
              </div>
            </fieldset>

            {consent && cameraProblem && <p className="alert alert-error">{cameraProblem} Choose manual verification to continue.</p>}
            {consent && gaveUp && <p className="alert alert-warn">Face capture failed 3 times. Choose manual verification to continue.</p>}
            {consent && !embedding && !cameraProblem && !gaveUp && (
              <FaceCamera
                actionLabel="Capture facial data"
                onCapture={setEmbedding}
                onGiveUp={() => setGaveUp(true)}
                onUnavailable={setCameraProblem}
                aside={<PositioningGuide />}
              />
            )}
            {consent && embedding && (
              <div className="alert alert-success flex items-center gap-3">
                <CircleCheck className="size-8 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="font-bold">Facial capture complete</p>
                  <p>A facial reference is ready to be linked to this beneficiary.</p>
                </div>
                <button type="button" className="link-action" onClick={() => setEmbedding(null)}>
                  Recapture
                </button>
              </div>
            )}
            {consent === false && <p className="alert alert-warn">No face data will be saved. This record will be flagged for manual ID verification.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <Heading title="Review Registration" text="Confirm the information before creating the beneficiary record." />
            <div className="grid gap-4 md:grid-cols-2">
              <Review title="Personal details" onEdit={() => setStep(0)}>
                <strong>{[v.firstName, v.middleName, v.lastName, v.suffix].filter(Boolean).join(" ")}</strong>
                <br />
                {v.birthDate} · {v.sex === "F" ? "Female" : "Male"} · {v.civilStatus}
              </Review>
              <Review title="Identification" onEdit={() => setStep(2)}>
                <strong>
                  {v.idType} · {v.oscaIdNo}
                </strong>
                <br />
                Issued {v.issueDate} at {v.placeOfIssue}
              </Review>
              <Review title="Contact and address" onEdit={() => setStep(1)}>
                <strong>{v.contactNo}</strong>
                <br />
                {[v.address, v.barangay, v.city, v.province].join(", ")}
              </Review>
              <Review title="Facial verification" onEdit={() => setStep(3)}>
                <strong>{embedding ? "Facial data captured" : "Manual verification"}</strong>
                <br />
                {embedding ? "Consent recorded" : "Consent not given"}
              </Review>
            </div>
          </div>
        )}

        <div className={`flex items-center gap-4 border-t border-line pt-5 ${step === 0 ? "" : "justify-between"}`}>
          {step > 0 && (
            <button type="button" className="link-action" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" className={`btn btn-primary ${step === 0 ? "min-h-15 w-full" : ""}`} onClick={next}>
              <ArrowRight className="size-[1.125rem]" aria-hidden />
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="button" className="btn btn-primary" disabled={!canLeaveConsent} onClick={() => setStep(4)}>
              <ArrowRight className="size-[1.125rem]" aria-hidden />
              Continue
            </button>
          )}
          {step === 4 && (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save beneficiary"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function cls(err: unknown) {
  return `input ${err ? "input-error" : ""}`;
}

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="card-title">{title}</h2>
      <p className="card-sub mt-1">{text}</p>
    </div>
  );
}

function Text({ label, error, ...input }: { label: string; error?: string } & React.ComponentProps<"input">) {
  return (
    <Field label={label} error={error}>
      <input className={cls(error)} {...input} />
    </Field>
  );
}

function Consent({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-medium text-ink ${checked ? "border-primary bg-primary-soft" : "border-line bg-white"}`}>
      <input type="radio" name="consent" checked={checked} onChange={onChange} className="size-4" />
      {children}
    </label>
  );
}

function PositioningGuide() {
  const tips = [
    { icon: UserCheck, text: "Face the camera directly and stay still." },
    { icon: EyeOff, text: "Remove glasses, hats, or face coverings." },
    { icon: Lightbulb, text: "Ensure even lighting on the face." },
  ];
  return (
    <div className="rounded-2xl border border-line bg-[#f7f9fc] p-5">
      <p className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
        <Info className="size-5 text-primary" aria-hidden />
        Positioning guide
      </p>
      <ul className="space-y-4">
        {tips.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-[#34415b]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-4" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Review({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm text-muted">{title}</h3>
        <button type="button" className="link-action !text-sm" onClick={onEdit}>
          Edit
        </button>
      </div>
      <p className="text-ink">{children}</p>
    </div>
  );
}
