import { createContext, type FormEvent, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleAlert, Clock3, FileCheck2, FileText, Gauge, HelpCircle, Image,
  Instagram, MapPin, Menu, PackageCheck, Pencil, Plus, Route as RouteIcon, ShieldCheck,
  Ship, Truck, X,
} from 'lucide-react';
import {
  Link, Redirect, Route, Switch, useLocation, Router as WouterRouter,
} from 'wouter';
import {
  getGetAdminOverviewQueryKey, getGetAdminSessionQueryKey, getGetAdminSettingsQueryKey,
  getGetPublicContactQueryKey, getListAdminContentQueryKey, getListAdminDeliveriesQueryKey,
  getListAdminRatesQueryKey, getListAdminSchedulesQueryKey, getListAuditLogQueryKey,
  getListPublicContentQueryKey, getListPublicDeliveriesQueryKey, getListPublicRatesQueryKey,
  getListPublicSchedulesQueryKey, getGetRateQuoteQueryKey,
  useCreateContent, useCreateDelivery, useCreateRate, useCreateSchedule, useDeleteContent,
  useDeleteDelivery, useDeleteRate, useDeleteSchedule, useGetAdminOverview, useGetAdminSession,
  useGetAdminSettings, useGetPublicContact, useGetRateQuote, useListAdminContent,
  useListAdminDeliveries, useListAdminRates, useListAdminSchedules, useListAuditLog,
  useListPublicContent, useListPublicDeliveries, useListPublicRates, useListPublicSchedules,
  useLoginAdmin, useLogoutAdmin, useUpdateAdminSettings, useUpdateContent,
  useUpdateDelivery, useUpdateRate, useUpdateSchedule,
} from '@workspace/api-client-react';
import type {
  ContentEntry, ContentInput, Delivery, DeliveryInput, Rate, RateInput, Schedule, ScheduleInput,
  AdminSession, SiteSettings,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const logoPath = `${basePath}/assets/aistudio/logo.png`;

const mainNav = [
  ['/about', 'Tentang Kami'], ['/services', 'Layanan'], ['/rates', 'Tarif'],
  ['/schedules', 'Jadwal'], ['/documentation', 'Dokumentasi'],
];
const fmt = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
const dateFmt = (v?: string | null) => v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(v)) : 'Belum tersedia';
const dateTimeFmt = (v?: string | null) => v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : 'Belum tersedia';
const human = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
function whatsappUrl(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  const internationalNumber = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return internationalNumber ? `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}` : undefined;
}
function storedMediaUrl(path: string) {
  if (path.startsWith('/') && !path.startsWith('/objects/')) {
    return `${basePath}${path}`;
  }
  return `${basePath}/api/storage/objects/${path.replace(/^\/objects\//, '')}`;
}

const seoPages: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Kirim Mobil - Pengiriman Mobil Antarkota & Antarpulau | Kirimmobil',
    description: 'Kirim Mobil - Ekspedisi pengiriman mobil antarkota & antarpulau di Indonesia via kapal RORO, kontainer, car carrier, dan towing car. Cek estimasi tarif dan jadwal resmi.',
  },
  '/about': {
    title: 'Tentang Kirim Mobil | Profil & Legalitas Kirimmobil.com',
    description: 'Kenali Kirim Mobil (Kirimmobil.com) - Penyedia jasa ekspedisi pengiriman kendaraan antarpulau dengan komitmen transparansi, aman, dan bergaransi asuransi.',
  },
  '/services': {
    title: 'Layanan Kirim Mobil - RORO, Kontainer & Towing | Kirimmobil.com',
    description: 'Pilihan metode kirim mobil: Kapal RORO, Kontainer FCL, Car Carrier, dan Towing Car. Layanan door-to-door dan port-to-port ke seluruh Indonesia.',
  },
  '/rates': {
    title: 'Cek Tarif Kirim Mobil Antarpulau & Antarkota | Kirimmobil.com',
    description: 'Cek estimasi biaya dan tarif kirim mobil berdasarkan rute asal, tujuan, jenis kendaraan, dan metode pengiriman yang terverifikasi.',
  },
  '/schedules': {
    title: 'Jadwal Kirim Mobil & Pelayaran Kapal Pelni / RORO | Kirimmobil.com',
    description: 'Tinjau jadwal keberangkatan kapal pengiriman mobil, closing date, ETD, ETA, dan kuota slot pengiriman terupdate.',
  },
  '/documentation': {
    title: 'Dokumentasi Kirim Mobil Terpercaya & Berita Acara | Kirimmobil.com',
    description: 'Dokumentasi asli perjalanan kirim mobil dari serah terima unit, pemuatan kapal laut, hingga serah terima di kota tujuan dengan aman.',
  },
  '/testimonials': {
    title: 'Testimoni & Pengalaman Kirim Mobil Pelanggan | Kirimmobil.com',
    description: 'Ulasan asli dari pemilik mobil yang telah mempercayakan pengiriman kendaraan mereka ke Kirim Mobil (Kirimmobil.com).',
  },
  '/faq': {
    title: 'FAQ Syarat & Ketentuan Kirim Mobil | Kirimmobil.com',
    description: 'Panduan lengkap dan pertanyaan umum seputar dokumen wajib (STNK, BPKB), asuransi all-risk, dan proses serah terima kirim mobil.',
  },
  '/contact': {
    title: 'Kontak Resmi & Alamat Kantor Kirim Mobil | Kirimmobil.com',
    description: 'Hubungi WhatsApp resmi, alamat kantor, dan customer support Kirim Mobil (Kirimmobil.com) untuk konsultasi pengiriman kendaraan.',
  },
};

