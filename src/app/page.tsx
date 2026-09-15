import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/types/tournament";
import { Trophy, Calendar, MapPin, ArrowRight, ShieldCheck, Clock, Users, Activity, Sparkles, Flame } from "lucide-react";
import RulesSection from "@/components/home/RulesSection";
import NewsCarousel from "@/components/home/NewsCarousel";
import type { Flyer } from "@/types/flyer";

export const revalidate = 0; // Fresh tournament data on each load

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  zones: "Fase de Zonas",
  playoffs: "Playoffs",
  finished: "Finalizado",
  registration: "Inscripción Abierta",
  active: "En Vivo",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info" | "live" | "gold"> = {
  draft: "default",
  zones: "warning",
  playoffs: "info",
  finished: "default",
  registration: "gold",
  active: "live",
  completed: "default",
  cancelled: "danger",
};

export default async function HomePage() {
  const supabase = await createClient();

  let tournaments: Tournament[] = [];
  let flyers: Flyer[] = [];
  
  try {
    const [tourRes, flyersRes] = await Promise.all([
      supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("flyers")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    ]);
    
    if (tourRes.data) tournaments = tourRes.data;
    if (flyersRes.data && flyersRes.data.length > 0) {
      flyers = flyersRes.data;
    } else {
      // 1. Intentar consultar Supabase Storage público
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
        const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/public/flyers/confirmed_flyer.json`, {
          cache: "no-store",
        });
        if (storageRes.ok) {
          const storageData = await storageRes.json();
          if (storageData && storageData.image_url) {
            flyers = [storageData];
          }
        }
      } catch (storageErr) {
        console.warn("Storage confirmed flyer fetch error on page:", storageErr);
      }

      // 2. Fallback a archivo en disco si no se obtuvo de storage
      if (flyers.length === 0) {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const filePath = path.join(process.cwd(), "public", "confirmed_flyer.json");
          if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(fileData);
            if (parsed && parsed.image_url) {
              flyers = [parsed];
            }
          }
        } catch (fsErr) {
          console.warn("Could not load local confirmed flyer:", fsErr);
        }
      }

      // 3. Fallback garantizado para que nunca esté vacío en móviles
      if (flyers.length === 0) {
        flyers = [
          {
            id: "oficial-spt-2026",
            title: "TORNEO ABIERTO DE PÁDEL - 5TA LIBRES",
            image_url: "/assets/fondos/fondo_1.jpg",
            link_url: "#torneos-activos",
            active: true,
            sort_order: -1,
            created_at: new Date().toISOString(),
          },
        ];
      }
    }
  } catch (e) {
    console.error("Error loading data on home:", e);
    flyers = [
      {
        id: "oficial-spt-2026",
        title: "TORNEO ABIERTO DE PÁDEL - 5TA LIBRES",
        image_url: "/assets/fondos/fondo_1.jpg",
        link_url: "#torneos-activos",
        active: true,
        sort_order: -1,
        created_at: new Date().toISOString(),
      },
    ];
  }

  const activeTournaments = tournaments.filter(
    (t) => t.status === "active" || t.status === "zones" || t.status === "playoffs" || t.status === "registration"
  );
  const pastTournaments = tournaments.filter(
    (t) => t.status === "finished" || t.status === "completed"
  );

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section - Premier Padel Aesthetic */}
      <section className="relative overflow-hidden pt-2 pb-6 sm:py-20 border-b border-dark-800/80">
        {/* Subtle Sports Mesh Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-600/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Circuit Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 shadow-lg shadow-emerald-500/10">
            <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>CIRCUITO OFICIAL DE PÁDEL 2026</span>
          </div>

          <h1 className="hidden sm:block text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight -mt-4 sm:mt-0">
            Saladillo{" "}
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-lime-300 bg-clip-text text-transparent">
              Padel Tour
            </span>
          </h1>

          <p className="hidden sm:block mt-3 sm:mt-4 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed px-2">
            Viví el pádel con seguimiento en tiempo real: marcadores en vivo con punto de oro,
            tablas de posiciones de zonas, cuadros de playoffs y rankings acumulados.
          </p>

          <NewsCarousel flyers={flyers} />

          {/* Quick Action CTA */}
          <div className="mt-2 sm:mt-8 flex flex-row gap-3 justify-center w-full mx-auto sm:max-w-none">
            <Link
              href="#torneos-activos"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-black text-xs sm:text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer min-h-[44px] sm:min-h-[48px]"
            >
              <Activity className="w-4 h-4 stroke-[2.5]" />
              <span>TORNEO EN VIVO</span>
            </Link>
            <Link
              href="/rankings"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 bg-dark-900/90 hover:bg-dark-850 text-white font-bold text-xs sm:text-sm rounded-xl transition-all border border-dark-700/80 active:scale-95 shadow-md cursor-pointer min-h-[44px] sm:min-h-[48px]"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>RANKINGS</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section id="torneos-activos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-emerald-400" />
              <span className="sm:hidden">Torneos Activos</span>
              <span className="hidden sm:inline">Torneos Activos y en Disputa</span>
            </h2>
            <p className="hidden sm:block text-dark-400 text-sm mt-1">
              Fixture actualizado al instante con marcadores punto a punto y clasificaciones
            </p>
          </div>
        </div>

        {activeTournaments.length === 0 ? (
          <Card className="p-10 text-center text-dark-400 border-dashed border-dark-700 bg-dark-900/60">
            <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-3 text-dark-400">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-200">No hay torneos en juego en este momento.</p>
            <p className="text-xs text-dark-400 mt-1">
              Las nuevas fechas del Saladillo Padel Tour se publicarán aquí en breve.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {activeTournaments.map((tour) => {
              const isLive = tour.status === "active" || tour.status === "zones" || tour.status === "playoffs";
              return (
                <Link key={tour.id} href={`/torneo/${tour.id}`} className="group">
                  <Card
                    hover
                    className={`p-6 h-full flex flex-col justify-between transition-all ${
                      isLive
                        ? "border-emerald-500/40 bg-gradient-to-b from-dark-900 via-dark-900/90 to-dark-950 group-hover:border-emerald-400 group-hover:shadow-emerald-500/15"
                        : "border-dark-700 group-hover:border-blue-500/50"
                    }`}
                  >
                    <div>
                      {/* Status & Category */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge
                          variant={STATUS_VARIANTS[tour.status] ?? "info"}
                          pulse={isLive}
                        >
                          {STATUS_LABELS[tour.status] ?? tour.status}
                        </Badge>
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 tracking-wider">
                          {tour.category}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors mb-3 leading-snug">
                        {tour.name}
                      </h3>

                      <div className="space-y-2 text-xs text-slate-300 mb-5">
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>
                            {new Date(tour.date).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {tour.location && (
                          <div className="flex items-center gap-2 font-medium">
                            <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            <span>{tour.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 font-medium">
                          <Users className="w-4 h-4 text-dark-400 flex-shrink-0" />
                          <span>
                            {tour.num_zones} zonas de {tour.zone_size} parejas
                          </span>
                        </div>
                        {tour.golden_point && (
                          <div className="flex items-center gap-2 font-bold text-amber-300">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span>Punto de Oro oficial (40-40)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-dark-800 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                      <span>Ver Fixture y Zonas en vivo</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Past Tournaments */}
        {pastTournaments.length > 0 && (
          <div className="mt-14 pt-10 border-t border-dark-800">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400" />
                Historial de Torneos y Campeones
              </h2>
              <p className="text-dark-400 text-sm mt-0.5">
                Resultados históricos y cuadros definitivos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastTournaments.map((tour) => (
                <Link key={tour.id} href={`/torneo/${tour.id}`} className="group">
                  <Card hover className="p-5 h-full flex flex-col justify-between border-dark-800/80 bg-dark-900/60">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <Badge variant="default" size="xs">Finalizado</Badge>
                        <span className="text-xs font-bold text-dark-400">{tour.category}</span>
                      </div>
                      <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors text-base">
                        {tour.name}
                      </h3>
                      <p className="text-xs text-dark-400 mt-1">
                        {new Date(tour.date).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-dark-800/60 text-xs font-semibold text-dark-400 group-hover:text-white flex items-center justify-between transition-colors">
                      <span>Ver posiciones finales</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Rules & Highlights Banner */}
      <RulesSection />
    </div>
  );
}

