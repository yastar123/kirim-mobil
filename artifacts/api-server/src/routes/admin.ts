import {
  CreateContentBody,
  CreateContentResponse,
  CreateDeliveryBody,
  CreateDeliveryResponse,
  CreateRateBody,
  CreateRateResponse,
  CreateScheduleBody,
  CreateScheduleResponse,
  DeleteContentParams,
  DeleteDeliveryParams,
  DeleteRateParams,
  DeleteScheduleParams,
  GetAdminOverviewResponse,
  GetAdminSessionResponse,
  GetAdminSettingsResponse,
  LoginAdminBody,
  ListAdminContentResponse,
  ListAdminDeliveriesResponse,
  ListAdminRatesResponse,
  ListAdminSchedulesResponse,
  ListAuditLogResponse,
  UpdateAdminSettingsBody,
  UpdateAdminSettingsResponse,
  UpdateContentBody,
  UpdateContentParams,
  UpdateContentResponse,
  UpdateDeliveryBody,
  UpdateDeliveryParams,
  UpdateDeliveryResponse,
  UpdateRateBody,
  UpdateRateParams,
  UpdateRateResponse,
  UpdateScheduleBody,
  UpdateScheduleParams,
  UpdateScheduleResponse,
} from "@workspace/api-zod";
import {
  auditLogTable,
  contentTable,
  deliveriesTable,
  ratesTable,
  schedulesTable,
  siteSettingsTable,
  db,
} from "@workspace/db";
import {
  and,
  arrayContains,
  count,
  desc,
  eq,
  gte,
  isNull,
  or,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  adminCredentialsConfigured,
  clearAdminSessionCookie,
  clearFailedAdminLogins,
  createAdminSessionCookie,
  getStaffFromResponse,
  limitAdminLoginAttempts,
  recordFailedAdminLogin,
  requireStaff,
  resolveStaffMember,
  verifyAdminCredentials,
  type StaffRole,
} from "../lib/adminAuth";
import { recordAudit } from "../lib/audit";

const router: IRouter = Router();
const contentRoles: StaffRole[] = ["admin_content"];
const operationsRoles: StaffRole[] = ["admin_operations"];

function paramString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateString(value: Date | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

function cleanDate(val: any): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function cleanRate(r: any) {
  if (!r) return r;
  return {
    ...r,
    inclusions: r.inclusions ?? "",
    exclusions: r.exclusions ?? "",
    validFrom: cleanDate(r.validFrom),
    validUntil: cleanDate(r.validUntil),
    updatedAt: cleanDate(r.updatedAt) ?? new Date(),
  };
}

function cleanSchedule(s: any) {
  if (!s) return s;
  return {
    ...s,
    closingDate: cleanDate(s.closingDate),
    etd: cleanDate(s.etd),
    eta: cleanDate(s.eta),
    verifiedSlots: s.verifiedSlots ?? null,
    source: s.source ?? null,
    updatedAt: cleanDate(s.updatedAt) ?? new Date(),
  };
}

function cleanDelivery(d: any) {
  if (!d) return d;
  return {
    ...d,
    shippedAt: cleanDate(d.shippedAt),
    narrative: d.narrative ?? "",
    mediaPaths: Array.isArray(d.mediaPaths) ? d.mediaPaths : [],
    updatedAt: cleanDate(d.updatedAt) ?? new Date(),
  };
}

router.post("/admin/login", limitAdminLoginAttempts, async (req, res): Promise<void> => {
  const parsed = LoginAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Masukkan email dan kata sandi yang valid." });
    return;
  }
  if (!adminCredentialsConfigured()) {
    res.status(503).json({ error: "Kredensial admin belum dikonfigurasi." });
    return;
  }
  if (!verifyAdminCredentials(parsed.data.email, parsed.data.password)) {
    recordFailedAdminLogin(req);
    res.status(401).json({ error: "Email atau kata sandi tidak benar." });
    return;
  }

  clearFailedAdminLogins(req);
  createAdminSessionCookie(res);
  const email = parsed.data.email.trim().toLowerCase();
  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetAdminSessionResponse.parse({
      email,
      displayName: email,
      role: "owner",
    }),
  );
});

router.post("/admin/logout", (_req, res): void => {
  clearAdminSessionCookie(res);
  res.status(204).end();
});

