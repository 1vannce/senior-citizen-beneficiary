import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";
import { dateTime } from "@/lib/format";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const me = await requirePageUser("ADMIN");
  const [users, audit] = await Promise.all([
    db.user.findMany({ orderBy: { username: "asc" } }),
    db.auditLog.findMany({ where: { entity: "User" }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role as "STAFF" | "ADMIN",
    isActive: u.isActive,
    locked: !!u.lockedAt,
  }));
  const names = new Map(users.map((u) => [u.id, u.username]));
  const log = audit.map((a) => ({
    id: a.id,
    date: dateTime(a.createdAt),
    by: a.user.fullName,
    account: names.get(a.entityId) ?? "",
    change: a.reason ?? "",
  }));
  return <UsersClient rows={rows} log={log} meId={me.id} />;
}
