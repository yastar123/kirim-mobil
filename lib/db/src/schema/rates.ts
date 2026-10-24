import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { publishStatusEnum, vehicleCategoryEnum } from "./kirimmobilEnums";

export const ratesTable = pgTable("kirimmobil_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  vehicleCategory: vehicleCategoryEnum("vehicle_category").notNull(),
  method: text("method").notNull(),
  price: integer("price").notNull(),
  insuranceIncluded: boolean("insurance_included").notNull().default(false),
  inclusions: text("inclusions").notNull().default(""),
  exclusions: text("exclusions").notNull().default(""),
  status: publishStatusEnum("status").notNull().default("draft"),
  validFrom: date("valid_from", { mode: "string" }),
  validUntil: date("valid_until", { mode: "string" }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertRateSchema = createInsertSchema(ratesTable).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRate = z.infer<typeof insertRateSchema>;
export type Rate = typeof ratesTable.$inferSelect;
