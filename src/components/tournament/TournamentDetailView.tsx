"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tournament, Zone, Couple, Match } from "@/types/tournament";
import { calculateRoundRobinStandings } from "@/lib/tournament/standings";
import { getCoupleNumberMap, getCoupleLabelWithNumber, getCouplePlayersShortLabel, isSumaCategory, formatScoreInput } from "@/lib/tournament/couples";
import { propagatePlayoffWinners, getStageName, findNextPlayoffMatchSlot } from "@/lib/tournament/elimination";
import { normalizeScheduledTime } from "@/lib/tournament/scheduler";
import Bracket from "@/components/tournament/Bracket";
import ZoneConformationEditor from "@/components/tournament/ZoneConformationEditor";
import AutoScheduleModal from "@/components/tournament/AutoScheduleModal";
import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
  ArrowLeft,
  Users,
  Sparkles,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Edit2,
} from "lucide-react";

interface TournamentDetailProps {
  id: string;
  initialTab?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  zones: "Fase de Zonas",
  playoffs: "Playoffs",
  finished: "Finalizado",
  registration: "Inscripción",
  active: "En Curso",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const GAME_MODE_LABELS: Record<string, string> = {
  american_9games: "Americano a 9 games",
  american_2sets: "Americano 2 sets a 3 games",
  traditional: "Tradicional al mejor de 3",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  zones: "warning",
  playoffs: "info",
  finished: "success",
  registration: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
};

export default function TournamentDetailView({ id, initialTab }: TournamentDetailProps) {
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [zoneCouplesMap, setZoneCouplesMap] = useState<Record<string, string[]>>({});
  const [fixtureFilter, setFixtureFilter] = useState<"all" | "zone" | "playoff">("all");
  const [loading, setLoading] = useState(true);
  const [isGeneratingZones, setIsGeneratingZones] = useState(false);
  const [isEditingConformation, setIsEditingConformation] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de Programación de Canchas y Horarios
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [formCourt, setFormCourt] = useState("");
  const [formTime, setFormTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const openScheduleModal = (m: Match) => {
    setSchedulingMatch(m);
    setFormCourt(m.court_name || "");
    // Si viene ISO, mostrar hora legible o ISO
    if (m.scheduled_time) {
      try {
        const d = new Date(m.scheduled_time);
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        setFormTime(`${hours}:${minutes}`);
      } catch {
        setFormTime(m.scheduled_time);
      }
    } else {
      setFormTime("");
    }
  };

  const handleSaveSingleSchedule = async () => {
    if (!schedulingMatch) return;
    setIsSavingSchedule(true);
    try {
      const normalizedTime = normalizeScheduledTime(formTime, tournament?.date);
      const { error } = await supabase
        .from("matches")
        .update({
          court_name: formCourt.trim() || null,
          scheduled_time: normalizedTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedulingMatch.id);

      if (error) throw error;

      setMatches((prev) =>
        prev.map((m) =>
          m.id === schedulingMatch.id
            ? { ...m, court_name: formCourt.trim() || null, scheduled_time: normalizedTime }
            : m
        )
      );
      setSchedulingMatch(null);
      setNotification({ type: "success", text: "Cancha y horario actualizados correctamente." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar horario";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Estados y lógica de carga de marcadores (Resultados)
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [formScoreSet1, setFormScoreSet1] = useState("");
  const [formScoreSet2, setFormScoreSet2] = useState("");
  const [formScoreSuperTb, setFormScoreSuperTb] = useState("");
  const [formWinnerCoupleId, setFormWinnerCoupleId] = useState("");
  const [isSavingScore, setIsSavingScore] = useState(false);

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

    setIsSavingScore(true);
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
      if (scoringMatch.stage !== "zone") {
        const nextSlot = findNextPlayoffMatchSlot(matches, scoringMatch);
        if (nextSlot) {
          const targetMatch = matches.find((m) => m.id === nextSlot.targetMatchId);
          const updatePayload: Record<string, unknown> = {
            [nextSlot.slotField]: formWinnerCoupleId,
            updated_at: new Date().toISOString(),
          };

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

          await supabase.from("matches").update(updatePayload).eq("id", nextSlot.targetMatchId);
        }
      }

      // Si el partido completado es la Final, auto-liquidar rankings
      if (scoringMatch.stage === "final") {
        try {
          await fetch("/api/rankings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tournamentId: id, recalculate: true }),
          });
        } catch (rankErr) {
          console.warn("Error auto-liquidando rankings tras la final:", rankErr);
        }
      }

      await loadTournamentData();
      setScoringMatch(null);
      setNotification({
        type: "success",
        text: "Marcador guardado exitosamente. El partido ahora figura como Finalizado.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar resultado";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsSavingScore(false);
    }
  };

  const loadTournamentData = useCallback(async () => {
    try {
      // Fetch tournament
      const { data: tourData } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (tourData) {
        setTournament(tourData);
      }

      // Fetch zones
      const { data: zonesData } = await supabase
        .from("zones")
        .select("*")
        .eq("tournament_id", id)
        .order("zone_number", { ascending: true });

      if (zonesData) setZones(zonesData);

      // Fetch couples with players
      const { data: couplesData } = await supabase
        .from("couples")
        .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)")
        .eq("tournament_id", id);

      if (couplesData) setCouples(couplesData);

      // Fetch zone_couples
      const { data: zcData } = await supabase
        .from("zone_couples")
        .select("zone_id, couple_id");

      if (zcData) {
        const map: Record<string, string[]> = {};
        zcData.forEach((item) => {
          if (!map[item.zone_id]) map[item.zone_id] = [];
          map[item.zone_id].push(item.couple_id);
        });
        setZoneCouplesMap(map);
      }

      // Fetch matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*, couple1:couples!matches_couple1_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)), couple2:couples!matches_couple2_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))")
        .eq("tournament_id", id)
        .order("scheduled_time", { ascending: true, nullsFirst: false });

      if (matchesData) setMatches(matchesData);
    } catch (err) {
      console.error("Error loading tournament details:", err);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  const handleGenerateZones = async () => {
    if (!tournament) return;
    setIsGeneratingZones(true);
    setNotification(null);
    try {
      const res = await fetch("/api/zonas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: id,
          action: "generate_zones",
          numZones: tournament.num_zones,
          zoneSize: tournament.zone_size,
          force: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar zonas");
      }

      await loadTournamentData();
      setNotification({
        type: "success",
        text: `Se generaron exitosamente ${data.zones?.length ?? tournament.num_zones} zonas con ${tournament.zone_size} parejas cada una.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al generar zonas";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsGeneratingZones(false);
    }
  };

  useEffect(() => {
    loadTournamentData();

    // Subscribe to realtime match score updates
    const channel = supabase
      .channel(`public:matches:tour_${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setMatches((prev) => prev.filter((m) => m.id !== deletedId));
            }
          } else {
            const updated = payload.new as Match;
            setMatches((prev) => {
              const exists = prev.some((m) => m.id === updated.id);
              if (exists) {
                return prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
              }
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  // Incondicional: Mapas de parejas y numeración correlativa
  const coupleNumberMap = useMemo(() => getCoupleNumberMap(couples), [couples]);

  const { coupleNamesMap, couplePlayersMap, coupleByIdMap } = useMemo(() => {
    const names: Record<string, string> = {};
    const players: Record<string, string> = {};
    const byId: Record<string, Couple> = {};

    couples.forEach((c) => {
      const num = coupleNumberMap.get(c.id);
      names[c.id] = getCoupleLabelWithNumber(c, num);
      players[c.id] = getCouplePlayersShortLabel(c);
      byId[c.id] = c;
    });

    matches.forEach((m) => {
      if (m.couple1 && m.couple1_id && !names[m.couple1_id]) {
        const num = coupleNumberMap.get(m.couple1_id);
        names[m.couple1_id] = getCoupleLabelWithNumber(m.couple1, num);
        players[m.couple1_id] = getCouplePlayersShortLabel(m.couple1);
        byId[m.couple1_id] = m.couple1;
      }
      if (m.couple2 && m.couple2_id && !names[m.couple2_id]) {
        const num = coupleNumberMap.get(m.couple2_id);
        names[m.couple2_id] = getCoupleLabelWithNumber(m.couple2, num);
        players[m.couple2_id] = getCouplePlayersShortLabel(m.couple2);
        byId[m.couple2_id] = m.couple2;
      }
    });

    return { coupleNamesMap: names, couplePlayersMap: players, coupleByIdMap: byId };
  }, [couples, matches, coupleNumberMap]);

  // Incondicional: Propagar reactivamente en memoria los ganadores de eliminatorias
  const { updatedMatches: displayMatches } = useMemo(() => {
    return propagatePlayoffWinners(matches);
  }, [matches]);

  // Incondicional: Ordenar fixture cronológicamente
  const sortedDisplayMatches = useMemo(() => {
    return [...displayMatches].sort((a, b) => {
      if (a.stage === "zone" && b.stage !== "zone") return -1;
      if (a.stage !== "zone" && b.stage === "zone") return 1;

      if (a.stage !== "zone" && b.stage !== "zone") {
        if (a.match_number != null && b.match_number != null) {
          return a.match_number - b.match_number;
        }
      }

      if (a.scheduled_time && b.scheduled_time) {
        return a.scheduled_time.localeCompare(b.scheduled_time);
      }
      if (a.match_number != null && b.match_number != null) {
        return a.match_number - b.match_number;
      }
      return (a.id || "").localeCompare(b.id || "");
    });
  }, [displayMatches]);

  const filteredMatches = useMemo(() => {
    if (fixtureFilter === "zone") {
      return sortedDisplayMatches.filter((m) => m.stage === "zone");
    }
    if (fixtureFilter === "playoff") {
      return sortedDisplayMatches.filter((m) => m.stage !== "zone");
    }
    return sortedDisplayMatches;
  }, [sortedDisplayMatches, fixtureFilter]);

  // Incondicional: Estructura del cuadro eliminatorio para pestaña playoffs
  const bracketRounds = useMemo(() => {
    const STAGE_ORDER: Record<string, number> = {
      round_of_16: 1,
      octavos: 1,
      quarter: 2,
      cuartos: 2,
      semi: 3,
      semifinal: 3,
      final: 4,
      third_place: 5,
      tercer_puesto: 5,
    };

    const playoffMatches = displayMatches
      .filter((m) => m.stage !== "zone")
      .sort((a, b) => {
        if (a.match_number != null && b.match_number != null && a.match_number !== b.match_number) {
          return a.match_number - b.match_number;
        }
        if (a.created_at && b.created_at && a.created_at !== b.created_at) {
          return a.created_at.localeCompare(b.created_at);
        }
        return a.id.localeCompare(b.id);
      });

    const playoffRoundsMap: Record<string, { pair1: string; pair2: string; winner?: string; score?: string }[]> = {};

    playoffMatches.forEach((m) => {
      const stage = m.stage;
      if (!playoffRoundsMap[stage]) playoffRoundsMap[stage] = [];
      const scoreStr = [m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ");
      playoffRoundsMap[stage].push({
        pair1: m.couple1_id ?? "Por definir",
        pair2: m.couple2_id ?? "Por definir",
        winner: m.winner_couple_id ?? undefined,
        score: scoreStr || undefined,
      });
    });

    return Object.entries(playoffRoundsMap)
      .sort(([roundA], [roundB]) => (STAGE_ORDER[roundA] ?? 99) - (STAGE_ORDER[roundB] ?? 99))
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches,
      }));
  }, [displayMatches]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-dark-400 text-lg mb-4">Torneo no encontrado</p>
        <Link href="/torneos" className="text-primary-400 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver a torneos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/torneos"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a torneos
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/parejas?torneo=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
            title="Ir al editor de parejas para este torneo"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Parejas ({couples.length})</span>
          </Link>
          <Link
            href={`/admin/torneos/${id}`}
            className="text-xs text-primary-400 hover:underline"
          >
            Panel de administración
          </Link>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl mb-6 flex items-center justify-between gap-3 text-xs font-semibold border ${
            notification.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-dark-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tournament Header */}
      <div className="bg-gradient-to-b from-dark-900 via-dark-900/90 to-dark-950 border border-dark-700/80 rounded-2xl p-6 mb-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <Badge variant={STATUS_VARIANTS[tournament.status] ?? "info"} pulse={tournament.status === "active"}>
                {STATUS_LABELS[tournament.status] ?? tournament.status}
              </Badge>
              <span className={`px-3 py-0.5 rounded-full text-xs font-black border tracking-wider ${
                tournament.gender === "Femenino"
                  ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
              }`}>
                {tournament.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
              </span>
              {isSumaCategory(tournament.category) ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/35 tracking-wider">
                  ∑ {tournament.category}
                </span>
              ) : (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 tracking-wider">
                  Categoría {tournament.category || "6ta"}
                </span>
              )}
              {tournament.game_mode && (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-sky-500/10 text-sky-400 border border-sky-500/25 tracking-wider">
                  {GAME_MODE_LABELS[tournament.game_mode] ?? tournament.game_mode}
                </span>
              )}
              {tournament.golden_point && (
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/35 flex items-center gap-1 shadow-sm shadow-amber-400/10">
                  ⭐ Punto de Oro (40-40)
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {tournament.name}
            </h1>
            <div className="flex items-center gap-4 mt-3.5 text-slate-300 text-xs sm:text-sm flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {new Date(tournament.date).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {tournament.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  {tournament.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-dark-400" />
                {couples.length} Parejas ({tournament.num_zones} zonas de {tournament.zone_size})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={initialTab || "parejas"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="parejas">Parejas ({couples.length})</TabsTrigger>
          <TabsTrigger value="zonas">Zonas</TabsTrigger>
          <TabsTrigger value="fixture">Fixture / Horarios</TabsTrigger>
          <TabsTrigger value="playoffs">Cuadro de Eliminación</TabsTrigger>
          <TabsTrigger value="posiciones">Posiciones</TabsTrigger>
        </TabsList>

        {/* 1. TAB: PAREJAS */}
        <TabsContent value="parejas">
          <div className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 p-5 rounded-2xl border border-dark-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Parejas Inscriptas ({couples.length})
                  </h2>
                  <p className="text-xs text-dark-400 mt-0.5">
                    Duplas confirmadas para competir en {tournament.name}.
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/parejas?torneo=${id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all self-start sm:self-center"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Editor de Parejas</span>
              </Link>
            </div>

            {couples.length === 0 ? (
              <Card className="p-12 text-center text-dark-400 space-y-4">
                <Users className="w-12 h-12 text-dark-500 mx-auto" />
                <div>
                  <h4 className="text-white font-bold text-base">Sin parejas registradas</h4>
                  <p className="text-xs text-dark-400 mt-1 max-w-sm mx-auto">
                    Aún no se han conformado las parejas para este torneo.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/admin/parejas?torneo=${id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-dark-950 font-black text-xs hover:bg-emerald-400 transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span>Cargar Parejas</span>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {couples.map((c) => {
                  const num = coupleNumberMap.get(c.id);
                  return (
                    <Card key={c.id} className="p-4 border-dark-700/80 bg-dark-900/90 hover:border-emerald-500/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Pareja {num ?? "-"}
                        </span>
                        <span className="text-xs text-dark-400 font-semibold">
                          Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {coupleNamesMap[c.id] || getCoupleLabelWithNumber(c, num)}
                      </h4>
                      <p className="text-xs text-dark-400">
                        {c.player1?.first_name} {c.player1?.last_name} &amp; {c.player2?.first_name} {c.player2?.last_name}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. TAB: ZONAS */}
        <TabsContent value="zonas">
          <div className="mt-6 space-y-6">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                  Fase de Zonas (Todos contra todos)
                </h2>
                <p className="text-xs text-dark-400 mt-0.5">
                  Estructura fijada al crear el torneo:{" "}
                  <strong className="text-white">
                    {tournament.num_zones} {tournament.num_zones === 1 ? "zona" : "zonas"}
                  </strong>{" "}
                  de <strong className="text-white">{tournament.zone_size} parejas</strong>.
                  <span className="hidden sm:inline"> (La peor clasificada de cada zona queda eliminada).</span>
                </p>
              </div>

              {/* Botones de acción en la opción Zonas */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleGenerateZones}
                  disabled={isGeneratingZones}
                  className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isGeneratingZones
                      ? "Generando..."
                      : zones.length === 0
                      ? "Generar Zonas"
                      : "Re-generar Zonas"}
                  </span>
                </Button>

                {zones.length > 0 && !isEditingConformation && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditingConformation(true)}
                    className="border-dark-700 hover:border-emerald-500/40 text-slate-200 font-bold flex items-center gap-1.5"
                  >
                    <Settings2 className="w-4 h-4 text-emerald-400" />
                    <span>Editar Conformación</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Modo Edición Interactivo de Conformación de Zonas */}
            {isEditingConformation ? (
              <ZoneConformationEditor
                tournamentId={id}
                zones={zones}
                couples={couples}
                zoneCouplesMap={zoneCouplesMap}
                coupleNumberMap={coupleNumberMap}
                coupleNamesMap={coupleNamesMap}
                targetZoneSize={tournament.zone_size || 4}
                onSaveSuccess={async () => {
                  await loadTournamentData();
                  setIsEditingConformation(false);
                  setNotification({
                    type: "success",
                    text: "Conformación de zonas guardada y actualizada exitosamente.",
                  });
                }}
                onCancel={() => setIsEditingConformation(false)}
              />
            ) : zones.length === 0 ? (
              <Card className="p-10 text-center text-dark-400 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base mb-1">
                    Aún no se han generado las zonas
                  </h4>
                  <p className="text-xs text-dark-300 max-w-md mx-auto">
                    El torneo fue configurado con{" "}
                    <strong className="text-emerald-400">{tournament.num_zones} zonas</strong> de{" "}
                    <strong className="text-emerald-400">{tournament.zone_size} parejas</strong>.
                    {couples.length > 0
                      ? ` Hay ${couples.length} parejas confirmadas listas para ser distribuidas.`
                      : " Recuerda cargar las parejas desde el editor."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={handleGenerateZones}
                    disabled={isGeneratingZones}
                    className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingZones ? "Generando Zonas..." : "Generar Zonas"}</span>
                  </Button>
                  <Link
                    href={`/admin/parejas?torneo=${id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-bold transition-all"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Editor de Parejas ({couples.length})</span>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {zones.map((zone) => {
                  const zoneCoupleIds = zoneCouplesMap[zone.id] ?? [];
                  const zoneMatches = matches.filter((m) => m.zone_id === zone.id);
                  const standings = calculateRoundRobinStandings(zoneMatches, zoneCoupleIds);

                  return (
                    <Card key={zone.id} className="overflow-hidden border border-dark-700/80 shadow-xl bg-dark-900/90">
                      <div className="px-5 py-3.5 bg-dark-950 border-b border-dark-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                            <span className="text-blue-400 font-bold text-xs">{zone.zone_number}</span>
                          </div>
                          <h3 className="text-white font-bold text-base">{zone.name}</h3>
                        </div>
                        <Badge variant="info" size="sm">Zona {zone.zone_number}</Badge>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-dark-400 text-[11px] uppercase tracking-wider bg-dark-950/60 border-b border-dark-800">
                              <th className="px-3 sm:px-4 py-2.5 text-left font-semibold">#</th>
                              <th className="px-3 sm:px-4 py-2.5 text-left font-semibold">Pareja</th>
                              <th className="px-2.5 py-2.5 text-center font-semibold">PJ</th>
                              <th className="px-2.5 py-2.5 text-center font-semibold text-emerald-400">PG</th>
                              <th className="px-2.5 py-2.5 text-center font-semibold text-rose-400">PP</th>
                              <th className="px-2.5 py-2.5 text-center font-bold text-sky-400">Pts</th>
                              <th className="px-2.5 py-2.5 text-center font-semibold">Dif</th>
                              <th className="px-3 py-2.5 text-center font-semibold text-xs">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-800/80">
                            {standings.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-4 py-4 text-center text-dark-400 text-xs">
                                  Sin parejas asignadas a esta zona
                                </td>
                              </tr>
                            ) : (
                              standings.map((s, idx) => {
                                const isEliminated = idx === standings.length - 1 && standings.length > 1;
                                const isFirst = idx === 0;
                                const isQualified = !isEliminated && standings.length > 1;
                                const coupleName = coupleNamesMap[s.pair_id ?? s.couple_id ?? ""] ?? "Pareja";

                                return (
                                  <tr
                                    key={s.pair_id || idx}
                                    className={`transition-colors ${
                                      isEliminated
                                        ? "bg-rose-950/20 hover:bg-rose-950/30 text-rose-300"
                                        : isFirst
                                        ? "bg-amber-400/[0.04] hover:bg-amber-400/[0.08] text-white"
                                        : "bg-dark-900/60 hover:bg-dark-850 text-white"
                                    }`}
                                  >
                                    <td className="px-3 sm:px-4 py-3 font-semibold text-xs">
                                      <span
                                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-black ${
                                          isFirst
                                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                            : isEliminated
                                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        }`}
                                      >
                                        {idx + 1}°
                                      </span>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm">
                                      <span className="truncate block max-w-[150px] sm:max-w-[180px]">{coupleName}</span>
                                    </td>
                                    <td className="px-2.5 py-3 text-center text-xs text-dark-300 scoreboard-digit">{s.matches_played}</td>
                                    <td className="px-2.5 py-3 text-center text-xs text-emerald-400 font-bold scoreboard-digit">{s.matches_won}</td>
                                    <td className="px-2.5 py-3 text-center text-xs text-rose-400 scoreboard-digit">{s.matches_lost}</td>
                                    <td className="px-2.5 py-3 text-center font-black text-sm text-sky-400 scoreboard-digit">{s.points}</td>
                                    <td className="px-2.5 py-3 text-center text-xs text-dark-300 scoreboard-digit">
                                      {(s.games_won ?? 0) - (s.games_lost ?? 0) > 0 ? `+${(s.games_won ?? 0) - (s.games_lost ?? 0)}` : (s.games_won ?? 0) - (s.games_lost ?? 0)}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      {isEliminated ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/35">
                                          Eliminada
                                        </span>
                                      ) : isFirst ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                          1° Puesto
                                        </span>
                                      ) : isQualified ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                          Clasifica
                                        </span>
                                      ) : (
                                        <span className="text-dark-500 text-xs">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. TAB: FIXTURE / HORARIOS */}
        <TabsContent value="fixture">
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  Programación de Partidos y Fixture
                </h2>
                <p className="text-xs text-dark-400 mt-1">
                  En eliminación directa, los cruces de cada fase se conforman automáticamente a medida que las parejas ganan sus partidos.
                </p>
              </div>
              {isAdmin && matches.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsAutoScheduleOpen(true)}
                  className="flex items-center gap-2 font-bold shadow-md bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-dark-950 self-start sm:self-auto"
                >
                  <Sparkles className="w-4 h-4 text-dark-950" />
                  Programador Automático
                </Button>
              )}
            </div>

            {/* Filtros de Fixture */}
            <div className="flex items-center gap-2 mb-6 p-1 bg-dark-900/80 rounded-xl border border-dark-800 w-fit flex-wrap">
              <button
                type="button"
                onClick={() => setFixtureFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fixtureFilter === "all"
                    ? "bg-emerald-500 text-dark-950 shadow-md font-black"
                    : "text-dark-400 hover:text-white"
                }`}
              >
                Todos ({sortedDisplayMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setFixtureFilter("zone")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fixtureFilter === "zone"
                    ? "bg-emerald-500 text-dark-950 shadow-md font-black"
                    : "text-dark-400 hover:text-white"
                }`}
              >
                Fase de Zonas ({sortedDisplayMatches.filter((m) => m.stage === "zone").length})
              </button>
              <button
                type="button"
                onClick={() => setFixtureFilter("playoff")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  fixtureFilter === "playoff"
                    ? "bg-emerald-500 text-dark-950 shadow-md font-black"
                    : "text-dark-400 hover:text-white"
                }`}
              >
                Eliminación Directa ({sortedDisplayMatches.filter((m) => m.stage !== "zone").length})
              </button>
            </div>

            {filteredMatches.length === 0 ? (
              <Card className="p-8 text-center text-dark-400">
                Aún no hay partidos programados en esta sección.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map((m) => {
                  const isPlayoff = m.stage !== "zone";
                  const isPendingRival = isPlayoff && (!m.couple1_id || !m.couple2_id);
                  const hasResult = m.status === "completed" || Boolean(m.score_set1 || m.score_set2 || m.score_super_tb);
                  const isFinished = m.status === "completed";
                  const isLive = m.status === "in_progress";
                  const isP1Winner = m.winner_couple_id && m.winner_couple_id === m.couple1_id;
                  const isP2Winner = m.winner_couple_id && m.winner_couple_id === m.couple2_id;

                  const c1Players = couplePlayersMap[m.couple1_id ?? ""] ?? (m.couple1 ? getCouplePlayersShortLabel(m.couple1) : "Por definir");
                  const c2Players = couplePlayersMap[m.couple2_id ?? ""] ?? (m.couple2 ? getCouplePlayersShortLabel(m.couple2) : "Por definir");
                  const c1Name = coupleNamesMap[m.couple1_id ?? ""] ?? (m.couple1 ? getCoupleLabelWithNumber(m.couple1, coupleNumberMap.get(m.couple1.id)) : "Por definir");
                  const c2Name = coupleNamesMap[m.couple2_id ?? ""] ?? (m.couple2 ? getCoupleLabelWithNumber(m.couple2, coupleNumberMap.get(m.couple2.id)) : "Por definir");

                  // Si ya tiene un resultado cargado, solo mostrar los nombres de los jugadores y el resultado
                  if (hasResult) {
                    return (
                      <Card
                        key={m.id}
                        className="p-4 border border-emerald-500/30 bg-dark-900/90 shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between text-xs text-dark-400 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-rose-400" />
                              FINALIZADO
                            </span>
                            {isPlayoff && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                CLASIFICÓ GANADOR
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-emerald-400/80 text-[11px] uppercase tracking-wider">
                            {getStageName(m.stage)}
                          </span>
                        </div>

                        {/* Electronic Scoreboard: solo nombres de jugadores y resultado */}
                        <div className="space-y-1.5 bg-dark-950/80 p-2 rounded-xl border border-dark-800/80 mb-2">
                          <div
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                              isP1Winner
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
                                : "text-slate-200"
                            }`}
                          >
                            <span className="truncate pr-2">{c1Players}</span>
                            {m.score_set1 && (
                              <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                                {m.score_set1}
                              </span>
                            )}
                          </div>

                          <div
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                              isP2Winner
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
                                : "text-slate-200"
                            }`}
                          >
                            <span className="truncate pr-2">{c2Players}</span>
                            {m.score_set2 && (
                              <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                                {m.score_set2}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-dark-800/60 text-xs">
                          <button
                            type="button"
                            onClick={() => isAdmin && openScoreModal(m)}
                            title={isAdmin ? "Clic para modificar resultado" : "Partido Finalizado"}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 transition-all ${
                              isAdmin ? "hover:bg-rose-500/30 cursor-pointer" : "cursor-default"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                            Finalizado
                          </button>
                          <div className="flex items-center gap-2">
                            {m.score_super_tb && (
                              <span className="text-amber-400 text-xs font-mono font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/25">
                                STB: {m.score_super_tb}
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openScheduleModal(m)}
                                title="Reprogramar cancha y horario"
                                className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium border border-dark-700"
                              >
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                <span>Reprogramar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card
                      key={m.id}
                      className={`p-4 border transition-all duration-200 ${
                        isLive
                          ? "border-rose-500/60 bg-gradient-to-b from-rose-950/20 via-dark-900/90 to-dark-950 shadow-lg shadow-rose-950/30"
                          : isPendingRival
                          ? "border-dark-800/80 bg-dark-950/40 opacity-80"
                          : "border-dark-700/70 bg-dark-900/90 shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-dark-400 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isLive ? (
                            <Badge variant="live" pulse size="xs">
                              EN JUEGO
                            </Badge>
                          ) : (
                            <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                              {getStageName(m.stage)}
                            </span>
                          )}
                          {isPlayoff && (
                            isPendingRival ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                                Esperando Rival
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                Cruce Confirmado
                              </span>
                            )
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {m.court_name && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[11px] font-bold">
                              {m.court_name}
                            </span>
                          )}
                          {m.scheduled_time && (
                            <span className="text-dark-300 font-medium">
                              {new Date(m.scheduled_time).toLocaleTimeString("es-AR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Electronic Scoreboard Box */}
                      <div className="space-y-1.5 bg-dark-950/80 p-2 rounded-xl border border-dark-800/80 mb-3">
                        <div
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                            isP1Winner
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
                              : !m.couple1_id
                              ? "text-dark-400 italic font-normal bg-dark-950/40"
                              : "text-slate-200"
                          }`}
                        >
                          <span className="truncate pr-2">{c1Name}</span>
                          {m.score_set1 && (
                            <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                              {m.score_set1}
                            </span>
                          )}
                        </div>

                        <div
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                            isP2Winner
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold"
                              : !m.couple2_id
                              ? "text-dark-400 italic font-normal bg-dark-950/40"
                              : "text-slate-200"
                          }`}
                        >
                          <span className="truncate pr-2">{c2Name}</span>
                          {m.score_set2 && (
                            <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                              {m.score_set2}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-dark-800 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPendingRival) openScoreModal(m);
                          }}
                          disabled={isPendingRival}
                          title={isPendingRival ? "Esperando definición de clasificados" : "Indicar resultado del partido"}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                            isPendingRival
                              ? "bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60 hover:scale-[1.02] cursor-pointer"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Programado
                        </button>
                        <div className="flex items-center gap-2">
                          {m.score_super_tb && (
                            <span className="text-amber-400 text-xs font-mono font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/25">
                              STB: {m.score_super_tb}
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openScheduleModal(m)}
                              title="Reprogramar cancha y horario"
                              className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-medium border border-dark-700"
                            >
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              <span>Reprogramar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>


        {/* 3. TAB: CUADRO DE ELIMINACIÓN (PLAYOFFS) */}
        <TabsContent value="playoffs">
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Cuadro Principal de Eliminación Directa
            </h2>

            {bracketRounds.length === 0 ? (
              <Card className="p-8 text-center text-dark-400">
                <p>El cuadro de playoffs se generará al completarse los partidos de zonas.</p>
                <p className="text-xs mt-2 text-dark-500">
                  Las parejas clasificadas avanzarán automáticamente a Cuartos, Semis y Final.
                </p>
              </Card>
            ) : (
              <Card className="p-6 overflow-x-auto">
                <Bracket rounds={bracketRounds} pairNames={coupleNamesMap} />
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 4. TAB: POSICIONES */}
        <TabsContent value="posiciones">
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Tabla General de Posiciones del Torneo
            </h2>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                      <th className="px-6 py-3 text-left">#</th>
                      <th className="px-6 py-3 text-left">Pareja</th>
                      <th className="px-6 py-3 text-center">Categoría</th>
                      <th className="px-6 py-3 text-center">Seed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {couples.map((c, i) => (
                      <tr key={c.id} className="bg-dark-800">
                        <td className="px-6 py-4 font-bold text-primary-400">{i + 1}</td>
                        <td className="px-6 py-4 text-white font-medium">
                          {coupleNamesMap[c.id] ?? "Pareja"}
                        </td>
                        <td className="px-6 py-4 text-center text-dark-300">
                          {tournament.category}
                        </td>
                        <td className="px-6 py-4 text-center text-dark-400">
                          {c.seed ? `#${c.seed}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Programador Automático de Partidos */}
      {tournament && (
        <AutoScheduleModal
          isOpen={isAutoScheduleOpen}
          onClose={() => setIsAutoScheduleOpen(false)}
          tournamentId={id}
          tournamentDate={tournament.date}
          matches={matches}
          onScheduleComplete={loadTournamentData}
        />
      )}

      {/* Modal: Edición Manual de Cancha y Horario */}
      <Modal
        isOpen={!!schedulingMatch}
        onClose={() => setSchedulingMatch(null)}
        title="Editar Cancha y Horario del Partido"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">
              Partido
            </label>
            <p className="text-white text-sm font-semibold p-2.5 bg-dark-900 rounded-lg border border-dark-700">
              {schedulingMatch?.couple1
                ? getCoupleLabelWithNumber(schedulingMatch.couple1, coupleNumberMap.get(schedulingMatch.couple1.id))
                : "Por definir"}{" "}
              <span className="text-emerald-400 mx-1">vs</span>{" "}
              {schedulingMatch?.couple2
                ? getCoupleLabelWithNumber(schedulingMatch.couple2, coupleNumberMap.get(schedulingMatch.couple2.id))
                : "Por definir"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">
              Cancha Asignada
            </label>
            <input
              type="text"
              placeholder="Ej: Cancha 1 / Cancha Central"
              value={formCourt}
              onChange={(e) => setFormCourt(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-400 mb-1">
              Horario Programado (HH:mm o fecha completa)
            </label>
            <input
              type="text"
              placeholder="Ej: 14:30 o 2026-10-25 14:30"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[11px] text-dark-400 mt-1">
              Puedes ingresar la hora en formato 24hs (ej: 09:00, 14:30) y se asociará a la fecha del torneo.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
            <Button variant="ghost" onClick={() => setSchedulingMatch(null)} disabled={isSavingSchedule}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSingleSchedule} disabled={isSavingSchedule}>
              {isSavingSchedule ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cargar / Modificar Marcador del Partido */}
      <Modal
        isOpen={!!scoringMatch}
        onClose={() => setScoringMatch(null)}
        title="Cargar / Modificar Marcador del Partido"
      >
        <div className="space-y-4">
          {/* 1. Selector de Pareja Ganadora */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Pareja Ganadora
            </label>
            <select
              value={formWinnerCoupleId}
              onChange={(e) => setFormWinnerCoupleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar pareja ganadora...</option>
              {scoringMatch?.couple1_id && (
                <option value={scoringMatch.couple1_id}>
                  🏆 {scoringMatch.couple1
                    ? getCoupleLabelWithNumber(scoringMatch.couple1, coupleNumberMap.get(scoringMatch.couple1.id))
                    : "Pareja 1"}
                </option>
              )}
              {scoringMatch?.couple2_id && (
                <option value={scoringMatch.couple2_id}>
                  🏆 {scoringMatch.couple2
                    ? getCoupleLabelWithNumber(scoringMatch.couple2, coupleNumberMap.get(scoringMatch.couple2.id))
                    : "Pareja 2"}
                </option>
              )}
            </select>
          </div>

          {/* 2. Debajo: Resultado del Partido con barra '/' automática */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
              Resultado del Partido {tournament?.game_mode === "american_2sets" ? "(Set 1)" : ""}
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ej: 9/4"
              value={formScoreSet1}
              onChange={(e) => setFormScoreSet1(formatScoreInput(e.target.value))}
              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
            />
            <p className="text-[11px] text-dark-400 mt-1 text-center">
              Tipeá solo los números (ej: 9 y 4) y la barra <span className="font-bold text-emerald-400">/</span> se colocará automáticamente.
            </p>
          </div>

          {tournament?.game_mode === "american_2sets" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Resultado Set 2 (a 3 games)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 3/1"
                  value={formScoreSet2}
                  onChange={(e) => setFormScoreSet2(formatScoreInput(e.target.value))}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Super Tie-Break a 10 (en caso de empate en sets)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 11/9"
                  value={formScoreSuperTb}
                  onChange={(e) => setFormScoreSuperTb(formatScoreInput(e.target.value))}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
                />
              </div>
            </>
          )}

          {tournament?.game_mode !== "american_9games" && tournament?.game_mode !== "american_2sets" && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                Resultado Set 2 (opcional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 6/3"
                value={formScoreSet2}
                onChange={(e) => setFormScoreSet2(formatScoreInput(e.target.value))}
                className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <Button variant="ghost" onClick={() => setScoringMatch(null)} disabled={isSavingScore}>
              Cancelar
            </Button>
            <Button onClick={handleSaveScore} disabled={isSavingScore}>
              {isSavingScore ? "Guardando..." : "Confirmar Resultado"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
