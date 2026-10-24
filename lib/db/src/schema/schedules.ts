import { createInsertSchema } from "drizzle-zod";
import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { publishStatusEnum, scheduleStatusEnum } from "./kirimmobilEnums";

export const schedulesTable = pgTable("kirimmobil_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  operator: text("operator").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  closingDate: date("closing_date", { mode: "string" }),
  etd: date("etd", { mode: "string" }),
  eta: date("eta", { mode: "string" }),
  status: scheduleStatusEnum("status").notNull().default("booking_open"),
  verifiedSlots: integer("verified_slots"),
  source: text("source"),
  publishStatus: publishStatusEnum("publish_status").notNull().default("draft"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
