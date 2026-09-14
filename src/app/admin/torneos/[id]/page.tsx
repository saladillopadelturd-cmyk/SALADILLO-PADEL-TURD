"use client";

import { use, useState, useEffect, useCallback, useMemo, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, Zone, Couple, Match } from "@/types/tournament";
import { calculateRoundRobinStandings } from "@/lib/tournament/standings";
import { calculateOptimalZones } from "@/lib/tournament/zones";
import { getCoupleNumberMap, getCoupleLabelWithNumber, getCouplePlayersShortLabel } from "@/lib/tournament/couples";
import { findNextPlayoffMatchSlot, propagatePlayoffWinners, getStageName } from "@/lib/tournament/elimination";
import ZoneCard from "@/components/tournament/ZoneCard";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Shuffle,
  Play,
  Clock,
  Edit2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Trash2,
  Medal,
} from "lucide-react";

const GAME_MODE_LABELS: Record<string, string> = {
  american_9games: "Americano a 9 games (Tie-break a 7 en 8-8)",
  american_2sets: "Americano 2 sets a 3 games (Super TB a 10 en empate)",
  round_robin_diff: "Todos contra todos por diferencia de games",
};

const STAGE_LABELS: Record<string, string> = {
  zone: "Fase de Grupos / Zonas",
  round_of_16: "Octavos de Final",
  quarter: "Cuartos de Final",
  semi: "Semifinales",
  final: "Gran Final",
  third_place: "Tercer Puesto",
};

