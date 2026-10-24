import { createInsertSchema } from "drizzle-zod";
import {
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { staffRoleEnum } from "./kirimmobilEnums";

export const staffMembersTable = pgTable("kirimmobil_staff", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: staffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembersTable.$inferSelect;

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
