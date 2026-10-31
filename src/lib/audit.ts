import { db } from "./db";

type Tx = Pick<typeof db, "auditLog">;

export function writeAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  reason?: string | null,
  client: Tx = db,
) {
  return client.auditLog.create({
    data: { userId, action, entity, entityId, reason: reason ?? null },
  });
}
