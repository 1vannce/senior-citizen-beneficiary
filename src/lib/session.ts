import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { authOptions } from "./auth";
import { db } from "./db";

// Reads the user fresh from the database so a deactivated account loses access immediately.
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  return user && user.isActive && !user.lockedAt ? user : null;
}

export async function requirePageUser(role?: "ADMIN"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect("/dashboard");
  return user;
}

export async function requireApiUser(
  role?: "ADMIN",
): Promise<{ user: User } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (role && user.role !== role) return { error: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  return { user };
}
