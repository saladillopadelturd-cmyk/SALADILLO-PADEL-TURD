"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import { isSumaCategory } from "@/lib/tournament/couples";
import {
  Calendar,
  MapPin,
  ArrowRight,
  Activity,
  Sparkles,
  Users,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import PlayerRegistrationBanner from "@/components/player/PlayerRegistrationBanner";

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

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createClient();

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      if (data) setTournaments(data);
    } catch (e: unknown) {
      console.error("Error al cargar torneos:", e);
      const msg = e instanceof Error ? e.message : "Error al cargar torneos";
      setNotification({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTournaments();

    // Suscripción Realtime a cambios en torneos
    const channel = supabase
      .channel("public:tournaments_torneos_page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        () => {
          loadTournaments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTournaments, supabase]);

  const handleDeleteTournament = async () => {
    if (!deletingTournament) return;
    const target = deletingTournament;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/torneos?id=${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar el torneo");
      }

      setTournaments((prev) => prev.filter((t) => t.id !== target.id));
      setDeletingTournament(null);
      setNotification({
        type: "success",
        text: `Torneo "${target.name}" eliminado correctamente.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar el torneo";
      setNotification({ type: "error", text: msg });
      setDeletingTournament(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link href="/admin/torneos">
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
              <Plus className="w-4 h-4" />
              <span>Nuevo Torneo</span>
            </Button>
          </Link>
        </div>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 px-2 py-1 text-dark-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Registro Autónomo de Jugador */}
      <PlayerRegistrationBanner variant="compact" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <Card className="p-10 text-center text-dark-400 border-dashed border-dark-700 bg-dark-900/60">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-dark-500" />
          <p className="text-base font-semibold text-slate-200">No hay torneos registrados por el momento.</p>
          <p className="text-xs text-dark-400 mt-1 mb-4">Los nuevos torneos creados aparecerán aquí automáticamente.</p>
          <Link href="/admin/torneos">
            <Button size="sm">Crear el Primer Torneo</Button>
          </Link>
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
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${
                          tour.gender === "Femenino"
                            ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
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
                        <span className="font-medium">{formatDate(tour.date)}</span>
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
                    <button
                      type="button"
                      onClick={() => setDeletingTournament(tour)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                      title={`Eliminar el torneo ${tour.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Eliminar</span>
                    </button>
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

      {/* Modal de confirmación para eliminar torneo */}
      <ConfirmModal
        isOpen={!!deletingTournament}
        onClose={() => setDeletingTournament(null)}
        onConfirm={handleDeleteTournament}
        loading={isDeleting}
        title="Eliminar Torneo"
        message={`¿Estás seguro de eliminar el torneo "${deletingTournament?.name}"? Se eliminarán todas las zonas, parejas y partidos asociados en la base de datos. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
