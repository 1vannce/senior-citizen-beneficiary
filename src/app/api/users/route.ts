import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/session";
import { writeAudit } from "@/lib/audit";
import { userCreateSchema } from "@/lib/validators";

// Create user account (UC 9.0)
export async function POST(req: Request) {
  const auth = await requireApiUser("ADMIN");
  if ("error" in auth) return auth.error;

  const parsed = userCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const dup = await db.user.findUnique({ where: { username: d.username } });
  if (dup) {
    return NextResponse.json(
      { error: "That username is already taken.", fields: { username: ["That username is already taken."] } },
      { status: 409 },
    );
  }

  const created = await db.user.create({
    data: {
      username: d.username,
      fullName: d.fullName,
      role: d.role,
      passwordHash: await bcrypt.hash(d.password, 10),
    },
  });
  await writeAudit(auth.user.id, "CREATE_USER", "User", created.id, `Role ${d.role}`);
  return NextResponse.json({ id: created.id }, { status: 201 });
}
