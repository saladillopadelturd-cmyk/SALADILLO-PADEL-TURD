"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tournament, Zone, Couple, Match } from "@/types/tournament";
import { calculateRoundRobinStandings, getQualifiedPairs } from "@/lib/tournament/standings";
import { getMatchZoneDisplayName, propagateZoneMatches, getZone4MatchInfo } from "@/lib/tournament/zones";
import { getCoupleNumberMap, getCoupleLabelWithNumber, getCouplePlayersShortLabel, getCoupleLastNames, isSumaCategory, formatScoreInput } from "@/lib/tournament/couples";
import {
  propagatePlayoffWinners,
  getStageName,
  findNextPlayoffMatchSlot,
  type QualifiedPair,
} from "@/lib/tournament/elimination";
import { normalizeScheduledTime } from "@/lib/tournament/scheduler";
import { formatDate } from "@/lib/dateUtils";
const ZoneConformationEditor = dynamic(
  () => import("@/components/tournament/ZoneConformationEditor"),
  { ssr: false }
);
const AutoScheduleModal = dynamic(
  () => import("@/components/tournament/AutoScheduleModal"),
  { ssr: false }
);
import { PlayoffBracketView } from "@/components/tournament/PlayoffBracketView";
import PlayerAvatar from "@/components/player/PlayerAvatar";
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
  RefreshCw,
  X,
  RotateCcw,
  Trash2,
  ArrowRightLeft,
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
  two_sets_super_tb: "2 set + super tie break",
  round_robin_diff: "Todos contra todos por diferencia de games",
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
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [zoneCouplesMap, setZoneCouplesMap] = useState<Record<string, string[]>>({});
  const [fixtureFilter, setFixtureFilter] = useState<"all" | "zone" | "playoff">("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(initialTab || "parejas");
  const [isGeneratingZones, setIsGeneratingZones] = useState(false);
  const [isGeneratingPlayoffs, setIsGeneratingPlayoffs] = useState(false);
  const [isEditingConformation, setIsEditingConformation] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTournament = async () => {
    if (!isAdmin) return;
    setIsDeleting(true);
    try {
      const effectiveEmail =
        user?.email ||
        (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
        "";

      const res = await fetch(`/api/torneos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          "x-admin-email": effectiveEmail,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar el torneo");
      }
      setShowDeleteModal(false);
      router.push("/torneos");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar el torneo";
      setNotification({ type: "error", text: msg });
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Estados de Programación de Canchas, Horarios y Parejas
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [formCourt, setFormCourt] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCouple1Id, setFormCouple1Id] = useState("");
  const [formCouple2Id, setFormCouple2Id] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Incondicional: Mapas de parejas y numeración correlativa
  const coupleNumberMap = useMemo(() => getCoupleNumberMap(couples), [couples]);

  const getMatchZoneLabel = useCallback(
    (m?: Match | null): string | null => {
      if (!m) return null;
      return getMatchZoneDisplayName(m, zones, couples, zoneCouplesMap);
    },
    [zones, couples, zoneCouplesMap]
  );

  // Parejas disponibles para programar en un partido
  const availableCouplesForScheduling = useMemo(() => {
    if (!schedulingMatch) return couples;
    if (schedulingMatch.stage === "zone" && schedulingMatch.zone_id) {
      return [...couples].sort((a, b) => {
        const aInZone = a.zone_id === schedulingMatch.zone_id;
        const bInZone = b.zone_id === schedulingMatch.zone_id;
        if (aInZone && !bInZone) return -1;
        if (!aInZone && bInZone) return 1;
        const numA = coupleNumberMap.get(a.id) ?? 999;
        const numB = coupleNumberMap.get(b.id) ?? 999;
        return numA - numB;
      });
    }
    return [...couples].sort((a, b) => {
      const numA = coupleNumberMap.get(a.id) ?? 999;
      const numB = coupleNumberMap.get(b.id) ?? 999;
      return numA - numB;
    });
  }, [schedulingMatch, couples, coupleNumberMap]);

  const openScheduleModal = (m: Match) => {
    setSchedulingMatch(m);
    setFormCourt(m.court_name || "");
    setFormCouple1Id(m.couple1_id || "");
    setFormCouple2Id(m.couple2_id || "");
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

    if (formCouple1Id && formCouple2Id && formCouple1Id === formCouple2Id) {
      setNotification({ type: "error", text: "La Pareja 1 y la Pareja 2 no pueden ser la misma pareja." });
      return;
    }

    setIsSavingSchedule(true);
    try {
      const normalizedTime = normalizeScheduledTime(formTime, tournament?.date);
      const c1Id = formCouple1Id.trim() || null;
      const c2Id = formCouple2Id.trim() || null;

      const payload: {
        court_name: string | null;
        scheduled_time: string | null;
        couple1_id: string | null;
        couple2_id: string | null;
        winner_couple_id?: string | null;
        updated_at: string;
      } = {
        court_name: formCourt.trim() || null,
        scheduled_time: normalizedTime,
        couple1_id: c1Id,
        couple2_id: c2Id,
        updated_at: new Date().toISOString(),
      };

      if (
        schedulingMatch.winner_couple_id &&
        schedulingMatch.winner_couple_id !== c1Id &&
        schedulingMatch.winner_couple_id !== c2Id
      ) {
        payload.winner_couple_id = null;
      }

      const { error } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", schedulingMatch.id);

      if (error) throw error;

      const c1Obj = couples.find((c) => c.id === c1Id) || null;
      const c2Obj = couples.find((c) => c.id === c2Id) || null;

      setMatches((prev) =>
        prev.map((m) =>
          m.id === schedulingMatch.id
            ? {
                ...m,
                court_name: formCourt.trim() || null,
                scheduled_time: normalizedTime,
                couple1_id: c1Id,
                couple2_id: c2Id,
                couple1: c1Obj || undefined,
                couple2: c2Obj || undefined,
                winner_couple_id: payload.winner_couple_id !== undefined ? payload.winner_couple_id : m.winner_couple_id,
              }
            : m
        )
      );
      setSchedulingMatch(null);
      setNotification({ type: "success", text: "Partido y parejas actualizados correctamente." });
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

  const openScoreModal = (m: Match, preselectedWinnerId?: string) => {
    setScoringMatch(m);
    setFormScoreSet1(m.score_set1 || "");
    setFormScoreSet2(m.score_set2 || "");
    setFormScoreSuperTb(m.score_super_tb || "");
    const initialWinner = preselectedWinnerId || m.winner_couple_id || m.couple1_id || "";
    setFormWinnerCoupleId(initialWinner);
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

    if (formScoreSet1.includes("9/8") || formScoreSet1.includes("8/9")) {
      const tbMatch = formScoreSet1.match(/([89]\/[89])\s*\(\s*(\d+)\s*-\s*(\d+)\s*\)/);
      if (!tbMatch) {
        setNotification({
          type: "error",
          text: "Para un resultado de 9/8, debes anotar los puntos del tie-break, por ejemplo: 9/8 (7-6)",
        });
        return;
      }
    }

    // Validaciones específicas para "2 set + super tie break"
    if (tournament?.game_mode === "two_sets_super_tb") {
      if (!formScoreSet1.trim()) {
        setNotification({ type: "error", text: "Debes ingresar el resultado del Set 1." });
        return;
      }
      if (!formScoreSet2.trim()) {
        setNotification({
          type: "error",
          text: "En modalidad '2 set + super tie break' debes ingresar el resultado del Set 1 y Set 2.",
        });
        return;
      }
      if (formScoreSet1.includes("( - )") || formScoreSet2.includes("( - )")) {
        setNotification({
          type: "error",
          text: "Completa los puntos del tie-break o retira los paréntesis vacíos (ej: 7/6 (7-5)).",
        });
        return;
      }

      const p1Match = formScoreSet1.match(/(\d+)\s*[-/]\s*(\d+)/);
      const p2Match = formScoreSet2.match(/(\d+)\s*[-/]\s*(\d+)/);
      if (p1Match && p2Match) {
        const s1_p1Won = parseInt(p1Match[1], 10) > parseInt(p1Match[2], 10);
        const s2_p1Won = parseInt(p2Match[1], 10) > parseInt(p2Match[2], 10);

        // Si están 1-1 en sets, se exige el Super Tie-Break a 11 puntos
        if (s1_p1Won !== s2_p1Won && !formScoreSuperTb.trim()) {
          setNotification({
            type: "error",
            text: "Los sets están empatados 1-1. Es obligatorio registrar el resultado del Super Tie-Break a 11 puntos.",
          });
          return;
        }
      }
    }

    setIsSavingScore(true);
    try {
      // 1. Persistir resultado y avance de fase a través de la API oficial con permisos seguros
      const res = await fetch("/api/matches/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: scoringMatch.id,
          tournamentId: id,
          winnerCoupleId: formWinnerCoupleId,
          scoreSet1: formScoreSet1.trim(),
          scoreSet2: formScoreSet2.trim() || null,
          scoreSuperTb: formScoreSuperTb.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al registrar el resultado en el servidor");
      }

      // En fase de eliminación directa (Playoffs), calcular slot destino para actualización reactiva en pantalla
      let nextTargetMatchId: string | null = null;
      let nextTargetSlotField: "couple1_id" | "couple2_id" | null = null;

      if (scoringMatch.stage !== "zone") {
        const nextSlot = findNextPlayoffMatchSlot(matches, scoringMatch);
        if (nextSlot) {
          nextTargetMatchId = nextSlot.targetMatchId;
          nextTargetSlotField = nextSlot.slotField;
        }
      }

      // Actualización optimista inmediata en memoria para que el cuadro refleje al instante la pareja ganadora en verde y avanzando
      setMatches((prev) => {
        let updated = prev.map((m) =>
          m.id === scoringMatch.id
            ? {
                ...m,
                score_set1: formScoreSet1.trim(),
                score_set2: formScoreSet2.trim() || null,
                score_super_tb: formScoreSuperTb.trim() || null,
                winner_couple_id: formWinnerCoupleId,
                status: "completed" as const,
              }
            : m
        );
        if (nextTargetMatchId && nextTargetSlotField) {
          updated = updated.map((m) =>
            m.id === nextTargetMatchId
              ? {
                  ...m,
                  [nextTargetSlotField!]: formWinnerCoupleId,
                }
              : m
          );
        }
        return updated;
      });

      setScoringMatch(null);
      setNotification({
        type: "success",
        text: data.advancedToNextStage
          ? "Marcador guardado con éxito. ¡La pareja ganadora avanzó a la próxima instancia del cuadro!"
          : "Marcador guardado exitosamente.",
      });

      await loadTournamentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar resultado";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleClearScoreForm = () => {
    setFormScoreSet1("");
    setFormScoreSet2("");
    setFormScoreSuperTb("");
    setFormWinnerCoupleId("");
  };

  const handleResetScoreToScheduled = async () => {
    if (!scoringMatch) return;
    setIsSavingScore(true);
    try {
      const res = await fetch("/api/matches/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: scoringMatch.id,
          tournamentId: id,
          reset: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al restablecer el resultado en el servidor");
      }

      // En fase de eliminación directa, calcular slot para actualizar estado en memoria
      let nextTargetMatchId: string | null = null;
      let nextTargetSlotField: "couple1_id" | "couple2_id" | null = null;

      if (scoringMatch.stage !== "zone") {
        const nextSlot = findNextPlayoffMatchSlot(matches, scoringMatch);
        if (nextSlot) {
          nextTargetMatchId = nextSlot.targetMatchId;
          nextTargetSlotField = nextSlot.slotField;
        }
      }

      // Actualización optimista inmediata en memoria
      setMatches((prev) => {
        let updated = prev.map((m) =>
          m.id === scoringMatch.id
            ? {
                ...m,
                score_set1: null,
                score_set2: null,
                score_super_tb: null,
                winner_couple_id: null,
                status: "pending" as const,
              }
            : m
        );
        if (nextTargetMatchId && nextTargetSlotField) {
          updated = updated.map((m) =>
            m.id === nextTargetMatchId
              ? {
                  ...m,
                  [nextTargetSlotField!]: null,
                  winner_couple_id: null,
                  status: "pending" as const,
                  score_set1: null,
                  score_set2: null,
                  score_super_tb: null,
                }
              : m
          );
        }
        return updated;
      });

      setScoringMatch(null);
      setNotification({
        type: "success",
        text: "Resultado restablecido exitosamente a pendiente y ranking actualizado.",
      });

      await loadTournamentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al restablecer el partido";
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

      if (matchesData) {
        const rawMatches = matchesData as Match[];
        const { updatedMatches: zoneUpdatedMatches, updatesToPersist: zoneUpdates } = propagateZoneMatches(rawMatches);
        const { updatedMatches, updatesToPersist: playoffUpdates } = propagatePlayoffWinners(zoneUpdatedMatches);
        setMatches(updatedMatches);

        if (isAdmin) {
          for (const update of zoneUpdates) {
            const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
            if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;
            if (update.resetScore) {
              payload.winner_couple_id = null;
              payload.status = "pending";
              payload.score_set1 = null;
              payload.score_set2 = null;
              payload.score_super_tb = null;
            }
            await supabase.from("matches").update(payload).eq("id", update.matchId);
          }
          for (const update of playoffUpdates) {
            const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (update.couple1_id !== undefined) payload.couple1_id = update.couple1_id;
            if (update.couple2_id !== undefined) payload.couple2_id = update.couple2_id;
            await supabase.from("matches").update(payload).eq("id", update.id);
          }
        }
      }
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

  const emptyZonesCount = useMemo(() => {
    return zones.filter((z) => (zoneCouplesMap[z.id] || []).length === 0).length;
  }, [zones, zoneCouplesMap]);

  const handleDeleteEmptyZones = async () => {
    try {
      setIsGeneratingZones(true);
      const res = await fetch("/api/zonas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: id, action: "delete_empty_zones" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar zonas vacías");

      await loadTournamentData();
      setNotification({
        type: "success",
        text: data.message || "Zonas vacías eliminadas exitosamente.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar zonas vacías";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsGeneratingZones(false);
    }
  };

  const handleGeneratePlayoffs = async () => {
    if (!tournament) return;
    setIsGeneratingPlayoffs(true);
    setNotification(null);
    try {
      const res = await fetch("/api/playoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: id,
          force: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al generar cuadro eliminatorio");
      }

      await loadTournamentData();
      setNotification({
        type: "success",
        text: `Cuadro de eliminación directa generado exitosamente (${data.matchesCreated ?? 0} partidos creados). Ya podés programar horarios o cargar marcadores.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al generar cuadro eliminatorio";
      setNotification({ type: "error", text: msg });
    } finally {
      setIsGeneratingPlayoffs(false);
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

  // Incondicional: Propagar reactivamente en memoria los clasificados de zonas y eliminatorias
  const { updatedMatches: displayMatches } = useMemo(() => {
    const { updatedMatches: zoneMatches } = propagateZoneMatches(matches);
    return propagatePlayoffWinners(zoneMatches);
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

  // Incondicional: Clasificados de cada zona y estado de playoffs
  const { allQualifiedPairs, hasPlayoffMatchesInDb } = useMemo(() => {
    const hasPlayoffs = matches.some((m) => m.stage !== "zone");
    const qualified: QualifiedPair[] = [];

    for (const zone of zones) {
      let zonePairIds = zoneCouplesMap[zone.id] || [];
      if (zonePairIds.length === 0) {
        zonePairIds = couples.filter((c) => c.zone_id === zone.id).map((c) => c.id);
      }
      if (zonePairIds.length === 0) continue;

      const zoneMatches = displayMatches.filter((m) => m.zone_id === zone.id && m.stage === "zone");
      const standings = calculateRoundRobinStandings(zoneMatches, zonePairIds);
      const qualifiedInZone = getQualifiedPairs(standings);

      qualifiedInZone.forEach((s) => {
        qualified.push({
          pairId: s.couple_id || s.pair_id || "",
          zoneId: zone.id,
          zoneName: zone.name,
          zonePosition: s.position || 1,
          points: s.points,
          gameDifference: (s.games_won ?? 0) - (s.games_lost ?? 0),
          gamesWon: s.games_won ?? 0,
        });
      });
    }

    return { allQualifiedPairs: qualified, hasPlayoffMatchesInDb: hasPlayoffs };
  }, [matches, zones, zoneCouplesMap, couples, displayMatches]);

  const isZonePhaseCompleted = useMemo(() => {
    const zoneMatches = matches.filter((m) => m.stage === "zone");
    return zoneMatches.length > 0 && zoneMatches.every((m) => m.status === "completed");
  }, [matches]);

  const hasAutoSwitchedTab = useRef(false);

  useEffect(() => {
    if (!initialTab && !hasAutoSwitchedTab.current && (isZonePhaseCompleted || hasPlayoffMatchesInDb)) {
      hasAutoSwitchedTab.current = true;
      setActiveTab("playoffs");
    }
  }, [initialTab, isZonePhaseCompleted, hasPlayoffMatchesInDb]);

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
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href={`/admin/parejas?torneo=${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
            title="Ir al editor de parejas para este torneo"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Parejas ({couples.length})</span>
          </Link>
          {isAdmin && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              title="Eliminar este torneo de forma definitiva (solo administradores)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Torneo</span>
            </Button>
          )}
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
              : notification.type === "info"
              ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : notification.type === "info" ? (
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin flex-shrink-0" />
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
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/35 flex items-center gap-1 shadow-sm shadow-amber-400/10">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Torneo {tournament.points_awarded ?? 1000} Puntos
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {tournament.name}
            </h1>
            <div className="flex items-center gap-4 mt-3.5 text-slate-300 text-xs sm:text-sm flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {formatDate(tournament.date)}
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                          {c.player1 && (
                            <PlayerAvatar
                              id={c.player1.id}
                              playerId={c.player1.id}
                              email={c.player1.email}
                              photoUrl={c.player1.photo_url || c.player1.avatar_url}
                              firstName={c.player1.first_name}
                              lastName={c.player1.last_name}
                              category={c.player1.category}
                              size="sm"
                              showCategoryBorder
                              className="ring-2 ring-dark-900"
                            />
                          )}
                          {c.player2 && (
                            <PlayerAvatar
                              id={c.player2.id}
                              playerId={c.player2.id}
                              email={c.player2.email}
                              photoUrl={c.player2.photo_url || c.player2.avatar_url}
                              firstName={c.player2.first_name}
                              lastName={c.player2.last_name}
                              category={c.player2.category}
                              size="sm"
                              showCategoryBorder
                              className="ring-2 ring-dark-900"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate">
                            {coupleNamesMap[c.id] || getCoupleLabelWithNumber(c, num)}
                          </h4>
                          <p className="text-xs text-dark-400 truncate">
                            {c.player1?.first_name} {c.player1?.last_name} &amp; {c.player2?.first_name} {c.player2?.last_name}
                          </p>
                        </div>
                      </div>
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

                {zones.length > 0 && emptyZonesCount > 0 && !isEditingConformation && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDeleteEmptyZones}
                    disabled={isGeneratingZones}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5"
                    title="Eliminar las zonas que no tienen ninguna pareja asignada"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Eliminar zonas vacías ({emptyZonesCount})</span>
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
                  const zone4Info = getZone4MatchInfo(m, matches);
                  const isPendingRival = !m.couple1_id || !m.couple2_id;
                  const hasResult = m.status === "completed" || Boolean(m.score_set1 || m.score_set2 || m.score_super_tb);
                  const isFinished = m.status === "completed";
                  const isLive = m.status === "in_progress";
                  const isP1Winner = m.winner_couple_id && m.winner_couple_id === m.couple1_id;
                  const isP2Winner = m.winner_couple_id && m.winner_couple_id === m.couple2_id;
                  const matchZoneLabel = getMatchZoneLabel(m);

                  const c1Players = couplePlayersMap[m.couple1_id ?? ""] ?? (m.couple1 ? getCouplePlayersShortLabel(m.couple1) : (zone4Info.couple1Placeholder || "Por definir"));
                  const c2Players = couplePlayersMap[m.couple2_id ?? ""] ?? (m.couple2 ? getCouplePlayersShortLabel(m.couple2) : (zone4Info.couple2Placeholder || "Por definir"));
                  const c1Name = coupleNamesMap[m.couple1_id ?? ""] ?? (m.couple1 ? getCoupleLabelWithNumber(m.couple1, coupleNumberMap.get(m.couple1.id)) : (zone4Info.couple1Placeholder || "Por definir"));
                  const c2Name = coupleNamesMap[m.couple2_id ?? ""] ?? (m.couple2 ? getCoupleLabelWithNumber(m.couple2, coupleNumberMap.get(m.couple2.id)) : (zone4Info.couple2Placeholder || "Por definir"));

                  return (
                    <Card
                      key={m.id}
                      className={`p-4 border transition-all duration-200 ${
                        hasResult
                          ? "border-emerald-500/30 bg-dark-900/90 shadow-md"
                          : isLive
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
                          {matchZoneLabel && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                              {matchZoneLabel}
                            </span>
                          )}
                          {zone4Info.roundBadge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 text-sky-300 border border-dark-700">
                              {zone4Info.roundBadge}
                            </span>
                          )}
                          {isPendingRival ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                              Esperando Clasificados
                            </span>
                          ) : isPlayoff ? (
                            hasResult ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                CLASIFICÓ GANADOR
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                Cruce Confirmado
                              </span>
                            )
                          ) : null}
                          <span className="text-dark-500 text-[11px]">#{m.match_number ?? "-"}</span>
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

                      {/* Electronic Scoreboard Box: parejas interactivas para elegir ganadora */}
                      <div className="space-y-1.5 bg-dark-950/80 p-2 rounded-xl border border-dark-800/80 mb-3">
                        {/* Pareja 1 */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.couple1_id && !isPendingRival) {
                              openScoreModal(m, m.couple1_id);
                            }
                          }}
                          disabled={!m.couple1_id || isPendingRival}
                          title={
                            !m.couple1_id || isPendingRival
                              ? "Esperando definición de clasificados"
                              : "Hacer clic para elegir como pareja ganadora y anotar el resultado"
                          }
                          className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all group ${
                            isP1Winner
                              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold shadow-sm shadow-emerald-500/10"
                              : isP2Winner
                              ? "bg-rose-500/15 border border-rose-500/40 text-rose-300/90 line-through opacity-85"
                              : !m.couple1_id
                              ? "text-dark-400 italic font-normal bg-dark-950/40 cursor-not-allowed border border-transparent"
                              : "bg-dark-900 border border-dark-800 text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            {isP1Winner && (
                              <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{c1Name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {m.score_set1 && (
                              <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                                {m.score_set1}
                              </span>
                            )}
                            {!hasResult && m.couple1_id && !isPendingRival && (
                              <span className="text-[10px] text-emerald-400/80 font-bold hidden group-hover:inline uppercase tracking-wider">
                                Ganadora
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Pareja 2 */}
                        <button
                          type="button"
                          onClick={() => {
                            if (m.couple2_id && !isPendingRival) {
                              openScoreModal(m, m.couple2_id);
                            }
                          }}
                          disabled={!m.couple2_id || isPendingRival}
                          title={
                            !m.couple2_id || isPendingRival
                              ? "Esperando definición de clasificados"
                              : "Hacer clic para elegir como pareja ganadora y anotar el resultado"
                          }
                          className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all group ${
                            isP2Winner
                              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold shadow-sm shadow-emerald-500/10"
                              : isP1Winner
                              ? "bg-rose-500/15 border border-rose-500/40 text-rose-300/90 line-through opacity-85"
                              : !m.couple2_id
                              ? "text-dark-400 italic font-normal bg-dark-950/40 cursor-not-allowed border border-transparent"
                              : "bg-dark-900 border border-dark-800 text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            {isP2Winner && (
                              <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{c2Name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {m.score_set2 && (
                              <span className="scoreboard-digit px-2 py-0.5 rounded bg-dark-900 border border-dark-700 text-xs font-mono font-black text-white">
                                {m.score_set2}
                              </span>
                            )}
                            {!hasResult && m.couple2_id && !isPendingRival && (
                              <span className="text-[10px] text-emerald-400/80 font-bold hidden group-hover:inline uppercase tracking-wider">
                                Ganadora
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Footer: leyenda Programado / Finalizado y botón Reprogramar */}
                      <div className="flex items-center justify-between pt-2 border-t border-dark-800 text-xs">
                        {hasResult ? (
                          <button
                            type="button"
                            onClick={() => openScoreModal(m)}
                            title="Partido finalizado. Clic para modificar marcador"
                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 hover:bg-rose-500/30 cursor-pointer transition-all shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                            Finalizado
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!isPendingRival) openScoreModal(m);
                            }}
                            disabled={isPendingRival}
                            title={isPendingRival ? "Esperando definición de clasificados" : "Clic para indicar resultado del partido"}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                              isPendingRival
                                ? "bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60 hover:scale-[1.02] cursor-pointer"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Programado
                          </button>
                        )}

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
                              title="Editar parejas, cancha y horario de este partido"
                              className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-dark-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold border border-dark-700 hover:border-emerald-500/50 cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              <span>Editar / Parejas</span>
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
          <div className="mt-6 space-y-6">
            {/* Cabecera del Cuadro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/80 p-5 rounded-2xl border border-dark-700/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">
                      Cuadro Principal de Eliminación Directa
                    </h2>
                    {hasPlayoffMatchesInDb ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Oficial en Fixture
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Llaves Clasificatorias
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-400 mt-1">
                    {hasPlayoffMatchesInDb
                      ? "Cuadro oficial en disputa. Los resultados cargados avanzan automáticamente las llaves hacia Semis y Final."
                      : "Llaves conformadas enfrentando la mejor pareja de cada zona vs la peor pareja clasificada de otra zona."}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    onClick={handleGeneratePlayoffs}
                    disabled={isGeneratingPlayoffs || zones.length === 0}
                    className={`flex items-center gap-2 font-bold ${
                      hasPlayoffMatchesInDb
                        ? "bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700"
                        : "bg-amber-500 hover:bg-amber-400 text-dark-950"
                    }`}
                  >
                    {isGeneratingPlayoffs ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generando cuadro...</span>
                      </>
                    ) : hasPlayoffMatchesInDb ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span>Regenerar Cuadro</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-dark-950" />
                        <span>Confirmar Cuadro Oficial</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Listado de Cruces Eliminatorios */}
            {matches.filter((m) => m.stage !== "zone").length === 0 ? (
              <Card className="p-12 text-center text-dark-400">
                <Trophy className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">
                  Aún no se han conformado los cruces eliminatorios
                </h3>
                <p className="text-sm max-w-md mx-auto mb-4">
                  Los cruces de eliminación directa se definirán al concluir la fase de zonas con las parejas clasificadas.
                </p>
                <Button onClick={() => setActiveTab("zonas")} variant="secondary">
                  Ir a Zonas
                </Button>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Visualización Gráfica Interactiva del Cuadro de Llaves */}
                <PlayoffBracketView
                  matches={matches}
                  couples={couples}
                  isAdmin={true}
                  onMatchClick={(m, winnerId) => {
                    if (m.couple1_id && m.couple2_id) {
                      openScoreModal(m, winnerId);
                    }
                  }}
                  title="Cuadro Oficial de Eliminación Directa"
                  subtitle="Toca una pareja en la llave para elegirla como ganadora y anotar el resultado. Avanzará automáticamente a la siguiente ronda y ocupará su lugar en la próxima instancia."
                  tournamentName={tournament.name}
                  categoryName={`${tournament.category || ""} ${tournament.gender ? `(${tournament.gender})` : ""}`.trim()}
                />

                <div className="space-y-6 pt-4 border-t border-dark-800">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Listado Detallado por Instancias
                  </h3>
                  {(["final", "semi", "quarter", "round_of_16", "round_of_32"] as const).map((stg) => {
                    const stageMatches = matches.filter(
                      (m) =>
                        m.stage === stg ||
                        (stg === "quarter" && (m.stage as string) === "cuartos") ||
                        (stg === "semi" && (m.stage as string) === "semifinal") ||
                        (stg === "round_of_16" && (m.stage as string) === "octavos") ||
                        (stg === "round_of_32" && (m.stage as string) === "dieciseisavos")
                    );
                    if (stageMatches.length === 0) return null;

                  return (
                    <div key={stg} className="space-y-3">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        {getStageName(stg)} ({stageMatches.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stageMatches.map((m) => {
                          const p1Name = m.couple1_id ? coupleNamesMap[m.couple1_id] || "Pareja 1" : "Por definir";
                          const p2Name = m.couple2_id
                            ? coupleNamesMap[m.couple2_id] || "Pareja 2"
                            : m.score_set1?.includes("BYE")
                            ? "BYE (Pasa de ronda)"
                            : "Por definir";
                          const isCompleted = m.status === "completed";
                          const score = [m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ");

                          return (
                            <Card
                              key={m.id}
                              onClick={() => {
                                if (m.couple1_id && m.couple2_id) {
                                  openScoreModal(m);
                                }
                              }}
                              className={`p-4 border-dark-800 bg-dark-900/60 ${
                                m.couple1_id && m.couple2_id
                                  ? "cursor-pointer hover:border-emerald-500/50 hover:bg-dark-900/90 transition-all"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs text-dark-400 mb-2">
                                <span className="font-semibold text-slate-300">
                                  {m.match_number ? `Partido #${m.match_number}` : getStageName(stg)}
                                </span>
                                {isCompleted ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                                    Finalizado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-dark-800 text-dark-300 font-medium">
                                    Pendiente
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <div className={`flex items-center justify-between ${m.winner_couple_id === m.couple1_id ? "text-emerald-300 font-bold" : "text-white"}`}>
                                  <span className="truncate">{p1Name}</span>
                                  {m.winner_couple_id === m.couple1_id && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                                <div className={`flex items-center justify-between ${m.winner_couple_id === m.couple2_id ? "text-emerald-300 font-bold" : "text-white"}`}>
                                  <span className="truncate">{p2Name}</span>
                                  {m.winner_couple_id === m.couple2_id && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                                </div>
                              </div>
                              {score && (
                                <div className="mt-2 pt-2 border-t border-dark-800 text-xs font-mono font-bold text-amber-300">
                                  {score}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
            {/* Zonas y Clasificación a Cuadro (Debajo del Cuadro Principal) */}
            {zones.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-dark-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      Fase de Zonas - Tablas de Posiciones y Clasificados
                    </h3>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Rendimiento de las parejas en la fase de grupos previa al cuadro principal
                    </p>
                  </div>
                </div>
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
                                        ) : (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
                                            Clasificada
                                          </span>
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
              </div>
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

      {/* Modal: Edición Manual de Cancha, Horario y Parejas */}
      <Modal
        isOpen={!!schedulingMatch}
        onClose={() => setSchedulingMatch(null)}
        title="Programar Partido y Modificar Parejas"
      >
        <div className="space-y-4">
          {/* Información del Partido */}
          <div className="flex items-center justify-between p-2.5 bg-dark-950/80 rounded-xl border border-dark-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-dark-300">
                {schedulingMatch && (STATUS_LABELS[schedulingMatch.stage] || schedulingMatch.stage)}
              </span>
              {schedulingMatch && getMatchZoneLabel(schedulingMatch) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                  {getMatchZoneLabel(schedulingMatch)}
                </span>
              )}
            </div>
            <span className="font-mono text-dark-400">
              Partido #{schedulingMatch?.match_number ?? "-"}
            </span>
          </div>

          {/* Selector de Parejas del Partido */}
          <div className="p-3 bg-dark-900/90 rounded-xl border border-dark-750 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Parejas que disputan el partido
              </label>
              <button
                type="button"
                onClick={() => {
                  const temp = formCouple1Id;
                  setFormCouple1Id(formCouple2Id);
                  setFormCouple2Id(temp);
                }}
                className="text-[11px] font-bold text-dark-300 hover:text-white flex items-center gap-1 bg-dark-800 hover:bg-dark-750 px-2 py-1 rounded-lg border border-dark-700 transition-colors cursor-pointer"
                title="Invertir Pareja 1 y Pareja 2"
              >
                <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                <span>Invertir lados</span>
              </button>
            </div>

            {/* Pareja 1 */}
            <div>
              <label className="block text-[11px] font-bold text-dark-300 mb-1">
                Pareja 1 (Lado A):
              </label>
              <select
                value={formCouple1Id}
                onChange={(e) => setFormCouple1Id(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Sin asignar (Por definir) --</option>
                {availableCouplesForScheduling.map((c) => {
                  const num = coupleNumberMap.get(c.id);
                  const isOther = formCouple2Id === c.id;
                  const inZone = schedulingMatch?.zone_id && c.zone_id === schedulingMatch.zone_id;
                  return (
                    <option key={c.id} value={c.id} disabled={isOther}>
                      {num ? `[#${num}] ` : ""}{getCoupleLabelWithNumber(c, num)}{inZone ? " ★ (Zona)" : ""}{isOther ? " (ya elegida en Pareja 2)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Pareja 2 */}
            <div>
              <label className="block text-[11px] font-bold text-dark-300 mb-1">
                Pareja 2 (Lado B):
              </label>
              <select
                value={formCouple2Id}
                onChange={(e) => setFormCouple2Id(e.target.value)}
                className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Sin asignar (Por definir) --</option>
                {availableCouplesForScheduling.map((c) => {
                  const num = coupleNumberMap.get(c.id);
                  const isOther = formCouple1Id === c.id;
                  const inZone = schedulingMatch?.zone_id && c.zone_id === schedulingMatch.zone_id;
                  return (
                    <option key={c.id} value={c.id} disabled={isOther}>
                      {num ? `[#${num}] ` : ""}{getCoupleLabelWithNumber(c, num)}{inZone ? " ★ (Zona)" : ""}{isOther ? " (ya elegida en Pareja 1)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-dark-300 mb-1 uppercase tracking-wider">
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
            <label className="block text-xs font-bold text-dark-300 mb-1 uppercase tracking-wider">
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
              {isSavingSchedule ? "Guardando..." : "Guardar Partido"}
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
          {/* 1. Selector Visual de Pareja Ganadora */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Pareja Ganadora (Avanza a la Próxima Instancia)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scoringMatch?.couple1_id && (
                <button
                  type="button"
                  onClick={() => setFormWinnerCoupleId(scoringMatch.couple1_id!)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    formWinnerCoupleId === scoringMatch.couple1_id
                      ? "bg-emerald-500/25 border-emerald-500 text-white ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
                      : "bg-rose-500/15 border-rose-500/50 text-rose-200 hover:bg-rose-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Pareja 1</span>
                    {formWinnerCoupleId === scoringMatch.couple1_id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" /> GANADORA
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                        PERDEDORA
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-white">
                    {scoringMatch.couple1
                      ? getCoupleLabelWithNumber(scoringMatch.couple1, coupleNumberMap.get(scoringMatch.couple1.id))
                      : coupleNamesMap[scoringMatch.couple1_id] || "Pareja 1"}
                  </p>
                </button>
              )}

              {scoringMatch?.couple2_id && (
                <button
                  type="button"
                  onClick={() => setFormWinnerCoupleId(scoringMatch.couple2_id!)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    formWinnerCoupleId === scoringMatch.couple2_id
                      ? "bg-emerald-500/25 border-emerald-500 text-white ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20"
                      : "bg-rose-500/15 border-rose-500/50 text-rose-200 hover:bg-rose-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Pareja 2</span>
                    {formWinnerCoupleId === scoringMatch.couple2_id ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" /> GANADORA
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                        PERDEDORA
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-sm text-white">
                    {scoringMatch.couple2
                      ? getCoupleLabelWithNumber(scoringMatch.couple2, coupleNumberMap.get(scoringMatch.couple2.id))
                      : coupleNamesMap[scoringMatch.couple2_id] || "Pareja 2"}
                  </p>
                </button>
              )}
            </div>
          </div>

          {/* 2. Marcador del Partido */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
              {tournament?.game_mode === "two_sets_super_tb"
                ? "Resultado Set 1 (a 6 games)"
                : tournament?.game_mode === "american_2sets"
                ? "Resultado Set 1 (a 3 games)"
                : "Resultado del Partido"}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder={
                    tournament?.game_mode === "two_sets_super_tb"
                      ? "Ej: 6/4 o 7/6 (7-5)"
                      : tournament?.game_mode === "american_2sets"
                      ? "Ej: 3/1"
                      : "Ej: 9/4 o 9/8 (7-6)"
                  }
                  value={formScoreSet1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveScore();
                    }
                  }}
                  onChange={(e) => setFormScoreSet1(formatScoreInput(e.target.value, formScoreSet1))}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
                />
              </div>

              {/* Botón (X) color rojo para borrar el resultado ingresado y poner el formulario en cero */}
              <button
                type="button"
                onClick={handleClearScoreForm}
                title="Borrar resultado ingresado y poner el formulario en cero"
                className="px-2.5 py-2.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-white border border-rose-500/40 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer flex-shrink-0 shadow-sm active:scale-95"
              >
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-inner">
                  ✕
                </span>
                <span className="hidden sm:inline">Poner en cero</span>
              </button>
            </div>
            
            {/* Chips de marcadores rápidos */}
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              {(tournament?.game_mode === "two_sets_super_tb"
                ? (formWinnerCoupleId === scoringMatch?.couple2_id
                    ? ["0/6", "1/6", "2/6", "3/6", "4/6", "5/7", "6/7"]
                    : ["6/0", "6/1", "6/2", "6/3", "6/4", "7/5", "7/6"])
                : tournament?.game_mode === "american_2sets"
                ? (formWinnerCoupleId === scoringMatch?.couple2_id
                    ? ["1/3", "2/3", "0/3"]
                    : ["3/1", "3/2", "3/0"])
                : (formWinnerCoupleId === scoringMatch?.couple2_id
                    ? ["4/9", "5/9", "6/9", "7/9", "3/9", "8/9"]
                    : ["9/4", "9/5", "9/6", "9/7", "9/3", "9/8"])
              ).map((chip) => {
                const isTbBase = chip === "9/8" || chip === "8/9" || chip === "7/6" || chip === "6/7";
                const isSelected = isTbBase
                  ? formScoreSet1.startsWith(chip)
                  : formScoreSet1 === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      if (isTbBase) {
                        setFormScoreSet1(`${chip} ( - )`);
                      } else {
                        setFormScoreSet1(chip);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border-dark-700"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>

            {/* Opciones de Tie-Break al 8-8 o 6-6 */}
            {(formScoreSet1.startsWith("9/8") ||
              formScoreSet1.startsWith("8/9") ||
              formScoreSet1.startsWith("7/6") ||
              formScoreSet1.startsWith("6/7")) && (
              <div className="mt-2.5 p-2.5 bg-dark-950/90 rounded-xl border border-amber-500/30">
                <p className="text-[11px] font-bold text-amber-300 text-center mb-1.5 uppercase tracking-wider">
                  Desempate en Tie-Break (a 7 puntos)
                </p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {(formScoreSet1.startsWith("8/9") || formScoreSet1.startsWith("6/7")
                    ? ["5-7", "4-7", "3-7", "2-7", "1-7", "0-7", "6-7", "6-8", "8-10"]
                    : ["7-5", "7-4", "7-3", "7-2", "7-1", "7-0", "7-6", "8-6", "10-8"]
                  ).map((tbChip) => {
                    const base = formScoreSet1.startsWith("8/9")
                      ? "8/9"
                      : formScoreSet1.startsWith("9/8")
                      ? "9/8"
                      : formScoreSet1.startsWith("6/7")
                      ? "6/7"
                      : "7/6";
                    const candidate = `${base} (${tbChip})`;
                    const isSelected = formScoreSet1 === candidate;
                    return (
                      <button
                        key={tbChip}
                        type="button"
                        onClick={() => setFormScoreSet1(candidate)}
                        className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-400 text-dark-950 border-amber-300 shadow-sm font-black"
                            : "bg-dark-900 hover:bg-dark-800 text-amber-300/90 border-amber-500/30 hover:border-amber-400"
                        }`}
                      >
                        ({tbChip})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[11px] text-dark-400 mt-1.5 text-center">
              Tipeá solo los números (ej: 6 y 4) y la barra <span className="font-bold text-emerald-400">/</span> se colocará automáticamente. Presioná <kbd className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 text-[10px] text-white">Enter</kbd> para confirmar.
            </p>
          </div>

          {/* Set 2 y Super Tie-Break para "2 set + super tie break" */}
          {tournament?.game_mode === "two_sets_super_tb" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                  Resultado Set 2 (a 6 games)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 6/3 o 7/6 (7-5)"
                  value={formScoreSet2}
                  onChange={(e) => setFormScoreSet2(formatScoreInput(e.target.value, formScoreSet2))}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
                />

                {/* Chips de marcadores rápidos Set 2 */}
                <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                  {(formWinnerCoupleId === scoringMatch?.couple2_id
                    ? ["0/6", "1/6", "2/6", "3/6", "4/6", "5/7", "6/7"]
                    : ["6/0", "6/1", "6/2", "6/3", "6/4", "7/5", "7/6"]
                  ).map((chip) => {
                    const isTbBase = chip === "7/6" || chip === "6/7";
                    const isSelected = isTbBase
                      ? formScoreSet2.startsWith(chip)
                      : formScoreSet2 === chip;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          if (isTbBase) {
                            setFormScoreSet2(`${chip} ( - )`);
                          } else {
                            setFormScoreSet2(chip);
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border-dark-700"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>

                {/* Opciones de Tie-Break al 6-6 en Set 2 */}
                {(formScoreSet2.startsWith("7/6") || formScoreSet2.startsWith("6/7")) && (
                  <div className="mt-2.5 p-2.5 bg-dark-950/90 rounded-xl border border-amber-500/30">
                    <p className="text-[11px] font-bold text-amber-300 text-center mb-1.5 uppercase tracking-wider">
                      Desempate Set 2 en Tie-Break (a 7 puntos)
                    </p>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {(formScoreSet2.startsWith("6/7")
                        ? ["5-7", "4-7", "3-7", "2-7", "1-7", "0-7", "6-7", "6-8"]
                        : ["7-5", "7-4", "7-3", "7-2", "7-1", "7-0", "7-6", "8-6"]
                      ).map((tbChip) => {
                        const base = formScoreSet2.startsWith("6/7") ? "6/7" : "7/6";
                        const candidate = `${base} (${tbChip})`;
                        const isSelected = formScoreSet2 === candidate;
                        return (
                          <button
                            key={tbChip}
                            type="button"
                            onClick={() => setFormScoreSet2(candidate)}
                            className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-400 text-dark-950 border-amber-300 shadow-sm font-black"
                                : "bg-dark-900 hover:bg-dark-800 text-amber-300/90 border-amber-500/30 hover:border-amber-400"
                            }`}
                          >
                            ({tbChip})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span>Super Tie-Break a 11 puntos (en empate 1-1 en sets)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 11/9 o 11/10"
                  value={formScoreSuperTb}
                  onChange={(e) => setFormScoreSuperTb(formatScoreInput(e.target.value, formScoreSuperTb))}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center tracking-widest"
                />

                {/* Chips rápidos Super Tie-Break a 11 */}
                <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                  {(formWinnerCoupleId === scoringMatch?.couple2_id
                    ? ["9/11", "8/11", "7/11", "6/11", "5/11", "10/11", "10/12"]
                    : ["11/9", "11/8", "11/7", "11/6", "11/5", "11/10", "12/10"]
                  ).map((stbChip) => {
                    const isSelected = formScoreSuperTb === stbChip;
                    return (
                      <button
                        key={stbChip}
                        type="button"
                        onClick={() => setFormScoreSuperTb(stbChip)}
                        className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-amber-400 text-dark-950 border-amber-300 font-black shadow-sm"
                            : "bg-dark-800 hover:bg-dark-700 text-amber-300 hover:text-white border-dark-700"
                        }`}
                      >
                        {stbChip}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

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

          {tournament?.game_mode !== "american_9games" &&
            tournament?.game_mode !== "american_2sets" &&
            tournament?.game_mode !== "two_sets_super_tb" && (
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

          <div className="flex items-center justify-between pt-4 border-t border-dark-800 flex-wrap gap-2">
            {scoringMatch?.status === "completed" ? (
              <button
                type="button"
                onClick={handleResetScoreToScheduled}
                disabled={isSavingScore}
                title="Poner el partido en cero y volverlo a Programado"
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer a Programado</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setScoringMatch(null)} disabled={isSavingScore}>
                Cancelar
              </Button>
              <Button onClick={handleSaveScore} disabled={isSavingScore} className="font-bold bg-emerald-500 hover:bg-emerald-600 text-dark-950">
                {isSavingScore ? "Guardando..." : "Confirmar Resultado"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTournament}
        loading={isDeleting}
        title="Eliminar Torneo"
        message={`¿Estás seguro de que deseas eliminar el torneo "${tournament?.name}"? Esta acción borrará todas sus zonas, parejas y partidos de forma irreversible.`}
      />
    </div>
  );
}
