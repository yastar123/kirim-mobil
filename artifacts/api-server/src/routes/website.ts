import {
  GetPublicContactResponse,
  GetRateQuoteQueryParams,
  GetRateQuoteResponse,
  ListPublicContentQueryParams,
  ListPublicContentResponse,
  ListPublicDeliveriesResponse,
  ListPublicRatesResponse,
  ListPublicSchedulesResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  contentTable,
  deliveriesTable,
  ratesTable,
  schedulesTable,
  siteSettingsTable,
} from "@workspace/db";
import { and, eq, isNull, or } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

router.get("/rates/quote", async (req, res): Promise<void> => {
  const query = GetRateQuoteQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { origin, destination, vehicleCategory, method } = query.data;
  const todayValue = today();
  const normOrigin = origin.trim().toLowerCase();
  const normDest = destination.trim().toLowerCase();
  const normMethod = method ? method.trim().toLowerCase() : undefined;

  const allRates = await db
    .select()
    .from(ratesTable)
    .where(
      and(
        eq(ratesTable.status, "published"),
        isNull(ratesTable.archivedAt),
      ),
    );

  const rate = allRates.find(
    (entry) =>
      entry.status === "published" &&
      !entry.archivedAt &&
      entry.origin.trim().toLowerCase() === normOrigin &&
      entry.destination.trim().toLowerCase() === normDest &&
      entry.vehicleCategory === vehicleCategory &&
      (!normMethod || entry.method.toLowerCase().includes(normMethod)) &&
      (!entry.validFrom || entry.validFrom <= todayValue) &&
      (!entry.validUntil || entry.validUntil >= todayValue),
  );

  const result = rate
    ? {
        available: true,
        origin,
        destination,
        vehicleCategory,
        method: rate.method,
        estimatedPrice: rate.price,
        insuranceIncluded: rate.insuranceIncluded,
        inclusions: rate.inclusions,
        exclusions: rate.exclusions,
        message: `Estimasi ${rate.method}: Rp${rate.price.toLocaleString("id-ID")}. Nilai akhir dan ketersediaan slot perlu dikonfirmasi admin.`,
      }
    : {
        available: false,
        origin,
        destination,
        vehicleCategory,
        method: method ?? "Minta Penawaran",
        estimatedPrice: null,
        insuranceIncluded: null,
        inclusions: null,
        exclusions: null,
        message:
          "Tarif untuk kombinasi ini belum tersedia. Minta penawaran kepada admin; tidak ada harga Rp0 yang ditampilkan.",
      };

  res.json(GetRateQuoteResponse.parse(result));
});

function cleanRate(r: any) {
  if (!r) return r;
  return {
    ...r,
    inclusions: r.inclusions ?? "",
    exclusions: r.exclusions ?? "",
    validFrom: r.validFrom ? new Date(r.validFrom) : null,
    validUntil: r.validUntil ? new Date(r.validUntil) : null,
    updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
  };
}

function cleanSchedule(s: any) {
  if (!s) return s;
  return {
    ...s,
    closingDate: s.closingDate ? new Date(s.closingDate) : null,
    etd: s.etd ? new Date(s.etd) : null,
    eta: s.eta ? new Date(s.eta) : null,
    verifiedSlots: s.verifiedSlots ?? null,
    source: s.source ?? null,
    updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
  };
}

function cleanDelivery(d: any) {
  if (!d) return d;
  return {
    ...d,
    shippedAt: d.shippedAt ? new Date(d.shippedAt) : null,
    narrative: d.narrative ?? "",
    mediaPaths: Array.isArray(d.mediaPaths) ? d.mediaPaths : [],
    updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
  };
}

function cleanContent(c: any) {
  if (!c) return c;
  return {
    ...c,
    publicationConsent: Boolean(c.publicationConsent),
    updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  };
}

router.get("/rates", async (_req, res): Promise<void> => {
  const todayValue = today();
  const rows = await db
    .select()
    .from(ratesTable)
    .where(
      and(eq(ratesTable.status, "published"), isNull(ratesTable.archivedAt)),
    );
  const activeRows = rows.filter(
    (entry) =>
      (!entry.validFrom || entry.validFrom <= todayValue) &&
      (!entry.validUntil || entry.validUntil >= todayValue),
  );
  res.json(ListPublicRatesResponse.parse(activeRows.map(cleanRate)));
});

router.get("/schedules", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(schedulesTable)
    .where(
      and(
        eq(schedulesTable.publishStatus, "published"),
        isNull(schedulesTable.archivedAt),
        or(
          eq(schedulesTable.status, "booking_open"),
          eq(schedulesTable.status, "nearly_full"),
          eq(schedulesTable.status, "closed"),
          eq(schedulesTable.status, "delayed"),
        ),
      ),
    );
  const current = rows.filter((entry) => !entry.etd || entry.etd >= today());
  res.json(ListPublicSchedulesResponse.parse(current.map(cleanSchedule)));
});

router.get("/gallery", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.status, "published"),
        eq(deliveriesTable.publicationConsent, true),
        eq(deliveriesTable.platesRedacted, true),
        isNull(deliveriesTable.archivedAt),
      ),
    );
  res.json(ListPublicDeliveriesResponse.parse(rows.map(cleanDelivery)));
});

router.get("/content", async (req, res): Promise<void> => {
  const query = ListPublicContentQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(contentTable)
    .where(
      and(
        eq(contentTable.status, "published"),
        isNull(contentTable.archivedAt),
        query.data.kind ? eq(contentTable.kind, query.data.kind) : undefined,
      ),
    );
  const approved = rows.filter(
    (entry) => entry.kind !== "testimonial" || entry.publicationConsent,
  );
  res.json(ListPublicContentResponse.parse(approved.map(cleanContent)));
});

router.get("/contact", async (_req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, 1))
    .limit(1);

  res.json(
    GetPublicContactResponse.parse(
      settings ?? {
        id: 1,
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

export default router;
