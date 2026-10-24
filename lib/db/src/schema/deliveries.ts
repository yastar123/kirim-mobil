import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { publishStatusEnum } from "./kirimmobilEnums";

export const deliveriesTable = pgTable("kirimmobil_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  shippedAt: date("shipped_at", { mode: "string" }),
  narrative: text("narrative").notNull().default(""),
  mediaPaths: text("media_paths")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  status: publishStatusEnum("status").notNull().default("draft"),
  publicationConsent: boolean("publication_consent").notNull().default(false),
  platesRedacted: boolean("plates_redacted").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
