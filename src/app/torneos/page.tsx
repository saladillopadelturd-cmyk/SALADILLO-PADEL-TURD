import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/types/tournament";
import { Calendar, MapPin, ArrowRight, Activity, Sparkles } from "lucide-react";

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
      <div className="mb-8">
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

      {tournaments.length === 0 ? (
        <Card className="p-10 text-center text-dark-400 border-dashed border-dark-700 bg-dark-900/60">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-dark-500" />
          <p className="text-base font-semibold text-slate-200">No hay torneos registrados por el momento.</p>
          <p className="text-xs text-dark-400 mt-1">Los nuevos torneos creados aparecerán aquí automáticamente.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tour) => {
            const isLive = tour.status === "active" || tour.status === "zones" || tour.status === "playoffs";
            return (
              <Link key={tour.id} href={`/torneo/${tour.id}`} className="group">
                <Card
                  hover
                  className={`p-6 h-full flex flex-col justify-between transition-all ${
                    isLive
                      ? "border-emerald-500/40 bg-gradient-to-b from-dark-900 via-dark-900/90 to-dark-950 group-hover:border-emerald-400"
                      : "border-dark-700/80 bg-dark-900/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge
                        variant={STATUS_VARIANTS[tour.status] ?? "info"}
                        pulse={isLive}
                      >
                        {STATUS_LABELS[tour.status] ?? tour.status}
                      </Badge>
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        Cat. {tour.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors mb-3">
                      {tour.name}
                    </h3>

                    <div className="space-y-2 text-xs text-slate-300 mb-5">
                      <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                          <span>{tour.location}</span>
                        </div>
                      )}
                      {tour.golden_point && (
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>Punto de Oro oficial (40-40)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dark-800 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Ver detalle completo</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