router.get("/admin/session", async (req, res): Promise<void> => {
  const staff = await resolveStaffMember(req);
  if (!staff) {
    res.status(401).json({ error: "Silakan masuk ke area admin." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetAdminSessionResponse.parse({
      email: staff.email,
      displayName: staff.displayName,
      role: staff.role,
    }),
  );
});

router.get("/admin/overview", requireStaff(), async (_req, res): Promise<void> => {
  const [draftRates] = await db
    .select({ value: count() })
    .from(ratesTable)
    .where(and(eq(ratesTable.status, "draft"), isNull(ratesTable.archivedAt)));
  const [publishedRates] = await db
    .select({ value: count() })
    .from(ratesTable)
    .where(and(eq(ratesTable.status, "published"), isNull(ratesTable.archivedAt)));
  const [upcomingSchedules] = await db
    .select({ value: count() })
    .from(schedulesTable)
    .where(
      and(
        isNull(schedulesTable.archivedAt),
        or(isNull(schedulesTable.etd), gte(schedulesTable.etd, today())),
      ),
    );
  const [publishedDeliveries] = await db
    .select({ value: count() })
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.status, "published"),
        eq(deliveriesTable.publicationConsent, true),
        eq(deliveriesTable.platesRedacted, true),
        isNull(deliveriesTable.archivedAt),
      ),
    );
  const [draftContent] = await db
    .select({ value: count() })
    .from(contentTable)
    .where(and(eq(contentTable.status, "draft"), isNull(contentTable.archivedAt)));
  const recentActivity = await db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(10);

  res.json(
    GetAdminOverviewResponse.parse({
      draftRates: draftRates.value,
      publishedRates: publishedRates.value,
      upcomingSchedules: upcomingSchedules.value,
      publishedDeliveries: publishedDeliveries.value,
      draftContent: draftContent.value,
      recentActivity,
    }),
  );
});

router.get("/admin/rates", requireStaff(...operationsRoles), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ratesTable)
    .where(isNull(ratesTable.archivedAt))
    .orderBy(desc(ratesTable.updatedAt));
  res.json(ListAdminRatesResponse.parse(rows.map(cleanRate)));
});

router.post("/admin/rates", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const parsed = CreateRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rate] = await db
    .insert(ratesTable)
    .values({
      ...parsed.data,
      validFrom: dateString(parsed.data.validFrom),
      validUntil: dateString(parsed.data.validUntil),
    })
    .returning();
  const staff = getStaffFromResponse(res);
  await recordAudit(staff, {
    entityType: "rate",
    entityId: rate.id,
    action: "created",
    summary: `Tarif ${rate.origin} → ${rate.destination} dibuat`,
  });
  res.status(201).json(CreateRateResponse.parse(cleanRate(rate)));
});

router.patch("/admin/rates/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = UpdateRateParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateRateBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan tarif." });
    return;
  }
  const updatePayload: Record<string, any> = { ...parsed.data };
  if ("validFrom" in parsed.data) {
    updatePayload.validFrom = dateString(parsed.data.validFrom);
  }
  if ("validUntil" in parsed.data) {
    updatePayload.validUntil = dateString(parsed.data.validUntil);
  }
  const [rate] = await db
    .update(ratesTable)
    .set(updatePayload)
    .where(and(eq(ratesTable.id, params.data.id), isNull(ratesTable.archivedAt)))
    .returning();
  if (!rate) {
    res.status(404).json({ error: "Tarif tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "rate",
    entityId: rate.id,
    action: "updated",
    summary: `Tarif ${rate.origin} → ${rate.destination} diperbarui`,
  });
  res.json(UpdateRateResponse.parse(cleanRate(rate)));
});

router.delete("/admin/rates/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = DeleteRateParams.safeParse({ id: paramString(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [rate] = await db
    .update(ratesTable)
    .set({ archivedAt: new Date() })
    .where(and(eq(ratesTable.id, params.data.id), isNull(ratesTable.archivedAt)))
    .returning();
  if (!rate) {
    res.status(404).json({ error: "Tarif tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "rate",
    entityId: rate.id,
    action: "archived",
    summary: `Tarif ${rate.origin} → ${rate.destination} diarsipkan`,
  });
  res.status(204).end();
});

