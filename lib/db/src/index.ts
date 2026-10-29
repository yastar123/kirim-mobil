import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { randomUUID } from "node:crypto";
import * as schema from "./schema";

const { Pool } = pg;

let pool: any;
let db: any;

// Helper to clone objects
function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

// In-memory data store for development & mock fallback
interface InMemData {
  rates: any[];
  schedules: any[];
  deliveries: any[];
  content: any[];
  settings: any[];
  auditLog: any[];
}

const initialData: InMemData = {
  rates: [
    // Jakarta - Manokwari
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Manokwari",
      vehicleCategory: "small",
      method: "Kontainer Reguler",
      price: 15000000,
      insuranceIncluded: true,
      inclusions: "Door to Port, Asuransi All-Risk, Wrapping Bodi & Interior",
      exclusions: "Bongkar muat di luar area pelabuhan tujuan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Manokwari",
      vehicleCategory: "medium",
      method: "Kontainer Reguler",
      price: 15500000,
      insuranceIncluded: true,
      inclusions: "Door to Port, Asuransi All-Risk, Wrapping Bodi & Interior",
      exclusions: "Bongkar muat di luar area pelabuhan tujuan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Manokwari",
      vehicleCategory: "large",
      method: "Kontainer Reguler",
      price: 16500000,
      insuranceIncluded: true,
      inclusions: "Door to Port, Asuransi All-Risk, Wrapping Bodi & Interior",
      exclusions: "Bongkar muat di luar area pelabuhan tujuan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Surabaya - Manokwari
    {
      id: randomUUID(),
      origin: "Surabaya",
      destination: "Manokwari",
      vehicleCategory: "small",
      method: "Kontainer Reguler",
      price: 12500000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Lashing 4 Sisi",
      exclusions: "Handling & penjemputan luar pelabuhan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Surabaya",
      destination: "Manokwari",
      vehicleCategory: "medium",
      method: "Kontainer Reguler",
      price: 13500000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Lashing 4 Sisi",
      exclusions: "Handling & penjemputan luar pelabuhan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Surabaya",
      destination: "Manokwari",
      vehicleCategory: "large",
      method: "Kontainer Reguler",
      price: 15000000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Lashing 4 Sisi",
      exclusions: "Handling & penjemputan luar pelabuhan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Makassar - Manokwari
    {
      id: randomUUID(),
      origin: "Makassar",
      destination: "Manokwari",
      vehicleCategory: "small",
      method: "Kapal Pelni / RORO",
      price: 10500000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Pengawalan Dek Kapal",
      exclusions: "Penjemputan alamat asal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Makassar",
      destination: "Manokwari",
      vehicleCategory: "medium",
      method: "Kapal Pelni / RORO",
      price: 11500000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Pengawalan Dek Kapal",
      exclusions: "Penjemputan alamat asal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Makassar",
      destination: "Manokwari",
      vehicleCategory: "large",
      method: "Kapal Pelni / RORO",
      price: 12500000,
      insuranceIncluded: true,
      inclusions: "Port to Port, Asuransi All-Risk, Pengawalan Dek Kapal",
      exclusions: "Penjemputan alamat asal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Jakarta - Balikpapan
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Balikpapan",
      vehicleCategory: "small",
      method: "Kapal RORO Cepat",
      price: 4800000,
      insuranceIncluded: true,
      inclusions: "Door to Door Jabodetabek - Balikpapan Kota, Asuransi Perjalanan",
      exclusions: "Pengantaran di luar area kota Balikpapan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Balikpapan",
      vehicleCategory: "medium",
      method: "Kapal RORO Cepat",
      price: 5300000,
      insuranceIncluded: true,
      inclusions: "Door to Door Jabodetabek - Balikpapan Kota, Asuransi Perjalanan",
      exclusions: "Pengantaran di luar area kota Balikpapan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Balikpapan",
      vehicleCategory: "large",
      method: "Kapal RORO Cepat",
      price: 6200000,
      insuranceIncluded: true,
      inclusions: "Door to Door Jabodetabek - Balikpapan Kota, Asuransi Perjalanan",
      exclusions: "Pengantaran di luar area kota Balikpapan",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Jakarta - Makassar
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Makassar",
      vehicleCategory: "small",
      method: "Kapal RORO",
      price: 4500000,
      insuranceIncluded: true,
      inclusions: "Door to Port Tanjung Priok - Soekarno Hatta Makassar",
      exclusions: "Retribusi dan pas masuk pelabuhan lokal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Makassar",
      vehicleCategory: "medium",
      method: "Kapal RORO",
      price: 5000000,
      insuranceIncluded: true,
      inclusions: "Door to Port Tanjung Priok - Soekarno Hatta Makassar",
      exclusions: "Retribusi dan pas masuk pelabuhan lokal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      origin: "Jakarta",
      destination: "Makassar",
      vehicleCategory: "large",
      method: "Kapal RORO",
      price: 5800000,
      insuranceIncluded: true,
      inclusions: "Door to Port Tanjung Priok - Soekarno Hatta Makassar",
      exclusions: "Retribusi dan pas masuk pelabuhan lokal",
      status: "published",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Draft rate for testing CMS
    {
      id: randomUUID(),
      origin: "Surabaya",
      destination: "Banjarmasin",
      vehicleCategory: "small",
      method: "Kapal RORO",
      price: 3200000,
      insuranceIncluded: true,
      inclusions: "Port to Port",
      exclusions: "Asuransi muatan tambahan",
      status: "draft",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  schedules: [
    {
      id: randomUUID(),
      operator: "PT Pelni (KM Dobonsolo)",
      origin: "Jakarta",
      destination: "Manokwari",
      closingDate: "2026-11-05",
      etd: "2026-11-08",
      eta: "2026-11-15",
      status: "booking_open",
      verifiedSlots: 8,
      source: "Jadwal Resmi PT Pelni",
      publishStatus: "published",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      operator: "PT Pelni (KM Ciremai)",
      origin: "Surabaya",
      destination: "Manokwari",
      closingDate: "2026-11-10",
      etd: "2026-11-12",
      eta: "2026-11-18",
      status: "nearly_full",
      verifiedSlots: 3,
      source: "Jadwal Resmi PT Pelni",
      publishStatus: "published",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      operator: "PT Pelni (KM Sinabung)",
      origin: "Makassar",
      destination: "Manokwari",
      closingDate: "2026-11-07",
      etd: "2026-11-09",
      eta: "2026-11-14",
      status: "booking_open",
      verifiedSlots: 12,
      source: "Jadwal Resmi PT Pelni",
      publishStatus: "published",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      operator: "DLU Logistics (KM Dharma Rucitra VII)",
      origin: "Jakarta",
      destination: "Balikpapan",
      closingDate: "2026-11-03",
      etd: "2026-11-04",
      eta: "2026-11-06",
      status: "booking_open",
      verifiedSlots: 6,
      source: "Dharma Lautan Utama",
      publishStatus: "published",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      operator: "PT Pelni (KM Nggapulu)",
      origin: "Jakarta",
      destination: "Makassar",
      closingDate: "2026-11-06",
      etd: "2026-11-08",
      eta: "2026-11-11",
      status: "booking_open",
      verifiedSlots: 10,
      source: "Jadwal Resmi PT Pelni",
      publishStatus: "published",
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  deliveries: [
    {
      id: randomUUID(),
      slug: "toyota-fortuner-jakarta-manokwari",
      title: "Pengiriman Toyota Fortuner 2.8 GR Jakarta ke Manokwari via Kontainer",
      origin: "Jakarta",
      destination: "Manokwari",
      vehicleType: "SUV / Kategori Besar",
      shippedAt: "2026-10-15",
      narrative: "Unit diserahkan di pool Tanjung Priok Jakarta dengan berita acara fisik 28 titik. Dilakukan pelapisan pelindung bodi & sarung jok, pemuatan ke dalam kontainer 20ft dengan lashing rantai 4 roda. Kapal kontainer berlayar dan tiba di Pelabuhan Manokwari dalam kondisi prima tanpa cela.",
      mediaPaths: ["/vehicle-logistics-hero.jpg"],
      status: "published",
      publicationConsent: true,
      platesRedacted: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      slug: "honda-crv-surabaya-manokwari",
      title: "Pengiriman Honda CR-V Turbo Surabaya ke Manokwari",
      origin: "Surabaya",
      destination: "Manokwari",
      vehicleType: "SUV / Kategori Sedang",
      shippedAt: "2026-10-08",
      narrative: "Pengiriman unit Honda CR-V dari Surabaya menuju Pelabuhan Manokwari. Unit telah melalui inspeksi ketat sebelum pemuatan kapal Pelni, dilapisi pelindung bodi dan diserahterimakan langsung ke penerima di Manokwari dengan berita acara lengkap.",
      mediaPaths: ["/vehicle-logistics-hero.jpg"],
      status: "published",
      publicationConsent: true,
      platesRedacted: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  content: [
    // FAQ
    {
      id: randomUUID(),
      kind: "faq",
      slug: "dokumen-wajib-kirim-mobil",
      title: "Apa saja dokumen yang wajib disiapkan sebelum kirim mobil?",
      body: "Dokumen yang wajib disiapkan adalah:\n1. STNK asli yang masih berlaku masa pajaknya.\n2. Fotokopi BPKB (jika BPKB masih berada di pihak leasing/kredit, lampirkan Surat Keterangan resmi dari leasing terkait).\n3. Fotokopi KTP pemilik atau pengirim kendaraan.\n4. Kunci cadangan (disarankan) jika ada.\n\nSemua dokumen akan dicek bersama dan dicantumkan dalam lembar serah terima (BAST).",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      kind: "faq",
      slug: "asuransi-dan-perlindungan",
      title: "Apakah pengiriman kendaraan dilindungi oleh asuransi?",
      body: "Ya, setiap pengiriman di Kirimmobil dilengkapi opsi asuransi all-risk dari perusahaan asuransi rekanan terpercaya. Nilai pertanggungan dihitung berdasarkan nilai taksasi atau nilai pasar kendaraan saat serah terima, mencakup perlindungan selama perjalanan laut dan penanganan di pelabuhan.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      kind: "faq",
      slug: "prosedur-serah-terima-kendaraan",
      title: "Bagaimana prosedur pemeriksaan fisik saat penyerahan unit?",
      body: "Sebelum kendaraan dimuat, petugas kami dan pengirim akan bersama-sama memeriksa kondisi fisik kendaraan meliputi: kondisi bodi (goresan, baret, penyok), kaca, lampu, velg, interior, jarak tempuh (odometer), dan sisa bahan bakar. Semua detail dicatat dalam formulir Berita Acara Serah Terima (BAST) dan difoto bersama sebagai bukti otentik.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      kind: "faq",
      slug: "mekanisme-pembayaran-ongkir",
      title: "Bagaimana mekanisme pembayaran biaya pengiriman?",
      body: "Pembayaran dilakukan secara aman melalui transfer ke rekening bank resmi perusahaan Kirimmobil.com (bukan rekening pribadi). Pembayaran dapat dilakukan dengan uang muka (DP) saat penyerahan unit di pool dan pelunasan saat manifes kapal terbit.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      kind: "faq",
      slug: "estimasi-waktu-perjalanan",
      title: "Berapa lama estimasi waktu pengiriman kendaraan (lead time)?",
      body: "Estimasi waktu perjalanan bergantung pada jarak dan jadwal kapal operasional:\n• Jakarta ke Manokwari: ±7 - 12 hari\n• Surabaya ke Manokwari: ±6 - 9 hari\n• Makassar ke Manokwari: ±5 - 7 hari\n• Jakarta ke Balikpapan: ±2 - 3 hari\n\nJadwal pelayaran kapal dapat dipantau langsung pada menu Jadwal di situs ini.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Testimonials
    {
      id: randomUUID(),
      kind: "testimonial",
      slug: "testimoni-hendra-wijaya",
      title: "Bpk. Hendra Wijaya — Jakarta ke Manokwari (Toyota Fortuner)",
      body: "Pengalaman pertama mengirimkan Fortuner ke Manokwari lewat Kirimmobil sangat memuaskan. Petugas di Tanjung Priok teliti mencatat kondisi mobil saat serah terima. Setiap progres pergerakan kapal selalu diinfokan melalui WhatsApp. Mobil tiba di Manokwari tepat waktu dan dalam kondisi sempurna tanpa ada cacat.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      kind: "testimonial",
      slug: "testimoni-ratna-paramita",
      title: "Ibu Ratna Paramita — Surabaya ke Manokwari (Honda CR-V)",
      body: "Pelayanan sangat rapi dan profesional. Tarif yang diberikan transparan dari awal tanpa ada biaya siluman di pelabuhan tujuan. Berita acara serah terima sangat jelas dan foto sebelum muat dikirimkan lengkap. Sangat saya rekomendasikan untuk pengiriman ke wilayah Papua Barat.",
      status: "published",
      publicationConsent: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  settings: [
    {
      id: 1,
      companyName: "Kirimmobil.com",
      whatsappNumber: "081234567890",
      officeAddress: "Jl. Pelabuhan Tanjung Priok No. 12, Jakarta Utara, DKI Jakarta 14310",
      officeHours: "Senin - Sabtu: 08.00 - 18.00 WIB",
      mapUrl: "https://maps.google.com/?q=Tanjung+Priok+Jakarta",
      instagramUrl: "https://instagram.com/kirimmobil",
      updatedAt: new Date(),
    },
  ],
  auditLog: [
    {
      id: randomUUID(),
      actorUserId: "system",
      actorEmail: "admin@kirimmobil.com",
      entityType: "system",
      entityId: "init",
      action: "initialized",
      summary: "Data master awal Kirimmobil.com berhasil dimuat",
      createdAt: new Date(),
    },
  ],
};

// Create a stateful in-memory store
const store: InMemData = {
  rates: [...initialData.rates],
  schedules: [...initialData.schedules],
  deliveries: [...initialData.deliveries],
  content: [...initialData.content],
  settings: [...initialData.settings],
  auditLog: [...initialData.auditLog],
};

function getTableStore(tableName: string): any[] {
  if (tableName.includes("rates")) return store.rates;
  if (tableName.includes("schedules")) return store.schedules;
  if (tableName.includes("deliveries")) return store.deliveries;
  if (tableName.includes("content")) return store.content;
  if (tableName.includes("settings")) return store.settings;
  if (tableName.includes("audit")) return store.auditLog;
  return store.rates;
}

function resolveTableName(table: any): string {
  if (typeof table === "string") return table;
  if (table && table._ && table._.name) return table._.name;
  if (table && typeof table === "object") {
    // Check property names in table
    for (const key of Object.keys(table)) {
      if (key === "vehicleCategory" || key === "price") return "kirimmobil_rates";
      if (key === "closingDate" || key === "verifiedSlots") return "kirimmobil_schedules";
      if (key === "platesRedacted" || key === "narrative") return "kirimmobil_deliveries";
      if (key === "kind" && key in table) return "kirimmobil_content";
      if (key === "whatsappNumber") return "kirimmobil_site_settings";
      if (key === "actorUserId") return "kirimmobil_audit_log";
    }
  }
  return "kirimmobil_rates";
}

// Memory query executor
class MemoryQueryBuilder {
  private tableName = "";
  private isCount = false;
  private whereFilters: Array<(row: any) => boolean> = [];
  private limitCount: number | null = null;
  private isOrderByDesc = false;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private insertData: any = null;
  private updateData: any = null;

  constructor(action: "select" | "insert" | "update" | "delete", selectFields?: any) {
    this.action = action;
    if (selectFields && typeof selectFields === "object" && selectFields.value) {
      this.isCount = true;
    }
  }

  from(table: any) {
    this.tableName = resolveTableName(table);
    return this;
  }

  values(data: any) {
    this.insertData = data;
    return this;
  }

  set(data: any) {
    this.updateData = data;
    return this;
  }

  where(condition?: any) {
    if (!condition) return this;
    // Inspect Drizzle conditions
    this.parseCondition(condition);
    return this;
  }

  private parseCondition(cond: any) {
    if (!cond) return;

    if (cond.queryChunks && Array.isArray(cond.queryChunks)) {
      const chunks = cond.queryChunks;
      // Check if there are nested SQL expressions (e.g. from and() / or())
      const subSqls = chunks.filter((c: any) => c && Array.isArray(c.queryChunks));
      if (subSqls.length > 0) {
        for (const sub of subSqls) {
          this.parseCondition(sub);
        }
        return;
      }

      // Atomic expression: inspect chunks
      let colName: string | null = null;
      let op = "";
      let paramVal: any = undefined;
      let hasParam = false;

      for (const c of chunks) {
        if (!c) continue;
        if (typeof c === "string") {
          op += " " + c;
        } else if (c.value !== undefined && typeof c.value === "string" && !c.name && !c.table && !c._) {
          op += " " + c.value;
        } else if (c.name && typeof c.name === "string") {
          colName = c.name;
        } else if (c.value !== undefined) {
          paramVal = c.value;
          hasParam = true;
        }
      }

      const cleanOp = op.trim().toLowerCase();
      if (colName) {
        if (cleanOp.includes("is null")) {
          const col = colName;
          this.whereFilters.push((row) => row[col] === null || row[col] === undefined);
          return;
        }
        if (cleanOp.includes("is not null")) {
          const col = colName;
          this.whereFilters.push((row) => row[col] !== null && row[col] !== undefined);
          return;
        }
        if (cleanOp.includes("=") && hasParam) {
          const col = colName;
          const val = paramVal;
          this.whereFilters.push((row) => row[col] == val);
          return;
        }
        if (cleanOp.includes(">=") && hasParam) {
          const col = colName;
          const val = paramVal;
          this.whereFilters.push((row) => row[col] >= val);
          return;
        }
        if (cleanOp.includes("<=") && hasParam) {
          const col = colName;
          const val = paramVal;
          this.whereFilters.push((row) => row[col] <= val);
          return;
        }
      }
      return;
    }

    // Direct object fallback
    if (cond.operator === "eq" || cond.name === "eq") {
      const colName = cond.left?.name || cond.left?._?.name;
      const val = cond.right?.value !== undefined ? cond.right.value : cond.right;
      if (colName && val !== undefined) {
        this.whereFilters.push((row) => row[colName] == val);
      }
    } else if (cond.operator === "isNull" || cond.name === "isNull") {
      const colName = cond.value?.name || cond.left?.name || cond.name;
      if (colName) {
        this.whereFilters.push((row) => row[colName] === null || row[colName] === undefined);
      }
    }
  }

  orderBy(_order?: any) {
    this.isOrderByDesc = true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  returning() {
    return this;
  }

  onConflictDoUpdate(config: { target: any; set: any }) {
    if (config && config.set) {
      this.updateData = config.set;
    }
    return this;
  }

  private execute(): any {
    const list = getTableStore(this.tableName);

    if (this.action === "insert") {
      const targetId = this.insertData.id !== undefined ? this.insertData.id : null;
      let existingIndex = -1;
      if (targetId !== null) {
        existingIndex = list.findIndex((r: any) => r.id === targetId);
      }
      if (existingIndex >= 0) {
        list[existingIndex] = {
          ...list[existingIndex],
          ...this.insertData,
          ...(this.updateData || {}),
          updatedAt: new Date(),
        };
        return [clone(list[existingIndex])];
      }

      const newRow = {
        id: this.insertData.id || randomUUID(),
        ...this.insertData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (this.tableName.includes("deliveries") && !newRow.mediaPaths) {
        newRow.mediaPaths = [];
      }
      list.push(newRow);
      return [clone(newRow)];
    }

    if (this.action === "update") {
      let updatedRows: any[] = [];
      for (let i = 0; i < list.length; i++) {
        let match = true;
        for (const f of this.whereFilters) {
          if (!f(list[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          list[i] = {
            ...list[i],
            ...this.updateData,
            updatedAt: new Date(),
          };
          updatedRows.push(clone(list[i]));
        }
      }
      return updatedRows;
    }

    if (this.action === "delete") {
      let deletedRows: any[] = [];
      for (let i = list.length - 1; i >= 0; i--) {
        let match = true;
        for (const f of this.whereFilters) {
          if (!f(list[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          deletedRows.push(clone(list[i]));
          list.splice(i, 1);
        }
      }
      return deletedRows;
    }

    // SELECT
    let result = list.filter((row) => {
      // Archived filter: if not archived
      if (row.archivedAt) return false;
      for (const filter of this.whereFilters) {
        if (!filter(row)) return false;
      }
      return true;
    });

    if (this.isCount) {
      return [{ value: result.length }];
    }

    if (this.isOrderByDesc) {
      result.sort((a, b) => {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    return clone(result);
  }

  // Support await / Promise
  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    try {
      resolve(this.execute());
    } catch (e) {
      if (reject) reject(e);
      else resolve([]);
    }
  }

  catch(reject: (err: any) => void) {
    try {
      return Promise.resolve(this.execute());
    } catch (e) {
      if (reject) reject(e);
      return Promise.reject(e);
    }
  }
}

function createDrizzleMemoryProxy(): any {
  return {
    select: (fields?: any) => new MemoryQueryBuilder("select", fields),
    insert: (table: any) => new MemoryQueryBuilder("insert").from(table),
    update: (table: any) => new MemoryQueryBuilder("update").from(table),
    delete: (table: any) => new MemoryQueryBuilder("delete").from(table),
  };
}

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn("[AI Studio] Error initializing PostgreSQL connection, falling back to in-memory store:", err);
  }
}

if (!db) {
  console.log("[AI Studio] DATABASE_URL not set — Kirimmobil in-memory store active with verified master data");
  pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    end: async () => {},
  };
  db = createDrizzleMemoryProxy();
}

export { pool, db };
export * from "./schema";