const pageDefinitions = [
  { path: '/', label: 'Beranda', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/'].description },
    { key: 'heroEyebrow', label: 'Label hero', value: 'LOGISTIK KENDARAAN · INDONESIA' },
    { key: 'heroTitle', label: 'Judul hero', value: 'Sebelum mobil berangkat,\nsemua harus jelas.' },
    { key: 'heroLead', label: 'Deskripsi hero', value: 'Temukan rute, tarif, dan jadwal yang telah dikonfirmasi. Jika informasi belum tersedia, kami tandai—bukan menebak.' },
    { key: 'heroPrimaryAction', label: 'Tombol utama hero', value: 'Cek tarif terbit' },
    { key: 'heroSecondaryAction', label: 'Tombol sekunder hero', value: 'Lihat jadwal' },
    { key: 'heroNote', label: 'Catatan hero', value: 'Estimasi hanya tersedia untuk rute yang sudah memiliki tarif terpublikasi.' },
    { key: 'processEyebrow', label: 'Label proses', value: 'Dibuat untuk perjalanan kendaraan' },
    { key: 'processTitle', label: 'Judul proses', value: 'Perjelas proses.\nJaga kepercayaan.' },
    { key: 'processBody', label: 'Deskripsi proses', value: 'Sebelum mengirim, pahami pilihan metode, rincian tarif, jadwal keberangkatan, serta dokumen yang perlu disiapkan. Setiap informasi di situs ini mengikuti data yang dikonfirmasi oleh tim.' },
    { key: 'step1Title', label: 'Langkah 1', value: 'Pilih rute' },
    { key: 'step1Body', label: 'Deskripsi langkah 1', value: 'Masukkan kota asal, tujuan, kategori kendaraan, dan metode pengiriman.' },
    { key: 'step2Title', label: 'Langkah 2', value: 'Tinjau informasi' },
    { key: 'step2Body', label: 'Deskripsi langkah 2', value: 'Bandingkan rincian biaya, hal yang termasuk, dan ketentuan yang belum termasuk.' },
    { key: 'step3Title', label: 'Langkah 3', value: 'Siapkan dokumen' },
    { key: 'step3Body', label: 'Deskripsi langkah 3', value: 'Baca panduan dokumen sebelum mengatur penyerahan kendaraan.' },
    { key: 'transparencyEyebrow', label: 'Label transparansi', value: 'Transparansi' },
    { key: 'transparencyTitle', label: 'Judul transparansi', value: 'Yang kami tampilkan harus bisa dipertanggungjawabkan.' },
    { key: 'transparencyBody', label: 'Deskripsi transparansi', value: 'Tarif dan jadwal ditampilkan hanya dari data publik yang tersedia. Dokumentasi pengiriman membutuhkan persetujuan publikasi dan perlindungan identitas kendaraan.' },
    { key: 'schedulesEyebrow', label: 'Label jadwal di beranda', value: 'Jadwal terbit' },
    { key: 'schedulesTitle', label: 'Judul jadwal di beranda', value: 'Keberangkatan mendatang' },
    { key: 'schedulesAction', label: 'Tombol jadwal di beranda', value: 'Semua jadwal' },
    { key: 'schedulesEmptyTitle', label: 'Judul jika jadwal kosong di beranda', value: 'Belum ada jadwal terbit' },
    { key: 'schedulesEmptyBody', label: 'Keterangan jika jadwal kosong di beranda', value: 'Jadwal akan muncul di sini setelah rincian perjalanan dikonfirmasi.' },
    { key: 'galleryEyebrow', label: 'Label dokumentasi di beranda', value: 'Dokumentasi berizin' },
    { key: 'galleryTitle', label: 'Judul dokumentasi di beranda', value: 'Perjalanan yang benar-benar tercatat.' },
    { key: 'galleryAction', label: 'Tombol dokumentasi di beranda', value: 'Lihat dokumentasi' },
    { key: 'galleryEmptyTitle', label: 'Judul jika dokumentasi kosong di beranda', value: 'Dokumentasi akan tampil setelah disetujui' },
    { key: 'galleryEmptyBody', label: 'Keterangan jika dokumentasi kosong di beranda', value: 'Galeri hanya menampilkan pengiriman asli yang sudah mendapat izin publikasi dan perlindungan identitas.' },
    { key: 'testimonialsEyebrow', label: 'Label testimoni di beranda', value: 'Cerita pelanggan' },
    { key: 'testimonialsTitle', label: 'Judul testimoni di beranda', value: 'Pengalaman yang dibagikan dengan izin.' },
    { key: 'testimonialsAction', label: 'Tombol testimoni di beranda', value: 'Semua cerita' },
    { key: 'testimonialsEmptyTitle', label: 'Judul jika testimoni kosong di beranda', value: 'Belum ada cerita pelanggan' },
    { key: 'testimonialsEmptyBody', label: 'Keterangan jika testimoni kosong di beranda', value: 'Testimoni akan ditampilkan setelah isi dan persetujuan publikasinya dikonfirmasi.' },
    { key: 'faqEyebrow', label: 'Label FAQ di beranda', value: 'Bantuan' },
    { key: 'faqTitle', label: 'Judul FAQ di beranda', value: 'Pertanyaan sebelum mengirim.' },
    { key: 'faqAction', label: 'Tombol FAQ di beranda', value: 'Semua FAQ' },
    { key: 'faqEmptyTitle', label: 'Judul jika FAQ kosong di beranda', value: 'FAQ belum diterbitkan' },
    { key: 'faqEmptyBody', label: 'Keterangan jika FAQ kosong di beranda', value: 'Jawaban resmi akan muncul setelah ditinjau dan diterbitkan oleh tim.' },
    { key: 'quoteEyebrow', label: 'Label estimasi di beranda', value: 'Mulai dari informasi rute' },
    { key: 'ctaTitle', label: 'Judul ajakan', value: 'Cek estimasi sebelum menghubungi tim.' },
    { key: 'ctaBody', label: 'Deskripsi ajakan', value: 'Nominal estimasi hanya tersedia jika rute telah memiliki tarif terpublikasi.' },
    { key: 'ctaAction', label: 'Tombol ajakan', value: 'Buka estimator tarif' },
  ] },
  { path: '/about', label: 'Tentang Kami', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/about'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/about'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Profil perusahaan' },
    { key: 'title', label: 'Judul halaman', value: 'Identitas yang jelas. Informasi yang terbuka.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Kirimmobil.com membantu pelanggan memahami layanan pengiriman kendaraan dan menyiapkan perjalanan ke berbagai tujuan di Indonesia.' },
    { key: 'sectionTitle', label: 'Judul bagian profil', value: 'Tentang Kirimmobil' },
    { key: 'sectionBody', label: 'Isi bagian profil', value: 'Kami membangun layanan informasi dan pengiriman kendaraan yang memudahkan pelanggan merencanakan rute, meninjau tarif, serta memahami proses dokumentasi sebelum kendaraan diberangkatkan.' },
    { key: 'sectionSecondBody', label: 'Isi bagian profil lanjutan', value: 'Komitmen kami adalah menyampaikan informasi sesuai data yang tersedia, bukan membuat klaim yang belum dapat diverifikasi.' },
  ] },
  { path: '/services', label: 'Layanan', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/services'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/services'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Layanan' },
    { key: 'title', label: 'Judul halaman', value: 'Pilihan pengiriman kendaraan, sesuai rute dan kebutuhan.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Rincian layanan operasional dapat berbeda menurut rute. Pastikan metode, jadwal, perlindungan, dan ketentuan tambahan telah dikonfirmasi sebelum pemesanan.' },
    { key: 'service1Title', label: 'Judul layanan 1', value: 'Pengiriman antarpulau' },
    { key: 'service1Body', label: 'Deskripsi layanan 1', value: 'Pengangkutan kendaraan lintas pulau mengikuti ketersediaan rute dan jadwal yang diterbitkan.' },
    { key: 'service2Title', label: 'Judul layanan 2', value: 'Pengiriman melalui darat' },
    { key: 'service2Body', label: 'Deskripsi layanan 2', value: 'Untuk rute yang tersedia, pilihan pengiriman darat bergantung pada kategori kendaraan dan konfirmasi operasional.' },
    { key: 'service3Title', label: 'Judul layanan 3', value: 'Informasi perlindungan' },
    { key: 'service3Body', label: 'Deskripsi layanan 3', value: 'Status asuransi dan batas perlindungan dicantumkan pada tarif yang berlaku, jika sudah dikonfirmasi.' },
    { key: 'service4Title', label: 'Judul layanan 4', value: 'Persiapan dokumen' },
    { key: 'service4Body', label: 'Deskripsi layanan 4', value: 'Panduan dokumen membantu pemilik kendaraan menyiapkan berkas sebelum serah terima.' },
    { key: 'notice', label: 'Catatan layanan', value: 'Tidak ada metode atau rute yang diasumsikan tersedia. Periksa tarif dan jadwal terbaru pada halaman terkait.' },
  ] },
  { path: '/rates', label: 'Tarif', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/rates'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/rates'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Tarif pengiriman' },
    { key: 'title', label: 'Judul halaman', value: 'Mulai dengan estimasi rute.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Masukkan kota asal dan tujuan untuk melihat estimasi dari tarif terpublikasi. Estimasi bukan konfirmasi pemesanan.' },
    { key: 'formTitle', label: 'Judul form estimasi', value: 'Estimasi biaya' },
    { key: 'formDescription', label: 'Deskripsi form estimasi', value: 'Pilih detail kendaraan dan metode jika sudah diketahui.' },
  ] },
  { path: '/schedules', label: 'Jadwal', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/schedules'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/schedules'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Jadwal keberangkatan' },
    { key: 'title', label: 'Judul halaman', value: 'Perjalanan yang direncanakan, ditampilkan apa adanya.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Cek jadwal, status, tanggal keberangkatan, dan estimasi tiba. Informasi slot hanya dicantumkan jika telah terverifikasi.' },
    { key: 'emptyTitle', label: 'Judul saat jadwal kosong', value: 'Belum ada jadwal yang dipublikasikan' },
    { key: 'emptyBody', label: 'Keterangan saat jadwal kosong', value: 'Jadwal baru akan muncul setelah operator, rute, serta tanggal keberangkatan dan kedatangan dikonfirmasi.' },
  ] },
  { path: '/documentation', label: 'Dokumentasi', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/documentation'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/documentation'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Dokumentasi pengiriman' },
    { key: 'title', label: 'Judul halaman', value: 'Catatan perjalanan, dengan persetujuan.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Dokumentasi publik hanya memuat cerita yang telah mendapat persetujuan publikasi dan memenuhi perlindungan identitas kendaraan.' },
    { key: 'emptyTitle', label: 'Judul saat dokumentasi kosong', value: 'Belum ada dokumentasi yang disetujui' },
    { key: 'emptyBody', label: 'Keterangan saat dokumentasi kosong', value: 'Dokumentasi akan tampil setelah mendapat persetujuan publikasi dan perlindungan identitas.' },
  ] },
  { path: '/testimonials', label: 'Testimoni', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/testimonials'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/testimonials'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Cerita pelanggan' },
    { key: 'title', label: 'Judul halaman', value: 'Cerita hanya ditampilkan dengan izin.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Pendapat pelanggan bukan materi promosi tanpa persetujuan. Halaman ini memuat testimonial yang telah mendapat persetujuan publikasi.' },
    { key: 'emptyTitle', label: 'Judul saat testimoni kosong', value: 'Belum ada cerita yang disetujui' },
    { key: 'emptyBody', label: 'Keterangan saat testimoni kosong', value: 'Testimonial akan muncul setelah isi dan persetujuan publikasi dikonfirmasi.' },
  ] },
  { path: '/faq', label: 'FAQ', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/faq'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/faq'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Bantuan' },
    { key: 'title', label: 'Judul halaman', value: 'Pertanyaan sebelum mengirim kendaraan.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Jawaban operasional ditampilkan dari informasi resmi yang telah diterbitkan.' },
    { key: 'emptyTitle', label: 'Judul saat FAQ kosong', value: 'FAQ belum diterbitkan' },
    { key: 'emptyBody', label: 'Keterangan saat FAQ kosong', value: 'Informasi jawaban resmi akan ditambahkan setelah ditinjau tim Kirimmobil.' },
  ] },
  { path: '/contact', label: 'Kontak', fields: [
    { key: 'metaTitle', label: 'Judul SEO', value: seoPages['/contact'].title },
    { key: 'metaDescription', label: 'Deskripsi SEO', value: seoPages['/contact'].description },
    { key: 'eyebrow', label: 'Label halaman', value: 'Kontak' },
    { key: 'title', label: 'Judul halaman', value: 'Hubungi Kirimmobil melalui kanal resmi.' },
    { key: 'lead', label: 'Deskripsi halaman', value: 'Kami hanya menampilkan kontak yang telah dikonfigurasi dan dikonfirmasi. Tidak ada nomor atau alamat yang diasumsikan.' },
    { key: 'channelsTitle', label: 'Judul bagian kanal', value: 'Kanal komunikasi' },
    { key: 'addressTitle', label: 'Judul bagian alamat', value: 'Alamat kantor' },
  ] },
] as const;

type PageCopyFields = Record<string, string>;
type PageCopyState = {
  published: Record<string, PageCopyFields>;
  preview: { path: string; fields: PageCopyFields } | null;
};
const PageCopyContext = createContext<PageCopyState>({ published: {}, preview: null });
function defaultPageCopy(pagePath: string): PageCopyFields {
  const definition = pageDefinitions.find((page) => page.path === pagePath);
  return definition ? Object.fromEntries(definition.fields.map((field) => [field.key, field.value])) : {};
}
function parsePageCopy(body: string): PageCopyFields {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}
function usePageCopy(pagePath: string): PageCopyFields {
  const context = useContext(PageCopyContext);
  return {
    ...defaultPageCopy(pagePath),
    ...context.published[pagePath],
    ...(context.preview?.path === pagePath ? context.preview.fields : {}),
  };
}
function PageCopyProvider({ children }: { children: ReactNode }) {
  const pages = useListPublicContent({ kind: 'page' });
  const [preview, setPreview] = useState<PageCopyState['preview']>(null);
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cms-preview')) return;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (!event.data || typeof event.data !== 'object') return;
      const message = event.data as { type?: unknown; path?: unknown; fields?: unknown };
      if (message.type !== 'kirimmobil:cms-preview' || typeof message.path !== 'string' || !pageDefinitions.some((page) => page.path === message.path)) return;
      if (!message.fields || typeof message.fields !== 'object' || Array.isArray(message.fields)) return;
      const page = pageDefinitions.find((definition) => definition.path === message.path);
      if (!page) return;
      const allowedKeys = new Set<string>(page.fields.map((field) => field.key));
      const fields = Object.fromEntries(Object.entries(message.fields).filter(([key, value]) => allowedKeys.has(key) && typeof value === 'string')) as PageCopyFields;
      setPreview({ path: message.path, fields });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const published = Object.fromEntries((pages.data ?? []).map((entry) => [entry.slug, parsePageCopy(entry.body)]));
  return <PageCopyContext.Provider value={{ published, preview }}>{children}</PageCopyContext.Provider>;
}