router.get("/admin/schedules", requireStaff(...operationsRoles), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(schedulesTable)
    .where(isNull(schedulesTable.archivedAt))
    .orderBy(desc(schedulesTable.updatedAt));
  res.json(ListAdminSchedulesResponse.parse(rows.map(cleanSchedule)));
});

router.post("/admin/schedules", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [schedule] = await db
    .insert(schedulesTable)
    .values({
      ...parsed.data,
      closingDate: dateString(parsed.data.closingDate),
      etd: dateString(parsed.data.etd),
      eta: dateString(parsed.data.eta),
    })
    .returning();
  await recordAudit(getStaffFromResponse(res), {
    entityType: "schedule",
    entityId: schedule.id,
    action: "created",
    summary: `Jadwal ${schedule.origin} → ${schedule.destination} dibuat`,
  });
  res.status(201).json(CreateScheduleResponse.parse(cleanSchedule(schedule)));
});

router.patch("/admin/schedules/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = UpdateScheduleParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan jadwal." });
    return;
  }
  const updatePayload: Record<string, any> = { ...parsed.data };
  if ("closingDate" in parsed.data) {
    updatePayload.closingDate = dateString(parsed.data.closingDate);
  }
  if ("etd" in parsed.data) {
    updatePayload.etd = dateString(parsed.data.etd);
  }
  if ("eta" in parsed.data) {
    updatePayload.eta = dateString(parsed.data.eta);
  }
  const [schedule] = await db
    .update(schedulesTable)
    .set(updatePayload)
    .where(and(eq(schedulesTable.id, params.data.id), isNull(schedulesTable.archivedAt)))
    .returning();
  if (!schedule) {
    res.status(404).json({ error: "Jadwal tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "schedule",
    entityId: schedule.id,
    action: "updated",
    summary: `Jadwal ${schedule.origin} → ${schedule.destination} diperbarui`,
  });
  res.json(UpdateScheduleResponse.parse(cleanSchedule(schedule)));
});

router.delete("/admin/schedules/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = DeleteScheduleParams.safeParse({ id: paramString(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [schedule] = await db
    .update(schedulesTable)
    .set({ archivedAt: new Date() })
    .where(and(eq(schedulesTable.id, params.data.id), isNull(schedulesTable.archivedAt)))
    .returning();
  if (!schedule) {
    res.status(404).json({ error: "Jadwal tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "schedule",
    entityId: schedule.id,
    action: "archived",
    summary: `Jadwal ${schedule.origin} → ${schedule.destination} diarsipkan`,
  });
  res.status(204).end();
});

router.get("/admin/gallery", requireStaff(...contentRoles), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(deliveriesTable)
    .where(isNull(deliveriesTable.archivedAt))
    .orderBy(desc(deliveriesTable.updatedAt));
  res.json(ListAdminDeliveriesResponse.parse(rows.map(cleanDelivery)));
});

router.post("/admin/gallery", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [delivery] = await db
    .insert(deliveriesTable)
    .values({ ...parsed.data, shippedAt: dateString(parsed.data.shippedAt) })
    .returning();
  await recordAudit(getStaffFromResponse(res), {
    entityType: "delivery",
    entityId: delivery.id,
    action: "created",
    summary: `Dokumentasi ${delivery.title} dibuat`,
  });
  res.status(201).json(CreateDeliveryResponse.parse(cleanDelivery(delivery)));
});

router.patch("/admin/gallery/:id", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateDeliveryBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan dokumentasi." });
    return;
  }
  const updatePayload: Record<string, any> = { ...parsed.data };
  if ("shippedAt" in parsed.data) {
    updatePayload.shippedAt = dateString(parsed.data.shippedAt);
  }
  const [delivery] = await db
    .update(deliveriesTable)
    .set(updatePayload)
    .where(and(eq(deliveriesTable.id, params.data.id), isNull(deliveriesTable.archivedAt)))
    .returning();
  if (!delivery) {
    res.status(404).json({ error: "Dokumentasi tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "delivery",
    entityId: delivery.id,
    action: "updated",
    summary: `Dokumentasi ${delivery.title} diperbarui`,
  });
  res.json(UpdateDeliveryResponse.parse(cleanDelivery(delivery)));
});

