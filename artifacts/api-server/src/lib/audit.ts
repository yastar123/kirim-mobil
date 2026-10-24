import { db, auditLogTable } from "@workspace/db";
import type { StaffRecord } from "./adminAuth";

export async function recordAudit(
  staff: StaffRecord,
  entry: {
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
  },
): Promise<void> {
  await db.insert(auditLogTable).values({
    actorUserId: staff.clerkUserId,
    actorEmail: staff.email,
    ...entry,
  });
}

export function dateOnly(value: Date | string | null | undefined) {
  if (value == null) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
