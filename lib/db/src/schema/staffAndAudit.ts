import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("kirimmobil_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: text("actor_user_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
