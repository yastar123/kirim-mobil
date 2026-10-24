import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
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
  getListPublicSchedulesQueryKey, getListStaffQueryKey, getGetRateQuoteQueryKey,
  useCreateContent, useCreateDelivery, useCreateRate, useCreateSchedule, useDeleteContent,
  useDeleteDelivery, useDeleteRate, useDeleteSchedule, useGetAdminOverview, useGetAdminSession,
  useGetAdminSettings, useGetPublicContact, useGetRateQuote, useListAdminContent,
  useListAdminDeliveries, useListAdminRates, useListAdminSchedules, useListAuditLog,
  useListPublicContent, useListPublicDeliveries, useListPublicRates, useListPublicSchedules,
  useListStaff, useRemoveStaffRole, useUpdateAdminSettings, useUpdateContent, useUpdateDelivery,
  useUpdateRate, useUpdateSchedule, useUpsertStaffRole,
} from '@workspace/api-client-react';
import type {
  ContentEntry, ContentInput, Delivery, DeliveryInput, Rate, RateInput, Schedule, ScheduleInput,
  SiteSettings, StaffMember,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: '#102C63', colorForeground: '#1F2937', colorMutedForeground: '#657184',
    colorBackground: '#FFFFFF', colorInput: '#FFFFFF', colorInputForeground: '#1F2937',
    colorDanger: '#E60012', colorNeutral: '#102C63', fontFamily: 'DM Sans',
  },
};
function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const mainNav = [
  ['/about', 'Tentang Kami'], ['/services', 'Layanan'], ['/rates', 'Tarif'],
  ['/schedules', 'Jadwal'], ['/documentation', 'Dokumentasi'],
];
const fmt = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
const dateFmt = (v?: string | null) => v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(v)) : 'Belum tersedia';
const human = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
function whatsappUrl(number: string, message: string) {
  const digits = number.replace(/\D/g, '');
  const internationalNumber = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return internationalNumber ? `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}` : undefined;
}
function storedMediaUrl(path: string) {
  return `${basePath}/api/storage/objects/${path.replace(/^\/objects\//, '')}`;
}

const seoPages: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Pengiriman Mobil Antarkota & Antarpulau | Kirimmobil.com',
    description: 'Rencanakan pengiriman kendaraan dengan informasi rute, estimasi tarif, jadwal, dan dokumentasi yang dipublikasikan setelah dikonfirmasi.',
  },
  '/about': {
    title: 'Tentang Kirimmobil.com | Profil Perusahaan',
    description: 'Kenali Kirimmobil.com dan cara kami menyajikan informasi pengiriman kendaraan secara terbuka dan bertanggung jawab.',
  },
  '/services': {
    title: 'Layanan Pengiriman Kendaraan | Kirimmobil.com',
    description: 'Lihat pilihan layanan pengiriman kendaraan dan persiapan dokumen. Ketersediaan metode mengikuti konfirmasi rute.',
  },
  '/rates': {
    title: 'Cek Estimasi Tarif Kirim Mobil | Kirimmobil.com',
    description: 'Cek estimasi tarif pengiriman berdasarkan rute, kategori kendaraan, dan metode yang telah dipublikasikan.',
  },
  '/schedules': {
    title: 'Jadwal Pengiriman Kendaraan | Kirimmobil.com',
    description: 'Tinjau jadwal keberangkatan dan status operasional kendaraan dari informasi yang telah dikonfirmasi.',
  },
  '/documentation': {
    title: 'Dokumentasi Pengiriman Kendaraan | Kirimmobil.com',
    description: 'Lihat dokumentasi perjalanan kendaraan yang dipublikasikan dengan persetujuan dan perlindungan identitas.',
  },
  '/testimonials': {
    title: 'Cerita Pelanggan | Kirimmobil.com',
    description: 'Baca cerita pelanggan yang telah mendapat persetujuan untuk ditampilkan.',
  },
  '/faq': {
    title: 'FAQ & Ketentuan Pengiriman | Kirimmobil.com',
    description: 'Temukan jawaban atas pertanyaan umum seputar proses dan persiapan pengiriman kendaraan.',
  },
  '/contact': {
    title: 'Kontak Resmi Kirimmobil.com',
    description: 'Lihat kanal komunikasi, alamat, jam layanan, dan peta Kirimmobil.com yang telah dikonfirmasi.',
  },
};

function SeoMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.split(/[?#]/, 1)[0] || '/';
    const page = seoPages[path];
    const title = page?.title ?? 'Area staf | Kirimmobil.com';
    const description = page?.description ?? 'Area staf Kirimmobil.com.';
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
  }, [location]);
  return null;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="topbar">
    <div className="container-wide flex h-[76px] items-center justify-between gap-6">
      <Link href="/" className="shrink-0" aria-label="Kirimmobil beranda"><img src={`${basePath}/kirimmobil-logo.png`} alt="Kirimmobil.com" className="h-auto w-[184px]" /></Link>
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
      <div><img src={`${basePath}/kirimmobil-logo.png`} alt="Kirimmobil.com" className="mb-4 w-[205px] rounded bg-white p-1" /><p className="max-w-sm text-sm leading-6 text-blue-100">Pengiriman kendaraan antarkota dan antarpulau. Informasi yang belum terverifikasi kami tandai dengan jelas.</p></div>
      <div><p className="eyebrow mb-4 text-blue-200">Jelajahi</p><div className="grid grid-cols-2 gap-3 text-sm text-blue-50">{[['/about','Tentang'],['/services','Layanan'],['/rates','Tarif'],['/schedules','Jadwal'],['/documentation','Dokumentasi'],['/faq','FAQ']].map(([to,label])=><Link key={to} href={to} className="hover:text-white">{label}</Link>)}</div></div>
      <div><p className="eyebrow mb-4 text-blue-200">Informasi</p><div className="grid gap-3 text-sm text-blue-50"><Link href="/contact">Kontak resmi</Link><Link href="/testimonials">Cerita pelanggan</Link><Link href="/admin/login">Area staf</Link></div><p className="mt-6 text-xs text-blue-200">© {new Date().getFullYear()} Kirimmobil.com</p></div>
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
  const rates = useListPublicRates();
  const schedules = useListPublicSchedules();
  const deliveries = useListPublicDeliveries();
  return <PublicLayout>
    <section className="hero-logistics hero-editorial min-h-[560px] text-white md:min-h-[625px]">
      <div className="container-wide relative z-[1] flex min-h-[560px] items-center py-16 md:min-h-[625px]">
        <div className="max-w-[690px] page-enter"><p className="eyebrow mb-6 inline-flex items-center gap-3 text-blue-100"><span className="h-[2px] w-8 bg-[#E60012]" /> LOGISTIK KENDARAAN · INDONESIA</p>
          <h1 className="max-w-3xl text-[42px] font-extrabold leading-[1.04] tracking-[-.045em] md:text-[68px]">Sebelum mobil berangkat,<br /><span className="text-blue-200">semua harus jelas.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-blue-50 md:text-lg">Temukan rute, tarif, dan jadwal yang telah dikonfirmasi. Jika informasi belum tersedia, kami tandai—bukan menebak.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/rates" className="btn-main btn-red">Cek tarif terbit <ArrowRight size={17} /></Link><Link href="/schedules" className="inline-flex min-h-12 items-center gap-2 border border-white/55 px-5 text-sm font-bold text-white hover:bg-white/10">Lihat jadwal <CalendarDays size={16} /></Link></div>
          <p className="mt-5 text-xs text-blue-100">Estimasi hanya tersedia untuk rute yang sudah memiliki tarif terpublikasi.</p>
        </div>
        <div className="hero-photo-note absolute bottom-6 right-0 hidden items-center gap-3 px-4 py-3 text-xs text-blue-100 md:flex"><Truck size={18} /><span>Foto ilustrasi, bukan dokumentasi pengiriman</span></div>
      </div>
    </section>
    <section className="home-stats container-wide -mt-8 relative z-[2] grid gap-0 md:grid-cols-3">
      {[{icon:<RouteIcon/>,label:'Tarif terpublikasi',value:rates.data?.length ?? null,link:'/rates',suffix:'rute tersedia'},{icon:<CalendarDays/>,label:'Jadwal aktif',value:schedules.data?.length ?? null,link:'/schedules',suffix:'jadwal ditampilkan'},{icon:<PackageCheck/>,label:'Dokumentasi',value:deliveries.data?.length ?? null,link:'/documentation',suffix:'kiriman terpublikasi'}].map((item)=><Link href={item.link} key={item.label} className="home-stat-card flex min-h-[120px] items-center gap-4 px-5 py-5"><span className="home-stat-icon flex h-11 w-11 shrink-0 items-center justify-center text-[#102C63]">{item.icon}</span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[.09em] text-slate-500">{item.label}</span><span className="mt-1 block text-xl font-extrabold text-[#102C63]">{item.value === null ? '—' : item.value}<small className="ml-2 text-xs font-medium text-slate-500">{item.suffix}</small></span></span><ArrowUpRight size={17} className="ml-auto text-slate-400" /></Link>)}
    </section>
    <section className="home-process container-wide grid gap-12 py-24 md:grid-cols-[.9fr_1.1fr] md:items-center">
      <div><p className="eyebrow section-label mb-4">Dibuat untuk perjalanan kendaraan</p><h2 className="text-3xl font-extrabold leading-tight text-[#102C63] md:text-5xl">Perjelas proses.<br />Jaga kepercayaan.</h2><p className="mt-5 max-w-lg leading-7 text-slate-600">Sebelum mengirim, pahami pilihan metode, rincian tarif, jadwal keberangkatan, serta dokumen yang perlu disiapkan. Setiap informasi di situs ini mengikuti data yang dikonfirmasi oleh tim.</p><Link href="/services" className="mt-7 inline-flex items-center gap-2 font-bold text-[#102C63]">Kenali layanan <ArrowRight size={16} /></Link></div>
      <div className="grid gap-3">
        {[['01','Pilih rute','Masukkan kota asal, tujuan, kategori kendaraan, dan metode pengiriman.'],['02','Tinjau informasi','Bandingkan rincian biaya, hal yang termasuk, dan ketentuan yang belum termasuk.'],['03','Siapkan dokumen','Baca panduan dokumen sebelum mengatur penyerahan kendaraan.']].map(([n,t,d])=><div key={n} className="flex gap-5 border-b border-slate-200 py-5"><span className="font-mono text-sm font-bold text-[#E60012]">{n}</span><div><h3 className="font-bold text-[#102C63]">{t}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{d}</p></div></div>)}
      </div>
    </section>
    <section className="bg-white py-20"><div className="container-wide grid gap-8 md:grid-cols-[1fr_1fr] md:items-center"><div><p className="eyebrow section-label mb-3">Transparansi</p><h2 className="text-3xl font-extrabold text-[#102C63] md:text-4xl">Yang kami tampilkan harus bisa dipertanggungjawabkan.</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">Tarif dan jadwal ditampilkan hanya dari data publik yang tersedia. Dokumentasi pengiriman membutuhkan persetujuan publikasi dan perlindungan identitas kendaraan.</p></div><div className="flex flex-wrap gap-3">{[['Tarif terverifikasi', '/rates', <BadgeCheck/>],['Jadwal operasional','/schedules',<Clock3/>],['Dokumentasi berizin','/documentation',<ShieldCheck/>]].map(([label,to,icon])=><Link href={String(to)} key={String(label)} className="flex min-h-[66px] flex-1 items-center gap-3 border border-slate-200 px-4 text-sm font-bold text-[#102C63]">{icon}{label}<ChevronRight size={15} className="ml-auto" /></Link>)}</div></div></section>
    <section className="container-wide py-20"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow section-label mb-3">Jadwal terbit</p><h2 className="text-3xl font-extrabold text-[#102C63]">Keberangkatan mendatang</h2></div><Link href="/schedules" className="inline-flex items-center gap-2 text-sm font-bold text-[#102C63]">Semua jadwal <ArrowRight size={16}/></Link></div><div className="mt-7">{schedules.isLoading?<SkeletonCards/>:schedules.isError?<LoadError retry={()=>void schedules.refetch()}/>:schedules.data?.length?<ScheduleCards schedules={schedules.data.slice(0,2)}/>:<EmptyState title="Belum ada jadwal terbit">Jadwal akan muncul di sini setelah rincian perjalanan dikonfirmasi.</EmptyState>}</div></section>
    <section className="bg-[#eaf0f7] py-14"><div className="container-wide flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"><div><p className="eyebrow section-label mb-2">Mulai dari informasi rute</p><h2 className="text-2xl font-extrabold text-[#102C63]">Cek estimasi sebelum menghubungi tim.</h2><p className="mt-2 text-sm text-slate-600">Nominal estimasi hanya tersedia jika rute telah memiliki tarif terpublikasi.</p></div><Link href="/rates" className="btn-main">Buka estimator tarif <ArrowRight size={17}/></Link></div></section>
  </PublicLayout>;
}
function SkeletonCards() { return <div className="grid gap-4 md:grid-cols-2">{[1,2].map((x)=><div key={x} className="panel p-6"><div className="skeleton mb-4 h-4 w-28"/><div className="skeleton mb-3 h-6 w-3/4"/><div className="skeleton h-4 w-1/2"/></div>)}</div>; }
function ScheduleCards({ schedules }: { schedules: Schedule[] }) {
  return <div className="grid gap-4 md:grid-cols-2">{schedules.map(s=><article className="panel p-6" key={s.id}><div className="flex items-center justify-between gap-4"><span className="eyebrow text-slate-500">{s.operator}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#102C63]">{human(s.status)}</span></div><div className="route-line mt-5 grid gap-3 pl-6"><div className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-[#102C63] bg-white"/><p className="text-xs text-slate-500">Asal</p><p className="font-bold text-[#102C63]">{s.origin}</p></div><div className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-[#E60012]"/><p className="text-xs text-slate-500">Tujuan</p><p className="font-bold text-[#102C63]">{s.destination}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><span className="text-xs text-slate-500">ETD</span><p className="font-semibold">{dateFmt(s.etd)}</p></div><div><span className="text-xs text-slate-500">ETA</span><p className="font-semibold">{dateFmt(s.eta)}</p></div></div>{s.verifiedSlots !== null && <p className="mt-4 text-xs text-slate-500">Slot terverifikasi: {s.verifiedSlots}</p>}</article>)}</div>;
}
function AboutPage() {
  const contact=useGetPublicContact();
  return <PublicLayout><PageIntro eyebrow="Profil perusahaan" title="Identitas yang jelas. Informasi yang terbuka." lead="Kirimmobil.com membantu pelanggan memahami layanan pengiriman kendaraan dan menyiapkan perjalanan ke berbagai tujuan di Indonesia."/>
    <section className="container-wide grid gap-12 py-16 md:grid-cols-[1fr_.8fr]"><div><h2 className="text-2xl font-extrabold text-[#102C63]">Tentang Kirimmobil</h2><p className="mt-4 leading-7 text-slate-600">Kami membangun layanan informasi dan pengiriman kendaraan yang memudahkan pelanggan merencanakan rute, meninjau tarif, serta memahami proses dokumentasi sebelum kendaraan diberangkatkan.</p><p className="mt-4 leading-7 text-slate-600">Komitmen kami adalah menyampaikan informasi sesuai data yang tersedia, bukan membuat klaim yang belum dapat diverifikasi.</p></div><div className="panel p-6"><div className="mb-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded bg-[#eef2f8] text-[#102C63]"><ShieldCheck/></span><h3 className="text-lg font-bold text-[#102C63]">Status verifikasi</h3></div><p className="text-sm leading-6 text-slate-600">Informasi legal perusahaan, alamat kantor, dan kanal kontak resmi hanya ditampilkan jika telah dikonfirmasi.</p>{contact.isLoading?<div className="skeleton mt-5 h-14"/>:contact.isError?<div className="mt-5 text-sm text-slate-500">Status informasi resmi belum dapat dimuat. Silakan coba kembali.</div>:<div className="mt-5 grid gap-2">{[['Nama perusahaan',contact.data?.companyName || 'Belum dikonfirmasi'],['Alamat kantor',contact.data?.officeAddress || 'Belum dikonfirmasi']].map(([k,v])=><div className="flex justify-between gap-4 border-t border-slate-100 py-3 text-sm" key={k}><span className="text-slate-500">{k}</span><span className="text-right font-semibold text-slate-700">{v}</span></div>)}</div>}</div></section>
    <section className="bg-white py-14"><div className="container-wide grid gap-6 md:grid-cols-3">{[['Terbuka','Rincian tarif, metode, dan pengecualian dijelaskan sebelum pengiriman.'],['Bertanggung jawab','Cerita pengiriman hanya dipublikasikan dengan persetujuan yang tercatat.'],['Terukur','Jadwal dan kuota ditampilkan berdasarkan data operasional terverifikasi.']].map(([h,p])=><div className="border-l-2 border-[#E60012] pl-5" key={h}><h3 className="font-bold text-[#102C63]">{h}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{p}</p></div>)}</div></section>
  </PublicLayout>;
}
function ServicesPage() {
  return <PublicLayout><PageIntro eyebrow="Layanan" title="Pilihan pengiriman kendaraan, sesuai rute dan kebutuhan." lead="Rincian layanan operasional dapat berbeda menurut rute. Pastikan metode, jadwal, perlindungan, dan ketentuan tambahan telah dikonfirmasi sebelum pemesanan."/>
    <section className="container-wide py-14"><div className="grid gap-5 md:grid-cols-2">{[{icon:<Ship/>,title:'Pengiriman antarpulau',text:'Pengangkutan kendaraan lintas pulau mengikuti ketersediaan rute dan jadwal yang diterbitkan.'},{icon:<Truck/>,title:'Pengiriman melalui darat',text:'Untuk rute yang tersedia, pilihan pengiriman darat bergantung pada kategori kendaraan dan konfirmasi operasional.'},{icon:<ShieldCheck/>,title:'Informasi perlindungan',text:'Status asuransi dan batas perlindungan dicantumkan pada tarif yang berlaku, jika sudah dikonfirmasi.'},{icon:<FileCheck2/>,title:'Persiapan dokumen',text:'Panduan dokumen membantu pemilik kendaraan menyiapkan berkas sebelum serah terima.'}].map((x)=><article key={x.title} className="panel flex gap-5 p-6 md:p-8"><span className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#eef2f8] text-[#102C63]">{x.icon}</span><div><h2 className="text-xl font-bold text-[#102C63]">{x.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{x.text}</p></div></article>)}</div><div className="mt-8 border-l-4 border-[#E60012] bg-white p-5 text-sm leading-6 text-slate-600">Tidak ada metode atau rute yang diasumsikan tersedia. Periksa tarif dan jadwal terbaru pada halaman terkait.</div><Link href="/rates" className="btn-main mt-8">Periksa tarif rute <ArrowRight size={16}/></Link></section></PublicLayout>;
}
function RatesPage() {
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
  return <PublicLayout><PageIntro eyebrow="Tarif pengiriman" title="Mulai dengan estimasi rute." lead="Masukkan kota asal dan tujuan untuk melihat estimasi dari tarif terpublikasi. Estimasi bukan konfirmasi pemesanan."/>
    <section className="container-wide grid gap-8 py-12 lg:grid-cols-[.95fr_1.05fr]"><form onSubmit={submit} className="panel p-6 md:p-8"><h2 className="text-xl font-extrabold text-[#102C63]">Estimasi biaya</h2><p className="mt-2 text-sm leading-6 text-slate-500">Pilih detail kendaraan dan metode jika sudah diketahui.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Kota asal<input className="form-control mt-2" placeholder="Contoh: kota asal" value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})} required data-testid="input-origin"/></label><label className="text-sm font-semibold">Kota tujuan<input className="form-control mt-2" placeholder="Contoh: kota tujuan" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} required data-testid="input-destination"/></label><label className="text-sm font-semibold">Kategori kendaraan<select className="form-control mt-2" value={form.vehicleCategory} onChange={e=>setForm({...form,vehicleCategory:e.target.value as typeof form.vehicleCategory})}><option value="small">Kecil</option><option value="medium">Sedang</option><option value="large">Besar</option></select></label><label className="text-sm font-semibold">Metode pengiriman <span className="font-normal text-slate-400">(opsional)</span><input className="form-control mt-2" placeholder="Sesuai tarif yang tersedia" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}/></label></div><button className="btn-main mt-6 w-full" type="submit" data-testid="button-get-quote">Tampilkan estimasi <ArrowRight size={16}/></button></form>
      <div className="space-y-4">{!submitted?<div className="flex min-h-[220px] flex-col justify-center border border-dashed border-slate-300 bg-white p-7"><RouteIcon className="text-[#102C63]"/><h3 className="mt-4 text-lg font-bold text-[#102C63]">Tarif disesuaikan dengan rute</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Isi kota asal dan tujuan. Jika rute belum memiliki harga terpublikasi, kami akan menyatakannya tanpa membuat perkiraan sendiri.</p></div>:quote.isLoading?<div className="panel p-7"><div className="skeleton h-5 w-40"/><div className="skeleton mt-5 h-10 w-64"/><div className="skeleton mt-6 h-4 w-full"/></div>:quote.isError?<LoadError retry={()=>void quote.refetch()} message="Permintaan estimasi belum berhasil. Coba lagi."/>:quote.data?<div className="panel border-t-4 border-t-[#102C63] p-7"><p className="eyebrow text-slate-500">{quote.data.origin} → {quote.data.destination}</p><h3 className="mt-3 text-xl font-extrabold text-[#102C63]">{quote.data.available&&quote.data.estimatedPrice!==null?fmt(quote.data.estimatedPrice):'Tarif belum tersedia'}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{quote.data.message}</p>{quote.data.available&&<div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm"><p><strong>Metode:</strong> {quote.data.method}</p><p><strong>Asuransi:</strong> {quote.data.insuranceIncluded?'Termasuk':'Tidak termasuk / perlu dikonfirmasi'}</p>{quote.data.inclusions&&<p><strong>Termasuk:</strong> {quote.data.inclusions}</p>}{quote.data.exclusions&&<p><strong>Belum termasuk:</strong> {quote.data.exclusions}</p>}</div>}</div>:null}
       {quoteWhatsapp&&<a className="btn-main btn-red w-full" href={quoteWhatsapp} target="_blank" rel="noreferrer">Konsultasi via WhatsApp <ArrowUpRight size={16}/></a>}{quote.data&&!contact.isLoading&&!contact.data?.whatsappNumber&&<div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Nomor WhatsApp resmi belum dikonfigurasi. Silakan gunakan halaman kontak untuk melihat kanal yang tersedia.</div>}</div></section>
    <section className="bg-white py-12"><div className="container-wide"><div className="flex items-end justify-between"><div><p className="eyebrow section-label">Daftar tarif</p><h2 className="mt-2 text-2xl font-extrabold text-[#102C63]">Tarif terpublikasi</h2></div></div><div className="mt-5">{rates.isLoading?<div className="skeleton h-28"/>:rates.isError?<LoadError retry={()=>void rates.refetch()}/>:rates.data?.length?<div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-3">Rute</th><th>Kendaraan</th><th>Metode</th><th>Harga</th><th>Berlaku sampai</th></tr></thead><tbody>{rates.data.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="py-4 font-semibold text-[#102C63]">{r.origin} → {r.destination}</td><td>{human(r.vehicleCategory)}</td><td>{r.method}</td><td className="font-bold">{fmt(r.price)}</td><td>{dateFmt(r.validUntil)}</td></tr>)}</tbody></table></div>:<EmptyState title="Belum ada tarif publik">Tarif akan ditampilkan setelah rute dan ketentuannya dikonfirmasi.</EmptyState>}</div></div></section>
  </PublicLayout>;
}
function SchedulesPage() {
  const q=useListPublicSchedules();
  return <PublicLayout><PageIntro eyebrow="Jadwal keberangkatan" title="Perjalanan yang direncanakan, ditampilkan apa adanya." lead="Cek jadwal, status, tanggal keberangkatan, dan estimasi tiba. Informasi slot hanya dicantumkan jika telah terverifikasi."/><section className="container-wide py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<ScheduleCards schedules={q.data}/>:<EmptyState title="Belum ada jadwal yang dipublikasikan">Jadwal baru akan muncul setelah operator, rute, serta tanggal keberangkatan dan kedatangan dikonfirmasi.</EmptyState>}</section></PublicLayout>;
}
function DocumentationPage() {
  const deliveries=useListPublicDeliveries();
  return <PublicLayout><PageIntro eyebrow="Dokumentasi pengiriman" title="Catatan perjalanan, dengan persetujuan." lead="Dokumentasi publik hanya memuat cerita yang telah mendapat persetujuan publikasi dan memenuhi perlindungan identitas kendaraan."/>
  <section className="container-wide py-12">{deliveries.isLoading?<SkeletonCards/>:deliveries.isError?<LoadError retry={()=>void deliveries.refetch()}/>:deliveries.data?.length?<div className="grid gap-5 md:grid-cols-2">{deliveries.data.map(d=><DeliveryCard key={d.id} d={d}/>)}</div>:<EmptyState title="Belum ada dokumentasi publik">Belum ada cerita pengiriman yang memenuhi persyaratan publikasi. Kami tidak menggunakan gambar ilustrasi sebagai bukti pengiriman.</EmptyState>}</section></PublicLayout>;
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
function TestimonialsPage(){const q=useListPublicContent({kind:'testimonial'});return <PublicLayout><PageIntro eyebrow="Cerita pelanggan" title="Cerita hanya ditampilkan dengan izin." lead="Pendapat pelanggan bukan materi promosi tanpa persetujuan. Halaman ini memuat testimonial yang telah mendapat persetujuan publikasi."/><section className="container-wide py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="grid gap-5 md:grid-cols-2">{q.data.map(x=><article key={x.id} className="panel p-7"><div className="mb-4 text-3xl font-serif text-[#E60012]">“</div><h2 className="text-lg font-bold text-[#102C63]">{x.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{x.body}</p></article>)}</div>:<EmptyState title="Belum ada cerita yang disetujui">Testimonial akan muncul setelah isi dan persetujuan publikasi dikonfirmasi.</EmptyState>}</section></PublicLayout>}
function FaqPage(){const q=useListPublicContent({kind:'faq'});return <PublicLayout><PageIntro eyebrow="Bantuan" title="Pertanyaan sebelum mengirim kendaraan." lead="Jawaban operasional ditampilkan dari informasi resmi yang telah diterbitkan."/><section className="container-wide max-w-4xl py-12">{q.isLoading?<SkeletonCards/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="grid gap-3">{q.data.map(f=><details key={f.id} className="panel group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#102C63]">{f.title}<ChevronDown size={18} className="transition group-open:rotate-180"/></summary><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{f.body}</p></details>)}</div>:<EmptyState title="FAQ belum diterbitkan">Informasi jawaban resmi akan ditambahkan setelah ditinjau tim Kirimmobil.</EmptyState>}</section></PublicLayout>}
function ContactPage(){const q=useGetPublicContact();return <PublicLayout><PageIntro eyebrow="Kontak" title="Hubungi Kirimmobil melalui kanal resmi." lead="Kami hanya menampilkan kontak yang telah dikonfigurasi dan dikonfirmasi. Tidak ada nomor atau alamat yang diasumsikan."/><section className="container-wide grid gap-6 py-12 md:grid-cols-2">{q.isLoading?<div className="skeleton h-56"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<><div className="panel p-7"><h2 className="text-xl font-extrabold text-[#102C63]">Kanal komunikasi</h2><div className="mt-5 grid gap-4 text-sm">{q.data?.whatsappNumber?<div className="border-t border-slate-100 pt-4"><p className="text-slate-500">WhatsApp</p>{whatsappUrl(q.data.whatsappNumber,'Halo Kirimmobil, saya ingin berkonsultasi tentang pengiriman kendaraan.')?<a className="mt-1 inline-block font-bold text-[#102C63] underline" href={whatsappUrl(q.data.whatsappNumber,'Halo Kirimmobil, saya ingin berkonsultasi tentang pengiriman kendaraan.')} target="_blank" rel="noreferrer">{q.data.whatsappNumber}</a>:<p className="mt-1 font-bold">{q.data.whatsappNumber}</p>}</div>:<div className="border-t border-slate-100 pt-4 text-slate-600">Nomor WhatsApp resmi belum dikonfigurasi.</div>}{q.data?.officeHours&&<div className="border-t border-slate-100 pt-4"><p className="text-slate-500">Jam operasional</p><p className="mt-1 font-bold">{q.data.officeHours}</p></div>}{q.data?.instagramUrl&&<a href={q.data.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-[#102C63]"><Instagram size={17}/> Instagram resmi</a>}</div></div><div className="panel p-7"><h2 className="text-xl font-extrabold text-[#102C63]">Alamat kantor</h2>{q.data?.officeAddress?<p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-1 shrink-0"/>{q.data.officeAddress}</p>:<p className="mt-4 text-sm leading-6 text-slate-600">Alamat kantor belum dikonfirmasi untuk ditampilkan.</p>}{q.data?.mapUrl&&<a href={q.data.mapUrl} target="_blank" rel="noreferrer" className="btn-ghost mt-5">Buka peta <ArrowUpRight size={15}/></a>}</div></>}</section></PublicLayout>}

const adminNavigation=[
  {path:'/admin',label:'Ikhtisar',icon:Gauge},
  {path:'/admin/rates',label:'Tarif',icon:RouteIcon},
  {path:'/admin/schedules',label:'Jadwal',icon:CalendarDays},
  {path:'/admin/gallery',label:'Dokumentasi',icon:PackageCheck},
  {path:'/admin/content',label:'Konten',icon:FileText},
  {path:'/admin/settings',label:'Pengaturan',icon:ShieldCheck},
  {path:'/admin/staff',label:'Staf',icon:BadgeCheck},
  {path:'/admin/audit-log',label:'Audit log',icon:Clock3},
];
function canAccessAdminPath(role:StaffMember['role'],path:string){
  if(role==='owner'||path==='/admin'||path==='/admin/audit-log')return true;
  if(role==='admin_operations')return ['/admin/rates','/admin/schedules'].includes(path);
  return ['/admin/gallery','/admin/content','/admin/settings'].includes(path);
}
function AdminGate({children}:{children:ReactNode}){
  const [location]=useLocation();
  const session=useGetAdminSession({query:{retry:false,queryKey:getGetAdminSessionQueryKey()}});
  if(session.isLoading)return <div className="admin-loading"><div className="w-72 space-y-3"><div className="skeleton h-8 w-44"/><div className="skeleton h-4 w-full"/><div className="skeleton h-4 w-4/5"/></div></div>;
  if(session.isError||!session.data)return <div className="admin-signin"><div className="admin-signin-card"><ShieldCheck size={32} className="mx-auto text-[#102C63]"/><p className="eyebrow section-label mt-5">AREA KIRIMMOBIL</p><h1 className="mt-2 text-2xl font-extrabold text-[#102C63]">Masuk ke ruang kerja</h1><p className="mt-3 text-sm leading-6 text-slate-600">Gunakan akun staf yang sudah diberi akses. Jika akun Anda belum terdaftar, hubungi owner.</p><Link href="/sign-in" className="btn-main mt-6 w-full">Masuk dengan akun staf <ArrowRight size={16}/></Link><Link href="/" className="mt-4 inline-block text-sm font-semibold text-slate-500">Kembali ke situs publik</Link></div></div>;
  const role=session.data.role;
  const activePath=location;
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><Link href="/admin" aria-label="Kirimmobil admin"><img src={`${basePath}/kirimmobil-logo.png`} alt="Kirimmobil" /></Link></div>
      <div className="admin-profile"><p className="eyebrow">RUANG KERJA</p><p className="mt-2 truncate text-sm font-bold">{session.data.displayName||session.data.email}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-blue-200">{human(role)}</p></div>
      <nav className="admin-nav" aria-label="Navigasi admin">
        {adminNavigation.filter((item)=>canAccessAdminPath(role,item.path)).map(({path,label,icon:Icon})=><Link key={path} href={path} aria-current={activePath===path?'page':undefined} className={`admin-nav-link ${activePath===path?'is-active':''}`}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></Link>)}
      </nav>
      <Link href="/" className="admin-public-link">Lihat situs publik <ArrowUpRight size={14}/></Link>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><div><p className="eyebrow text-slate-400">KIRIMMOBIL · CMS</p><p className="mt-1 text-sm font-bold text-[#102C63]">{human(activePath.split('/').pop()||'overview')}</p></div><div className="min-w-0 text-right"><p className="truncate text-sm font-semibold text-slate-700">{session.data.displayName||session.data.email}</p><p className="truncate text-xs text-slate-500">{human(role)} · {session.data.email}</p></div></header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
function AdminHeading({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:ReactNode}){return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow section-label">{eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold text-[#102C63]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{desc}</p></div>{action}</div>}
function AdminHome({role}:{role:StaffMember['role']}){
  const q=useGetAdminOverview();
  const quickLinks=role==='owner'
    ?[{label:'Tarif',href:'/admin/rates',icon:RouteIcon},{label:'Jadwal',href:'/admin/schedules',icon:CalendarDays},{label:'Dokumentasi',href:'/admin/gallery',icon:PackageCheck},{label:'Konten',href:'/admin/content',icon:FileText},{label:'Pengaturan',href:'/admin/settings',icon:ShieldCheck},{label:'Manajemen staf',href:'/admin/staff',icon:BadgeCheck}]
    :role==='admin_operations'
      ?[{label:'Tarif',href:'/admin/rates',icon:RouteIcon},{label:'Jadwal',href:'/admin/schedules',icon:CalendarDays}]
      :[{label:'Dokumentasi',href:'/admin/gallery',icon:PackageCheck},{label:'Konten',href:'/admin/content',icon:FileText},{label:'Pengaturan',href:'/admin/settings',icon:ShieldCheck}];
  const primary=role==='admin_content'?{href:'/admin/content',label:'Buka konten'}:{href:'/admin/rates',label:'Buka tarif'};
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

function ContentAdmin(){const q=useListAdminContent();const create=useCreateContent();const update=useUpdateContent();const del=useDeleteContent();const qc=useQueryClient();const [edit,setEdit]=useState<ContentEntry|null>(null);const [adding,setAdding]=useState(false);const [error,setError]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const data:ContentInput={kind:f.get('kind') as ContentInput['kind'],slug:String(f.get('slug')),title:String(f.get('title')),body:String(f.get('body')),status:f.get('status') as ContentInput['status'],publicationConsent:f.get('consent')==='on'};try{if(edit)await update.mutateAsync({id:edit.id,data});else await create.mutateAsync({data});setEdit(null);setAdding(false);await Promise.all([qc.invalidateQueries({queryKey:getListAdminContentQueryKey()}),qc.invalidateQueries({queryKey:getListPublicContentQueryKey()}),qc.invalidateQueries({queryKey:getGetAdminOverviewQueryKey()})]);}catch{setError('Konten gagal disimpan.')}}async function remove(c:ContentEntry){if(confirm(`Hapus konten “${c.title}”?`)){try{await del.mutateAsync({id:c.id});await Promise.all([qc.invalidateQueries({queryKey:getListAdminContentQueryKey()}),qc.invalidateQueries({queryKey:getListPublicContentQueryKey()})]);}catch{setError('Konten tidak dapat dihapus.')}}}return <><AdminHeading eyebrow="PUBLIKASI" title="Konten" desc="Kelola halaman, FAQ, dan testimonial. Testimonial membutuhkan persetujuan publikasi." action={<button onClick={()=>{setAdding(true);setEdit(null)}} className="btn-main"><Plus size={16}/> Buat konten</button>}/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="grid gap-3">{q.data?.map(c=><article key={c.id} className="panel flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{c.kind}</span><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{human(c.status)}</span>{c.kind==='testimonial'&&<span className="text-xs text-slate-500">{c.publicationConsent?'Persetujuan tercatat':'Belum ada persetujuan'}</span>}</div><p className="mt-2 font-bold text-[#102C63]">{c.title}</p><p className="text-xs text-slate-500">/{c.slug}</p></div><div className="flex gap-4"><button className="text-sm font-semibold text-[#102C63] underline" onClick={()=>{setEdit(c);setAdding(false)}}>Edit</button><button className="text-sm font-semibold text-[#E60012] underline" onClick={()=>void remove(c)}>Hapus</button></div></article>)}</div>}{!q.isLoading&&!q.isError&&!q.data?.length&&<EmptyState title="Belum ada konten">Buat entri konten dalam status draft sampai ditinjau.</EmptyState>}{error&&<p role="alert" className="mt-3 text-sm text-[#E60012]">{error}</p>}{(adding||edit)&&<Modal title={edit?'Edit konten':'Konten baru'} onClose={()=>{setEdit(null);setAdding(false)}}><form onSubmit={save} className="grid gap-4"><label className="text-sm font-semibold">Jenis<select name="kind" defaultValue={edit?.kind||'page'} className="form-control mt-1">{['page','faq','testimonial'].map(x=><option key={x} value={x}>{human(x)}</option>)}</select></label><label className="text-sm font-semibold">Slug<input name="slug" required defaultValue={edit?.slug||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Judul<input name="title" required defaultValue={edit?.title||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Isi<textarea name="body" rows={6} defaultValue={edit?.body||''} className="form-control mt-1"/></label><label className="text-sm font-semibold">Status<select name="status" defaultValue={edit?.status||'draft'} className="form-control mt-1"><option value="draft">Draft</option><option value="published">Terbit</option><option value="inactive">Nonaktif</option></select></label><label className="flex gap-2 text-sm"><input name="consent" type="checkbox" defaultChecked={edit?.publicationConsent}/> Persetujuan publikasi telah diperoleh / tidak diperlukan untuk jenis ini</label><p className="text-xs leading-5 text-slate-500">Jangan menerbitkan testimoni tanpa persetujuan eksplisit. Persetujuan harus dicatat terlebih dahulu.</p><div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={()=>{setEdit(null);setAdding(false)}}>Batal</button><button className="btn-main" disabled={create.isPending||update.isPending}>Simpan</button></div></form></Modal>}</>}
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
        if(!response.ok)throw new Error('Tidak dapat membuat URL unggah. Pastikan Anda masuk sebagai admin konten.');
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

function SettingsAdmin(){const q=useGetAdminSettings();const update=useUpdateAdminSettings();const qc=useQueryClient();const [saved,setSaved]=useState(false);async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await update.mutateAsync({data:{companyName:String(f.get('companyName')),whatsappNumber:String(f.get('whatsappNumber')||'')||null,officeAddress:String(f.get('officeAddress')||'')||null,officeHours:String(f.get('officeHours')||'')||null,mapUrl:String(f.get('mapUrl')||'')||null,instagramUrl:String(f.get('instagramUrl')||'')||null}});await Promise.all([qc.invalidateQueries({queryKey:getGetAdminSettingsQueryKey()}),qc.invalidateQueries({queryKey:getGetPublicContactQueryKey()})]);setSaved(true);}catch{setSaved(false)}}return <><AdminHeading eyebrow="SITUS" title="Pengaturan" desc="Informasi kontak publik. Kolom kosong tidak ditampilkan kepada pengunjung."/>{q.isLoading?<div className="skeleton h-48"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<form onSubmit={save} className="panel grid max-w-3xl gap-4 p-6 md:grid-cols-2">{[['companyName','Nama perusahaan',q.data?.companyName],['whatsappNumber','Nomor WhatsApp resmi',q.data?.whatsappNumber],['officeAddress','Alamat kantor',q.data?.officeAddress],['officeHours','Jam operasional',q.data?.officeHours],['mapUrl','URL peta',q.data?.mapUrl],['instagramUrl','Instagram URL',q.data?.instagramUrl]].map(([n,l,v])=><label key={String(n)} className="text-sm font-semibold text-slate-700">{l}<input name={String(n)} defaultValue={String(v??'')} className="form-control mt-1"/></label>)}<div className="md:col-span-2 flex items-center justify-between"><span className="text-xs text-emerald-700">{saved?'Pengaturan tersimpan.':''}</span><button disabled={update.isPending} className="btn-main">{update.isPending?'Menyimpan…':'Simpan pengaturan'}</button></div></form>}</>}
function StaffAdmin(){const q=useListStaff();const upsert=useUpsertStaffRole();const remove=useRemoveStaffRole();const qc=useQueryClient();const [err,setErr]=useState('');async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await upsert.mutateAsync({clerkUserId:String(f.get('clerkUserId')),data:{email:String(f.get('email')),displayName:String(f.get('displayName')),role:f.get('role') as StaffMember['role']}});e.currentTarget.reset();await qc.invalidateQueries({queryKey:getListStaffQueryKey()});}catch{setErr('Peran staf tidak dapat disimpan. Clerk user ID harus sudah dikenali.')}}async function drop(s:StaffMember){if(confirm(`Hapus akses staf ${s.email}?`)){try{await remove.mutateAsync({clerkUserId:s.clerkUserId});await qc.invalidateQueries({queryKey:getListStaffQueryKey()})}catch{setErr('Akses staf tidak dapat dihapus.')}}}return <><AdminHeading eyebrow="AKSES OWNER" title="Manajemen staf" desc="Halaman ini hanya tersedia bagi owner. Penetapan peran harus sesuai akun Clerk yang sudah terdaftar."/><form onSubmit={save} className="panel mb-7 grid gap-3 p-5 md:grid-cols-4"><label className="text-xs font-semibold">Clerk user ID<input name="clerkUserId" required className="form-control mt-1 text-sm"/></label><label className="text-xs font-semibold">Email akun<input name="email" type="email" required className="form-control mt-1 text-sm"/></label><label className="text-xs font-semibold">Nama tampilan<input name="displayName" required className="form-control mt-1 text-sm"/></label><label className="text-xs font-semibold">Peran<select name="role" className="form-control mt-1 text-sm"><option value="admin_content">Admin konten</option><option value="admin_operations">Admin operasional</option><option value="owner">Owner</option></select></label><button className="btn-main md:col-span-4 md:justify-self-end" disabled={upsert.isPending}><Plus size={15}/> Tambah / ubah akses</button></form>{err&&<p role="alert" className="mb-3 text-sm text-[#E60012]">{err}</p>}{q.isLoading?<div className="skeleton h-32"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:<div className="panel divide-y divide-slate-100">{q.data?.map(s=><div key={s.clerkUserId} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-bold text-[#102C63]">{s.displayName}</p><p className="text-sm text-slate-500">{s.email} · {human(s.role)}</p></div><button className="text-sm font-semibold text-[#E60012] underline" onClick={()=>void drop(s)}>Hapus akses</button></div>)}</div>}</>}
function AuditAdmin(){const q=useListAuditLog();return <><AdminHeading eyebrow="AKUNTABILITAS" title="Audit log" desc="Riwayat perubahan pada area staf. Log baca-saja untuk keterlacakan."/>{q.isLoading?<div className="skeleton h-40"/>:q.isError?<LoadError retry={()=>void q.refetch()}/>:q.data?.length?<div className="panel divide-y divide-slate-100">{q.data.map(a=><div key={a.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-[#102C63]">{a.summary}</p><p className="mt-1 text-xs text-slate-500">{a.actorEmail} · {a.entityType} · {a.action}</p></div><time className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString('id-ID')}</time></div>)}</div>:<EmptyState title="Belum ada aktivitas">Perubahan yang tercatat akan muncul di sini.</EmptyState>}</>}
function ProtectedAdmin({page}:{page:string}){
  const session=useGetAdminSession({query:{retry:false,queryKey:getGetAdminSessionQueryKey()}});
  if(session.data&&!canAccessAdminPath(session.data.role,page))return <AdminGate><div className="admin-denied"><CircleAlert className="text-[#E60012]"/><h1 className="mt-3 text-xl font-bold text-[#102C63]">Bagian ini belum tersedia untuk peran Anda</h1><p className="mt-2 text-sm leading-6 text-slate-500">Akses modul diatur berdasarkan peran staf. Hubungi owner jika Anda memerlukan akses tambahan.</p><Link href="/admin" className="btn-ghost mt-5">Kembali ke ikhtisar <ArrowRight size={15}/></Link></div></AdminGate>;
  return <AdminGate>{page==='/admin'?<AdminHome role={session.data?.role??'admin_operations'}/>:page==='/admin/rates'?<RatesAdmin/>:page==='/admin/schedules'?<SchedulesAdmin/>:page==='/admin/gallery'?<GalleryAdmin/>:page==='/admin/content'?<ContentAdmin/>:page==='/admin/settings'?<SettingsAdmin/>:page==='/admin/staff'?<StaffAdmin/>:<AuditAdmin/>}</AdminGate>;
}
function AdminLogin(){return <Redirect to="/sign-in"/>}
function Router(){return <Switch><Route path="/" component={Home}/><Route path="/about" component={AboutPage}/><Route path="/services" component={ServicesPage}/><Route path="/rates" component={RatesPage}/><Route path="/schedules" component={SchedulesPage}/><Route path="/documentation" component={DocumentationPage}/><Route path="/testimonials" component={TestimonialsPage}/><Route path="/faq" component={FaqPage}/><Route path="/contact" component={ContactPage}/><Route path="/admin/login" component={AdminLogin}/><Route path="/admin" component={()=> <ProtectedAdmin page="/admin"/>}/><Route path="/admin/rates" component={()=> <ProtectedAdmin page="/admin/rates"/>}/><Route path="/admin/schedules" component={()=> <ProtectedAdmin page="/admin/schedules"/>}/><Route path="/admin/gallery" component={()=> <ProtectedAdmin page="/admin/gallery"/>}/><Route path="/admin/content" component={()=> <ProtectedAdmin page="/admin/content"/>}/><Route path="/admin/settings" component={()=> <ProtectedAdmin page="/admin/settings"/>}/><Route path="/admin/staff" component={()=> <ProtectedAdmin page="/admin/staff"/>}/><Route path="/admin/audit-log" component={()=> <ProtectedAdmin page="/admin/audit-log"/>}/><Route path="/sign-in/*?" component={()=> <div className="min-h-[100dvh] bg-[#F5F7FA] px-4 py-10"><div className="container-wide mb-8 flex justify-center"><Link href="/"><img className="w-[220px]" src={`${basePath}/kirimmobil-logo.png`} alt="Kirimmobil.com"/></Link></div><div className="mx-auto w-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><SignIn routing="path" path={`${basePath}/sign-in`} appearance={clerkAppearance}/></div></div>}/><Route path="/sign-up/*?" component={()=> <div className="min-h-[100dvh] bg-[#F5F7FA] px-4 py-10"><div className="container-wide mb-8 flex justify-center"><Link href="/"><img className="w-[220px]" src={`${basePath}/kirimmobil-logo.png`} alt="Kirimmobil.com"/></Link></div><div className="mx-auto w-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><SignUp routing="path" path={`${basePath}/sign-up`} appearance={clerkAppearance}/></div></div>}/><Route component={NotFound}/></Switch>}
function App(){if(!clerkPubKey)throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');return <QueryClientProvider client={queryClient}><ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} routerPush={(to)=>window.history.pushState(null,'',stripBase(to))} routerReplace={(to)=>window.history.replaceState(null,'',stripBase(to))} appearance={clerkAppearance}><WouterRouter base={basePath}><SeoMetadata/><Router/></WouterRouter></ClerkProvider></QueryClientProvider>}
export default App;
