import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("kirimmobil_site_settings", {
  id: integer("id").primaryKey().default(1),
  companyName: text("company_name").notNull().default("Kirimmobil.com"),
  whatsappNumber: text("whatsapp_number"),
  officeAddress: text("office_address"),
  officeHours: text("office_hours"),
  mapUrl: text("map_url"),
  instagramUrl: text("instagram_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettingsTable.$inferSelect;
