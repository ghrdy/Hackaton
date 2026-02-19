import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Linkedin, MapPin, Briefcase, Building2, GraduationCap, Calendar, Share2, Globe } from "lucide-react";

// --- Types ---
interface Alumnus {
  documentId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  company?: string;
  city?: string;
  linkedinUrl?: string;
  photo?: { url: string };
  promotion?: { year: string };
  sector?: { name: string };
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

async function getAlumnusBySlug(slug: string): Promise<Alumnus | null> {
  const query = `${STRAPI_URL}/api/alumni?filters[slug][$eq]=${slug}&populate[0]=photo&populate[1]=promotion&populate[2]=sector`;
  try {
    const res = await fetch(query, { cache: "no-store" });
    const json = await res.json();
    return json.data?.[0] || null;
  } catch { return null; }
}

export default async function AlumnusProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = await getAlumnusBySlug(slug);

  if (!person) notFound();

  return (
    <div className="min-h-screen bg-neutral-50/50 selection:bg-[#00AFEF] selection:text-white">
      {/* Dynamic Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="group flex items-center gap-3 text-xs font-black text-neutral-400 hover:text-[#00AFEF] transition-all tracking-widest uppercase"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-100 bg-white group-hover:border-[#00AFEF]/30 group-hover:bg-[#00AFEF]/5 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </div>
              Retour à l'annuaire
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-8 w-px bg-neutral-100 mx-2 hidden sm:block"></div>
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-100 bg-white hover:bg-neutral-50 transition-colors text-neutral-400">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Left Column: Profile Card */}
          <div className="md:col-span-4 lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-[40px] border border-neutral-100 bg-white p-6 shadow-xl shadow-neutral-200/40">
                <div className="flex justify-center mb-8">
                  <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-white bg-neutral-50 shadow-lg">
                    {person.photo ? (
                      <Image
                        src={`${STRAPI_URL}${person.photo.url}`}
                        alt={person.lastName}
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-200">
                        <GraduationCap className="h-20 w-20" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-3xl font-black text-neutral-900 tracking-tight leading-none mb-2">
                    {person.firstName} <br />
                    <span className="uppercase text-[#00AFEF]">{person.lastName}</span>
                  </h1>
                  <p className="inline-block px-3 py-1 rounded-full bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    {person.promotion ? `Promotion ${person.promotion.year}` : 'Alumni'}
                  </p>
                  
                  {person.linkedinUrl ? (
                    <a
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-10 flex w-full items-center justify-center gap-3 rounded-[20px] bg-[#0077b5] py-4 text-xs font-black text-white hover:bg-[#00669c] transition-all active:scale-[0.98] shadow-lg shadow-blue-100 uppercase tracking-widest"
                    >
                      <Linkedin className="h-4 w-4" />
                      Profil LinkedIn
                    </a>
                  ) : (
                    <div className="h-2" />
                  )}
                </div>
              </div>

              {/* Localisation Box */}
              <div className="rounded-[32px] border border-neutral-100 bg-white p-6 shadow-sm flex items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50 text-[#00AFEF]">
                    <MapPin className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">Localisation</p>
                    <p className="text-sm font-bold text-neutral-800 uppercase">{person.city || 'Non renseignée'}</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Info */}
          <div className="md:col-span-8 lg:col-span-8 space-y-8">
            {/* Professional Dossier Header */}
            <section className="rounded-[48px] border border-neutral-100 bg-white p-10 md:p-14 shadow-sm relative overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-50/30 blur-3xl"></div>
              
              <div className="mb-12 flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-[#00AFEF]"></div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-neutral-300">Dossier Professionnel</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-14 gap-x-12 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00AFEF] mb-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Poste actuel</label>
                  </div>
                  <p className="text-2xl font-black text-neutral-900 leading-tight">
                    {person.jobTitle || 'Poste privé'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00AFEF] mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Entreprise</label>
                  </div>
                  <p className="text-2xl font-black text-neutral-900 leading-tight uppercase tracking-tighter">
                    {person.company || 'Confidentiel'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00AFEF] mb-1">
                    <Globe className="h-3.5 w-3.5" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Secteur d'activité</label>
                  </div>
                  <p className="text-xl font-black text-neutral-900 uppercase">
                    {person.sector?.name || 'Général'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00AFEF] mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Promotion</label>
                  </div>
                  <p className="text-xl font-black text-neutral-900 uppercase">
                    Class of {person.promotion?.year || 'NC'}
                  </p>
                </div>
              </div>
            </section>

            {/* MDS Context Card */}
            <section className="rounded-[48px] bg-black p-10 md:p-14 text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                  <GraduationCap className="h-32 w-32 -rotate-12" />
               </div>
               <h2 className="mb-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-600">Parcours My Digital School</h2>
               <p className="text-xl font-medium leading-relaxed opacity-90 relative z-10 max-w-xl">
                 {person.firstName} est un membre actif de la communauté **My Digital School Paris**. 
                 Ce profil certifié témoigne de l'excellence académique et professionnelle de nos diplômés.
               </p>
               
               <div className="mt-14 flex flex-wrap gap-5">
                 <div className="rounded-[20px] bg-white/5 border border-white/10 px-8 py-5">
                   <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Campus</p>
                   <p className="text-sm font-black uppercase tracking-tight">Paris - France</p>
                 </div>
                 <div className="rounded-[20px] bg-white/5 border border-white/10 px-8 py-5">
                   <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Statut</p>
                   <p className="text-sm font-black uppercase tracking-tight">Diplômé Certifié</p>
                 </div>
               </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-30">
         <p className="text-[10px] font-black tracking-[0.5em] uppercase">My Digital School Paris / Alumni Archive</p>
      </footer>
    </div>
  );
}
