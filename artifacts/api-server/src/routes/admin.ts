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
  ListAdminContentResponse,
  ListAdminDeliveriesResponse,
  ListAdminRatesResponse,
  ListAdminSchedulesResponse,
  ListAuditLogResponse,
  ListStaffResponse,
  RemoveStaffRoleParams,
  RemoveStaffRoleResponse,
  StaffRole,
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
  UpsertStaffRoleBody,
  UpsertStaffRoleParams,
  UpsertStaffRoleResponse,
} from "@workspace/api-zod";
import {
  auditLogTable,
  contentTable,
  deliveriesTable,
  ratesTable,
  schedulesTable,
  siteSettingsTable,
  staffMembersTable,
  db,
} from "@workspace/db";
import { clerkClient, getAuth } from "@clerk/express";
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
  getStaffFromResponse,
  requireStaff,
  resolveStaffMember,
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

function dateString(value: Date | string | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

router.get("/admin/session", async (req, res): Promise<void> => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  const staff = await resolveStaffMember(req);
  if (!staff) {
    res.status(403).json({ error: "This account does not have a staff role." });
    return;
  }
  res.json(GetAdminSessionResponse.parse(staff));
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
  res.json(ListAdminRatesResponse.parse(rows));
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
  res.status(201).json(CreateRateResponse.parse(rate));
});

router.patch("/admin/rates/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = UpdateRateParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateRateBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan tarif." });
    return;
  }
  const [rate] = await db
    .update(ratesTable)
    .set({
      ...parsed.data,
      validFrom: dateString(parsed.data.validFrom),
      validUntil: dateString(parsed.data.validUntil),
    })
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
  res.json(UpdateRateResponse.parse(rate));
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
  res.json(ListAdminSchedulesResponse.parse(rows));
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
  res.status(201).json(CreateScheduleResponse.parse(schedule));
});

router.patch("/admin/schedules/:id", requireStaff(...operationsRoles), async (req, res): Promise<void> => {
  const params = UpdateScheduleParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan jadwal." });
    return;
  }
  const [schedule] = await db
    .update(schedulesTable)
    .set({
      ...parsed.data,
      closingDate: dateString(parsed.data.closingDate),
      etd: dateString(parsed.data.etd),
      eta: dateString(parsed.data.eta),
    })
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
  res.json(UpdateScheduleResponse.parse(schedule));
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
  res.json(ListAdminDeliveriesResponse.parse(rows));
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
  res.status(201).json(CreateDeliveryResponse.parse(delivery));
});

router.patch("/admin/gallery/:id", requireStaff(...contentRoles), async (req, res): Promise<void> => {
  const params = UpdateDeliveryParams.safeParse({ id: paramString(req.params.id) });
  const parsed = UpdateDeliveryBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message ?? "Isi perubahan dokumentasi." });
    return;
  }
  const [delivery] = await db
    .update(deliveriesTable)
    .set({ ...parsed.data, shippedAt: dateString(parsed.data.shippedAt) })
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
  res.json(UpdateDeliveryResponse.parse(delivery));
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

router.get("/admin/staff", requireStaff(), async (_req, res): Promise<void> => {
  const staff = getStaffFromResponse(res);
  if (staff.role !== "owner") {
    res.status(403).json({ error: "Owner role required." });
    return;
  }
  const rows = await db
    .select()
    .from(staffMembersTable)
    .orderBy(staffMembersTable.createdAt);
  res.json(ListStaffResponse.parse(rows));
});

router.put("/admin/staff/:clerkUserId", requireStaff(), async (req, res): Promise<void> => {
  const actor = getStaffFromResponse(res);
  if (actor.role !== "owner") {
    res.status(403).json({ error: "Owner role required." });
    return;
  }
  const params = UpsertStaffRoleParams.safeParse({
    clerkUserId: paramString(req.params.clerkUserId),
  });
  const parsed = UpsertStaffRoleBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: params.error?.message ?? parsed.error?.message });
    return;
  }
  let user;
  try {
    user = await clerkClient.users.getUser(params.data.clerkUserId);
  } catch {
    res.status(404).json({ error: "Akun Clerk tidak ditemukan." });
    return;
  }
  const primaryEmail = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  )?.emailAddress;
  if (!primaryEmail || primaryEmail.toLowerCase() !== parsed.data.email.toLowerCase()) {
    res.status(400).json({ error: "Email harus sama dengan email utama akun Clerk." });
    return;
  }
  if (params.data.clerkUserId === actor.clerkUserId && parsed.data.role !== "owner") {
    res.status(400).json({ error: "Owner tidak dapat menurunkan perannya sendiri." });
    return;
  }
  const displayName =
    parsed.data.displayName.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    primaryEmail;
  const [member] = await db
    .insert(staffMembersTable)
    .values({
      clerkUserId: params.data.clerkUserId,
      email: primaryEmail,
      displayName,
      role: parsed.data.role,
    })
    .onConflictDoUpdate({
      target: staffMembersTable.clerkUserId,
      set: { email: primaryEmail, displayName, role: parsed.data.role, updatedAt: new Date() },
    })
    .returning();
  await recordAudit(actor, {
    entityType: "staff",
    entityId: member.clerkUserId,
    action: "role_updated",
    summary: `Hak akses ${member.email} diperbarui`,
  });
  res.json(UpsertStaffRoleResponse.parse(member));
});

router.delete("/admin/staff/:clerkUserId", requireStaff(), async (req, res): Promise<void> => {
  const actor = getStaffFromResponse(res);
  if (actor.role !== "owner") {
    res.status(403).json({ error: "Owner role required." });
    return;
  }
  const params = RemoveStaffRoleParams.safeParse({
    clerkUserId: paramString(req.params.clerkUserId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (params.data.clerkUserId === actor.clerkUserId) {
    res.status(400).json({ error: "Owner tidak dapat menghapus aksesnya sendiri." });
    return;
  }
  const [member] = await db
    .delete(staffMembersTable)
    .where(eq(staffMembersTable.clerkUserId, params.data.clerkUserId))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Anggota staf tidak ditemukan." });
    return;
  }
  await recordAudit(actor, {
    entityType: "staff",
    entityId: member.clerkUserId,
    action: "role_removed",
    summary: `Hak akses ${member.email} dicabut`,
  });
  res.status(204).end();
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