function SeoMetadata() {
  const [location] = useLocation();
  const path = location.split(/[?#]/, 1)[0] || '/';
  const copy = usePageCopy(path);
  useEffect(() => {
    const page = seoPages[path];
    const title = copy.metaTitle || page?.title || 'Area staf | Kirim Mobil';
    const description = copy.metaDescription || page?.description || 'Area staf Kirim Mobil.';
    document.title = title;

    const updateMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    updateMeta('meta[name="description"]', 'name', 'description');
    updateMeta('meta[name="description"]', 'content', description);
    updateMeta('meta[name="robots"]', 'name', 'robots');
    updateMeta('meta[name="robots"]', 'content', page ? 'index, follow' : 'noindex, nofollow');
    updateMeta('meta[property="og:title"]', 'property', 'og:title');
    updateMeta('meta[property="og:title"]', 'content', title);
    updateMeta('meta[property="og:description"]', 'property', 'og:description');
    updateMeta('meta[property="og:description"]', 'content', description);
    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title');
    updateMeta('meta[name="twitter:title"]', 'content', title);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description');
    updateMeta('meta[name="twitter:description"]', 'content', description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://kirimmobil.net${path === '/' ? '' : path}`);
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    ogUrl?.setAttribute('content', `https://kirimmobil.net${path === '/' ? '' : path}`);
    const twitterUrl = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:url"]');
    twitterUrl?.setAttribute('content', `https://kirimmobil.net${path === '/' ? '' : path}`);
  }, [location, path, copy.metaTitle, copy.metaDescription]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="topbar">
    <div className="container-wide flex h-[76px] items-center justify-between gap-6">
      <Link href="/" className="shrink-0" aria-label="Kirim Mobil beranda"><img src={logoPath} alt="Kirim Mobil - Kirimmobil.com" className="h-auto w-[184px]" /></Link>
      <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigasi utama">
        {mainNav.map(([to, label]) => <Link key={to} href={to} className="text-[13px] font-semibold text-slate-700 transition hover:text-[#102C63]">{label}</Link>)}
        <Link href="/faq" className="text-[13px] font-semibold text-slate-700 hover:text-[#102C63]">FAQ</Link>
      </nav>
      <Link href="/rates" className="btn-main hidden min-h-[42px] !px-4 !py-2 text-sm lg:inline-flex">Cek estimasi <ArrowRight size={16} /></Link>
      <button className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 text-[#102C63] lg:hidden" aria-label="Buka menu" data-testid="button-mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav className="container-wide grid gap-1 border-t border-slate-100 py-3 lg:hidden">{[...mainNav, ['/testimonials', 'Cerita pelanggan'], ['/contact', 'Kontak'], ['/rates', 'Cek estimasi']].map(([to, label]) => <Link key={to} href={to} onClick={() => setOpen(false)} className="rounded px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">{label}</Link>)}</nav>}
  </header>;
}
function Footer() {
  return <footer className="mt-20 bg-[#102C63] text-white">
    <div className="container-wide grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
      <div><img src={logoPath} alt="Kirim Mobil - Kirimmobil.com" className="mb-4 w-[205px] rounded bg-white p-1" /><p className="max-w-sm text-sm leading-6 text-blue-100">Kirim Mobil (Kirimmobil.com) — Jasa pengiriman mobil dan kendaraan antarkota &amp; antarpulau di Indonesia terpercaya, aman, dan bergaransi asuransi.</p></div>
      <div><p className="eyebrow mb-4 text-blue-200">Jelajahi</p><div className="grid grid-cols-2 gap-3 text-sm text-blue-50">{[['/about','Tentang'],['/services','Layanan'],['/rates','Tarif'],['/schedules','Jadwal'],['/documentation','Dokumentasi'],['/faq','FAQ']].map(([to,label])=><Link key={to} href={to} className="hover:text-white">{label}</Link>)}</div></div>
      <div><p className="eyebrow mb-4 text-blue-200">Informasi</p><div className="grid gap-3 text-sm text-blue-50"><Link href="/contact">Kontak resmi</Link><Link href="/testimonials">Cerita pelanggan</Link><Link href="/admin/login">Area staf</Link></div><p className="mt-6 text-xs text-blue-200">© {new Date().getFullYear()} Kirim Mobil (Kirimmobil.com)</p></div>
    </div>
  </footer>;
}
function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="site-shell"><Header /><main>{children}</main><Footer /></div>;
}
function PageIntro({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return <div className="border-b border-slate-200 bg-white py-14 md:py-16"><div className="container-wide max-w-5xl"><p className="eyebrow section-label mb-4">{eyebrow}</p><h1 className="max-w-4xl text-4xl font-extrabold leading-[1.07] text-[#102C63] md:text-6xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{lead}</p></div></div>;
}
function LoadError({ retry, message = 'Informasi belum dapat dimuat.' }: { retry: () => void; message?: string }) {
  return <div className="panel flex flex-col items-start gap-3 p-6" role="alert"><CircleAlert className="text-[#E60012]" /><p className="text-sm text-slate-700">{message}</p><button className="btn-ghost" onClick={retry}>Coba lagi</button></div>;
}
function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#102C63]"><FileText size={21} /></div><h3 className="text-lg font-bold text-[#102C63]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{children}</p></div>;
}
function Home() {
  const copy = usePageCopy('/');
  const rates = useListPublicRates();
  const schedules = useListPublicSchedules();
  const deliveries = useListPublicDeliveries();
  const testimonials = useListPublicContent({ kind: 'testimonial' });
  const faqs = useListPublicContent({ kind: 'faq' });
  return <PublicLayout>
    <section className="hero-logistics hero-editorial min-h-[560px] text-white md:min-h-[625px]">
      <div className="container-wide relative z-[1] flex min-h-[560px] items-center py-16 md:min-h-[625px]">
        <div className="max-w-[690px] page-enter"><p className="eyebrow mb-6 inline-flex items-center gap-3 text-blue-100"><span className="h-[2px] w-8 bg-[#E60012]" /> {copy.heroEyebrow}</p>
          <h1 className="max-w-3xl whitespace-pre-line text-[42px] font-extrabold leading-[1.04] tracking-[-.045em] md:text-[68px]">{copy.heroTitle.split('\n').map((line,index)=><span key={`${line}-${index}`} className={index?'text-blue-200':''}>{index>0&&<br/>}{line}</span>)}</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-blue-50 md:text-lg">{copy.heroLead}</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/rates" className="btn-main btn-red">{copy.heroPrimaryAction} <ArrowRight size={17} /></Link><Link href="/schedules" className="inline-flex min-h-12 items-center gap-2 border border-white/55 px-5 text-sm font-bold text-white hover:bg-white/10">{copy.heroSecondaryAction} <CalendarDays size={16} /></Link></div>
          <p className="mt-5 text-xs text-blue-100">{copy.heroNote}</p>
        </div>
        <div className="hero-photo-note absolute bottom-6 right-0 hidden items-center gap-3 px-4 py-3 text-xs text-blue-100 md:flex"><Truck size={18} /><span>Foto ilustrasi, bukan dokumentasi pengiriman</span></div>
      </div>
    </section>
    <section className="home-stats container-wide -mt-8 relative z-[2] grid gap-0 md:grid-cols-3">
      {[{icon:<RouteIcon/>,label:'Tarif terpublikasi',value:rates.data?.length ?? null,link:'/rates',suffix:'rute tersedia'},{icon:<CalendarDays/>,label:'Jadwal aktif',value:schedules.data?.length ?? null,link:'/schedules',suffix:'jadwal ditampilkan'},{icon:<PackageCheck/>,label:'Dokumentasi',value:deliveries.data?.length ?? null,link:'/documentation',suffix:'kiriman terpublikasi'}].map((item)=><Link href={item.link} key={item.label} className="home-stat-card flex min-h-[120px] items-center gap-4 px-5 py-5"><span className="home-stat-icon flex h-11 w-11 shrink-0 items-center justify-center text-[#102C63]">{item.icon}</span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[.09em] text-slate-500">{item.label}</span><span className="mt-1 block text-xl font-extrabold text-[#102C63]">{item.value === null ? '—' : item.value}<small className="ml-2 text-xs font-medium text-slate-500">{item.suffix}</small></span></span><ArrowUpRight size={17} className="ml-auto text-slate-400" /></Link>)}
    </section>
    <section className="home-process container-wide grid gap-12 py-24 md:grid-cols-[.9fr_1.1fr] md:items-center">
      <div><p className="eyebrow section-label mb-4">{copy.processEyebrow}</p><h2 className="whitespace-pre-line text-3xl font-extrabold leading-tight text-[#102C63] md:text-5xl">{copy.processTitle}</h2><p className="mt-5 max-w-lg leading-7 text-slate-600">{copy.processBody}</p><Link href="/services" className="mt-7 inline-flex items-center gap-2 font-bold text-[#102C63]">Kenali layanan <ArrowRight size={16} /></Link></div>
      <div className="grid gap-3">
        {([['01',copy.step1Title,copy.step1Body],['02',copy.step2Title,copy.step2Body],['03',copy.step3Title,copy.step3Body]]).map(([n,t,d])=><div key={n} className="flex gap-5 border-b border-slate-200 py-5"><span className="font-mono text-sm font-bold text-[#E60012]">{n}</span><div><h3 className="font-bold text-[#102C63]">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{d}</p></div></div>)}
      </div>
    </section>
    <section className="bg-white py-20"><div className="container-wide grid gap-8 md:grid-cols-[1fr_1fr] md:items-center"><div><p className="eyebrow section-label mb-3">{copy.transparencyEyebrow}</p><h2 className="text-3xl font-extrabold text-[#102C63] md:text-4xl">{copy.transparencyTitle}</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">{copy.transparencyBody}</p></div><div className="flex flex-wrap gap-3">{[['Tarif terverifikasi', '/rates', <BadgeCheck/>],['Jadwal operasional','/schedules',<Clock3/>],['Dokumentasi berizin','/documentation',<ShieldCheck/>]].map(([label,to,icon])=><Link href={String(to)} key={String(label)} className="flex min-h-[66px] flex-1 items-center gap-3 border border-slate-200 px-4 text-sm font-bold text-[#102C63]">{icon}{label}<ChevronRight size={15} className="ml-auto" /></Link>)}</div></div></section>
    <section className="container-wide py-20"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow section-label mb-3">{copy.schedulesEyebrow}</p><h2 className="text-3xl font-extrabold text-[#102C63]">{copy.schedulesTitle}</h2></div><Link href="/schedules" className="inline-flex items-center gap-2 text-sm font-bold text-[#102C63]">{copy.schedulesAction} <ArrowRight size={16}/></Link></div><div className="mt-7">{schedules.isLoading?<SkeletonCards/>:schedules.isError?<LoadError retry={()=>void schedules.refetch()}/>:schedules.data?.length?<ScheduleCards schedules={schedules.data.slice(0,2)}/>:<EmptyState title={copy.schedulesEmptyTitle}>{copy.schedulesEmptyBody}</EmptyState>}</div></section>
    <section className="bg-white py-16">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow section-label mb-3">{copy.galleryEyebrow}</p><h2 className="text-3xl font-extrabold text-[#102C63]">{copy.galleryTitle}</h2></div>
          <Link href="/documentation" className="inline-flex items-center gap-2 text-sm font-bold text-[#102C63]">{copy.galleryAction} <ArrowRight size={16}/></Link>
        </div>
        <div className="mt-7">
          {deliveries.isLoading?<SkeletonCards/>:deliveries.isError?<LoadError retry={()=>void deliveries.refetch()}/>:deliveries.data?.length?<div className="grid gap-5 md:grid-cols-2">{deliveries.data.slice(0,2).map(d=><DeliveryCard key={d.id} d={d}/>)}</div>:<EmptyState title={copy.galleryEmptyTitle}>{copy.galleryEmptyBody}</EmptyState>}
        </div>
      </div>
    </section>
    <section className="container-wide grid gap-12 py-16 md:grid-cols-2">
      <div>
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow section-label mb-3">{copy.testimonialsEyebrow}</p><h2 className="text-2xl font-extrabold text-[#102C63]">{copy.testimonialsTitle}</h2></div><Link href="/testimonials" aria-label={copy.testimonialsAction} className="shrink-0 text-sm font-bold text-[#102C63]">{copy.testimonialsAction} <ArrowRight size={15} className="inline"/></Link></div>
        <div className="mt-5">{testimonials.isLoading?<SkeletonCards/>:testimonials.isError?<LoadError retry={()=>void testimonials.refetch()}/>:testimonials.data?.length?<div className="grid gap-3">{testimonials.data.slice(0,2).map(t=><article key={t.id} className="panel p-5"><p className="text-2xl font-serif text-[#E60012]">“</p><h3 className="font-bold text-[#102C63]">{t.title}</h3><p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{t.body}</p></article>)}</div>:<EmptyState title={copy.testimonialsEmptyTitle}>{copy.testimonialsEmptyBody}</EmptyState>}</div>
      </div>
      <div>
        <div className="flex items-end justify-between gap-4"><div><p className="eyebrow section-label mb-3">{copy.faqEyebrow}</p><h2 className="text-2xl font-extrabold text-[#102C63]">{copy.faqTitle}</h2></div><Link href="/faq" aria-label={copy.faqAction} className="shrink-0 text-sm font-bold text-[#102C63]">{copy.faqAction} <ArrowRight size={15} className="inline"/></Link></div>
        <div className="mt-5">{faqs.isLoading?<SkeletonCards/>:faqs.isError?<LoadError retry={()=>void faqs.refetch()}/>:faqs.data?.length?<div className="grid gap-3">{faqs.data.slice(0,3).map(f=><details key={f.id} className="panel group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#102C63]">{f.title}<ChevronDown size={18} className="shrink-0 transition group-open:rotate-180"/></summary><p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{f.body}</p></details>)}</div>:<EmptyState title={copy.faqEmptyTitle}>{copy.faqEmptyBody}</EmptyState>}</div>
      </div>
    </section>
    <section className="bg-[#eaf0f7] py-14"><div className="container-wide flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div><p className="eyebrow section-label mb-2">{copy.quoteEyebrow}</p><h2 className="text-2xl font-extrabold text-[#102C63]">{copy.ctaTitle}</h2><p className="mt-2 text-sm text-slate-600">{copy.ctaBody}</p></div><Link href="/rates" className="btn-main">{copy.ctaAction} <ArrowRight size={17}/></Link></div></section>
  </PublicLayout>;
}
function SkeletonCards() { return <div className="grid gap-4 md:grid-cols-2">{[1,2].map((x)=><div key={x} className="panel p-6"><div className="skeleton mb-4 h-4 w-28"/><div className="skeleton mb-3 h-6 w-3/4"/><div className="skeleton h-4 w-1/2"/></div>)}</div>; }
function ScheduleCards({ schedules }: { schedules: Schedule[] }) {
  return <div className="grid gap-4 md:grid-cols-2">{schedules.map(s=><article className="panel p-6" key={s.id}><div className="flex items-center justify-between gap-4"><span className="eyebrow text-slate-500">{s.operator}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#102C63]">{human(s.status)}</span></div><div className="route-line mt-5 grid gap-3 pl-6"><div className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-[#102C63] bg-white"/><p className="text-xs text-slate-500">Asal</p><p className="font-bold text-[#102C63]">{s.origin}</p></div><div className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-[#E60012]"/><p className="text-xs text-slate-500">Tujuan</p><p className="font-bold text-[#102C63]">{s.destination}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><span className="text-xs text-slate-500">Closing</span><p className="font-semibold">{dateFmt(s.closingDate)}</p></div><div><span className="text-xs text-slate-500">ETD</span><p className="font-semibold">{dateFmt(s.etd)}</p></div><div><span className="text-xs text-slate-500">ETA</span><p className="font-semibold">{dateFmt(s.eta)}</p></div>{s.verifiedSlots !== null && <div><span className="text-xs text-slate-500">Slot terverifikasi</span><p className="font-semibold">{s.verifiedSlots}</p></div>}</div><div className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">{s.source&&<p>Sumber: {s.source}</p>}<p>Diperbarui: {dateTimeFmt(s.updatedAt)}</p></div></article>)}</div>;
}
function AboutPage() {
  const copy = usePageCopy('/about');
  const contact=useGetPublicContact();
  return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/>
    <section className="container-wide grid gap-12 py-16 md:grid-cols-[1fr_.8fr]"><div><h2 className="text-2xl font-extrabold text-[#102C63]">{copy.sectionTitle}</h2><p className="mt-4 leading-7 text-slate-600">{copy.sectionBody}</p><p className="mt-4 leading-7 text-slate-600">{copy.sectionSecondBody}</p></div><div className="panel p-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded bg-[#eef2f8] text-[#102C63]"><ShieldCheck/></span><h3 className="text-lg font-bold text-[#102C63]">Status verifikasi</h3></div><p className="text-sm leading-6 text-slate-600">Informasi legal perusahaan, alamat kantor, dan kanal kontak resmi hanya ditampilkan jika telah dikonfirmasi.</p>{contact.isLoading?<div className="skeleton mt-5 h-14"/>:contact.isError?<div className="mt-5 text-sm text-slate-500">Status informasi resmi belum dapat dimuat. Silakan coba kembali.</div>:<div className="mt-5 grid gap-2">{[['Nama perusahaan',contact.data?.companyName || 'Belum dikonfirmasi'],['Alamat kantor',contact.data?.officeAddress || 'Belum dikonfirmasi']].map(([k,v])=><div className="flex justify-between gap-4 border-t border-slate-100 py-3 text-sm" key={k}><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-slate-700">{v}</span></div>)}</div>}</div></section>
    <section className="bg-white py-14"><div className="container-wide grid gap-6 md:grid-cols-3">{[['Terbuka','Rincian tarif, metode, dan pengecualian dijelaskan sebelum pengiriman.'],['Bertanggung jawab','Cerita pengiriman hanya dipublikasikan dengan persetujuan yang tercatat.'],['Terukur','Jadwal dan kuota ditampilkan berdasarkan data operasional terverifikasi.']].map(([h,p])=><div className="border-l-2 border-[#E60012] pl-5" key={h}><h3 className="font-bold text-[#102C63]">{h}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{p}</p></div>)}</div></section>
  </PublicLayout>;
}
function ServicesPage() {
  const copy = usePageCopy('/services');
  const services = [
    { icon: <Ship/>, title: copy.service1Title, text: copy.service1Body },
    { icon: <Truck/>, title: copy.service2Title, text: copy.service2Body },
    { icon: <ShieldCheck/>, title: copy.service3Title, text: copy.service3Body },
    { icon: <FileCheck2/>, title: copy.service4Title, text: copy.service4Body },
  ];
  return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/>
    <section className="container-wide py-14"><div className="grid gap-5 md:grid-cols-2">{services.map((x)=><article key={x.title} className="panel flex gap-5 p-6 md:p-8"><span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#eef2f8] text-[#102C63]">{x.icon}</span><div><h2 className="text-xl font-bold text-[#102C63]">{x.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{x.text}</p></div></article>)}</div><div className="mt-8 border-l-4 border-[#E60012] bg-white p-5 text-sm leading-6 text-slate-600">{copy.notice}</div><Link href="/rates" className="btn-main mt-8">Periksa tarif rute <ArrowRight size={16}/></Link></section></PublicLayout>;
}
function RatesPage() {
  const copy = usePageCopy('/rates');
  const [form,setForm]=useState({origin:'',destination:'',vehicleCategory:'small' as 'small'|'medium'|'large',method:''});
  const [submitted,setSubmitted]=useState(false);
  const params={origin:form.origin.trim(),destination:form.destination.trim(),vehicleCategory:form.vehicleCategory,method:form.method.trim()||undefined};
  const quote=useGetRateQuote(params,{query:{enabled:submitted && !!params.origin && !!params.destination,queryKey:getGetRateQuoteQueryKey(params)}});
  const rates=useListPublicRates();
  const contact=useGetPublicContact();
  function submit(e:FormEvent){e.preventDefault();setSubmitted(true);}
  const quoteMessage=quote.data
    ? `Halo Kirimmobil, saya ingin berkonsultasi tentang pengiriman kendaraan.\nAsal: ${quote.data.origin}\nTujuan: ${quote.data.destination}\nKategori kendaraan: ${human(quote.data.vehicleCategory)}\nMetode: ${quote.data.method}${quote.data.available&&quote.data.estimatedPrice!==null?`\nEstimasi: ${fmt(quote.data.estimatedPrice)}`:'\nPermintaan: mohon penawaran'}`
    : '';
  const quoteWhatsapp=contact.data?.whatsappNumber&&quote.data
    ? whatsappUrl(contact.data.whatsappNumber,quoteMessage)
    : undefined;
  return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/>
    <section className="container-wide grid gap-8 py-12 lg:grid-cols-[.95fr_1.05fr]"><form onSubmit={submit} className="panel p-6 md:p-8"><h2 className="text-xl font-extrabold text-[#102C63]">{copy.formTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{copy.formDescription}</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Kota asal<input className="form-control mt-2" placeholder="Contoh: kota asal" value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})} required data-testid="input-origin"/></label><label className="text-sm font-semibold">Kota tujuan<input className="form-control mt-2" placeholder="Contoh: kota tujuan" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} required data-testid="input-destination"/></label><label className="text-sm font-semibold">Kategori kendaraan<select className="form-control mt-2" value={form.vehicleCategory} onChange={e=>setForm({...form,vehicleCategory:e.target.value as typeof form.vehicleCategory})}><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></label><label className="text-sm font-semibold">Metode pengiriman <span className="font-normal text-slate-400">(opsional)</span><input className="form-control mt-2" placeholder="Sesuai tarif yang tersedia" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}/></label></div><button className="btn-main mt-6 w-full" type="submit" data-testid="button-get-quote">Tampilkan estimasi <ArrowRight size={16}/></button></form>
      <div className="space-y-4">{!submitted?<div className="flex min-h-[220px] flex-col justify-center border border-dashed border-slate-300 bg-white p-7"><RouteIcon className="text-[#102C63]"/><h3 className="mt-4 text-lg font-bold text-[#102C63]">Tarif disesuaikan dengan rute</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Isi kota asal dan tujuan. Jika rute belum memiliki harga terpublikasi, kami akan menyatakannya tanpa membuat perkiraan sendiri.</p></div>:quote.isLoading?<div className="panel p-7"><div className="skeleton h-5 w-40"/><div className="skeleton mt-5 h-10 w-64"/><div className="skeleton mt-6 h-4 w-full"/></div>:quote.isError?<LoadError retry={()=>void quote.refetch()} message="Permintaan estimasi belum berhasil. Coba lagi."/>:quote.data?<div className="panel border-t-4 border-t-[#102C63] p-7"><p className="eyebrow text-slate-500">{quote.data.origin} → {quote.data.destination}</p><h3 className="mt-3 text-xl font-extrabold text-[#102C63]">{quote.data.available&&quote.data.estimatedPrice!==null?fmt(quote.data.estimatedPrice):'Tarif belum tersedia'}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{quote.data.message}</p>{quote.data.available&&<div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm"><p><strong>Metode:</strong> {quote.data.method}</p><p><strong>Asuransi:</strong> {quote.data.insuranceIncluded?'Termasuk':'Tidak termasuk / perlu dikonfirmasi'}</p>{quote.data.inclusions&&<p><strong>Termasuk:</strong> {quote.data.inclusions}</p>}{quote.data.exclusions&&<p><strong>Belum termasuk:</strong> {quote.data.exclusions}</p>}</div>}</div>:null}
       {quoteWhatsapp&&<a className="btn-main btn-red w-full" href={quoteWhatsapp} target="_blank" rel="noreferrer">Konsultasi via WhatsApp <ArrowUpRight size={16}/></a>}{quote.data&&!contact.isLoading&&!contact.data?.whatsappNumber&&<div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Nomor WhatsApp resmi belum dikonfigurasi. Silakan gunakan halaman kontak untuk melihat kanal yang tersedia.</div>}</div></section>
    <section className="bg-white py-12"><div className="container-wide"><div className="flex items-end justify-between"><div><p className="eyebrow section-label">Daftar tarif</p><h2 className="mt-2 text-2xl font-extrabold text-[#102C63]">Tarif terpublikasi</h2></div></div><div className="mt-5">{rates.isLoading?<div className="skeleton h-28"/>:rates.isError?<LoadError retry={()=>void rates.refetch()}/>:rates.data?.length?<div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-3">Rute</th><th>Kendaraan</th><th>Metode</th><th>Harga</th><th>Berlaku sampai</th></tr></thead><tbody>{rates.data.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="py-4 font-semibold text-[#102C63]">{r.origin} → {r.destination}</td><td>{human(r.vehicleCategory)}</td><td>{r.method}</td><td className="font-bold">{fmt(r.price)}</td><td>{dateFmt(r.validUntil)}</td></tr>)}</tbody></table></div>:<EmptyState title="Belum ada tarif publik">Tarif akan ditampilkan setelah rute dan ketentuannya dikonfirmasi.</EmptyState>}</div></div></section>
  </PublicLayout>;
}
function SchedulesPage() {
  const copy=usePageCopy('/schedules');
  const q=useListPublicSchedules();
  return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/><section className="container-wide py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<ScheduleCards schedules={q.data}/>:<EmptyState title={copy.emptyTitle}>{copy.emptyBody}</EmptyState>}</section></PublicLayout>;
}
function DocumentationPage() {
  const copy=usePageCopy('/documentation');
  const deliveries=useListPublicDeliveries();
  return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/>
  <section className="container-wide py-12">{deliveries.isLoading?<SkeletonCards/>:deliveries.isError?<LoadError retry={()=>void deliveries.refetch()}/>:deliveries.data?.length?<div className="grid gap-5 md:grid-cols-2">{deliveries.data.map(d=><DeliveryCard key={d.id} d={d}/>)}</div>:<EmptyState title={copy.emptyTitle}>{copy.emptyBody}</EmptyState>}</section></PublicLayout>;
}
function DeliveryCard({d}:{d:Delivery}){
  return <article className="panel overflow-hidden">
    {d.mediaPaths.length>0?<div className="grid aspect-[16/8] grid-cols-1 gap-1 overflow-hidden bg-[#eaf0f7] sm:grid-cols-2">
      {d.mediaPaths.map((path,index)=>path.match(/\.(mp4|mov)$/i)
        ?<video key={path} src={storedMediaUrl(path)} controls preload="metadata" className="h-full min-h-0 w-full object-cover" aria-label={`${d.title}, video ${index+1}`}/>
        :<img key={path} src={storedMediaUrl(path)} alt={`${d.title} — dokumentasi ${index+1}`} loading="lazy" className="h-full min-h-0 w-full object-cover"/>)}
    </div>:<div className="flex aspect-[16/8] items-center justify-center bg-[#eaf0f7] text-[#102C63]"><Image size={28}/><span className="ml-3 text-sm font-semibold">Dokumentasi visual tidak tersedia</span></div>}
    <div className="p-6"><p className="eyebrow text-slate-500">{d.vehicleType} · {dateFmt(d.shippedAt)}</p><h2 className="mt-2 text-xl font-bold text-[#102C63]">{d.title}</h2><p className="mt-2 text-sm text-slate-600">{d.origin} → {d.destination}</p><p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{d.narrative}</p></div>
  </article>;
}
function TestimonialsPage(){const copy=usePageCopy('/testimonials');const q=useListPublicContent({kind:'testimonial'});return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/><section className="container-wide py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="grid gap-5 md:grid-cols-2">{q.data.map(x=><article key={x.id} className="panel p-7"><div className="mb-4 text-3xl font-serif text-[#E60012]">“</div><h2 className="text-lg font-bold text-[#102C63]">{x.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{x.body}</p></article>)}</div>:<EmptyState title={copy.emptyTitle}>{copy.emptyBody}</EmptyState>}</section></PublicLayout>}
function FaqPage(){const copy=usePageCopy('/faq');const q=useListPublicContent({kind:'faq'});return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/><section className="container-wide max-w-4xl py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="grid gap-3">{q.data.map(f=><details key={f.id} className="panel group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#102C63]">{f.title}<ChevronDown size={18} className="transition group-open:rotate-180"/></summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{f.body}</p></details>)}</div>:<EmptyState title={copy.emptyTitle}>{copy.emptyBody}</EmptyState>}</section></PublicLayout>}
function ContactPage(){const copy=usePageCopy('/contact');const q=useGetPublicContact();return <PublicLayout><PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}/><section className="container-wide grid gap-6 py-12 md:grid-cols-2">{q.isLoading?<div className="skeleton h-56"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<><div className="panel p-7"><h2 className="text-xl font-extrabold text-[#102C63]">{copy.channelsTitle}</h2><div className="mt-5 grid gap-4 text-sm">{q.data?.whatsappNumber?<div className="border-t border-slate-100 pt-4"><p className="text-slate-500">WhatsApp</p>{whatsappUrl(q.data.whatsappNumber,'Halo Kirimmobil, saya ingin berkonsultasi tentang pengiriman kendaraan.')?<a className="mt-1 inline-block font-bold text-[#102C63] underline" href={whatsappUrl(q.data.whatsappNumber,'Halo Kirimmobil, saya ingin berkonsultasi tentang pengiriman kendaraan.')} target="_blank" rel="noreferrer">{q.data.whatsappNumber}</a>:<p className="mt-1 font-bold">{q.data.whatsappNumber}</p>}</div>:<div className="border-t border-slate-100 pt-4 text-slate-600">Nomor WhatsApp resmi belum dikonfigurasi.</div>}{q.data?.officeHours&&<div className="border-t border-slate-100 pt-4"><p className="text-slate-500">Jam operasional</p><p className="mt-1 font-bold">{q.data.officeHours}</p></div>}{q.data?.instagramUrl&&<a href={q.data.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-[#102C63]"><Instagram size={17}/> Instagram resmi</a>}</div></div><div className="panel p-7"><h2 className="text-xl font-extrabold text-[#102C63]">{copy.addressTitle}</h2>{q.data?.officeAddress?<p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-1 shrink-0"/>{q.data.officeAddress}</p>:<p className="mt-4 text-sm leading-6 text-slate-600">Alamat kantor belum dikonfirmasi untuk ditampilkan.</p>}{q.data?.mapUrl&&<a href={q.data.mapUrl} target="_blank" rel="noreferrer" className="btn-ghost mt-5">Buka peta <ArrowUpRight size={15}/></a>}</div></>}</section></PublicLayout>}

const adminNavigation=[
  {path:'/admin',label:'Ikhtisar',icon:Gauge},
  {path:'/admin/rates',label:'Tarif',icon:RouteIcon},
  {path:'/admin/schedules',label:'Jadwal',icon:CalendarDays},
  {path:'/admin/gallery',label:'Dokumentasi',icon:PackageCheck},
  {path:'/admin/pages',label:'Halaman situs',icon:Pencil},
  {path:'/admin/content',label:'Konten',icon:FileText},
  {path:'/admin/settings',label:'Pengaturan',icon:ShieldCheck},
  {path:'/admin/audit-log',label:'Audit log',icon:Clock3},
];
function AdminGate({children}:{children:ReactNode}){
  const [location,setLocation]=useLocation();
  const session=useGetAdminSession({query:{retry:false,queryKey:getGetAdminSessionQueryKey()}});
  const logout=useLogoutAdmin();
  const qc=useQueryClient();
  async function signOut(){try{await logout.mutateAsync()}catch{}finally{qc.clear();setLocation('/admin/login')}}
  if(session.isLoading)return <div className="admin-loading"><div className="w-72 space-y-3"><div className="skeleton h-8 w-44"/><div className="skeleton h-4 w-full"/><div className="skeleton h-4 w-4/5"/></div></div>;
  if(session.isError||!session.data)return <div className="admin-signin"><div className="admin-signin-card"><ShieldCheck size={32} className="mx-auto text-[#102C63]"/><p className="eyebrow section-label mt-5">AREA KIRIMMOBIL</p><h1 className="mt-2 text-2xl font-extrabold text-[#102C63]">Masuk ke ruang kerja</h1><p className="mt-3 text-sm leading-6 text-slate-600">Area admin hanya dapat dibuka dengan email dan kata sandi admin.</p><Link href="/admin/login" className="btn-main mt-6 w-full">Masuk sebagai admin <ArrowRight size={16}/></Link><Link href="/" className="mt-4 inline-block text-sm font-semibold text-slate-500">Kembali ke situs publik</Link></div></div>;
  const role:AdminSession['role']=session.data.role;
  const activePath=location;
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><Link href="/admin" aria-label="Kirimmobil admin"><img src={logoPath} alt="Kirimmobil" /></Link></div>
      <div className="admin-profile"><p className="eyebrow">RUANG KERJA</p><p className="mt-2 truncate text-sm font-bold">{session.data.displayName||session.data.email}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-blue-200">{human(role)}</p></div>
      <nav className="admin-nav" aria-label="Navigasi admin">
        {adminNavigation.map(({path,label,icon:Icon})=><Link key={path} href={path} aria-current={activePath===path?'page':undefined} className={`admin-nav-link ${activePath===path?'is-active':''}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></Link>)}
      </nav>
      <Link href="/" className="admin-public-link">Lihat situs publik <ArrowUpRight size={14}/></Link>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div><p className="eyebrow text-slate-400">KIRIMMOBIL · CMS</p><p className="mt-1 text-sm font-bold text-[#102C63]">{human(activePath.split('/').pop()||'overview')}</p></div><div className="flex items-center gap-3"><div className="min-w-0 text-right"><p className="truncate text-sm font-semibold text-slate-700">{session.data.displayName||session.data.email}</p><p className="truncate text-xs text-slate-500">{human(role)} · {session.data.email}</p></div><button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={()=>void signOut()} disabled={logout.isPending}>{logout.isPending?'Keluar…':'Keluar'}</button></div></header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
function AdminHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:ReactNode}){return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow section-label">{eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold text-[#102C63]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{desc}</p></div>{action}</div>}
function AdminHome(){
  const q=useGetAdminOverview();
  const quickLinks=[{label:'Tarif',href:'/admin/rates',icon:RouteIcon},{label:'Jadwal',href:'/admin/schedules',icon:CalendarDays},{label:'Dokumentasi',href:'/admin/gallery',icon:PackageCheck},{label:'Konten',href:'/admin/content',icon:FileText},{label:'Pengaturan',href:'/admin/settings',icon:ShieldCheck}];
  const primary={href:'/admin/rates',label:'Buka tarif'};
  const metrics=[
    {label:'Tarif draft',value:q.data?.draftRates??0,note:'Belum tampil di situs',icon:RouteIcon},
    {label:'Tarif terbit',value:q.data?.publishedRates??0,note:'Tarif yang dipublikasikan',icon:BadgeCheck},
    {label:'Jadwal mendatang',value:q.data?.upcomingSchedules??0,note:'Jadwal publik mendatang',icon:CalendarDays},
    {label:'Dokumentasi terbit',value:q.data?.publishedDeliveries??0,note:'Kiriman yang dipublikasikan',icon:PackageCheck},
    {label:'Konten draft',value:q.data?.draftContent??0,note:'Belum tampil di situs',icon:FileText},
  ];
  return <>
    <AdminHeading eyebrow="RUANG KERJA · RINGKASAN" title="Status publikasi" desc="Angka dan perubahan terbaru dari CMS. Pastikan data telah dikonfirmasi sebelum ditampilkan kepada pengunjung." action={<Link href={primary.href} className="btn-main">{primary.label}<ArrowRight size={16}/></Link>}/>
    {q.isLoading?<div className="admin-metric-grid">{[1,2,3,4,5].map(i=><div key={i} className="admin-metric-card"><div className="skeleton h-4 w-24"/><div className="skeleton mt-5 h-8 w-16"/></div>)}</div>
    :q.isError?<LoadError retry={()=>void q.refetch()}/>
    :<>
      <div className="admin-metric-grid">{metrics.map(({label,value,note,icon:Icon})=><article className="admin-metric-card" key={label}><div className="admin-metric-top"><span className="admin-metric-icon"><Icon size={17}/></span><span className="eyebrow">CMS</span></div><p className="admin-metric-label">{label}</p><p className="admin-metric-value">{value}</p><p className="admin-metric-note">{note}</p></article>)}</div>
      <div className="admin-dashboard-lower">
        <section className="admin-activity panel">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow section-label">JEJAK PERUBAHAN</p><h2 className="mt-2 text-xl font-bold text-[#102C63]">Aktivitas terbaru</h2></div><Link href="/admin/audit-log" className="inline-flex items-center gap-2 text-sm font-bold text-[#102C63]">Buka audit log <ArrowRight size={14}/></Link></div>
          {q.data?.recentActivity?.length?<div className="mt-5 divide-y divide-slate-100">{q.data.recentActivity.map(a=><div key={a.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div><p className="font-semibold text-slate-700">{a.summary}</p><p className="mt-1 text-xs text-slate-500">{a.actorEmail} · {a.entityType} · {a.action}</p></div><time className="text-xs text-slate-500">{dateFmt(a.createdAt)}</time></div>)}</div>:<p className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">Belum ada aktivitas yang tercatat.</p>}
        </section>
        <aside className="admin-quick-links panel"><p className="eyebrow section-label">MODUL</p><h2 className="mt-2 text-xl font-bold text-[#102C63]">Ruang kerja</h2><div className="mt-4 divide-y divide-slate-100">{quickLinks.map(({label,href,icon:Icon})=><Link key={href} href={href} className="admin-quick-link"><Icon size={17}/><span>{label}</span><ArrowRight size={15} className="ml-auto"/></Link>)}</div></aside>
      </div>
    </>}
  </>;
}

function RatesAdmin(){const q=useListAdminRates();const create=useCreateRate();const update=useUpdateRate();const del=useDeleteRate();const qc=useQueryClient();const [edit,setEdit]=useState<Rate|null>(null);const [adding,setAdding]=useState(false);const [err,setErr]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setErr('');const f=new FormData(e.currentTarget);const data:RateInput={origin:String(f.get('origin')),destination:String(f.get('destination')),vehicleCategory:f.get('vehicleCategory') as RateInput['vehicleCategory'],method:String(f.get('method')),price:Number(f.get('price')),insuranceIncluded:f.get('insuranceIncluded')==='on',inclusions:String(f.get('inclusions')),exclusions:String(f.get('exclusions')),status:f.get('status') as RateInput['status'],validFrom:String(f.get('validFrom')||'')||null,validUntil:String(f.get('validUntil')||'')||null};try{if(edit)await update.mutateAsync({id:edit.id,data});else await create.mutateAsync({data});setEdit(null);setAdding(false);await Promise.all([qc.invalidateQueries({queryKey:getListAdminRatesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicRatesQueryKey()}),qc.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()})]);}catch{setErr('Tarif tidak tersimpan. Periksa data dan hak akses, lalu coba lagi.')}}async function remove(r:Rate){if(!confirm(`Hapus tarif ${r.origin} → ${r.destination}?`))return;try{await del.mutateAsync({id:r.id});await Promise.all([qc.invalidateQueries({queryKey:getListAdminRatesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicRatesQueryKey()})]);}catch{setErr('Tarif tidak dapat dihapus.')}}return <><AdminHeading eyebrow="OPERASIONAL" title="Tarif" desc="Kelola tarif rute, kategori kendaraan, cakupan dan status publikasi." action={<button onClick={()=>{setAdding(true);setEdit(null)}} className="btn-main"><Plus size={16}/> Tambah tarif</button>}/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Rute','Kategori / metode','Harga','Status','Aksi'].map(x=><th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody>{q.data?.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold text-[#102C63]">{r.origin} → {r.destination}</td><td className="px-5 py-4">{human(r.vehicleCategory)} · {r.method}</td><td className="px-5 py-4 font-bold">{fmt(r.price)}</td><td className="px-5 py-4">{human(r.status)}</td><td className="px-5 py-4"><button className="text-[#102C63] underline" onClick={()=>{setEdit(r);setAdding(false)}}>Edit</button><button className="ml-4 text-[#E60012] underline" onClick={()=>void remove(r)}>Hapus</button></td></tr>)}</tbody></table>{!q.data?.length&&<p className="p-8 text-center text-sm text-slate-500">Belum ada data tarif.</p>}</div>}{err&&<p role="alert" className="mt-4 text-sm text-[#E60012]">{err}</p>}{(adding||edit)&&<RateEditor rate={edit} busy={create.isPending||update.isPending} onClose={()=>{setAdding(false);setEdit(null)}} onSave={save}/>}</>}
function RateEditor({rate,busy,onClose,onSave}:{rate:Rate|null;busy:boolean;onClose:()=>void;onSave:(e:FormEvent<HTMLFormElement>)=>void}){return <Modal title={rate?'Edit tarif':'Tarif baru'} onClose={onClose}><form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">{[['origin','Kota asal',rate?.origin],['destination','Kota tujuan',rate?.destination],['method','Metode',rate?.method],['price','Harga (IDR)',rate?.price],['inclusions','Termasuk',rate?.inclusions],['exclusions','Tidak termasuk',rate?.exclusions],['validFrom','Berlaku mulai',rate?.validFrom],['validUntil','Berlaku sampai',rate?.validUntil]].map(([name,label,val])=><label key={String(name)} className="text-sm font-semibold text-slate-700">{label}<input name={String(name)} type={name==='price'?'number':name==='validFrom'||name==='validUntil'?'date':'text'} defaultValue={String(val??'')} className="form-control mt-1" required={['origin','destination','method','price'].includes(String(name))}/></label>)}<label className="text-sm font-semibold">Kategori<select name="vehicleCategory" defaultValue={rate?.vehicleCategory||'small'} className="form-control mt-1"><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></label><label className="text-sm font-semibold">Status<select name="status" defaultValue={rate?.status||'draft'} className="form-control mt-1"><option value="draft">Draft</option><option value="published">Terbit</option><option value="inactive">Nonaktif</option></select></label><label className="flex items-center gap-2 text-sm"><input name="insuranceIncluded" type="checkbox" defaultChecked={rate?.insuranceIncluded}/> Asuransi termasuk</label><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Batal</button><button disabled={busy} className="btn-main" type="submit">{busy?'Menyimpan…':'Simpan tarif'}</button></div></form></Modal>}

function SchedulesAdmin(){const q=useListAdminSchedules();const create=useCreateSchedule();const update=useUpdateSchedule();const del=useDeleteSchedule();const qc=useQueryClient();const [edit,setEdit]=useState<Schedule|null>(null);const [adding,setAdding]=useState(false);const [err,setErr]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const data:ScheduleInput={operator:String(f.get('operator')),origin:String(f.get('origin')),destination:String(f.get('destination')),closingDate:String(f.get('closingDate')||'')||null,etd:String(f.get('etd')||'')||null,eta:String(f.get('eta')||'')||null,status:f.get('status') as ScheduleInput['status'],verifiedSlots:f.get('verifiedSlots')===''?null:Number(f.get('verifiedSlots')),source:String(f.get('source')||'')||null,publishStatus:f.get('publishStatus') as ScheduleInput['publishStatus']};try{if(edit)await update.mutateAsync({id:edit.id,data});else await create.mutateAsync({data});setAdding(false);setEdit(null);await Promise.all([qc.invalidateQueries({queryKey:getListAdminSchedulesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicSchedulesQueryKey()}),qc.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()})]);}catch{setErr('Jadwal gagal disimpan.')}}async function remove(s:Schedule){if(confirm(`Hapus jadwal ${s.origin} → ${s.destination}?`)){try{await del.mutateAsync({id:s.id});await Promise.all([qc.invalidateQueries({queryKey:getListAdminSchedulesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicSchedulesQueryKey()})]);}catch{setErr('Jadwal gagal dihapus.')}}}return <><AdminHeading eyebrow="OPERASIONAL" title="Jadwal" desc="Publikasikan jadwal hanya setelah rute, operator, tanggal, dan sumber informasi diverifikasi." action={<button className="btn-main" onClick={()=>{setAdding(true);setEdit(null)}}><Plus size={16}/> Tambah jadwal</button>}/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="grid gap-3">{q.data?.map(s=><div key={s.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-bold text-[#102C63]">{s.origin} → {s.destination}</p><p className="mt-1 text-sm text-slate-500">{s.operator} · ETD {dateFmt(s.etd)} · {human(s.status)} · {human(s.publishStatus)}</p></div><div className="flex gap-4 text-sm"><button className="font-semibold text-[#102C63] underline" onClick={()=>{setEdit(s);setAdding(false)}}>Edit</button><button className="font-semibold text-[#E60012] underline" onClick={()=>void remove(s)}>Hapus</button></div></div>)}</div>}{!q.isLoading&&!q.isError&&!q.data?.length&&<EmptyState title="Belum ada jadwal">Tambahkan data operasional yang telah diverifikasi.</EmptyState>}{err&&<p role="alert" className="mt-3 text-sm text-[#E60012]">{err}</p>}{(adding||edit)&&<Modal title={edit?'Edit jadwal':'Jadwal baru'} onClose={()=>{setAdding(false);setEdit(null)}}><form onSubmit={save} className="grid gap-3 sm:grid-cols-2">{[['operator','Operator',edit?.operator],['origin','Kota asal',edit?.origin],['destination','Kota tujuan',edit?.destination],['closingDate','Batas pemesanan',edit?.closingDate],['etd','ETD',edit?.etd],['eta','ETA',edit?.eta],['verifiedSlots','Slot terverifikasi',edit?.verifiedSlots],['source','Sumber verifikasi',edit?.source]].map(([n,l,v])=><label key={String(n)} className="text-sm font-semibold">{l}<input name={String(n)} type={['closingDate','etd','eta'].includes(String(n))?'date':n==='verifiedSlots'?'number':'text'} defaultValue={String(v??'')} className="form-control mt-1" required={['operator','origin','destination'].includes(String(n))}/></label>)}<label className="text-sm font-semibold">Status<select name="status" defaultValue={edit?.status||'booking_open'} className="form-control mt-1">{['booking_open','nearly_full','closed','departed','delayed','cancelled'].map(x=><option key={x} value={x}>{human(x)}</option>)}</select></label><label className="text-sm font-semibold">Publikasi<select name="publishStatus" defaultValue={edit?.publishStatus||'draft'} className="form-control mt-1"><option value="draft">Draft</option><option value="published">Terbit</option><option value="inactive">Nonaktif</option></select></label><div className="sm:col-span-2 flex justify-end gap-2"><button className="btn-ghost" type="button" onClick={()=>{setAdding(false);setEdit(null)}}>Batal</button><button className="btn-main" disabled={create.isPending||update.isPending}>Simpan jadwal</button></div></form></Modal>}</>}

function PagesAdmin() {
  const q = useListAdminContent();
  const create = useCreateContent();
  const update = useUpdateContent();
  const del = useDeleteContent();
  const qc = useQueryClient();
  const [selectedPath, setSelectedPath] = useState('/');
  const [draft, setDraft] = useState<PageCopyFields>(() => defaultPageCopy('/'));
  const [pageStatus, setPageStatus] = useState<ContentInput['status']>('draft');
  const [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const definition = pageDefinitions.find((page) => page.path === selectedPath) ?? pageDefinitions[0];
  const savedPage = q.data?.find((entry) => entry.kind === 'page' && entry.slug === selectedPath);

  useEffect(() => {
    setDraft({ ...defaultPageCopy(selectedPath), ...(savedPage ? parsePageCopy(savedPage.body) : {}) });
    setPageStatus(savedPage?.status ?? 'draft');
  }, [selectedPath, savedPage?.body]);

  function sendPreview() {
    frame.current?.contentWindow?.postMessage(
      { type: 'kirimmobil:cms-preview', path: selectedPath, fields: draft },
      window.location.origin,
    );
  }

  useEffect(() => {
    sendPreview();
  }, [selectedPath, draft]);

  async function save() {
    setError('');
    const data: ContentInput = {
      kind: 'page',
      slug: selectedPath,
      title: definition.label,
      body: JSON.stringify(draft),
      status: pageStatus,
      publicationConsent: false,
    };
    try {
      if (savedPage) await update.mutateAsync({ id: savedPage.id, data });
      else await create.mutateAsync({ data });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListAdminContentQueryKey() }),
        qc.invalidateQueries({ queryKey: getListPublicContentQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() }),
      ]);
    } catch {
      setError('Perubahan halaman gagal disimpan. Periksa koneksi dan hak akses admin.');
    }
  }

  async function remove() {
    if (!savedPage || !confirm(`Hapus konten khusus halaman ${definition.label}? Halaman akan kembali ke teks bawaan.`)) return;
    setError('');
    try {
      await del.mutateAsync({ id: savedPage.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListAdminContentQueryKey() }),
        qc.invalidateQueries({ queryKey: getListPublicContentQueryKey() }),
      ]);
    } catch {
      setError('Konten halaman tidak dapat dihapus.');
    }
  }

  return <>
    <AdminHeading eyebrow="CMS · HALAMAN PUBLIK" title="Halaman situs" desc="Ubah teks halaman, lihat pratinjau dengan layout publik yang sama, lalu simpan untuk menerbitkan."/>
    {q.isLoading ? <div className="skeleton h-40"/> : q.isError ? <LoadError retry={() => void q.refetch()}/> : <>
      <label className="mb-5 block max-w-sm text-sm font-semibold text-slate-700">Pilih halaman
        <select className="form-control mt-2" value={selectedPath} onChange={(event) => setSelectedPath(event.target.value)}>
          {pageDefinitions.map((page) => <option key={page.path} value={page.path}>{page.label}</option>)}
        </select>
      </label>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <section className="panel p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><p className="eyebrow section-label">EDIT KONTEN</p><h2 className="mt-1 text-lg font-bold text-[#102C63]">{definition.label}</h2></div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{savedPage ? human(savedPage.status) : 'Belum disimpan'}</span>
          </div>
          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">Status publikasi
              <select className="form-control mt-1" value={pageStatus} onChange={(event) => setPageStatus(event.target.value as ContentInput['status'])}>
                <option value="draft">Draft — hanya pratinjau</option>
                <option value="published">Terbit — tampil di situs</option>
                <option value="inactive">Nonaktif — tidak tampil di situs</option>
              </select>
            </label>
            {definition.fields.map((field) => <label key={field.key} className="text-sm font-semibold text-slate-700">{field.label}
              <textarea rows={field.key.toLowerCase().includes('body') || field.key === 'lead' || field.key === 'notice' ? 4 : 2}
                className="form-control mt-1" value={draft[field.key] ?? field.value}
                onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}/>
            </label>)}
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-[#E60012]">{error}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {savedPage && <button type="button" className="btn-ghost text-[#E60012]" onClick={() => void remove()} disabled={del.isPending}>Hapus perubahan</button>}
            <button type="button" className="btn-ghost" onClick={() => { setDraft({ ...defaultPageCopy(selectedPath), ...(savedPage ? parsePageCopy(savedPage.body) : {}) }); setPageStatus(savedPage?.status ?? 'draft'); }}>Batalkan edit</button>
            <button type="button" className="btn-main" onClick={() => void save()} disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'Menyimpan…' : pageStatus === 'published' ? 'Simpan & terbitkan' : 'Simpan perubahan'}</button>
          </div>
        </section>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-[#102C63]">Pratinjau langsung</h2><a href={`${basePath}${selectedPath}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#102C63] underline">Buka halaman publik</a></div>
          <iframe key={selectedPath} ref={frame} title={`Pratinjau ${definition.label}`} src={`${basePath}${selectedPath}?cms-preview=1`} onLoad={sendPreview} className="h-[720px] w-full border-0"/>
        </section>
      </div>
    </>}
  </>;
}

function ContentAdmin(){const q=useListAdminContent();const create=useCreateContent();const update=useUpdateContent();const del=useDeleteContent();const qc=useQueryClient();const [edit,setEdit]=useState<ContentEntry|null>(null);const [adding,setAdding]=useState(false);const [error,setError]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const data:ContentInput={kind:f.get('kind') as ContentInput['kind'],slug:String(f.get('slug')),title:String(f.get('title')),body:String(f.get('body')),status:f.get('status') as ContentInput['status'],publicationConsent:f.get('consent')==='on'};try{if(edit)await update.mutateAsync({id:edit.id,data});else await create.mutateAsync({data});setEdit(null);setAdding(false);await Promise.all([qc.invalidateQueries({queryKey:getListAdminContentQueryKey()}),qc.invalidateQueries({queryKey:getListPublicContentQueryKey()}),qc.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()})]);}catch{setError('Konten gagal disimpan.')}}async function remove(c:ContentEntry){if(confirm(`Hapus konten “${c.title}”?`)){try{await del.mutateAsync({id:c.id});await Promise.all([qc.invalidateQueries({queryKey:getListAdminContentQueryKey()}),qc.invalidateQueries({queryKey:getListPublicContentQueryKey()})]);}catch{setError('Konten tidak dapat dihapus.')}}}const entries=q.data?.filter((entry)=>entry.kind!=='page');return <><AdminHeading eyebrow="PUBLIKASI" title="Konten" desc="Kelola FAQ dan testimonial. Perubahan copy halaman situs dikelola terpisah pada menu Halaman situs." action={<button onClick={()=>{setAdding(true);setEdit(null)}} className="btn-main"><Plus size={16}/> Buat konten</button>}/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="grid gap-3">{entries?.map(c=><article key={c.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{c.kind}</span><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{human(c.status)}</span>{c.kind==='testimonial'&&<span className="text-xs text-slate-500">{c.publicationConsent?'Persetujuan tercatat':'Belum ada persetujuan'}</span>}</div><p className="mt-2 font-bold text-[#102C63]">{c.title}</p><p className="text-xs text-slate-500">/{c.slug}</p></div><div className="flex gap-4"><button className="text-sm font-semibold text-[#102C63] underline" onClick={()=>{setEdit(c);setAdding(false)}}>Edit</button><button className="text-sm font-semibold text-[#E60012] underline" onClick={()=>void remove(c)}>Hapus</button></div></article>)}</div>}{!q.isLoading&&!q.isError&&!entries?.length&&<EmptyState title="Belum ada konten">Buat entri FAQ atau testimonial dalam status draft sampai ditinjau.</EmptyState>}{error&&<p role="alert" className="mt-3 text-sm text-[#E60012]">{error}</p>}{(adding||edit)&&<Modal title={edit?'Edit konten':'Konten baru'} onClose={()=>{setEdit(null);setAdding(false)}}><form onSubmit={save} className="grid gap-4"><label className="text-sm font-semibold">Jenis<select name="kind" defaultValue={edit?.kind||'faq'} className="form-control mt-1">{['faq','testimonial'].map(x=><option key={x} value={x}>{human(x)}</option>)}</select></label><label className="text-sm font-semibold">Slug<input name="slug" required defaultValue={edit?.slug||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Judul<input name="title" required defaultValue={edit?.title||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Isi<textarea name="body" rows={6} defaultValue={edit?.body||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Status<select name="status" defaultValue={edit?.status||'draft'} className="form-control mt-1"><option value="draft">Draft</option><option value="published">Terbit</option><option value="inactive">Nonaktif</option></select></label><label className="flex gap-2 text-sm"><input name="consent" type="checkbox" defaultChecked={edit?.publicationConsent}/> Persetujuan publikasi telah diperoleh / tidak diperlukan untuk jenis ini</label><p className="text-xs leading-5 text-slate-500">Jangan menerbitkan testimoni tanpa persetujuan eksplisit. Persetujuan harus dicatat terlebih dahulu.</p><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={()=>{setEdit(null);setAdding(false)}}>Batal</button><button className="btn-main" disabled={create.isPending||update.isPending}>Simpan</button></div></form></Modal>}</>}
function GalleryAdmin(){
  const q=useListAdminDeliveries();const create=useCreateDelivery();const update=useUpdateDelivery();const del=useDeleteDelivery();const qc=useQueryClient();
  const [edit,setEdit]=useState<Delivery|null>(null);const [adding,setAdding]=useState(false);const [error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>,mediaPaths:string[]){
    e.preventDefault();const f=new FormData(e.currentTarget);
    const data:DeliveryInput={slug:String(f.get('slug')),title:String(f.get('title')),origin:String(f.get('origin')),destination:String(f.get('destination')),vehicleType:String(f.get('vehicleType')),shippedAt:String(f.get('shippedAt')||'')||null,narrative:String(f.get('narrative')),mediaPaths,status:f.get('status') as DeliveryInput['status'],publicationConsent:f.get('consent')==='on',platesRedacted:f.get('platesRedacted')==='on'};
    try{if(edit)await update.mutateAsync({id:edit.id,data});else await create.mutateAsync({data});setEdit(null);setAdding(false);await Promise.all([qc.invalidateQueries({queryKey:getListAdminDeliveriesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicDeliveriesQueryKey()}),qc.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()})]);}catch{setError('Dokumentasi gagal disimpan.')}
  }
  async function remove(d:Delivery){if(confirm(`Hapus dokumentasi “${d.title}”?`)){try{await del.mutateAsync({id:d.id});await Promise.all([qc.invalidateQueries({queryKey:getListAdminDeliveriesQueryKey()}),qc.invalidateQueries({queryKey:getListPublicDeliveriesQueryKey()})]);}catch{setError('Dokumentasi gagal dihapus.')}}}
  return <><AdminHeading eyebrow="DOKUMENTASI" title="Galeri pengiriman" desc="Publikasi membutuhkan persetujuan tertulis serta plat nomor telah disamarkan. Media harus merupakan dokumentasi asli, bukan ilustrasi." action={<button className="btn-main" onClick={()=>{setAdding(true);setEdit(null)}}><Plus size={16}/> Tambah catatan</button>}/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="grid gap-3">{q.data?.map(d=><div className="panel flex flex-wrap items-center justify-between gap-4 p-5" key={d.id}><div><p className="font-bold text-[#102C63]">{d.title}</p><p className="mt-1 text-sm text-slate-500">{d.origin} → {d.destination} · {human(d.status)}</p><p className="mt-1 text-xs text-slate-500">Persetujuan: {d.publicationConsent?'tercatat':'belum'} · Plat disamarkan: {d.platesRedacted?'ya':'tidak'} · {d.mediaPaths.length} media</p></div><div className="flex gap-4"><button onClick={()=>{setEdit(d);setAdding(false)}} className="text-sm font-semibold text-[#102C63] underline">Edit</button><button onClick={()=>void remove(d)} className="text-sm font-semibold text-[#E60012] underline">Hapus</button></div></div>)}</div>}{!q.isLoading&&!q.isError&&!q.data?.length&&<EmptyState title="Belum ada dokumentasi">Catatan tersimpan sebagai draft sampai izin dan perlindungan identitas diverifikasi.</EmptyState>}{error&&<p role="alert" className="mt-3 text-sm text-[#E60012]">{error}</p>}{(adding||edit)&&<DeliveryEditor key={edit?.id??'new'} delivery={edit} busy={create.isPending||update.isPending} onClose={()=>{setEdit(null);setAdding(false)}} onSave={save}/>}</>
}

function DeliveryEditor({delivery,busy,onClose,onSave}:{delivery:Delivery|null;busy:boolean;onClose:()=>void;onSave:(e:FormEvent<HTMLFormElement>,mediaPaths:string[])=>void}){
  const [mediaPaths,setMediaPaths]=useState(delivery?.mediaPaths??[]);const [uploading,setUploading]=useState(false);const [uploadError,setUploadError]=useState('');
  async function uploadFiles(files:File[]){
    if(!files.length)return;setUploading(true);setUploadError('');
    try{
      for(const file of files){
        if(file.size>50*1024*1024)throw new Error(`${file.name}: ukuran maksimum 50 MB.`);
        if(!['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(file.type))throw new Error(`${file.name}: tipe file tidak didukung.`);
        const response=await fetch(`${basePath}/api/storage/uploads/request-url`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,size:file.size,contentType:file.type})});
        if(!response.ok){
          const errorBody:unknown=await response.json().catch(()=>undefined);
          const message=errorBody&&typeof errorBody==='object'&&'error'in errorBody&&typeof errorBody.error==='string'?errorBody.error:`Permintaan URL unggah gagal (HTTP ${response.status}).`;
          throw new Error(message);
        }
        const result:unknown=await response.json();
        if(!result||typeof result!=='object'||!('uploadURL'in result)||!('objectPath'in result)||typeof result.uploadURL!=='string'||typeof result.objectPath!=='string')throw new Error('Respons unggah tidak valid.');
        const uploaded=await fetch(result.uploadURL,{method:'PUT',headers:{'Content-Type':file.type},body:file});
        if(!uploaded.ok)throw new Error(`Unggah ${file.name} gagal. Coba lagi.`);
        setMediaPaths((current)=>[...current,result.objectPath as string]);
      }
    }catch(error){setUploadError(error instanceof Error?error.message:'Unggah media gagal.')}
    finally{setUploading(false)}
  }
  return <Modal title={delivery?'Edit dokumentasi':'Catatan pengiriman'} onClose={onClose}>
    <form onSubmit={(e)=>onSave(e,mediaPaths)} className="grid gap-3 sm:grid-cols-2">
      {([['slug','Slug',delivery?.slug],['title','Judul',delivery?.title],['origin','Kota asal',delivery?.origin],['destination','Kota tujuan',delivery?.destination],['vehicleType','Jenis kendaraan',delivery?.vehicleType],['shippedAt','Tanggal kirim',delivery?.shippedAt]] as const).map(([name,label,value])=><label key={name} className="text-sm font-semibold">{label}<input name={name} type={name==='shippedAt'?'date':'text'} defaultValue={String(value??'')} required={name!=='shippedAt'} className="form-control mt-1"/></label>)}
      <label className="sm:col-span-2 text-sm font-semibold">Narasi<textarea name="narrative" rows={4} defaultValue={delivery?.narrative||''} className="form-control mt-1"/></label>
      <label className="text-sm font-semibold">Status<select name="status" defaultValue={delivery?.status||'draft'} className="form-control mt-1"><option value="draft">Draft</option><option value="published">Terbit</option><option value="inactive">Nonaktif</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input name="platesRedacted" type="checkbox" defaultChecked={delivery?.platesRedacted}/> Plat nomor tersamarkan</label>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input name="consent" type="checkbox" defaultChecked={delivery?.publicationConsent}/> Persetujuan eksplisit untuk publikasi telah diberikan</label>
      <div className="sm:col-span-2 rounded border border-slate-200 p-4">
        <label className="block text-sm font-semibold">Foto atau video dokumentasi asli<input className="form-control mt-2" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" disabled={uploading} onChange={(e)=>{const files=Array.from(e.currentTarget.files??[]);e.currentTarget.value='';void uploadFiles(files)}}/></label>
        <p className="mt-2 text-xs leading-5 text-slate-500">Format JPG, PNG, WebP, MP4, atau MOV. Maksimal 50 MB per file. Foto harus sudah disamarkan dan disetujui sebelum diterbitkan.</p>
        {uploading&&<p className="mt-3 text-sm font-semibold text-[#102C63]">Mengunggah media…</p>}
        {uploadError&&<p className="mt-3 text-sm text-[#E60012]" role="alert">{uploadError}</p>}
        {mediaPaths.length>0&&<ul className="mt-4 grid gap-2">{mediaPaths.map((path,index)=><li key={`${path}-${index}`} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-xs"><span className="truncate">{path.split('/').pop()}</span><button type="button" className="font-semibold text-[#E60012] underline" onClick={()=>setMediaPaths((current)=>current.filter((_,i)=>i!==index))}>Hapus</button></li>)}</ul>}
      </div>
      <p className="sm:col-span-2 text-xs leading-5 text-slate-500">Jangan memublikasikan foto tanpa persetujuan atau sebelum plat nomor dan identitas konsumen dilindungi.</p>
      <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Batal</button><button className="btn-main" disabled={busy||uploading}>{busy?'Menyimpan…':'Simpan'}</button></div>
    </form>
  </Modal>;
}
function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0d1c32]/55 p-0 sm:items-center sm:p-5" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg sm:p-7"><header className="mb-5 flex items-center justify-between"><h2 className="text-xl font-extrabold text-[#102C63]">{title}</h2><button className="flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100" onClick={onClose} aria-label="Tutup"><X size={18}/></button></header>{children}</section></div>}

function SettingsAdmin(){
  const q=useGetAdminSettings();
  const update=useUpdateAdminSettings();
  const qc=useQueryClient();
  const [saved,setSaved]=useState(false);
  const [error,setError]=useState('');
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setSaved(false);
    setError('');
    const f=new FormData(e.currentTarget);
    try{
      await update.mutateAsync({data:{companyName:String(f.get('companyName')),whatsappNumber:String(f.get('whatsappNumber')||'')||null,officeAddress:String(f.get('officeAddress')||'')||null,officeHours:String(f.get('officeHours')||'')||null,mapUrl:String(f.get('mapUrl')||'')||null,instagramUrl:String(f.get('instagramUrl')||'')||null}});
      await Promise.all([qc.invalidateQueries({queryKey:getGetAdminSettingsQueryKey()}),qc.invalidateQueries({queryKey:getGetPublicContactQueryKey()})]);
      setSaved(true);
    }catch{
      setError('Pengaturan gagal disimpan. Periksa koneksi dan hak akses admin.');
    }
  }
  return <><AdminHeading eyebrow="SITUS" title="Pengaturan" desc="Informasi kontak publik. Kolom kosong tidak ditampilkan kepada pengunjung."/>
    {q.isLoading?<div className="skeleton h-48"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<form onSubmit={(e)=>void save(e)} className="panel grid max-w-3xl gap-4 p-6 md:grid-cols-2">
      {[['companyName','Nama perusahaan',q.data?.companyName],['whatsappNumber','Nomor WhatsApp resmi',q.data?.whatsappNumber],['officeAddress','Alamat kantor',q.data?.officeAddress],['officeHours','Jam operasional',q.data?.officeHours],['mapUrl','URL peta',q.data?.mapUrl],['instagramUrl','Instagram URL',q.data?.instagramUrl]].map(([n,l,v])=><label key={String(n)} className="text-sm font-semibold text-slate-700">{l}<input name={String(n)} defaultValue={String(v??'')} className="form-control mt-1"/></label>)}
      {error&&<p role="alert" className="md:col-span-2 text-sm text-[#E60012]">{error}</p>}
      <div className="md:col-span-2 flex items-center justify-between"><span className="text-xs text-emerald-700">{saved?'Pengaturan tersimpan.':''}</span><button disabled={update.isPending} className="btn-main">{update.isPending?'Menyimpan…':'Simpan pengaturan'}</button></div>
    </form>}
  </>;
}
function AuditAdmin(){const q=useListAuditLog();return <><AdminHeading eyebrow="AKUNTABILITAS" title="Audit log" desc="Riwayat perubahan pada area staf. Log baca-saja untuk keterlacakan."/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="panel divide-y divide-slate-100">{q.data.map(a=><div key={a.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-[#102C63]">{a.summary}</p><p className="mt-1 text-xs text-slate-500">{a.actorEmail} · {a.entityType} · {a.action}</p></div><time className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString('id-ID')}</time></div>)}</div>:<EmptyState title="Belum ada aktivitas">Perubahan yang tercatat akan muncul di sini.</EmptyState>}</>}
function ProtectedAdmin({page}:{page:string}){
  return <AdminGate>{page==='/admin'?<AdminHome/>:page==='/admin/rates'?<RatesAdmin/>:page==='/admin/schedules'?<SchedulesAdmin/>:page==='/admin/gallery'?<GalleryAdmin/>:page==='/admin/pages'?<PagesAdmin/>:page==='/admin/content'?<ContentAdmin/>:page==='/admin/settings'?<SettingsAdmin/>:page==='/admin/audit-log'?<AuditAdmin/>:<NotFound/>}</AdminGate>;
}
function AdminLogin(){
  const login=useLoginAdmin();
  const session=useGetAdminSession({query:{retry:false,queryKey:getGetAdminSessionQueryKey()}});
  const qc=useQueryClient();
  const [,setLocation]=useLocation();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  if(session.data)return <Redirect to="/admin"/>;
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError('');
    try{
      await login.mutateAsync({data:{email,password}});
      await qc.invalidateQueries({queryKey:getGetAdminSessionQueryKey()});
      setLocation('/admin');
    }catch(error){
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? error.status
        : undefined;
      setError(status === 503
        ? 'Konfigurasi admin di server belum lengkap. Pastikan KIRIMMOBIL_ADMIN_EMAIL, KIRIMMOBIL_ADMIN_PASSWORD (minimal 12 karakter), dan SESSION_SECRET (minimal 32 karakter) sudah diatur.'
        : 'Email atau kata sandi tidak valid, atau konfigurasi admin belum lengkap.');
    }
  }
  return <div className="admin-signin"><div className="admin-signin-card">
    <Link href="/" className="mb-6 flex justify-center"><img className="w-[220px]" src={logoPath} alt="Kirimmobil.com"/></Link>
    <ShieldCheck size={32} className="mx-auto text-[#102C63]"/>
    <p className="eyebrow section-label mt-5">AREA KIRIMMOBIL</p>
    <h1 className="mt-2 text-2xl font-extrabold text-[#102C63]">Masuk sebagai admin</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">Gunakan email dan kata sandi admin yang dikonfigurasi untuk proyek ini.</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">Admin: konfigurasi KIRIMMOBIL_ADMIN_EMAIL, KIRIMMOBIL_ADMIN_PASSWORD (minimal 12 karakter), dan SESSION_SECRET (minimal 32 karakter) pada environment server.</p>
    <form className="mt-6 grid gap-4 text-left" onSubmit={(e)=>void submit(e)}>
      <label className="text-sm font-semibold text-slate-700">Email<input className="form-control mt-1" type="email" autoComplete="username" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>
      <label className="text-sm font-semibold text-slate-700">Kata sandi<input className="form-control mt-1" type="password" autoComplete="current-password" minLength={12} maxLength={256} required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
      {error&&<p role="alert" className="text-sm text-[#E60012]">{error}</p>}
      <button className="btn-main w-full justify-center" disabled={login.isPending}>{login.isPending?'Memeriksa…':'Masuk'}</button>
    </form>
    <Link href="/" className="mt-5 inline-block text-sm font-semibold text-slate-500">Kembali ke situs publik</Link>
  </div></div>;
}
function Router(){return <Switch><Route path="/" component={Home}/><Route path="/about" component={AboutPage}/><Route path="/services" component={ServicesPage}/><Route path="/rates" component={RatesPage}/><Route path="/schedules" component={SchedulesPage}/><Route path="/documentation" component={DocumentationPage}/><Route path="/testimonials" component={TestimonialsPage}/><Route path="/faq" component={FaqPage}/><Route path="/contact" component={ContactPage}/><Route path="/admin/login" component={AdminLogin}/><Route path="/admin" component={()=> <ProtectedAdmin page="/admin"/>}/><Route path="/admin/rates" component={()=> <ProtectedAdmin page="/admin/rates"/>}/><Route path="/admin/schedules" component={()=> <ProtectedAdmin page="/admin/schedules"/>}/><Route path="/admin/gallery" component={()=> <ProtectedAdmin page="/admin/gallery"/>}/><Route path="/admin/pages" component={()=> <ProtectedAdmin page="/admin/pages"/>}/><Route path="/admin/content" component={()=> <ProtectedAdmin page="/admin/content"/>}/><Route path="/admin/settings" component={()=> <ProtectedAdmin page="/admin/settings"/>}/><Route path="/admin/audit-log" component={()=> <ProtectedAdmin page="/admin/audit-log"/>}/><Route component={NotFound}/></Switch>}
function App(){return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><PageCopyProvider><SeoMetadata/><Router/></PageCopyProvider></WouterRouter></QueryClientProvider>}
export default App;
