import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/types/tournament";
import { Trophy, Calendar, MapPin, ArrowRight, ShieldCheck, Clock, Users, Activity, Sparkles, Flame } from "lucide-react";

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
  try {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("date", { ascending: false });
    if (data) tournaments = data;
  } catch (e) {
    console.error("Error loading tournaments on home:", e);
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
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-dark-800/80">
        {/* Subtle Sports Mesh Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-600/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Circuit Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-6 shadow-lg shadow-emerald-500/10">
            <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>CIRCUITO OFICIAL DE PÁDEL 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
            Saladillo{" "}
            <span className="bg-gradient-to-r from-blue-400 via-emerald-400 to-lime-300 bg-clip-text text-transparent">
              Padel Tour
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            Viví el pádel con seguimiento en tiempo real: marcadores en vivo con punto de oro,
            tablas de posiciones de zonas, cuadros de playoffs y rankings acumulados.
          </p>

          {/* Quick Action CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3.5 justify-center max-w-md mx-auto sm:max-w-none">
            <Link
              href="#torneos-activos"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-black text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer min-h-[48px]"
            >
              <Activity className="w-4 h-4 stroke-[2.5]" />
              <span>Ver Torneos en Vivo</span>
            </Link>
            <Link
              href="/rankings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-dark-900/90 hover:bg-dark-850 text-white font-bold text-sm rounded-xl transition-all border border-dark-700/80 active:scale-95 shadow-md cursor-pointer min-h-[48px]"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tabla de Rankings</span>
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
              Torneos Activos y en Disputa
            </h2>
            <p className="text-dark-400 text-sm mt-1">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-dark-800">
        <h2 className="text-2xl font-black text-white text-center mb-8">
          Reglas y Formato del Circuito SPT
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-amber-400/40 transition-colors">
            <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">Punto de Oro</h3>
            <p className="text-dark-400 text-xs leading-relaxed">
              En todos los partidos al llegar a 40-40 se juega la bola decisiva sin ventajas. Quien gana el punto, gana el game.
            </p>
          </Card>

          <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-rose-400/40 transition-colors">
            <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">Eliminación en Zonas</h3>
            <p className="text-dark-400 text-xs leading-relaxed">
              En cada zona de 3 o 4 parejas, la última pareja posicionada queda eliminada. Las mejores clasifican a Playoffs.
            </p>
          </Card>

          <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-emerald-400/40 transition-colors">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">Doble Ranking Oficial</h3>
            <p className="text-dark-400 text-xs leading-relaxed">
              Puntos por pareja fija y ranking individual que se preserva aunque cambies de compañero en la temporada.
            </p>
          </Card>

          <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-blue-400/40 transition-colors">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-white font-bold text-sm mb-1">Sistema Americano</h3>
            <p className="text-dark-400 text-xs leading-relaxed">
              A 9 games (empate 8-8 con TB a 7 muere en 7) o a 2 sets de 3 games con super TB a 10 (muere en 11).
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

