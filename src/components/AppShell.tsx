"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartNoAxesCombined,
  ChevronLeft,
  ClipboardCheck,
  FileClock,
  Fingerprint,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { initials } from "@/lib/format";

type NavItem = { href: string; label: string; icon: LucideIcon };

const STAFF_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/beneficiaries/register", label: "Register senior", icon: UserPlus },
  { href: "/verify", label: "Verify identity", icon: Fingerprint },
  { href: "/eligibility", label: "Check eligibility", icon: ClipboardCheck },
  { href: "/assistance/new", label: "Record assistance", icon: ShieldCheck },
  { href: "/history", label: "Assistance history", icon: FileClock },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Accounts", icon: Users },
  { href: "/beneficiaries", label: "Beneficiary Records", icon: FolderOpen },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
];

type Props = { role: string; fullName: string; today: string; children: React.ReactNode };

export default function AppShell({ role, fullName, today, children }: Props) {
  const isAdmin = role === "ADMIN";
  const nav = isAdmin ? ADMIN_NAV : STAFF_NAV;
  const pathname = usePathname();
  const router = useRouter();

  // Staff reach a beneficiary's history from the history search, so keep that item active.
  const path = !isAdmin && pathname.endsWith("/history") ? "/history" : pathname;
  const active = nav
    .filter((n) => path === n.href || path.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const title = active?.label ?? "Dashboard";

  return (
    <div className={`${isAdmin ? "theme-admin" : "theme-staff"} flex min-h-screen flex-col font-sans lg:flex-row`}>
      <aside
        className={`flex shrink-0 flex-col gap-7 text-white lg:sticky lg:top-0 lg:h-screen ${
          isAdmin
            ? "bg-gradient-to-b from-[#0a2457] to-[#12408f] px-5 py-7 lg:w-65"
            : "bg-gradient-to-b from-[#0b1836] via-[#102958] via-70% to-[#153266] px-4 py-10 lg:w-72"
        }`}
      >
        {isAdmin ? (
          <div className="flex items-center gap-3 py-1">
            <span className="flex size-10 items-center justify-center rounded-[0.625rem] bg-[#f5b820]">
              <LayoutDashboard className="size-5 text-[#0a2457]" aria-hidden />
            </span>
            <span>
              <span className="block text-xl leading-[1.625rem] font-bold">SCVS / OSCA</span>
              <span className="block text-xs text-[#b7c9ea]">Beneficiary Verification</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Image src="/images/osca-seal.png" alt="OSCA seal" width={70} height={70} className="size-[4.375rem] rounded-full object-cover" />
            <span>
              <span className="block font-display text-[1.4375rem] font-extrabold tracking-[0.04em]">SCBVS</span>
              <span className="block text-sm text-[#b9c8e8]">OSCA Service Portal</span>
            </span>
          </div>
        )}

        <nav aria-label="Main" className="flex flex-wrap gap-2 lg:flex-col lg:gap-0">
          {!isAdmin && <p className="mb-3 hidden px-3.5 text-base font-extrabold tracking-[0.12em] text-[#92a7d1] uppercase lg:block">Workspace</p>}
          {nav.map(({ href, label, icon: Icon }) => {
            const current = active?.href === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={
                  isAdmin
                    ? `flex h-14 items-center gap-3 rounded-[0.625rem] border px-3 text-sm font-medium lg:mb-2 ${
                        current ? "border-[#3f63a8] bg-[#1d3f7d]" : "border-transparent hover:bg-white/8"
                      }`
                    : `flex h-[3.7rem] items-center gap-3 rounded-[0.875rem] px-3.5 text-xl font-semibold ${
                        current ? "bg-white/12 text-white" : "text-[#cbd8f1] hover:bg-white/8"
                      }`
                }
              >
                <Icon className={isAdmin ? "size-[1.375rem]" : "size-[1.1875rem]"} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1 lg:block" />

        {isAdmin ? (
          <div className="border-t border-[#3f63a8] pt-5 text-center">
            <p className="mb-3 text-left text-xs text-[#b7c9ea]">Signed in as System Administrator</p>
            <SignOutButton className="flex h-11 w-full cursor-pointer items-center justify-center rounded-[0.625rem] text-sm font-medium hover:bg-white/8">
              Log Out
            </SignOutButton>
          </div>
        ) : (
          <div className="border-t border-white/12 px-2 pt-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#d7e4ff] font-inter font-bold text-black">
                {initials(fullName)}
              </span>
              <span>
                <span className="block text-[1.025rem] font-bold">{fullName}</span>
                <span className="block text-base text-[#aebfdf]">OSCA Staff</span>
              </span>
            </div>
            <SignOutButton className="mt-3 flex h-12 cursor-pointer items-center gap-2 rounded-[0.8125rem] px-3 text-[1.0625rem] font-bold text-[#dbe5f7] hover:bg-white/8">
              <LogOut className="size-[1.0625rem]" aria-hidden />
              Sign out
            </SignOutButton>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {isAdmin ? (
          <header className="flex h-[4.5rem] items-center justify-between gap-4 border-b border-line bg-white px-5 lg:px-10">
            <div className="flex items-center gap-4">
              <BackButton onClick={() => router.back()} />
              <p className="font-bold text-ink">OSCA Office / {title}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="hidden text-sm text-muted md:block">{fullName}, OSCA Administrator</p>
              <span className="badge bg-primary-soft text-[#334155]">System Administrator</span>
            </div>
          </header>
        ) : (
          <header className="sticky top-0 z-10 flex h-[5.75rem] items-center justify-between gap-4 border-b border-line bg-white/94 px-5 backdrop-blur-sm lg:px-8">
            <div className="flex items-center gap-4">
              <BackButton onClick={() => router.back()} />
              <div>
                <p className="text-base text-muted">Senior Citizen Benefits &amp; Verification System</p>
                <p className="font-display text-[1.225rem] font-bold text-ink">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <span className="rounded-full bg-primary-soft px-3 py-1.5 text-base leading-4 font-extrabold text-primary">Staff</span>
              <p className="hidden text-base text-muted sm:block">{today}</p>
            </div>
          </header>
        )}
        <main className={`flex-1 p-5 ${isAdmin ? "lg:p-10" : "lg:px-8 lg:py-10 2xl:px-14"}`}>{children}</main>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-line bg-page text-ink"
    >
      <ChevronLeft className="size-5" aria-hidden />
    </button>
  );
}
