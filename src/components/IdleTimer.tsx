"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { SESSION_IDLE_MINUTES } from "@/lib/constants";

const IDLE_MS = SESSION_IDLE_MINUTES * 60_000;
const REFRESH_MS = 60_000;

// Signs the user out after 15 idle minutes and, while active, refreshes the session cookie
// so the 15-minute window slides with activity.
export default function IdleTimer() {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastRefresh = Date.now();

    const onActivity = () => {
      lastActivity = Date.now();
      if (lastActivity - lastRefresh > REFRESH_MS) {
        lastRefresh = lastActivity;
        fetch("/api/auth/session").catch(() => {});
      }
    };
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity));

    const timer = setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_MS) {
        signOut({ callbackUrl: "/login" });
      }
    }, 15_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(timer);
    };
  }, []);

  return null;
}