router.delete("/admin/gallery/:id", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const params = DeleteDeliveryParams.safeParse({ id: paramString(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [delivery] = await db
    .update(deliveriesTable)
    .set({ archivedAt: new Date() })
    .where(and(eq(deliveriesTable.id, params.data.id), isNull(deliveriesTable.archivedAt)))
    .returning();
  if (!delivery) {
    res.status(404).json({ error: "Dokumentasi tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "delivery",
    entityId: delivery.id,
    action: "archived",
    summary: `Dokumentasi ${delivery.title} diarsipkan`,
  });
  res.status(204).end();
});

router.get("/admin/content", requireStaff(...contentRoles), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contentTable)
    .where(isNull(contentTable.archivedAt))
    .orderBy(desc(contentTable.updatedAt));
  res.json(ListAdminContentResponse.parse(rows));
});

router.post("/admin/content", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const parsed = CreateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(contentTable).values(parsed.data).returning();
  await recordAudit(getStaffFromResponse(res), {
    entityType: "content",
    entityId: entry.id,
    action: "created",
    summary: `Konten "${entry.title}" dibuat`,
  });
  res.status(201).json(CreateContentResponse.parse(entry));
});

router.patch("/admin/content/:id", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const params = UpdateContentParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateContentBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan konten." });
    return;
  }
  const [entry] = await db
    .update(contentTable)
    .set(parsed.data)
    .where(and(eq(contentTable.id, params.data.id), isNull(contentTable.archivedAt)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Konten tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "content",
    entityId: entry.id,
    action: "updated",
    summary: `Konten "${entry.title}" diperbarui`,
  });
  res.json(UpdateContentResponse.parse(entry));
});

router.delete("/admin/content/:id", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const params = DeleteContentParams.safeParse({ id: paramString(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db
    .update(contentTable)
    .set({ archivedAt: new Date() })
    .where(and(eq(contentTable.id, params.data.id), isNull(contentTable.archivedAt)))
    .returning();
  if (!entry) {
    res.status(404).json({ error: "Konten tidak ditemukan." });
    return;
  }
  await recordAudit(getStaffFromResponse(res), {
    entityType: "content",
    entityId: entry.id,
    action: "archived",
    summary: `Konten "${entry.title}" diarsipkan`,
  });
  res.status(204).end();
});

router.get("/admin/settings", requireStaff(...contentRoles), async (_req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, 1))
    .limit(1);
  res.json(
    GetAdminSettingsResponse.parse(
      settings ?? {
        companyName: "Kirimmobil.com",
        whatsappNumber: null,
        officeAddress: null,
        officeHours: null,
        mapUrl: null,
        instagramUrl: null,
        updatedAt: new Date(),
      },
    ),
  );
});

router.patch("/admin/settings", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: parsed.error?.message ?? "Isi pengaturan yang akan diubah." });
    return;
  }
  const [settings] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  await recordAudit(getStaffFromResponse(res), {
    entityType: "settings",
    entityId: "1",
    action: "updated",
    summary: "Pengaturan situs diperbarui",
  });
  res.json(UpdateAdminSettingsResponse.parse(settings));
});

router.put("/admin/settings", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const parsed = UpdateAdminSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Isi pengaturan yang akan diubah." });
    return;
  }
  const [settings] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  await recordAudit(getStaffFromResponse(res), {
    entityType: "settings",
    entityId: "1",
    action: "updated",
    summary: "Pengaturan situs diperbarui",
  });
  res.json(UpdateAdminSettingsResponse.parse(settings));
});

router.get("/admin/audit-log", requireStaff(), async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(100);
  res.json(ListAuditLogResponse.parse(rows));
});

export async function isPublishedDeliveryMedia(objectPath: string): Promise<boolean> {
  const [delivery] = await db
    .select({ id: deliveriesTable.id })
    .from(deliveriesTable)
    .where(
      and(
        arrayContains(deliveriesTable.mediaPaths, [objectPath]),
        eq(deliveriesTable.status, "published"),
        eq(deliveriesTable.publicationConsent, true),
        eq(deliveriesTable.platesRedacted, true),
        isNull(deliveriesTable.archivedAt),
      ),
    )
    .limit(1);
  return Boolean(delivery);
}

export default router;
