import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/types/tournament";
import { isSumaCategory } from "@/lib/tournament/couples";
import { Calendar, MapPin, ArrowRight, Activity, Sparkles, Users } from "lucide-react";
import PlayerRegistrationBanner from "@/components/player/PlayerRegistrationBanner";

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  zones: "Fase de Zonas",
  playoffs: "Playoffs",
  finished: "Finalizado",
  registration: "Inscripción",
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

export default async function TorneosPage() {
  const supabase = await createClient();
  let tournaments: Tournament[] = [];

  try {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("date", { ascending: false });
    if (data) tournaments = data;
  } catch (e) {
    console.error("Error loading tournaments:", e);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-screen">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>TORNEOS OFICIALES SPT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Todos los Torneos
        </h1>
        <p className="text-slate-300 text-sm mt-1">
          Seguí el desarrollo de las zonas, fixtures, tanteos y cuadros de playoffs en tiempo real
        </p>
      </div>

      {/* Banner de Registro Autónomo de Jugador (solo visible si el email del navegador no existe en BD) */}
      <PlayerRegistrationBanner variant="compact" />

      {tournaments.length === 0 ? (
        <Card className="p-10 text-center text-dark-400 border-dashed border-dark-700 bg-dark-900/60">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-dark-500" />
          <p className="text-base font-semibold text-slate-200">No hay torneos registrados por el momento.</p>
          <p className="text-xs text-dark-400 mt-1">Los nuevos torneos creados aparecerán aquí automáticamente.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tournaments.map((tour) => {
            const isLive = tour.status === "active" || tour.status === "zones" || tour.status === "playoffs";
            return (
              <Card
                key={tour.id}
                hover
                className={`p-6 w-full flex flex-col justify-between transition-all shadow-xl ${
                  isLive
                    ? "border-emerald-500/40 bg-gradient-to-b from-dark-900 via-dark-900/90 to-dark-950"
                    : "border-dark-700/80 bg-dark-900/80"
                }`}
              >
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-dark-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={STATUS_VARIANTS[tour.status] ?? "info"}
                        pulse={isLive}
                      >
                        {STATUS_LABELS[tour.status] ?? tour.status}
                      </Badge>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                        tour.gender === "Femenino"
                          ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}>
                        {tour.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
                      </span>
                      {isSumaCategory(tour.category) ? (
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/35">
                          ∑ {tour.category}
                        </span>
                      ) : (
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          Cat. {tour.category || "6ta"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-medium">
                          {new Date(tour.date).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {tour.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                          <span>{tour.location}</span>
                        </div>
                      )}
                      {tour.golden_point && (
                        <div className="flex items-center gap-1 font-bold text-amber-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>Punto de Oro</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/torneo/${tour.id}`} className="group/title block mb-4">
                    <h3 className="text-2xl font-black text-white group-hover/title:text-emerald-400 transition-colors">
                      {tour.name}
                    </h3>
                  </Link>
                </div>

                <div className="pt-4 border-t border-dark-800 flex items-center justify-between gap-3 flex-nowrap overflow-x-auto whitespace-nowrap">
                  <div className="flex items-center gap-2 flex-nowrap">
                    <Link
                      href={`/torneo/${tour.id}?tab=zonas`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-600 text-xs font-bold transition-all whitespace-nowrap"
                    >
                      <span>Zonas</span>
                    </Link>
                    <Link
                      href={`/torneo/${tour.id}?tab=fixture`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-600 text-xs font-bold transition-all whitespace-nowrap"
                    >
                      <span>Fixture</span>
                    </Link>
                    <Link
                      href={`/torneo/${tour.id}?tab=posiciones`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-600 text-xs font-bold transition-all whitespace-nowrap"
                    >
                      <span>Resultados</span>
                    </Link>
                    <Link
                      href={`/admin/parejas?torneo=${tour.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all whitespace-nowrap"
                      title="Editor de parejas de este torneo"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Parejas</span>
                    </Link>
                  </div>

                  <Link
                    href={`/torneo/${tour.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-black transition-all whitespace-nowrap group/link ml-auto"
                  >
                    <span>Ver detalle completo</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

