import { Check, X, type LucideIcon } from "lucide-react";
import { initials } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-1">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">{title}</h1>
        {action}
      </div>
      <p className="page-sub">{subtitle}</p>
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mx-auto mb-8 flex max-w-[71rem] items-start px-6">
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className="relative flex-1 text-center" aria-current={now ? "step" : undefined}>
            {i < steps.length - 1 && (
              <span className={`absolute top-5 left-1/2 h-0.5 w-full ${done ? "bg-success" : "bg-line"}`} aria-hidden />
            )}
            <span
              className={`relative mx-auto flex size-10 items-center justify-center rounded-full border text-sm font-bold ${
                done ? "border-success bg-success text-white" : now ? "border-primary bg-primary text-white" : "border-line bg-white text-muted"
              }`}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={`mt-2 block text-sm ${done || now ? "font-bold text-ink" : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return status === "ACTIVE" ? <span className="badge badge-green">Active</span> : <span className="badge badge-rose">Inactive</span>;
}

export function PersonCard({
  name,
  detail,
  status,
  manual,
}: {
  name: string;
  detail: string;
  status: string;
  manual: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-[#f7f9fc] p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
        {initials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{name}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <span className="flex flex-wrap gap-2">
        <StatusBadge status={status} />
        {manual ? <span className="badge badge-amber">Manual Verification</span> : <span className="badge badge-blue">Facial Data Ready</span>}
      </span>
    </div>
  );
}

export function CompletePanel({
  icon: Icon,
  title,
  message,
  refLabel,
  refValue,
  children,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  refLabel: string;
  refValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card mx-auto max-w-[76rem] space-y-6 py-14 text-center">
      <span className="mx-auto flex size-32 items-center justify-center rounded-full bg-success-soft text-success">
        <Icon className="size-16" strokeWidth={1.25} aria-hidden />
      </span>
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="card-sub mt-1">{message}</p>
      </div>
      <div className="mx-auto w-fit min-w-96 rounded-xl border border-[#f5dc9c] bg-[#fff3d1] px-10 py-3">
        <p className="text-xs font-bold text-warn uppercase">{refLabel}</p>
        <p className="text-xl font-bold text-ink">{refValue}</p>
      </div>
      {children}
    </div>
  );
}

export function Modal({
  title,
  badge,
  onClose,
  children,
}: {
  title: string;
  badge?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a2457]/40 p-4 backdrop-blur-[1.5px]">
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-[35rem] space-y-6 overflow-y-auto rounded-2xl border border-line bg-white p-6">
        {badge && <span className="badge badge-amber">{badge}</span>}
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <h2 className="flex-1 font-inter text-2xl font-bold text-ink">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-page text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="error-text">{error}</span>}
    </label>
  );
}