function AdminTorneoDetailContent({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") || "config";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [fixtureFilter, setFixtureFilter] = useState<"all" | "zone" | "playoff">("all");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [zoneCouplesMap, setZoneCouplesMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals for Actions
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [formCourt, setFormCourt] = useState("");
  const [formTime, setFormTime] = useState("");

  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [formScoreSet1, setFormScoreSet1] = useState("");
  const [formScoreSet2, setFormScoreSet2] = useState("");
  const [formScoreSuperTb, setFormScoreSuperTb] = useState("");
  const [formWinnerCoupleId, setFormWinnerCoupleId] = useState("");

  const supabase = createClient();

  // Sync tab with URL parameter when parameter changes
  useEffect(() => {
    if (tabParam && ["config", "zonas", "fixture", "results"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.replace(`/admin/torneos/${tournamentId}?tab=${newTab}`, { scroll: false });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [tourRes, zonesRes, couplesRes, zcRes, matchesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("zones").select("*").eq("tournament_id", tournamentId).order("zone_number", { ascending: true }),
        supabase
          .from("couples")
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)")
          .eq("tournament_id", tournamentId),
        supabase.from("zone_couples").select("zone_id, couple_id"),
        supabase
          .from("matches")
          .select(
            "*, couple1:couples!matches_couple1_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)), couple2:couples!matches_couple2_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))"
          )
          .eq("tournament_id", tournamentId)
          .order("match_number", { ascending: true, nullsFirst: false }),
      ]);

      if (tourRes.error) throw tourRes.error;
      if (tourRes.data) setTournament(tourRes.data);
      if (zonesRes.data) setZones(zonesRes.data);
      if (couplesRes.data) setCouples(couplesRes.data as unknown as Couple[]);

      if (zcRes.data) {
        const map: Record<string, string[]> = {};
        zcRes.data.forEach((item) => {
          if (!map[item.zone_id]) map[item.zone_id] = [];
          map[item.zone_id].push(item.couple_id);
        });
        setZoneCouplesMap(map);
      }

      if (matchesRes.data) {
        const rawMatches = matchesRes.data as unknown as Match[];
        // Conformar y propagar automáticamente los ganadores de eliminatorias a las siguientes rondas del fixture
        const { updatedMatches, updatesToPersist } = propagatePlayoffWinners(rawMatches);
        setMatches(updatedMatches);

        // Auto-sanar y persistir slots en segundo plano si hubiera desincronización
        if (updatesToPersist.length > 0) {
          for (const update of updatesToPersist) {
            const payload: Record<string, unknown> = {
              updated_at: new Date().toISOString(),
            };
            if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
            if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;
            await supabase.from("matches").update(payload).eq("id", update.id);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar datos del torneo";
      console.error(err);
      setNotification({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [supabase, tournamentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mapa de numeración correlativa por torneo (Pareja 1, Pareja 2, etc.)
  const coupleNumberMap = useMemo(() => {
    return getCoupleNumberMap(couples);
  }, [couples]);

  const getCoupleLabel = (c?: Couple | null, coupleId?: string | null) => {
    const coupleObj = c || (coupleId ? couples.find((item) => item.id === coupleId) : null);
    if (!coupleObj) return "Por definir";
    const num = coupleNumberMap.get(coupleObj.id);
    return getCoupleLabelWithNumber(coupleObj, num);
  };

  const getCouplePlayersLabel = (c?: Couple | null, coupleId?: string | null) => {
    const coupleObj = c || (coupleId ? couples.find((item) => item.id === coupleId) : null);
    if (!coupleObj) return "Por definir";
    return getCouplePlayersShortLabel(coupleObj);
  };

  // Determinar si la Gran Final ya tiene ganador para habilitar liquidación de rankings
  const hasCompletedFinal = useMemo(() => {
    return matches.some(
      (m) =>
        m.stage === "final" &&
        (m.status === "completed" || Boolean(m.winner_couple_id))
    );
  }, [matches]);

  // Configuración interactiva de Zonas para el sorteo
  const [targetZoneSize, setTargetZoneSize] = useState<number>(4);
  const [targetNumZones, setTargetNumZones] = useState<string>("");
  const [showUnequalWarningModal, setShowUnequalWarningModal] = useState(false);

  useEffect(() => {
    if (tournament) {
      const defaultSize = tournament.zone_size || 4;
      setTargetZoneSize(defaultSize);
      const optimal = calculateOptimalZones(couples.length, defaultSize);
      setTargetNumZones(String(optimal.numZones));
    }
  }, [tournament, couples.length]);

  const handleZoneSizeChange = (newSize: number) => {
    setTargetZoneSize(newSize);
    const optimal = calculateOptimalZones(couples.length, newSize);
    setTargetNumZones(String(optimal.numZones));
  };

  const zoneDistribution = useMemo(() => {
    const num = targetNumZones ? parseInt(targetNumZones, 10) : undefined;
    return calculateOptimalZones(couples.length, targetZoneSize, num);
  }, [couples.length, targetZoneSize, targetNumZones]);

  // 1. Action: Sorteo Automático de Zonas
  const executeShuffleZones = async (force: boolean = false) => {
    startTransition(async () => {
      try {
        const chosenNumZones = targetNumZones ? parseInt(targetNumZones, 10) : zoneDistribution.numZones;
        const res = await fetch("/api/zonas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId,
            action: "shuffle",
            numZones: chosenNumZones,
            zoneSize: targetZoneSize,
            force,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.canForce) {
            setShowUnequalWarningModal(true);
            return;
          }
          throw new Error(data.error || "Error al sortear zonas");
        }

        await loadData();
        setShowUnequalWarningModal(false);
        setNotification({
          type: "success",
          text: `Sorteo de zonas realizado exitosamente (${data.zones?.length ?? 0} zonas conformadas).`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al sortear zonas";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleShuffleZones = () => {
    if (!zoneDistribution.isEqual) {
      setShowUnequalWarningModal(true);
    } else {
      executeShuffleZones(false);
    }
  };

  // 2. Action: Generar Partidos de Fase de Zonas
  const handleGenerateZoneMatches = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/zonas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, action: "generate_matches" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al generar partidos de zonas");

        await loadData();
        setActiveTab("fixture");
        setNotification({
          type: "success",
          text: `Se generaron ${data.matchesCreated ?? 0} partidos para la fase de zonas.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al generar partidos";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 3. Action: Generar Cuadro de Playoffs
  const handleGeneratePlayoffs = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/playoffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, force: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al generar playoffs");

        await loadData();
        setActiveTab("fixture");
        setNotification({
          type: "success",
          text: `Cuadro de eliminación directa generado con éxito (${data.matchesCount ?? 0} partidos creados).`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al generar cuadro eliminatorio";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 4. Action: Abrir Programación de Cancha y Horario
  const openScheduleModal = (m: Match) => {
    setSchedulingMatch(m);
    setFormCourt(m.court_name || "");
    setFormTime(m.scheduled_time || "");
  };

  const handleSaveSchedule = async () => {
    if (!schedulingMatch) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({
            court_name: formCourt.trim() || null,
            scheduled_time: formTime.trim() || null,
          })
          .eq("id", schedulingMatch.id);

        if (error) throw error;

        setMatches((prev) =>
          prev.map((m) =>
            m.id === schedulingMatch.id
              ? { ...m, court_name: formCourt.trim() || null, scheduled_time: formTime.trim() || null }
              : m
          )
        );
        setSchedulingMatch(null);
        setNotification({ type: "success", text: "Cancha y horario programados correctamente." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar programación";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 5. Action: Abrir Modal de Carga de Resultados
  const openScoreModal = (m: Match) => {
    setScoringMatch(m);
    setFormScoreSet1(m.score_set1 || "");
    setFormScoreSet2(m.score_set2 || "");
    setFormScoreSuperTb(m.score_super_tb || "");
    setFormWinnerCoupleId(m.winner_couple_id || m.couple1_id || "");
  };

  const handleSaveScore = async () => {
    if (!scoringMatch) return;
    if (!formScoreSet1.trim()) {
      setNotification({ type: "error", text: "Debes ingresar al menos el resultado del Set / Partido." });
      return;
    }
    if (!formWinnerCoupleId) {
      setNotification({ type: "error", text: "Debes seleccionar la pareja ganadora del partido." });
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({
            score_set1: formScoreSet1.trim(),
            score_set2: formScoreSet2.trim() || null,
            score_super_tb: formScoreSuperTb.trim() || null,
            winner_couple_id: formWinnerCoupleId,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", scoringMatch.id);

        if (error) throw error;

        // En fase de eliminación directa (Playoffs), avanzar automáticamente a la pareja ganadora al siguiente cruce
        let advancedToNextStage = false;
        if (scoringMatch.stage !== "zone") {
          const nextSlot = findNextPlayoffMatchSlot(matches, scoringMatch);
          if (nextSlot) {
            const targetMatch = matches.find((m) => m.id === nextSlot.targetMatchId);
            const updatePayload: Record<string, unknown> = {
              [nextSlot.slotField]: formWinnerCoupleId,
              updated_at: new Date().toISOString(),
            };

            // Si se corrigió un ganador anterior y ya figuraba como ganador de la ronda siguiente, resetear ese resultado dependiente
            if (
              scoringMatch.winner_couple_id &&
              scoringMatch.winner_couple_id !== formWinnerCoupleId &&
              targetMatch &&
              targetMatch.winner_couple_id === scoringMatch.winner_couple_id
            ) {
              updatePayload.winner_couple_id = null;
              updatePayload.status = "pending";
              updatePayload.score_set1 = null;
              updatePayload.score_set2 = null;
              updatePayload.score_super_tb = null;
            }

            const { error: nextError } = await supabase
              .from("matches")
              .update(updatePayload)
              .eq("id", nextSlot.targetMatchId);

            if (nextError) {
              console.error("Error al avanzar pareja a la siguiente ronda:", nextError);
            } else {
              advancedToNextStage = true;
            }
          }
        }

        await loadData();
        setScoringMatch(null);
        setNotification({
          type: "success",
          text: advancedToNextStage
            ? "Resultado guardado y pareja ganadora clasificada automáticamente a la siguiente fase del cuadro."
            : "Resultado guardado y posiciones actualizadas con éxito.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar marcador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 6. Action: Liquidar / Actualizar Rankings Oficiales
  const handleProcessRankings = async () => {
    if (!hasCompletedFinal) {
      setNotification({
        type: "error",
        text: "Para liquidar los rankings oficiales, el torneo debe tener el partido de la Gran Final completado con su pareja ganadora.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/rankings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, recalculate: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al liquidar rankings");

        await loadData();
        setNotification({
          type: "success",
          text: data.message || "Rankings oficiales liquidados y actualizados exitosamente.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al procesar rankings";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 7. Action: Eliminar Torneo
  const handleDelete = () => {
    startTransition(async () => {
      try {
        const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
        if (error) throw error;
        setShowDelete(false);
        router.push("/admin/torneos");
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el torneo";
        setNotification({ type: "error", text: msg });
        setShowDelete(false);
      }
    });
  };

  return (
    <div>
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-dark-400 text-sm mb-4">
        <Link href="/admin/torneos" className="hover:text-white transition-colors">
          Torneos
        </Link>
        <ChevronRight className="w-4 h-4 text-dark-600" />
        <span className="text-white font-medium">{tournament?.name ?? "Detalle"}</span>
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
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-9 h-9 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !tournament ? (
        <Card className="p-12 text-center">
          <p className="text-dark-400 text-base mb-4">El torneo no fue encontrado o fue eliminado.</p>
          <Link href="/admin/torneos">
            <Button>Volver a Torneos</Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-700/80 rounded-2xl p-6 mb-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <Badge variant="success">{tournament.status.toUpperCase()}</Badge>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/25">
                    Categoría {tournament.category}
                  </span>
                  {tournament.golden_point && (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      ⭐ Punto de Oro (40-40)
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {tournament.name}
                </h1>
                <div className="flex items-center gap-4 mt-3 text-dark-300 text-xs sm:text-sm flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    {tournament.date}
                  </span>
                  {tournament.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-sky-400" />
                      {tournament.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-dark-400" />
                    {couples.length} parejas inscritas ({tournament.num_zones} zonas de {tournament.zone_size})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/admin/parejas`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-400" />
                    Parejas ({couples.length})
                  </Button>
                </Link>
                <Link href={`/torneo/${tournament.id}`} target="_blank">
                  <Button variant="secondary" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Ver Vista Pública
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6">
              <TabsTrigger value="config">Configuración</TabsTrigger>
              <TabsTrigger value="zonas">Zonas ({zones.length})</TabsTrigger>
              <TabsTrigger value="fixture">Fixture ({matches.length})</TabsTrigger>
              <TabsTrigger value="results">
                Resultados ({matches.filter((m) => m.status === "completed").length}/{matches.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: CONFIGURACIÓN */}
            <TabsContent value="config">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <label className="block text-dark-400 mb-1">Nombre del Torneo</label>
                    <p className="text-white font-medium text-base">{tournament.name}</p>
                  </div>
                  <div>
                    <label className="block text-dark-400 mb-1">Fecha</label>
                    <p className="text-white font-medium text-base">{tournament.date}</p>
                  </div>
                  <div>
                    <label className="block text-dark-400 mb-1">Modalidad de Juego</label>
                    <p className="text-white font-medium">
                      {GAME_MODE_LABELS[tournament.game_mode] ?? tournament.game_mode}
                    </p>
                  </div>
                  <div>
                    <label className="block text-dark-400 mb-1">Estructura de Zonas</label>
                    <p className="text-white font-medium">
                      {tournament.num_zones} zonas configuradas de {tournament.zone_size} parejas
                    </p>
                  </div>
                  <div>
                    <label className="block text-dark-400 mb-1">Regla de Eliminación</label>
                    <p className="text-emerald-400 font-medium">
                      La peor pareja de cada zona queda eliminada. Las demás avanzan al cuadro de playoffs.
                    </p>
                  </div>
                  <div>
                    <label className="block text-dark-400 mb-1">Punto de Oro en 40-40</label>
                    <p className="text-amber-300 font-medium">
                      {tournament.golden_point ? "Activo permanente (Golden Point)" : "Inactivo"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-dark-700 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-rose-400">Zona de Peligro</h4>
                    <p className="text-dark-500 text-xs">
                      Eliminar este torneo borrará todas sus zonas, partidos y estadísticas asociadas.
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} disabled={isPending}>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Eliminar Torneo
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 2: ZONAS */}
            <TabsContent value="zonas">
              <div className="space-y-6">
                {/* Panel de Configuración Interactiva de Zonas */}
                <div className="bg-dark-900/90 border border-dark-700/80 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-800">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-emerald-400" />
                        Confección y Sorteo de Zonas
                      </h3>
                      <p className="text-dark-400 text-xs mt-0.5">
                        Define la cantidad de zonas y parejas por zona para conformar la fase de grupos.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold">
                        {couples.length} Parejas inscriptas
                      </span>
                      {zones.length > 0 && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
                          {zones.length} Zonas activas
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                        Objetivo de Parejas por Zona
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleZoneSizeChange(4)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            targetZoneSize === 4
                              ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-sm shadow-primary-500/20"
                              : "bg-dark-800 border-dark-700 text-dark-400 hover:text-white"
                          }`}
                        >
                          4 parejas por zona
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZoneSizeChange(3)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            targetZoneSize === 3
                              ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-sm shadow-primary-500/20"
                              : "bg-dark-800 border-dark-700 text-dark-400 hover:text-white"
                          }`}
                        >
                          3 parejas por zona
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                        Cantidad de Zonas a Formar
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={couples.length || 1}
                          value={targetNumZones}
                          onChange={(e) => setTargetNumZones(e.target.value)}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const optimal = calculateOptimalZones(couples.length, targetZoneSize);
                            setTargetNumZones(String(optimal.numZones));
                          }}
                          className="px-3 py-2 bg-dark-800 hover:bg-dark-750 text-dark-300 hover:text-white border border-dark-700 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                          title="Recalcular automáticamente según cantidad de parejas"
                        >
                          Calcular óptimo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Igualdad de Zonas y Advertencia de Jugadores Faltantes */}
                  {!zoneDistribution.isEqual ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-300 text-sm">
                            Condición Reglamentaria: Zonas con Igual Cantidad de Parejas
                          </p>
                          <p className="text-amber-200/90 mt-0.5">
                            Con las <strong>{couples.length} parejas</strong> inscriptas, las zonas quedarían desiguales.
                            {" "}Para que todas las zonas tengan la misma cantidad ({targetZoneSize} parejas por zona),{" "}
                            <strong className="text-white underline decoration-amber-400 decoration-2">
                              faltan {zoneDistribution.missingPlayers} jugadores ({zoneDistribution.missingCouples} {zoneDistribution.missingCouples === 1 ? "pareja" : "parejas"})
                            </strong>.
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/admin/parejas?tournamentId=${tournamentId}`}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold whitespace-nowrap self-start sm:self-center transition-colors"
                      >
                        Inscribir Parejas
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>
                        <strong>Condición reglamentaria cumplida:</strong> Todas las {zoneDistribution.numZones} zonas tienen exactamente {zoneDistribution.zoneSize} parejas.
                      </span>
                    </div>
                  )}

                  {/* Resumen dinámico del reparto de parejas */}
                  <div className="p-3.5 bg-dark-950/80 border border-dark-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-dark-200">
                        Distribución: <strong className="text-white">{zoneDistribution.summary}</strong>
                        {couples.length > 0 && (
                          <span className="text-dark-400 ml-1">
                            ({zoneDistribution.distribution.map((d) => `${d.zoneName}: ${d.targetCount}`).join(", ")})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        size="sm"
                        onClick={handleShuffleZones}
                        disabled={isPending || couples.length < 2}
                        className="flex items-center gap-1.5"
                      >
                        <Shuffle className="w-4 h-4" />
                        {zones.length === 0 ? "Realizar Sorteo" : "Re-sortear Zonas"}
                      </Button>
                      {zones.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleGenerateZoneMatches}
                          disabled={isPending}
                          className="flex items-center gap-1.5"
                        >
                          <Play className="w-4 h-4" />
                          Generar Fixture
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {zones.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Shuffle className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white mb-2">Aún no se han confeccionado las zonas</h4>
                    <p className="text-dark-400 text-sm max-w-md mx-auto mb-6">
                      Hay {couples.length} parejas inscritas. Con la configuración seleccionada arriba, se crearán{" "}
                      <strong>{zoneDistribution.summary}</strong>. Haz clic en el botón para sortear.
                    </p>
                    <Button
                      onClick={handleShuffleZones}
                      disabled={isPending || couples.length < 2}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <Shuffle className="w-4 h-4" />
                      {isPending ? "Sorteando..." : "Realizar Sorteo Automático"}
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {zones.map((zone) => {
                      const zoneCoupleIds = zoneCouplesMap[zone.id] ?? [];
                      const zoneMatches = matches.filter((m) => m.zone_id === zone.id);
                      const standings = calculateRoundRobinStandings(zoneMatches, zoneCoupleIds);

                      const formattedStandings = standings.map((s, idx) => {
                        const coupleObj = couples.find((c) => c.id === s.pair_id);
                        return {
                          position: idx + 1,
                          pairName: getCoupleLabel(coupleObj),
                          matchesPlayed: s.matches_played,
                          matchesWon: s.matches_won,
                          matchesLost: s.matches_lost,
                          setsWon: s.sets_won ?? 0,
                          setsLost: s.sets_lost ?? 0,
                          gamesWon: s.games_won ?? 0,
                          gamesLost: s.games_lost ?? 0,
                          points: s.points,
                        };
                      });

                      return (
                        <ZoneCard
                          key={zone.id}
                          zoneName={zone.name}
                          zoneNumber={zone.zone_number}
                          standings={formattedStandings}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: FIXTURE */}
            <TabsContent value="fixture">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 p-4 rounded-xl border border-dark-700">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-sky-400" />
                      Programación de Partidos
                    </h3>
                    <p className="text-dark-400 text-xs mt-1">
                      Asigna canchas y horarios a cada partido del torneo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGeneratePlayoffs}
                      disabled={isPending || zones.length === 0}
                      className="flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Generar Cuadro Playoffs
                    </Button>
                  </div>
                </div>

                {matches.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Clock className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white mb-2">No hay partidos creados todavía</h4>
                    <p className="text-dark-400 text-sm max-w-md mx-auto mb-4">
                      Para programar partidos, primero debes sortear las zonas y generar el fixture desde la pestaña Zonas.
                    </p>
                    <Button onClick={() => setActiveTab("zonas")}>Ir a Zonas</Button>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Filtros de Fixture */}
                    <div className="flex items-center gap-2 p-1 bg-dark-950/80 rounded-xl border border-dark-800 w-fit flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFixtureFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          fixtureFilter === "all"
                            ? "bg-primary-500 text-white shadow-md font-black"
                            : "text-dark-400 hover:text-white"
                        }`}
                      >
                        Todos ({matches.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFixtureFilter("zone")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          fixtureFilter === "zone"
                            ? "bg-primary-500 text-white shadow-md font-black"
                            : "text-dark-400 hover:text-white"
                        }`}
                      >
                        Fase de Zonas ({matches.filter((m) => m.stage === "zone").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFixtureFilter("playoff")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          fixtureFilter === "playoff"
                            ? "bg-primary-500 text-white shadow-md font-black"
                            : "text-dark-400 hover:text-white"
                        }`}
                      >
                        Eliminación Directa ({matches.filter((m) => m.stage !== "zone").length})
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {matches
                        .filter((m) => {
                          if (fixtureFilter === "zone") return m.stage === "zone";
                          if (fixtureFilter === "playoff") return m.stage !== "zone";
                          return true;
                        })
                        .map((m) => {
                          const isPlayoff = m.stage !== "zone";
                          const isPendingRival = isPlayoff && (!m.couple1_id || !m.couple2_id);
                          const hasResult = m.status === "completed" || Boolean(m.score_set1 || m.score_set2 || m.score_super_tb);
                          const isP1Winner = m.winner_couple_id && m.winner_couple_id === m.couple1_id;
                          const isP2Winner = m.winner_couple_id && m.winner_couple_id === m.couple2_id;
                          const scoreDisplay = [m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ");

                          if (hasResult) {
                            return (
                              <Card
                                key={m.id}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-500/30 bg-dark-900/60 transition-colors"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="success" size="sm">
                                      FINALIZADO
                                    </Badge>
                                    <span className="text-dark-400 text-xs">
                                      {STAGE_LABELS[m.stage] ?? getStageName(m.stage)}
                                    </span>
                                    <span className="text-dark-400 text-xs">Partido #{m.match_number ?? "-"}</span>
                                  </div>
                                  <div className="text-sm font-semibold text-white">
                                    <span className={isP1Winner ? "text-emerald-400 font-bold" : "text-white"}>
                                      {getCouplePlayersLabel(m.couple1, m.couple1_id)}
                                    </span>
                                    <span className="text-dark-500 mx-2">vs</span>
                                    <span className={isP2Winner ? "text-emerald-400 font-bold" : "text-white"}>
                                      {getCouplePlayersLabel(m.couple2, m.couple2_id)}
                                    </span>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-sky-400">
                                    Resultado: {scoreDisplay || "Finalizado"}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => openScoreModal(m)}>
                                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                                    Modificar Marcador
                                  </Button>
                                </div>
                              </Card>
                            );
                          }

                          return (
                            <Card
                              key={m.id}
                              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-colors ${
                                isPendingRival
                                  ? "border-dark-800 bg-dark-950/50 opacity-80"
                                  : "border-dark-700/80 hover:border-dark-600"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={m.stage === "zone" ? "info" : "success"} size="sm">
                                    {STAGE_LABELS[m.stage] ?? getStageName(m.stage)}
                                  </Badge>
                                  <span className="text-dark-400 text-xs">Partido #{m.match_number ?? "-"}</span>
                                  {isPlayoff && (
                                    isPendingRival ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                                        Esperando Clasificados
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                        Cruce Confirmado
                                      </span>
                                    )
                                  )}
                                </div>
                                <div className="text-sm font-semibold text-white">
                                  <span>{getCoupleLabel(m.couple1, m.couple1_id)}</span>
                                  <span className="text-primary-400 mx-2">vs</span>
                                  <span>{getCoupleLabel(m.couple2, m.couple2_id)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-dark-400">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                    {m.court_name || "Sin cancha asignada"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                    {m.scheduled_time || "Horario a definir"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" onClick={() => openScheduleModal(m)}>
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  Programar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => openScoreModal(m)}
                                  disabled={isPendingRival}
                                  title={
                                    isPendingRival
                                      ? "El cruce se conformará automáticamente cuando concluyan los partidos de la fase previa"
                                      : "Cargar Marcador"
                                  }
                                >
                                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                                  Cargar Marcador
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: RESULTADOS */}
            <TabsContent value="results">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 p-4 rounded-xl border border-dark-700">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      Carga y Control de Resultados
                    </h3>
                    <p className="text-dark-400 text-xs mt-1">
                      Registra los marcadores para que las tablas de posiciones y cuadros se calculen en vivo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasCompletedFinal && (
                      <span className="text-[11px] text-dark-400 bg-dark-800/80 px-2.5 py-1 rounded-lg border border-dark-700/80 hidden sm:inline-block">
                        Final pendiente
                      </span>
                    )}
                    <Button
                      onClick={handleProcessRankings}
                      disabled={isPending || !hasCompletedFinal}
                      variant="secondary"
                      size="sm"
                      title={
                        !hasCompletedFinal
                          ? "Disponible automáticamente cuando se complete la Gran Final"
                          : "Liquidar puntos oficiales de este torneo"
                      }
                      className={`flex items-center gap-2 ${
                        !hasCompletedFinal
                          ? "opacity-50 cursor-not-allowed border-dark-700 text-dark-400"
                          : "border-amber-500/30 text-amber-300 hover:bg-amber-500/10 shadow-sm shadow-amber-500/10"
                      }`}
                    >
                      <Medal className="w-4 h-4 text-amber-400" />
                      {isPending ? "Procesando..." : "Liquidar / Actualizar Rankings"}
                    </Button>
                  </div>
                </div>

                {matches.length === 0 ? (
                  <Card className="p-12 text-center text-dark-400">
                    Aún no hay partidos generados para cargar resultados.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {matches.map((m) => {
                      const isCompleted = m.status === "completed";
                      const isPlayoffPendingRival = !isCompleted && m.stage !== "zone" && (!m.couple1_id || !m.couple2_id);

                      return (
                        <Card
                          key={m.id}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-colors ${
                            isCompleted
                              ? "border-emerald-500/30 bg-dark-900/60"
                              : isPlayoffPendingRival
                              ? "border-dark-800 bg-dark-950/50 opacity-80"
                              : "border-dark-700/80"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant={isCompleted ? "success" : isPlayoffPendingRival ? "warning" : "default"} size="sm">
                                {isCompleted ? "FINALIZADO" : isPlayoffPendingRival ? "ESPERANDO RIVAL" : "PENDIENTE"}
                              </Badge>
                              <span className="text-xs text-dark-400">
                                {STAGE_LABELS[m.stage] ?? getStageName(m.stage)}
                              </span>
                              <span className="text-dark-500 text-xs">Partido #{m.match_number ?? "-"}</span>
                            </div>
                            <div className="text-sm font-semibold text-white">
                              <span className={m.winner_couple_id === m.couple1_id ? "text-emerald-400 font-bold" : ""}>
                                {getCoupleLabel(m.couple1, m.couple1_id)}
                              </span>
                              <span className="text-dark-500 mx-2">vs</span>
                              <span className={m.winner_couple_id === m.couple2_id ? "text-emerald-400 font-bold" : ""}>
                                {getCoupleLabel(m.couple2, m.couple2_id)}
                              </span>
                            </div>
                            {isCompleted && (
                              <p className="text-xs font-mono font-bold text-sky-400 mt-1">
                                Marcador: {[m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ")}
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={isCompleted ? "secondary" : "primary"}
                            onClick={() => openScoreModal(m)}
                            disabled={isPlayoffPendingRival}
                            title={
                              isPlayoffPendingRival
                                ? "El cruce se conformará automáticamente cuando concluyan los partidos de la ronda previa"
                                : isCompleted
                                ? "Editar Marcador"
                                : "Cargar Marcador"
                            }
                          >
                            {isCompleted ? "Editar Marcador" : "Cargar Marcador"}
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Modal: Programar Cancha y Horario */}
          <Modal
            isOpen={!!schedulingMatch}
            onClose={() => setSchedulingMatch(null)}
            title="Programar Cancha y Horario"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Partido
                </label>
                <p className="text-white text-sm font-semibold p-2.5 bg-dark-900 rounded-lg border border-dark-700">
                  {getCoupleLabel(schedulingMatch?.couple1, schedulingMatch?.couple1_id)} vs {getCoupleLabel(schedulingMatch?.couple2, schedulingMatch?.couple2_id)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Cancha Asignada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cancha 1 / Cancha Central"
                  value={formCourt}
                  onChange={(e) => setFormCourt(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Horario Estimado
                </label>
                <input
                  type="text"
                  placeholder="Ej: 14:30 hs / Sábado 16:00"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setSchedulingMatch(null)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSchedule} disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar Programación"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Carga de Marcador */}
          <Modal
            isOpen={!!scoringMatch}
            onClose={() => setScoringMatch(null)}
            title="Cargar / Editar Marcador"
          >
            <div className="space-y-4">
              <div className="p-3 bg-dark-900 rounded-lg border border-dark-700 text-sm">
                <div className="flex justify-between font-bold text-white mb-1">
                  <span>{getCoupleLabel(scoringMatch?.couple1, scoringMatch?.couple1_id)}</span>
                  <span className="text-dark-400">vs</span>
                  <span>{getCoupleLabel(scoringMatch?.couple2, scoringMatch?.couple2_id)}</span>
                </div>
                <p className="text-dark-400 text-xs">
                  Modalidad: {GAME_MODE_LABELS[tournament.game_mode] ?? tournament.game_mode}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Resultado Set 1 (o partido Americano 9 games)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 9-4, 9-8 (7-4), 6-3"
                  value={formScoreSet1}
                  onChange={(e) => setFormScoreSet1(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              {tournament.game_mode === "american_2sets" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Resultado Set 2
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 6-4, 3-1"
                      value={formScoreSet2}
                      onChange={(e) => setFormScoreSet2(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1">
                      Super Tie-Break (Tercer Set)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 11-9 (Muere en 11)"
                      value={formScoreSuperTb}
                      onChange={(e) => setFormScoreSuperTb(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Pareja Ganadora
                </label>
                <select
                  value={formWinnerCoupleId}
                  onChange={(e) => setFormWinnerCoupleId(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar ganador</option>
                  {scoringMatch?.couple1_id && (
                    <option value={scoringMatch.couple1_id}>
                      {getCoupleLabel(scoringMatch.couple1, scoringMatch.couple1_id)}
                    </option>
                  )}
                  {scoringMatch?.couple2_id && (
                    <option value={scoringMatch.couple2_id}>
                      {getCoupleLabel(scoringMatch.couple2, scoringMatch.couple2_id)}
                    </option>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setScoringMatch(null)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveScore} disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar Marcador"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Confirmar Eliminación */}
          <ConfirmModal
            isOpen={showDelete}
            onClose={() => setShowDelete(false)}
            onConfirm={handleDelete}
            loading={isPending}
            title="Eliminar Torneo"
            message={`¿Estás seguro de eliminar el torneo "${tournament.name}"? Se eliminarán todas las zonas, parejas y partidos asociados en la base de datos. Esta acción no se puede deshacer.`}
          />

          {/* Modal: Advertencia de Zonas Desiguales y Jugadores Faltantes */}
          <Modal
            isOpen={showUnequalWarningModal}
            onClose={() => setShowUnequalWarningModal(false)}
            title="⚠️ Advertencia: Zonas con Cantidad Desigual de Parejas"
          >
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-200">
                <p className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Condición reglamentaria no cumplida
                </p>
                <p>
                  En SPT, todas las zonas deben tener la <strong>misma cantidad exacta de parejas</strong> ({targetZoneSize} por zona).
                </p>
                <p className="text-white text-sm font-semibold bg-dark-900/80 p-2.5 rounded-lg border border-amber-500/20">
                  Actualmente hay {couples.length} parejas. Para completar zonas equitativas de {targetZoneSize} parejas,{" "}
                  <span className="text-amber-300">
                    faltan {zoneDistribution.missingPlayers} jugadores ({zoneDistribution.missingCouples} {zoneDistribution.missingCouples === 1 ? "pareja" : "parejas"})
                  </span>.
                </p>
                <p className="text-dark-300 text-xs">
                  Si continúas, algunas zonas tendrán {targetZoneSize} parejas y otras menos, dejando un fixture desbalanceado.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Link
                  href={`/admin/parejas?tournamentId=${tournamentId}`}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold text-center transition-colors"
                >
                  Inscribir Jugadores/Parejas
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnequalWarningModal(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => executeShuffleZones(true)}
                  disabled={isPending}
                >
                  {isPending ? "Sorteando..." : "Forzar Sorteo de Todos Modos"}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

export default function AdminTorneoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminTorneoDetailContent tournamentId={tournamentId} />
    </Suspense>
  );
}
