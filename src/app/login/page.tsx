"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardCheck, Fingerprint, History, Lock, type LucideIcon } from "lucide-react";
import { loginSchema } from "@/lib/validators";
import type { z } from "zod";

type LoginForm = z.infer<typeof loginSchema>;

const MESSAGES: Record<string, string> = {
  INVALID: "Incorrect username or password. Please try again.",
  LOCKED: "This account is locked after too many failed attempts. Please contact the Administrator.",
  INACTIVE: "This account is deactivated. Access denied.",
};

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Fingerprint, title: "Identity assurance", text: "Guided facial and manual verification" },
  { icon: ClipboardCheck, title: "Clear decisions", text: "Transparent eligibility rules and outcomes" },
  { icon: History, title: "Complete traceability", text: "Assistance history and accountable actions" },
];

export default function LoginPage() {
  const [error, setError] = useState("");
  // Visual only for now: the signed-in account decides the role.
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  // Before hydration a click would submit natively and put the password in the URL.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setError("");
    const res = await signIn("credentials", { ...values, redirect: false });
    if (res?.error) {
      setError(MESSAGES[res.error] ?? "Unable to sign in. Please try again.");
      return;
    }
    // A full load so the app layout reads the new session. router.refresh() right after
    // router.replace() could cancel the navigation and leave a signed-in user on this page.
    window.location.replace("/dashboard");
  }

  return (
    <main className="theme-staff grid min-h-screen bg-[#fafafa] lg:grid-cols-2">
      <section
        className="relative hidden flex-col justify-center overflow-hidden px-[6.25vw] py-8 text-white lg:flex"
        style={{
          background:
            "radial-gradient(circle at 75% 20%, rgba(47,105,207,0.42), rgba(47,105,207,0) 32%), linear-gradient(138deg, rgb(9,22,47) 0%, rgb(16,44,93) 65%, rgb(22,75,140) 100%)",
        }}
      >
        <Image src="/images/osca-seal.png" alt="OSCA seal" width={99} height={99} className="size-25 rounded-full object-cover" />
        <span className="mt-4 w-fit rounded-full bg-[#e8f1ff] px-3 py-1.5 text-[0.9rem] font-extrabold text-[#1755b3]">
          SCBVS Service Portal
        </span>
        <h1 className="mt-2 font-display text-[clamp(3rem,4.27vw,5.125rem)] leading-[1.06] tracking-[-0.025em]">
          Serve every senior
          <br />
          with clarity,
          <br />
          dignity, and
          <br />
          confidence.
        </h1>
        <p className="mt-6 text-xl leading-8 text-[#c6d4ed]">
          A unified workspace for beneficiary registration, identity verification, eligibility, and assistance delivery.
        </p>
        <ul className="mt-8 space-y-4 2xl:mt-12 2xl:space-y-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-[0.875rem] border border-white/12 bg-white/8">
                <Icon className="size-6 text-[#d7a32b]" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-bold">{title}</span>
                <span className="block text-[0.95rem] text-[#9fb2d6]">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[0.85rem] text-[#93a8d0] 2xl:mt-16">Senior Citizen Benefits &amp; Verification System</p>
      </section>

      <section className="relative flex items-center justify-center overflow-hidden p-6">
        <Image src="/images/login-seniors.png" alt="" fill sizes="50vw" priority className="object-cover object-bottom opacity-75" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="relative w-full max-w-[46.25rem] space-y-5 rounded-[3.75rem] bg-[#d9d9d9e3] px-10 py-14 sm:px-20"
        >
          <div>
            <p className="font-inter font-semibold text-[#1755b3]">WELCOME BACK</p>
            <h2 className="mt-2 font-inter text-[2.1875rem] text-[#0b1836]">Access your workspace</h2>
            <p className="mt-1 font-inter text-[#69758a]">Sign in with your assigned Account</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="label">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              placeholder="Enter Username"
              className={`input border-white tracking-[1px] ${errors.username ? "input-error" : ""}`}
              {...register("username")}
            />
            {errors.username && <p className="error-text">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter Password"
              className={`input border-white tracking-[1px] ${errors.password ? "input-error" : ""}`}
              {...register("password")}
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <div role="group" aria-labelledby="role-label">
            <span id="role-label" className="label">
              Role
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(["STAFF", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                  className={`h-14 rounded-[0.8125rem] border bg-white font-inter font-semibold text-[#44516a] ${
                    role === r ? "border-[#1755b3] text-[#1755b3] ring-2 ring-[#1755b3]/20" : "border-white"
                  }`}
                >
                  {r === "STAFF" ? "Staff" : "Administrator"}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={!hydrated || isSubmitting} className="btn btn-primary mt-2 min-h-15 w-full text-xl">
            <Lock className="size-[1.125rem]" aria-hidden />
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
