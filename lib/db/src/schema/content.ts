import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { contentKindEnum, publishStatusEnum } from "./kirimmobilEnums";

export const contentTable = pgTable("kirimmobil_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: contentKindEnum("kind").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  status: publishStatusEnum("status").notNull().default("draft"),
  publicationConsent: boolean("publication_consent").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContent = z.infer<typeof insertContentSchema>;
export type ContentEntry = typeof contentTable.$inferSelect;
