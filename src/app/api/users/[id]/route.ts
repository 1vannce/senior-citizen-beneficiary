import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { userEditSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

// Edit, deactivate or unlock a user account (UC 9.0)
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const parsed = userEditSchema.extend({ unlock: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (id === auth.user.id && (!d.isActive || d.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account or remove your own Admin role." },
      { status: 409 },
    );
  }

  await db.user.update({
    where: { id },
    data: {
      fullName: d.fullName,
      role: d.role,
      isActive: d.isActive,
      ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
      ...(d.unlock ? { lockedAt: null, failedAttempts: 0 } : {}),
    },
  });

  const notes = [
    existing.isActive !== d.isActive ? (d.isActive ? "activated" : "deactivated") : null,
    existing.role !== d.role ? `role ${existing.role}->${d.role}` : null,
    d.password ? "password reset" : null,
    d.unlock ? "unlocked" : null,
  ].filter(Boolean);
  await writeAudit(auth.user.id, "UPDATE_USER", "User", id, notes.join(", ") || "details edited");
  return NextResponse.json({ ok: true });
}
