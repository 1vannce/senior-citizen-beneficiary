import Link from "next/link";
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Fingerprint,
  PackageCheck,
  ShieldAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { fullName } from "@/lib/beneficiaries";
import { ACTION_LABELS } from "@/lib/constants";
import { claimRef, dateTime, greeting, isoDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requirePageUser();
  return user.role === "ADMIN" ? <AdminDashboard user={user} /> : <StaffDashboard user={user} />;
}

const firstName = (u: User) => u.fullName.split(" ")[0];

async function StaffDashboard({ user }: { user: User }) {
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const [active, flagged, claims, todays, recent] = await Promise.all([
    db.beneficiary.count({ where: { status: "ACTIVE" } }),
    db.beneficiary.count({ where: { status: "ACTIVE", needsManualVerification: true } }),
    db.assistanceClaim.count(),
    db.assistanceClaim.findMany({ where: { releasedAt: { gte: dayStart } }, select: { verificationMethod: true } }),
    db.assistanceClaim.findMany({
      take: 3,
      orderBy: { releasedAt: "desc" },
      include: { program: true, beneficiary: true },
    }),
  ]);
  const manualToday = todays.filter((c) => c.verificationMethod !== "FACE").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="page-eyebrow">STAFF OPERATIONS</p>
        <h1 className="page-title mt-2">
          {greeting(new Date())}, {firstName(user)}
        </h1>
        <p className="page-sub mt-2">Continue today’s registrations, verifications, and assistance transactions.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-4">
        <StaffMetric icon={Fingerprint} label="Verifications today" value={todays.length} note={`${manualToday} manual ${manualToday === 1 ? "check" : "checks"}`} />
        <StaffMetric icon={PackageCheck} label="Claims recorded" value={claims} note="Assistance released" />
        <StaffMetric icon={UserPlus} label="Active beneficiaries" value={active} note="Available for service" />
        <StaffMetric icon={ShieldAlert} label="Manual verification" value={flagged} note="Beneficiaries requiring ID check" />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.45fr_1fr]">
        <section className="card">
          <h2 className="card-title">Quick Actions</h2>
          <p className="card-sub mt-2">Start a common task from your role workspace.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <StaffAction href="/beneficiaries/register" icon={UserPlus} title="Register a senior" text="Create a beneficiary record and capture facial data." />
            <StaffAction href="/verify" icon={Fingerprint} title="Verify identity" text="Confirm a beneficiary before an assistance transaction." />
            <StaffAction href="/eligibility" icon={ClipboardCheck} title="Check eligibility" text="Review program requirements and previous claims." />
            <StaffAction href="/assistance/new" icon={PackageCheck} title="Record assistance" text="Complete an approved release and update history." />
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Recent Activity</h2>
          <p className="card-sub mt-2">Current beneficiary and assistance events.</p>
          <ul className="mt-6 divide-y divide-line">
            {recent.length === 0 && <li className="py-4 text-muted">No assistance has been recorded yet.</li>}
            {recent.map((c) => (
              <li key={c.id} className="flex items-start gap-3.5 py-5">
                <span className="mt-1 size-4 shrink-0 rounded-full border-2 border-primary-soft bg-[#2165cc]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink">{c.program.name}</span>
                  <span className="block text-base text-muted">{fullName(c.beneficiary)}</span>
                </span>
                <span className="text-right text-base text-muted">
                  {isoDate(c.releasedAt)} · {claimRef(c.id)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StaffMetric({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: number; note: string }) {
  return (
    <div className="card flex items-center gap-5 !p-5 2xl:!p-7">
      <span className="flex h-20 w-20 shrink-0 items-center 2xl:h-25 2xl:w-23 justify-center rounded-[0.8125rem] bg-primary-soft text-primary">
        <Icon className="size-14" strokeWidth={1.25} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-muted">{label}</span>
        <span className="block font-display text-[2.1875rem] font-extrabold text-ink">{value}</span>
        <span className="block text-sm text-muted">{note}</span>
      </span>
    </div>
  );
}

function StaffAction({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="flex min-h-30 items-center gap-3.5 rounded-2xl border border-line bg-[#fbfcfe] p-3.5 hover:border-primary">
      <span className="flex size-[4.9rem] shrink-0 items-center justify-center rounded-[0.8125rem] bg-primary-soft text-primary">
        <Icon className="size-10" strokeWidth={1.25} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.075rem] font-bold text-ink">{title}</span>
        <span className="mt-1 block text-sm text-muted">{text}</span>
      </span>
      <ChevronRight className="size-[1.125rem] shrink-0 text-ink" aria-hidden />
    </Link>
  );
}

async function AdminDashboard({ user }: { user: User }) {
  const [active, inactive, admins, staff, claims, auditCount, recent] = await Promise.all([
    db.beneficiary.count({ where: { status: "ACTIVE" } }),
    db.beneficiary.count({ where: { status: { not: "ACTIVE" } } }),
    db.user.count({ where: { isActive: true, role: "ADMIN" } }),
    db.user.count({ where: { isActive: true, role: "STAFF" } }),
    db.assistanceClaim.count(),
    db.auditLog.count(),
    db.auditLog.findMany({ where: { action: { not: "LOGIN" } }, take: 3, orderBy: { createdAt: "desc" }, include: { user: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-base font-bold tracking-[1px] text-primary uppercase">Administrator Overview</p>
        <h1 className="page-title">
          {greeting(new Date())}, {firstName(user)}
        </h1>
        <p className="page-sub">Monitor records, access, and assistance delivery across the OSCA workspace.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-4">
        <AdminMetric icon={Users} label="Active beneficiaries" value={active} note={`${inactive} inactive records`} />
        <AdminMetric icon={Users} label="Active system users" value={admins + staff} note={`${admins} Administrator, ${staff} Staff`} />
        <AdminMetric icon={FileText} label="Assistance recorded" value={claims} note="claims released" />
        <AdminMetric icon={Activity} label="Audit activity" value={auditCount} note="traceable record changes" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <section className="card space-y-4">
          <div>
            <h2 className="card-title">Quick actions</h2>
            <p className="card-sub">Start a common task from your role workspace.</p>
          </div>
          <AdminAction href="/beneficiaries" icon={Users} title="Beneficiary records" text="Review, correct, or deactivate beneficiary records." />
          <AdminAction href="/admin/users" icon={Users} title="User accounts" text="Create accounts, assign roles, and control access." />
          <AdminAction href="/reports" icon={FileText} title="Generate reports" text="Prepare masterlists and assistance summaries." />
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="card-title">Recent activity</h2>
            <p className="card-sub">Latest record and access changes.</p>
          </div>
          {recent.length === 0 && <p className="text-sm text-muted">No changes recorded yet.</p>}
          <ul className="space-y-3">
            {recent.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl border border-divider p-4">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap justify-between gap-2">
                    <span className="text-sm font-bold text-ink">{ACTION_LABELS[a.action] ?? a.action}</span>
                    <span className="text-xs text-muted">{dateTime(a.createdAt)}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {a.reason} by {a.user.fullName}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: number; note: string }) {
  return (
    <div className="card flex items-center gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary">
        <Icon className="size-[1.375rem]" aria-hidden />
      </span>
      <span>
        <span className="block text-sm text-muted">{label}</span>
        <span className="block text-[2.5rem] leading-12 font-bold tracking-[-0.6px] text-ink">{value.toLocaleString("en-US")}</span>
        <span className="block text-xs text-muted">{note}</span>
      </span>
    </div>
  );
}

function AdminAction({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="flex h-[4.5rem] items-center gap-4 rounded-xl border border-divider p-4 hover:border-primary">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-muted">{text}</span>
      </span>
      <ChevronRight className="size-5 text-muted" aria-hidden />
    </Link>
  );
}
