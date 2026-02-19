import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, Briefcase, GraduationCap, Building2, ChevronRight } from "lucide-react";

// --- Types ---
interface Promotion {
  documentId: string;
  year: string;
}

interface Sector {
  documentId: string;
  name: string;
}

interface Alumnus {
  documentId: string;
  slug: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  company?: string;
  city?: string;
  photo?: { url: string };
  promotion?: Promotion;
  sector?: Sector;
}

interface StrapiResponse<T> {
  data: T[];
}

// --- Fetchers ---
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

async function getPromotions(): Promise<Promotion[]> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/promotions?sort=year:desc`);
    const json: StrapiResponse<Promotion> = await res.json();
    return json.data || [];
  } catch { return []; }
}

async function getSectors(): Promise<Sector[]> {
  try {
    const res = await fetch(`${STRAPI_URL}/api/sectors?sort=name:asc`);
    const json: StrapiResponse<Sector> = await res.json();
    return json.data || [];
  } catch { return []; }
}

async function getAlumni(search?: string, promoId?: string, sectorId?: string): Promise<Alumnus[]> {
  let query = `${STRAPI_URL}/api/alumni?populate[0]=photo&populate[1]=promotion&populate[2]=sector`;
  if (search) {
    query += `&filters[$or][0][firstName][$containsi]=${search}&filters[$or][1][lastName][$containsi]=${search}&filters[$or][2][company][$containsi]=${search}`;
  }
  if (promoId && promoId !== "all") query += `&filters[promotion][documentId][$eq]=${promoId}`;
  if (sectorId && sectorId !== "all") query += `&filters[sector][documentId][$eq]=${sectorId}`;

  try {
    const res = await fetch(query, { cache: "no-store" });
    const json: StrapiResponse<Alumnus> = await res.json();
    return json.data || [];
  } catch { return []; }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; promo?: string; sector?: string }>;
}) {
  const { q, promo, sector } = await searchParams;
  const [alumni, promos, sectors] = await Promise.all([
    getAlumni(q, promo, sector),
    getPromotions(),
    getSectors()
  ]);

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-[#00AFEF] selection:text-white">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00AFEF] text-white shadow-md shadow-cyan-200">
                <span className="text-xl font-black">M</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 leading-none tracking-tight">MY DIGITAL SCHOOL</span>
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-0.5">Paris Alumni</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button className="text-xs font-bold text-slate-600 hover:text-[#00AFEF] tracking-widest uppercase transition-colors">Annuaire</button>
              <button className="text-xs font-bold text-slate-600 hover:text-[#00AFEF] tracking-widest uppercase transition-colors">Événements</button>
              <button className="rounded-full bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-[#00AFEF] transition-all uppercase tracking-widest shadow-md hover:shadow-lg">Accès Admin</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Search & Filter Section */}
        <section className="mb-12 rounded-[24px] border border-slate-200 bg-white p-8 md:p-10 shadow-lg shadow-slate-200/50">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Réseau Alumni</h1>
            <p className="text-slate-500 font-medium text-lg">Retrouvez et connectez-vous avec les diplômés de My Digital School Paris.</p>
          </div>

          <form action="/" method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00AFEF] transition-colors" />
              <input
                type="text"
                name="q"
                placeholder="Nom, entreprise, poste..."
                defaultValue={q}
                className="h-14 w-full rounded-xl border-2 border-slate-100 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-[#00AFEF] focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                name="promo"
                defaultValue={promo || "all"}
                className="h-14 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#00AFEF] focus:bg-white appearance-none cursor-pointer transition-all"
              >
                <option value="all">Toutes les promotions</option>
                {promos.map((p) => (
                  <option key={p.documentId} value={p.documentId}>Promo {p.year}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>

            <div className="relative">
              <select
                name="sector"
                defaultValue={sector || "all"}
                className="h-14 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none focus:border-[#00AFEF] focus:bg-white appearance-none cursor-pointer transition-all"
              >
                <option value="all">Tous les secteurs</option>
                {sectors.map((s) => (
                  <option key={s.documentId} value={s.documentId}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>

            <button
              type="submit"
              className="h-14 w-full rounded-xl bg-[#00AFEF] text-sm font-black text-white hover:bg-[#0094cc] hover:-translate-y-0.5 transition-all shadow-lg shadow-cyan-200/50 active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" /> Rechercher
            </button>
          </form>
        </section>

        {/* Results Info */}
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-[#00AFEF] animate-pulse"></div>
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{alumni.length} Profils trouvés</span>
          </div>
          {(q || promo || sector) && (
            <Link 
              href="/" 
              className="text-xs font-black text-slate-400 hover:text-[#00AFEF] uppercase tracking-widest border-b-2 border-transparent hover:border-[#00AFEF] transition-all pb-0.5"
            >
              Effacer les filtres
            </Link>
          )}
        </div>

        {/* Directory Grid */}
        {alumni.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-[32px] border-2 border-dashed border-slate-300 bg-slate-50/50">
            <div className="h-20 w-20 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
               <Search className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Aucun résultat</h3>
            <p className="text-slate-500 font-medium mt-1">Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {alumni.map((person) => (
              <Link
                key={person.documentId}
                href={`/alumnus/${person.slug}`}
                className="group relative flex flex-col rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-[#00AFEF]/30 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Photo */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-slate-100 border border-slate-100">
                  {person.photo ? (
                    <Image
                      src={`${STRAPI_URL}${person.photo.url}`}
                      alt={`${person.firstName} ${person.lastName}`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300 bg-slate-50">
                      <GraduationCap className="h-20 w-20 opacity-50" />
                    </div>
                  )}
                  {person.promotion && (
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-900 shadow-sm backdrop-blur uppercase tracking-widest border border-slate-100">
                        Promo {person.promotion.year}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 pt-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-[#00AFEF] transition-colors leading-none tracking-tight">
                      {person.firstName} <br />
                      <span className="uppercase text-slate-800 group-hover:text-[#00AFEF]">{person.lastName}</span>
                    </h3>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    {person.jobTitle && (
                      <div className="flex items-start gap-2.5">
                        <Briefcase className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#00AFEF]" />
                        <span className="text-xs font-bold text-slate-600 leading-tight line-clamp-2">{person.jobTitle}</span>
                      </div>
                    )}
                    {person.company && (
                      <div className="flex items-start gap-2.5">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest line-clamp-1">{person.company}</span>
                      </div>
                    )}
                    {person.city && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">{person.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    {person.sector ? (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-500 border border-slate-100">
                        {person.sector.name}
                      </span>
                    ) : <span />}
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#00AFEF] group-hover:text-white transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-16 mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg">
              <span className="font-bold text-xs">M</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 tracking-tight uppercase">My Digital School</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Campus de Paris</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">© 2026 Annuaire Officiel Alumni</p>
          <div className="flex gap-8">
             <a href="#" className="text-[10px] font-black text-slate-400 hover:text-[#00AFEF] uppercase tracking-widest transition-colors">Mentions Légales</a>
             <a href="#" className="text-[10px] font-black text-slate-400 hover:text-[#00AFEF] uppercase tracking-widest transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
