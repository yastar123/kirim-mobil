import { pgEnum } from "drizzle-orm/pg-core";

export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "published",
  "inactive",
]);

export const vehicleCategoryEnum = pgEnum("vehicle_category", [
  "small",
  "medium",
  "large",
]);

export const scheduleStatusEnum = pgEnum("schedule_status", [
  "booking_open",
  "nearly_full",
  "closed",
  "departed",
  "delayed",
  "cancelled",
]);

export const contentKindEnum = pgEnum("content_kind", [
  "page",
  "faq",
  "testimonial",
]);

