"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className={className}>
      {children}
    </button>
  );
}
