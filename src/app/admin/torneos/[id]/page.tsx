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
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, Zone, Couple, Match } from "@/types/tournament";
import { calculateRoundRobinStandings, getQualifiedPairs, getEliminatedPair } from "@/lib/tournament/standings";
import { calculateOptimalZones, getZoneSuggestions, getMatchZoneDisplayName, propagateZoneMatches, getZone4MatchInfo } from "@/lib/tournament/zones";
import { getCoupleNumberMap, getCoupleLabelWithNumber, getCouplePlayersShortLabel, getCoupleLastNames, isSumaCategory, formatScoreInput } from "@/lib/tournament/couples";
import { findNextPlayoffMatchSlot, propagatePlayoffWinners, getStageName } from "@/lib/tournament/elimination";
import ZoneCard from "@/components/tournament/ZoneCard";
import ZoneConformationEditor from "@/components/tournament/ZoneConformationEditor";
import AutoScheduleModal from "@/components/tournament/AutoScheduleModal";
import { ManualPlayoffBracketModal } from "@/components/tournament/ManualPlayoffBracketModal";
import { PlayoffBracketView } from "@/components/tournament/PlayoffBracketView";
import { normalizeScheduledTime } from "@/lib/tournament/scheduler";
import { formatDate } from "@/lib/dateUtils";
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
  Settings2,
  ShieldAlert,
  ArrowRightLeft,
  X,
  RotateCcw,
  Plus,
} from "lucide-react";

const GAME_MODE_LABELS: Record<string, string> = {
  american_9games: "Americano a 9 games (Tie-break a 7 en 8-8)",
  american_2sets: "Americano 2 sets a 3 games (Super TB a 10 en empate)",
  two_sets_super_tb: "2 set + super tie break",
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
  const { isAdmin, user } = useAuth();
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
  const [isEditingConformation, setIsEditingConformation] = useState(false);

  // Modals for Actions
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [schedulingMatch, setSchedulingMatch] = useState<Match | null>(null);
  const [formCourt, setFormCourt] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCouple1Id, setFormCouple1Id] = useState("");
  const [formCouple2Id, setFormCouple2Id] = useState("");

  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [formScoreSet1, setFormScoreSet1] = useState("");
  const [formScoreSet2, setFormScoreSet2] = useState("");
  const [formScoreSuperTb, setFormScoreSuperTb] = useState("");
  const [formWinnerCoupleId, setFormWinnerCoupleId] = useState("");

  // Estados para Armado y Edición Manual de Partidos de Eliminación
  const [isPlayoffMatchModalOpen, setIsPlayoffMatchModalOpen] = useState(false);
  const [editingPlayoffMatch, setEditingPlayoffMatch] = useState<Match | null>(null);
  const [playoffStage, setPlayoffStage] = useState<string>("quarter");
  const [playoffMatchNumber, setPlayoffMatchNumber] = useState<string>("");
  const [playoffCouple1Id, setPlayoffCouple1Id] = useState<string>("");
  const [playoffCouple2Id, setPlayoffCouple2Id] = useState<string>("");
  const [playoffIsBye, setPlayoffIsBye] = useState<boolean>(false);
  const [isClearPlayoffsModalOpen, setIsClearPlayoffsModalOpen] = useState(false);
  const [deletingPlayoffMatchId, setDeletingPlayoffMatchId] = useState<string | null>(null);
  const [isManualBracketModalOpen, setIsManualBracketModalOpen] = useState(false);

  const supabase = createClient();

  // Sync tab with URL parameter when parameter changes
  useEffect(() => {
    if (tabParam && ["config", "parejas", "zonas", "fixture", "playoffs", "results"].includes(tabParam)) {
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
        // 1. Propagar automáticamente parejas en zonas de 4 (Ganadores y Perdedores)
        const { updatedMatches: zoneUpdatedMatches, updatesToPersist: zoneUpdates } = propagateZoneMatches(rawMatches);

        // 2. Conformar y propagar automáticamente los ganadores de eliminatorias a las siguientes rondas del fixture
        const { updatedMatches, updatesToPersist: playoffUpdates } = propagatePlayoffWinners(zoneUpdatedMatches);
        setMatches(updatedMatches);

        // Auto-sanar y persistir slots en segundo plano si hubiera desincronización
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

  const coupleNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    couples.forEach((c) => {
      const num = coupleNumberMap.get(c.id);
      map[c.id] = getCoupleLabelWithNumber(c, num);
    });
    return map;
  }, [couples, coupleNumberMap]);

  const getCoupleLabel = (c?: Couple | null, coupleId?: string | null, placeholder?: string) => {
    const coupleObj = c || (coupleId ? couples.find((item) => item.id === coupleId) : null);
    if (!coupleObj) return placeholder || "Por definir";
    const num = coupleNumberMap.get(coupleObj.id);
    return getCoupleLabelWithNumber(coupleObj, num);
  };

  const getCouplePlayersLabel = (c?: Couple | null, coupleId?: string | null) => {
    const coupleObj = c || (coupleId ? couples.find((item) => item.id === coupleId) : null);
    if (!coupleObj) return "Por definir";
    return getCouplePlayersShortLabel(coupleObj);
  };

  const getMatchZoneLabel = useCallback(
    (m?: Match | null): string | null => {
      if (!m) return null;
      return getMatchZoneDisplayName(m, zones, couples, zoneCouplesMap);
    },
    [zones, couples, zoneCouplesMap]
  );

  // Determinar si la Gran Final ya tiene ganador para habilitar liquidación de rankings
  const hasCompletedFinal = useMemo(() => {
    return matches.some(
      (m) =>
        m.stage === "final" &&
        (m.status === "completed" || Boolean(m.winner_couple_id))
    );
  }, [matches]);

  // Propagación reactiva de ganadores de zonas y playoffs para la vista administrativa
  const { updatedMatches: displayMatches } = useMemo(() => {
    const { updatedMatches: zoneMatches } = propagateZoneMatches(matches);
    return propagatePlayoffWinners(zoneMatches);
  }, [matches]);

  // Cálculo oficial de parejas clasificadas y eliminadas por zona:
  // - En zonas de 4 parejas: clasifican las 3 mejores (1°, 2°, 3°). La 4ª queda eliminada.
  // - En zonas de 3 parejas: clasifican las 2 mejores (1°, 2°). La 3ª queda eliminada.
  const zoneQualifications = useMemo(() => {
    const qualified: {
      pairId: string;
      coupleObj?: Couple;
      zoneId: string;
      zoneName: string;
      zoneNumber: number;
      zoneSize: number;
      position: number;
      points: number;
      gameDifference: number;
      gamesWon: number;
      isAssigned: boolean;
      assignedMatchNumber?: number;
      assignedStage?: string;
    }[] = [];

    const eliminated: {
      pairId: string;
      coupleObj?: Couple;
      zoneId: string;
      zoneName: string;
      zoneNumber: number;
      zoneSize: number;
      position: number;
      points: number;
    }[] = [];

    const playoffMatches = matches.filter((m) => m.stage !== "zone");
    const assignedCoupleMap = new Map<string, { matchNumber?: number; stage: string }>();
    playoffMatches.forEach((m) => {
      if (m.couple1_id) assignedCoupleMap.set(m.couple1_id, { matchNumber: m.match_number || undefined, stage: m.stage });
      if (m.couple2_id) assignedCoupleMap.set(m.couple2_id, { matchNumber: m.match_number || undefined, stage: m.stage });
    });

    zones.forEach((zone) => {
      const zoneCoupleIds = zoneCouplesMap[zone.id] ?? [];
      if (zoneCoupleIds.length === 0) return;
      const zoneMatches = matches.filter((m) => m.zone_id === zone.id);
      const standings = calculateRoundRobinStandings(zoneMatches, zoneCoupleIds);

      // Regla oficial SPT: 3 clasificados en zona de 4; 2 clasificados en zona de 3
      const qualifiedStandings = getQualifiedPairs(standings);
      const eliminatedStanding = getEliminatedPair(standings);

      qualifiedStandings.forEach((s) => {
        const pid = s.couple_id || s.pair_id || "";
        const coupleObj = couples.find((c) => c.id === pid);
        const assignedInfo = assignedCoupleMap.get(pid);
        qualified.push({
          pairId: pid,
          coupleObj,
          zoneId: zone.id,
          zoneName: zone.name,
          zoneNumber: zone.zone_number,
          zoneSize: zoneCoupleIds.length,
          position: s.position || 1,
          points: s.points,
          gameDifference: (s.games_won ?? 0) - (s.games_lost ?? 0),
          gamesWon: s.games_won ?? 0,
          isAssigned: !!assignedInfo,
          assignedMatchNumber: assignedInfo?.matchNumber,
          assignedStage: assignedInfo?.stage,
        });
      });

      if (eliminatedStanding && standings.length > qualifiedStandings.length) {
        const elimId = eliminatedStanding.couple_id || eliminatedStanding.pair_id || "";
        const coupleObj = couples.find((c) => c.id === elimId);
        eliminated.push({
          pairId: elimId,
          coupleObj,
          zoneId: zone.id,
          zoneName: zone.name,
          zoneNumber: zone.zone_number,
          zoneSize: zoneCoupleIds.length,
          position: eliminatedStanding.position || standings.length,
          points: eliminatedStanding.points,
        });
      }
    });

    return { qualified, eliminated };
  }, [zones, zoneCouplesMap, matches, couples]);

  // Configuración interactiva de Zonas para el sorteo
  const [targetZoneSize, setTargetZoneSize] = useState<number>(4);
  const [targetNumZones, setTargetNumZones] = useState<string>("");
  const [showUnequalWarningModal, setShowUnequalWarningModal] = useState(false);

  const zoneSuggestions = useMemo(() => {
    return getZoneSuggestions(couples.length);
  }, [couples.length]);

  useEffect(() => {
    if (tournament) {
      const defaultSize = tournament.zone_size || 4;
      setTargetZoneSize(defaultSize);
      const sug = defaultSize === 3 ? zoneSuggestions.suggestion3 : zoneSuggestions.suggestion4;
      setTargetNumZones(String(sug.numZones));
    }
  }, [tournament, zoneSuggestions]);

  const handleZoneSizeChange = (newSize: number) => {
    setTargetZoneSize(newSize);
    const sug = newSize === 3 ? zoneSuggestions.suggestion3 : zoneSuggestions.suggestion4;
    setTargetNumZones(String(sug.numZones));
  };

  const zoneDistribution = useMemo(() => {
    const num = targetNumZones ? parseInt(targetNumZones, 10) : undefined;
    return calculateOptimalZones(couples.length, targetZoneSize, num);
  }, [couples.length, targetZoneSize, targetNumZones]);

  // 1. Action: Generar Zonas Automáticamente
  const executeShuffleZones = async (force: boolean = false) => {
    startTransition(async () => {
      try {
        const chosenNumZones = targetNumZones ? parseInt(targetNumZones, 10) : (tournament?.num_zones || zoneDistribution.numZones);
        const res = await fetch("/api/zonas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId,
            action: force ? "generate_zones" : "shuffle",
            numZones: chosenNumZones,
            zoneSize: targetZoneSize,
            confirmedByAdmin: true,
            force: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al generar zonas");
        }

        await loadData();
        setShowUnequalWarningModal(false);
        setNotification({
          type: "success",
          text: `Zonas confirmadas y generadas exitosamente (${data.zones?.length ?? chosenNumZones} zonas).`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al generar zonas";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleShuffleZones = () => {
    executeShuffleZones(true);
  };

  // Conteo de zonas sin parejas
  const emptyZonesCount = useMemo(() => {
    return zones.filter((z) => (zoneCouplesMap[z.id] || []).length === 0).length;
  }, [zones, zoneCouplesMap]);

  // Detección de zonas de 4 parejas con fixture antiguo (más de 4 partidos)
  const hasLegacy4MatchZones = useMemo(() => {
    return zones.some((z) => {
      const coupleCount = (zoneCouplesMap[z.id] || []).length;
      const zoneMatchesCount = matches.filter((m) => m.zone_id === z.id && m.stage === "zone").length;
      return coupleCount === 4 && zoneMatchesCount > 4;
    });
  }, [zones, zoneCouplesMap, matches]);

  // Action: Eliminar zonas que no tienen parejas asignadas
  const handleDeleteEmptyZones = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/zonas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, action: "delete_empty_zones" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar zonas vacías");

        await loadData();
        setNotification({
          type: "success",
          text: data.message || "Zonas vacías eliminadas exitosamente.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar zonas vacías";
        setNotification({ type: "error", text: msg });
      }
    });
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

  // 3. Actions: Gestión y Armado Manual de Cuadro de Eliminación Directa
  const openCreatePlayoffMatchModal = () => {
    setEditingPlayoffMatch(null);
    const qCount = zoneQualifications.qualified.length;
    let defaultStage = "quarter";
    if (qCount > 16) defaultStage = "round_of_32";
    else if (qCount > 8) defaultStage = "round_of_16";
    else if (qCount <= 4) defaultStage = "semi";

    setPlayoffStage(defaultStage);
    const maxMatchNum = matches
      .filter((m) => m.stage !== "zone")
      .reduce((max, m) => Math.max(max, m.match_number || 100), 100);
    setPlayoffMatchNumber(String(maxMatchNum + 1));
    setPlayoffCouple1Id("");
    setPlayoffCouple2Id("");
    setPlayoffIsBye(false);
    setIsPlayoffMatchModalOpen(true);
  };

  const openEditPlayoffMatchModal = (m: Match) => {
    setEditingPlayoffMatch(m);
    setPlayoffStage(m.stage);
    setPlayoffMatchNumber(m.match_number ? String(m.match_number) : "");
    setPlayoffCouple1Id(m.couple1_id || "");
    setPlayoffCouple2Id(m.couple2_id || "");
    setPlayoffIsBye(Boolean(m.score_set1?.includes("BYE") || (!m.couple2_id && m.status === "completed")));
    setIsPlayoffMatchModalOpen(true);
  };

  const handleSavePlayoffMatch = async () => {
    if (!tournamentId) return;

    const cleanId = (v: string | null | undefined) => {
      if (!v || v === "Por definir" || v === "BYE" || v === "") return null;
      return v.trim() || null;
    };

    const c1 = cleanId(playoffCouple1Id);
    const c2 = playoffIsBye ? null : cleanId(playoffCouple2Id);

    if (!playoffIsBye && c1 && c2 && c1 === c2) {
      setNotification({ type: "error", text: "La Pareja 1 y la Pareja 2 no pueden ser la misma." });
      return;
    }

    startTransition(async () => {
      try {
        const isEdit = !!editingPlayoffMatch;
        const res = await fetch("/api/playoffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId,
            action: isEdit ? "update_match" : "create_match",
            matchId: editingPlayoffMatch?.id,
            stage: playoffStage,
            couple1_id: c1,
            couple2_id: c2,
            isBye: playoffIsBye,
            match_number: playoffMatchNumber ? parseInt(playoffMatchNumber, 10) : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al guardar partido de playoffs");

        // Al presionar CREAR PARTIDO (o guardar): el partido queda creado y se cierra el modal
        setIsPlayoffMatchModalOpen(false);
        setEditingPlayoffMatch(null);
        setPlayoffCouple1Id("");
        setPlayoffCouple2Id("");
        setPlayoffIsBye(false);

        if (data.match) {
          setMatches((prev) => {
            const exists = prev.some((m) => m.id === data.match.id);
            if (exists) {
              return prev.map((m) => (m.id === data.match.id ? { ...m, ...data.match } : m));
            }
            return [...prev, data.match];
          });
        }

        await loadData();
        setNotification({
          type: "success",
          text: isEdit ? "Partido de eliminación actualizado exitosamente." : "Partido de eliminación creado exitosamente.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar partido";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleDeletePlayoffMatch = async (matchId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/playoffs?tournamentId=${tournamentId}&matchId=${matchId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar partido");

        setDeletingPlayoffMatchId(null);
        await loadData();
        setNotification({ type: "success", text: "Partido de eliminación eliminado con éxito." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar partido";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleClearPlayoffs = async () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/playoffs?tournamentId=${tournamentId}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al vaciar cuadro");

        setIsClearPlayoffsModalOpen(false);
        await loadData();
        setNotification({ type: "success", text: "Cuadro de eliminación vaciado exitosamente." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al vaciar cuadro";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // Carga opcional de sugerencia oficial FAP como base editable
  const handleLoadFAPSuggestion = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/playoffs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId, action: "generate_fap", force: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al generar cruces FAP");

        await loadData();
        setNotification({
          type: "success",
          text: `Cruces oficiales FAP cargados (${data.matchesCreated ?? 0} partidos). Podés modificarlos o agregar nuevos libremente.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al sugerir cruces FAP";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleGeneratePlayoffs = handleLoadFAPSuggestion;

  // Parejas disponibles para programar en un partido
  const availableCouplesForScheduling = useMemo(() => {
    if (!schedulingMatch) return couples;
    // Si es partido de zona, priorizar parejas asignadas a esa zona
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

  // 4. Action: Abrir Programación de Cancha, Horario y Parejas
  const openScheduleModal = (m: Match) => {
    setSchedulingMatch(m);
    setFormCourt(m.court_name || "");
    setFormCouple1Id(m.couple1_id || "");
    setFormCouple2Id(m.couple2_id || "");
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

  const handleSaveSchedule = async () => {
    if (!schedulingMatch) return;

    if (formCouple1Id && formCouple2Id && formCouple1Id === formCouple2Id) {
      setNotification({ type: "error", text: "La Pareja 1 y la Pareja 2 no pueden ser la misma pareja." });
      return;
    }

    startTransition(async () => {
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

        // Si cambió alguna pareja y el ganador anterior ya no coincide, resetear ganador
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

        // Buscar objetos de pareja actualizados para el estado local
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
        setNotification({ type: "success", text: "Partido y parejas programados correctamente." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar programación";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // 5. Action: Abrir Modal de Carga de Resultados
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
        let nextTargetMatchId: string | null = null;
        let nextTargetSlotField: "couple1_id" | "couple2_id" | null = null;

        if (scoringMatch.stage !== "zone") {
          const nextSlot = findNextPlayoffMatchSlot(matches, scoringMatch);
          if (nextSlot) {
            nextTargetMatchId = nextSlot.targetMatchId;
            nextTargetSlotField = nextSlot.slotField;
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

        // Propagar avance en zonas de 4 parejas (Ganador vs Ganador y Perdedor vs Perdedor)
        if (scoringMatch.stage === "zone" && scoringMatch.zone_id) {
          const simulatedMatches = matches.map((m) =>
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
          const { updatesToPersist: zoneUpdates } = propagateZoneMatches(simulatedMatches);
          for (const upd of zoneUpdates) {
            const p: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (upd.couple1_id !== undefined) p.couple1_id = upd.couple1_id;
            if (upd.couple2_id !== undefined) p.couple2_id = upd.couple2_id;
            if (upd.resetScore) {
              p.winner_couple_id = null;
              p.status = "pending";
              p.score_set1 = null;
              p.score_set2 = null;
              p.score_super_tb = null;
            }
            await supabase.from("matches").update(p).eq("id", upd.matchId);
          }
        }

        // Actualización optimista inmediata en memoria
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

        // Si el partido completado es la Gran Final, auto-liquidar los rankings oficiales de inmediato
        let finalCompleted = false;
        if (scoringMatch.stage === "final") {
          try {
            await fetch("/api/rankings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tournamentId, recalculate: true }),
            });
            finalCompleted = true;
          } catch (rankErr) {
            console.warn("Error auto-liquidando rankings tras la final:", rankErr);
          }
        }

        await loadData();
        setScoringMatch(null);
        setNotification({
          type: "success",
          text: finalCompleted
            ? "¡Gran Final completada! Los rankings oficiales por parejas e individual han sido liquidados y actualizados automáticamente."
            : advancedToNextStage
            ? "Resultado guardado y pareja ganadora clasificada automáticamente a la siguiente fase del cuadro."
            : "Resultado guardado y posiciones actualizadas con éxito.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar marcador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleClearScoreForm = () => {
    setFormScoreSet1("");
    setFormScoreSet2("");
    setFormScoreSuperTb("");
    setFormWinnerCoupleId("");
  };

  const handleResetScoreToScheduled = async () => {
    if (!scoringMatch) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("matches")
          .update({
            score_set1: null,
            score_set2: null,
            score_super_tb: null,
            winner_couple_id: null,
            status: "scheduled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", scoringMatch.id);

        if (error) throw error;

        await loadData();
        setScoringMatch(null);
        setNotification({
          type: "success",
          text: "El partido fue restablecido a Programado y el marcador fue puesto en cero.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al restablecer el partido";
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
    if (!isAdmin) return;
    startTransition(async () => {
      try {
        const effectiveEmail =
          user?.email ||
          (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
          "";

        const res = await fetch(`/api/torneos?id=${encodeURIComponent(tournamentId)}`, {
          method: "DELETE",
          headers: {
            "x-admin-email": effectiveEmail,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar el torneo");
        }

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
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    tournament.gender === "Femenino"
                      ? "bg-pink-500/10 text-pink-400 border-pink-500/30"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  }`}>
                    {tournament.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
                  </span>
                  {isSumaCategory(tournament.category) ? (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                      ∑ {tournament.category}
                    </span>
                  ) : (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/25">
                      Categoría {tournament.category}
                    </span>
                  )}
                  {tournament.golden_point && (
                    <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      ⭐ Punto de Oro (40-40)
                    </span>
                  )}
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1 shadow-sm">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {tournament.points_awarded ?? 1000} Pts Oficiales
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {tournament.name}
                </h1>
                <div className="flex items-center gap-4 mt-3 text-dark-300 text-xs sm:text-sm flex-wrap">
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
                    {couples.length} parejas inscritas ({tournament.num_zones} zonas de {tournament.zone_size})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/admin/parejas?torneo=${tournament.id}`}>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    <Users className="w-4 h-4 text-emerald-400" />
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
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="config">Configuración</TabsTrigger>
              <TabsTrigger value="zonas">Zonas ({zones.length})</TabsTrigger>
              <TabsTrigger value="fixture">Fixture ({matches.length})</TabsTrigger>
              <TabsTrigger value="playoffs">Cuadro de Eliminación</TabsTrigger>
              <TabsTrigger value="results">
                Resultados ({matches.filter((m) => m.status === "completed").length}/{matches.length})
              </TabsTrigger>
              <TabsTrigger value="parejas">Parejas ({couples.length})</TabsTrigger>
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
                    <p className="text-white font-medium text-base">{formatDate(tournament.date)}</p>
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
                  <div>
                    <label className="block text-dark-400 mb-1">Puntos que Otorga</label>
                    <p className="text-amber-300 font-bold text-base flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      {tournament.points_awarded ?? 1000} Puntos Totales (P)
                    </p>
                  </div>
                </div>

                {/* Desglose de Puntos que Otorga el Torneo */}
                {(() => {
                  const pVal = tournament.points_awarded ?? 1000;
                  return (
                    <div className="mt-6 p-5 bg-dark-900/80 rounded-2xl border border-amber-500/25 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          Escala Oficial de Puntos del Torneo ({pVal.toLocaleString("es-AR")} pts)
                        </h4>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-semibold self-start sm:self-auto">
                          100% individual a cada jugador
                        </span>
                      </div>

                      <p className="text-xs text-dark-300 leading-relaxed">
                        Los puntos totales (<b className="text-white">P = {pVal}</b>) se distribuyen de forma individual a cada jugador según la instancia alcanzada por la pareja. Las parejas eliminadas en zona suman la Base de Participación (3%) más un bonus del 2% por cada partido ganado en su grupo.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-amber-500/30">
                          <span className="text-dark-400 block text-[11px]">Campeones (100%)</span>
                          <span className="text-amber-300 font-black text-base">{Math.round(pVal * 1.0)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-dark-800">
                          <span className="text-dark-400 block text-[11px]">Subcampeones (60%)</span>
                          <span className="text-white font-bold">{Math.round(pVal * 0.6)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-dark-800">
                          <span className="text-dark-400 block text-[11px]">Semifinalistas (35%)</span>
                          <span className="text-white font-bold">{Math.round(pVal * 0.35)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-dark-800">
                          <span className="text-dark-400 block text-[11px]">Cuartos de final (20%)</span>
                          <span className="text-white font-bold">{Math.round(pVal * 0.2)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-dark-800">
                          <span className="text-dark-400 block text-[11px]">Octavos de final (12%)</span>
                          <span className="text-white font-bold">{Math.round(pVal * 0.12)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-dark-800">
                          <span className="text-dark-400 block text-[11px]">16avos de final (7%)</span>
                          <span className="text-white font-bold">{Math.round(pVal * 0.07)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-emerald-500/25">
                          <span className="text-emerald-400/80 block text-[11px]">Base Participación (3%)</span>
                          <span className="text-emerald-400 font-bold">{Math.round(pVal * 0.03)} pts</span>
                        </div>
                        <div className="bg-dark-950/80 p-3 rounded-xl border border-sky-500/25">
                          <span className="text-sky-400/80 block text-[11px]">Bonus Zona (+2% c/victoria)</span>
                          <span className="text-sky-400 font-bold">+{Math.round(pVal * 0.02)} pts c/u</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sección Parejas del Torneo en la Ficha Técnica */}
                <div className="mt-8 pt-6 border-t border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/60 p-5 rounded-2xl border border-dark-750">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        Parejas del Torneo
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {couples.length} {couples.length === 1 ? "pareja" : "parejas"}
                        </span>
                      </h4>
                      <p className="text-dark-400 text-xs mt-0.5">
                        {couples.length === 0
                          ? "El torneo fue creado pero aún no tiene parejas inscriptas. Gestiona o sortea las parejas desde el editor."
                          : `Hay ${couples.length} parejas conformadas respetando las reglas de categoría del torneo.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/parejas?torneo=${tournament.id}`}>
                      <Button variant="secondary" size="sm" className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Parejas
                      </Button>
                    </Link>
                  </div>
                </div>

                {isAdmin && (
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
                )}
              </Card>
            </TabsContent>

            {/* TAB: PAREJAS */}
            <TabsContent value="parejas">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/90 border border-dark-700/80 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Parejas del Torneo ({couples.length})
                      </h3>
                      <p className="text-dark-400 text-xs">
                        Gestión, conformación y validación reglamentaria de parejas de {tournament.name}.
                      </p>
                    </div>
                  </div>
                  <Link href={`/admin/parejas?torneo=${tournament.id}`}>
                    <Button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-black">
                      <Users className="w-4 h-4" />
                      Editor de Parejas
                    </Button>
                  </Link>
                </div>

                {couples.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white mb-2">No hay parejas inscriptas todavía</h4>
                    <p className="text-dark-400 text-sm max-w-md mx-auto mb-6">
                      El torneo está creado y listo para recibir competidores. Puedes crear parejas manualmente o mediante sorteo automático en el editor.
                    </p>
                    <Link href={`/admin/parejas?torneo=${tournament.id}`}>
                      <Button className="flex items-center gap-2 mx-auto bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-black">
                        <Users className="w-4 h-4" />
                        Ir a Parejas
                      </Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {couples.map((couple) => {
                      const num = coupleNumberMap.get(couple.id);
                      return (
                        <Card key={couple.id} className="p-4 border-dark-700/80 bg-dark-900/80 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Pareja {num ?? "-"}
                              </span>
                              <span className="text-xs text-dark-400">
                                {couple.player1?.category ?? "?"} / {couple.player2?.category ?? "?"}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">
                              {getCoupleLabel(couple)}
                            </h4>
                            <p className="text-xs text-dark-400">
                              {couple.player1?.first_name} {couple.player1?.last_name} &amp; {couple.player2?.first_name} {couple.player2?.last_name}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-dark-800 flex justify-end">
                            <Link href={`/admin/parejas?torneo=${tournament.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs text-emerald-400 hover:text-emerald-300">
                                Modificar en Parejas →
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
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

                  {/* Sugerencias de Conformación según parejas inscriptas */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Sugerencias de Conformación ({couples.length} Parejas Inscriptas)
                      </span>
                      <span className="text-[11px] text-dark-400">
                        Haz clic en una opción para seleccionarla
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Tarjeta Sugerencia Zonas de 4 */}
                      <button
                        type="button"
                        onClick={() => handleZoneSizeChange(4)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          targetZoneSize === 4
                            ? "bg-emerald-500/15 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                            : "bg-dark-950/80 border-dark-800 hover:border-dark-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            {targetZoneSize === 4 ? "✓ " : ""}Opción: Zonas de 4 parejas
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-dark-300 font-mono">
                            {zoneSuggestions.suggestion4.numZones} zonas
                          </span>
                        </div>
                        <p className="text-xs text-white font-bold mb-1">
                          {zoneSuggestions.suggestion4.summary}
                        </p>
                        <p className="text-[11px] text-dark-400">
                          {zoneSuggestions.suggestion4.distribution
                            .map((d) => `${d.zoneName} (${d.count})`)
                            .join(" · ")}
                        </p>
                      </button>

                      {/* Tarjeta Sugerencia Zonas de 3 */}
                      <button
                        type="button"
                        onClick={() => handleZoneSizeChange(3)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          targetZoneSize === 3
                            ? "bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/30"
                            : "bg-dark-950/80 border-dark-800 hover:border-dark-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-sky-400 flex items-center gap-1">
                            {targetZoneSize === 3 ? "✓ " : ""}Opción: Zonas de 3 parejas
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-dark-300 font-mono">
                            {zoneSuggestions.suggestion3.numZones} zonas
                          </span>
                        </div>
                        <p className="text-xs text-white font-bold mb-1">
                          {zoneSuggestions.suggestion3.summary}
                        </p>
                        <p className="text-[11px] text-dark-400">
                          {zoneSuggestions.suggestion3.distribution
                            .map((d) => `${d.zoneName} (${d.count})`)
                            .join(" · ")}
                        </p>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-dark-950/70 border border-dark-800 rounded-xl text-xs text-dark-300">
                      <span>
                        Estructura seleccionada:{" "}
                        <strong className="text-white">
                          {targetNumZones} zonas de {targetZoneSize} parejas objetivo
                        </strong>
                        {couples.length % targetZoneSize !== 0 && (
                          <span className="text-amber-400 font-medium ml-1">
                            ({targetZoneSize === 4 ? zoneSuggestions.suggestion4.summary : zoneSuggestions.suggestion3.summary})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-400 text-[11px]">Zonas:</span>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, Math.floor(couples.length / 2))}
                          value={targetNumZones}
                          onChange={(e) => setTargetNumZones(e.target.value)}
                          className="w-16 px-2 py-1 bg-dark-900 border border-dark-700 rounded-lg text-white font-bold text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumen dinámico del reparto de parejas */}
                  <div className="p-3.5 bg-dark-950/80 border border-dark-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-dark-200">
                        Distribución confirmada:{" "}
                        <strong className="text-white">
                          {targetZoneSize === 4
                            ? zoneSuggestions.suggestion4.summary
                            : zoneSuggestions.suggestion3.summary}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        size="sm"
                        onClick={handleShuffleZones}
                        disabled={isPending || couples.length < 2}
                        className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-md flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        {zones.length === 0
                          ? "Confirmar y Generar Zonas"
                          : "Confirmar y Re-generar Zonas"}
                      </Button>
                      {zones.length > 0 && !isEditingConformation && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsEditingConformation(true)}
                          className="border-dark-700 hover:border-emerald-500/40 text-slate-200 font-bold flex items-center gap-1.5"
                        >
                          <Settings2 className="w-4 h-4 text-emerald-400" />
                          Editar Conformación
                        </Button>
                      )}
                      {zones.length > 0 && emptyZonesCount > 0 && !isEditingConformation && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleDeleteEmptyZones}
                          disabled={isPending}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5"
                          title="Eliminar del torneo las zonas que no tienen parejas asignadas"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          Eliminar zonas vacías ({emptyZonesCount})
                        </Button>
                      )}
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

                {/* Banner de alerta si hay zonas vacías creadas sin parejas */}
                {zones.length > 0 && emptyZonesCount > 0 && !isEditingConformation && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-300 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      <span>
                        Se detectaron <strong>{emptyZonesCount} {emptyZonesCount === 1 ? "zona vacía" : "zonas vacías"}</strong> sin parejas asignadas. Nunca debe haber zonas vacías en el torneo.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleDeleteEmptyZones}
                      disabled={isPending}
                      className="bg-rose-500 hover:bg-rose-400 text-dark-950 font-black text-xs flex items-center gap-1.5 flex-shrink-0 shadow-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar zonas vacías ahora
                    </Button>
                  </div>
                )}

                {/* Modo Edición Interactivo de Conformación de Zonas */}
                {isEditingConformation ? (
                  <ZoneConformationEditor
                    tournamentId={tournamentId}
                    zones={zones}
                    couples={couples}
                    zoneCouplesMap={zoneCouplesMap}
                    coupleNumberMap={coupleNumberMap}
                    coupleNamesMap={coupleNamesMap}
                    targetZoneSize={tournament?.zone_size || targetZoneSize}
                    onSaveSuccess={async () => {
                      await loadData();
                      setIsEditingConformation(false);
                      setNotification({
                        type: "success",
                        text: "Conformación de zonas guardada y actualizada exitosamente.",
                      });
                    }}
                    onCancel={() => setIsEditingConformation(false)}
                  />
                ) : zones.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Shuffle className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-white mb-2">Aún no se han generado las zonas</h4>
                    <p className="text-dark-400 text-sm max-w-md mx-auto mb-6">
                      Hay {couples.length} parejas inscritas. Con la configuración fijada para este torneo, se crearán{" "}
                      <strong>{tournament?.num_zones ?? zoneDistribution.numZones} zonas de {tournament?.zone_size ?? targetZoneSize} parejas</strong>.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href={`/admin/parejas?torneo=${tournamentId}`}>
                        <Button
                          variant="secondary"
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-2"
                        >
                          <Users className="w-4 h-4 text-emerald-400" />
                          Parejas ({couples.length})
                        </Button>
                      </Link>
                      <Button
                        onClick={handleShuffleZones}
                        disabled={isPending || couples.length < 2}
                        className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isPending ? "Generando Zonas..." : "Generar Zonas"}
                      </Button>
                    </div>
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
                      size="sm"
                      onClick={() => setIsAutoScheduleOpen(true)}
                      disabled={isPending || matches.length === 0}
                      className="flex items-center gap-1.5 font-bold shadow-md bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-dark-950"
                    >
                      <Sparkles className="w-4 h-4 text-dark-950" />
                      Programador Automático
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateZoneMatches}
                      disabled={isPending || zones.length === 0}
                      className="flex items-center gap-1.5"
                      title="Regenerar fixture de zonas respetando el orden oficial (4 partidos en zonas de 4)"
                    >
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                      Regenerar Fixture de Zonas
                    </Button>
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

                {/* Banner de alerta si hay zonas de 4 parejas con formato legacy (6 partidos) */}
                {hasLegacy4MatchZones && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-300 shadow-lg animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <span>
                        Se detectaron zonas de 4 parejas con fixture antiguo (6 partidos). Con la regla oficial actual, cada zona de 4 parejas debe jugar exactamente <strong>4 partidos</strong> (P1 vs P4, P2 vs P3, Ganador vs Ganador, Perdedor vs Perdedor).
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateZoneMatches}
                      disabled={isPending}
                      className="bg-amber-400 hover:bg-amber-300 text-dark-950 font-black text-xs flex items-center gap-1.5 flex-shrink-0 shadow-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Regenerar Fixture Oficial (4 partidos)
                    </Button>
                  </div>
                )}

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
                          const zone4Info = getZone4MatchInfo(m, matches);
                          const isPendingRival = !m.couple1_id || !m.couple2_id;
                          const hasResult = m.status === "completed" || Boolean(m.score_set1 || m.score_set2 || m.score_super_tb);
                          const isP1Winner = m.winner_couple_id && m.winner_couple_id === m.couple1_id;
                          const isP2Winner = m.winner_couple_id && m.winner_couple_id === m.couple2_id;
                          const scoreDisplay = [m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ");
                          const zoneLabel = getMatchZoneLabel(m);

                          return (
                            <Card
                              key={m.id}
                              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border transition-all ${
                                hasResult
                                  ? "border-emerald-500/30 bg-dark-900/80 shadow-md"
                                  : isPendingRival
                                  ? "border-dark-800 bg-dark-950/50 opacity-80"
                                  : "border-dark-700/80 hover:border-dark-600 bg-dark-900/90"
                              }`}
                            >
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={m.stage === "zone" ? "info" : "success"} size="sm">
                                    {STAGE_LABELS[m.stage] ?? getStageName(m.stage)}
                                  </Badge>
                                  {zoneLabel && (
                                    <Badge variant="warning" size="sm" className="font-bold">
                                      {zoneLabel}
                                    </Badge>
                                  )}
                                  {zone4Info.roundBadge && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 text-sky-300 border border-dark-700">
                                      {zone4Info.roundBadge}
                                    </span>
                                  )}
                                  <span className="text-dark-400 text-xs">Partido #{m.match_number ?? "-"}</span>
                                  {isPendingRival ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                                      Esperando Clasificados
                                    </span>
                                  ) : isPlayoff ? (
                                    hasResult ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                        Clasificó Ganador
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                        Cruce Confirmado
                                      </span>
                                    )
                                  ) : null}
                                </div>

                                {/* Parejas: hacer clic en la pareja ganadora para abrir modal de resultado */}
                                <div className="flex items-center gap-2 flex-wrap text-sm font-semibold">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (m.couple1_id && !isPendingRival) openScoreModal(m, m.couple1_id);
                                    }}
                                    disabled={!m.couple1_id || isPendingRival}
                                    title={
                                      !m.couple1_id || isPendingRival
                                        ? "Esperando clasificados"
                                        : "Hacer clic para elegir como pareja ganadora y anotar el resultado"
                                    }
                                    className={`px-3 py-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 ${
                                      isP1Winner
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm shadow-emerald-500/10"
                                        : isP2Winner
                                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300/90 line-through opacity-85"
                                        : !m.couple1_id
                                        ? "text-dark-400 italic bg-dark-900/40 border-dark-800 cursor-not-allowed"
                                        : "bg-dark-950/80 border-dark-700/80 text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
                                    }`}
                                  >
                                    {isP1Winner && <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                    <span className="truncate">{getCoupleLabel(m.couple1, m.couple1_id, zone4Info.couple1Placeholder)}</span>
                                  </button>

                                  <span className="text-dark-500 font-bold px-1">vs</span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (m.couple2_id && !isPendingRival) openScoreModal(m, m.couple2_id);
                                    }}
                                    disabled={!m.couple2_id || isPendingRival}
                                    title={
                                      !m.couple2_id || isPendingRival
                                        ? "Esperando clasificados"
                                        : "Hacer clic para elegir como pareja ganadora y anotar el resultado"
                                    }
                                    className={`px-3 py-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 ${
                                      isP2Winner
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold shadow-sm shadow-emerald-500/10"
                                        : isP1Winner
                                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300/90 line-through opacity-85"
                                        : !m.couple2_id
                                        ? "text-dark-400 italic bg-dark-900/40 border-dark-800 cursor-not-allowed"
                                        : "bg-dark-950/80 border-dark-700/80 text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer"
                                    }`}
                                  >
                                    {isP2Winner && <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                    <span className="truncate">{getCoupleLabel(m.couple2, m.couple2_id, zone4Info.couple2Placeholder)}</span>
                                  </button>
                                </div>

                                {hasResult && (
                                  <div className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                                    <span>Resultado: {scoreDisplay || "Finalizado"}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-xs text-dark-400">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                    {m.court_name || "Sin cancha asignada"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                    {m.scheduled_time
                                      ? !isNaN(Date.parse(m.scheduled_time))
                                        ? new Date(m.scheduled_time).toLocaleTimeString("es-AR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }) + " hs"
                                        : m.scheduled_time
                                      : "Horario a definir"}
                                  </span>
                                </div>
                              </div>

                              {/* Acciones: Programado -> Finalizado y Reprogramar */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {hasResult ? (
                                  <button
                                    type="button"
                                    onClick={() => openScoreModal(m)}
                                    title="Partido finalizado. Clic para modificar marcador"
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 hover:bg-rose-500/30 cursor-pointer transition-all shadow-sm"
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
                                    title={
                                      isPendingRival
                                        ? "El cruce se conformará automáticamente cuando concluyan los partidos de la fase previa"
                                        : "Hacer clic para indicar resultado del partido"
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                      isPendingRival
                                        ? "bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed"
                                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60 cursor-pointer"
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Programado
                                  </button>
                                )}

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openScheduleModal(m)}
                                  className="flex items-center gap-1.5 text-xs font-bold border-dark-700 hover:border-emerald-500/50"
                                  title="Editar parejas, cancha y horario de este partido"
                                >
                                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Editar / Parejas</span>
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

            {/* TAB: CUADRO DE ELIMINACIÓN */}
            <TabsContent value="playoffs">
              <div className="space-y-6">
                {/* Cabecera y Botonera */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-dark-900/90 p-5 rounded-2xl border border-dark-700/80 shadow-lg">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      Cuadro de Eliminación Directa
                    </h3>
                    <p className="text-dark-300 text-xs mt-1.5 max-w-2xl leading-relaxed">
                      <strong className="text-emerald-400">Regla Oficial:</strong> En zonas de 4 parejas clasifican las <span className="underline decoration-emerald-400">3 mejores</span> (1°, 2° y 3°). En zonas de 3 parejas clasifican las <span className="underline decoration-emerald-400">2 mejores</span> (1° y 2°). Como administrador podés armar cada partido manualmente seleccionando las parejas clasificadas.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={openCreatePlayoffMatchModal}
                      disabled={isPending}
                      className="flex items-center gap-1.5 font-bold bg-emerald-500 hover:bg-emerald-600 text-dark-950 shadow-md"
                    >
                      <Plus className="w-4 h-4 text-dark-950" />
                      Armar Partido
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleLoadFAPSuggestion}
                      disabled={isPending || zoneQualifications.qualified.length < 2}
                      title="Carga la plantilla oficial FAP de acuerdo a la cantidad de parejas del torneo como base editable"
                      className="flex items-center gap-1.5 text-xs border-dark-700 hover:border-amber-400/50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Sugerir Cruces FAP
                    </Button>
                    {matches.filter((m) => m.stage !== "zone").length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsClearPlayoffsModalOpen(true)}
                        disabled={isPending}
                        className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-1.5 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Vaciar Cuadro
                      </Button>
                    )}
                  </div>
                </div>

                {/* Panel de Parejas Clasificadas y Eliminadas por Zona */}
                <div className="bg-dark-900/60 p-5 rounded-2xl border border-dark-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        Parejas Clasificadas al Cuadro ({zoneQualifications.qualified.length} parejas)
                      </h4>
                      <p className="text-xs text-dark-400 mt-0.5">
                        Estado de disponibilidad para conformar los partidos de eliminación directa
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Clasificada ({zoneQualifications.qualified.length})
                      </span>
                      <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        Eliminada ({zoneQualifications.eliminated.length})
                      </span>
                    </div>
                  </div>

                  {zones.length === 0 ? (
                    <p className="text-xs text-dark-400 italic">No hay zonas configuradas en este torneo.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {zones.map((zone) => {
                        const zoneQualified = zoneQualifications.qualified.filter((q) => q.zoneId === zone.id);
                        const zoneElim = zoneQualifications.eliminated.find((e) => e.zoneId === zone.id);
                        const totalInZone = zoneQualified.length + (zoneElim ? 1 : 0);

                        return (
                          <div
                            key={zone.id}
                            className="p-3.5 bg-dark-950/80 rounded-xl border border-dark-800 space-y-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-dark-800/80">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Badge variant="default" size="xs">
                                  {zone.name}
                                </Badge>
                                <span className="text-[11px] text-dark-400">({totalInZone} parejas)</span>
                              </span>
                              <span className="text-[10px] text-emerald-400/90 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Clasifican {totalInZone === 4 ? 3 : 2}
                              </span>
                            </div>

                            {/* Lista de Clasificadas de esta Zona */}
                            <div className="space-y-1.5">
                              {zoneQualified.map((q) => {
                                const coupleLabel = getCoupleLabel(q.coupleObj);
                                return (
                                  <div
                                    key={q.pairId}
                                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                                      q.isAssigned
                                        ? "bg-sky-500/5 border-sky-500/30 text-sky-200"
                                        : "bg-dark-900/90 border-emerald-500/30 text-white"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                          q.position === 1
                                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                            : q.position === 2
                                            ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                                            : "bg-amber-700/20 text-amber-400 border border-amber-700/40"
                                        }`}
                                      >
                                        {q.position}°
                                      </span>
                                      <span className="truncate font-medium">{coupleLabel}</span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${
                                        q.isAssigned
                                          ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                      }`}
                                    >
                                      {q.isAssigned
                                        ? `En M#${q.assignedMatchNumber ?? ""}`
                                        : "Disponible"}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Pareja Eliminada de esta Zona */}
                              {zoneElim && (
                                <div className="p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center justify-between gap-2 text-rose-300/80">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                      {zoneElim.position}°
                                    </span>
                                    <span className="truncate line-through opacity-75">
                                      {getCoupleLabel(zoneElim.coupleObj)}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex-shrink-0">
                                    Eliminada
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Gestión de Partidos de Eliminación */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2 bg-dark-900/60 p-4 rounded-xl border border-dark-800">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Partidos de Eliminación Directa ({matches.filter((m) => m.stage !== "zone").length})
                    </h4>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Configura el cuadro de arriba hacia abajo asignando si cada pareja juega o se siembra a la próxima ronda.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsManualBracketModalOpen(true)}
                      disabled={isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-bold text-xs shadow-md shadow-emerald-500/20"
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1.5" />
                      GENERAR CUADRO DE ELIMINACION DIRECTA
                    </Button>
                    {matches.filter((m) => m.stage !== "zone").length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsClearPlayoffsModalOpen(true)}
                        disabled={isPending}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Vaciar Cuadro
                      </Button>
                    )}
                  </div>
                </div>

                {/* Visor Gráfico Oficial de Llaves de Arriba hacia Abajo */}
                {matches.filter((m) => m.stage !== "zone").length > 0 && (
                  <div className="mb-6">
                    <PlayoffBracketView
                      matches={matches}
                      couples={couples}
                      isAdmin={true}
                      onMatchClick={(m) => openScoreModal(m)}
                      title="Cuadro Gráfico de Eliminación Directa"
                      subtitle="Estructura conformada de arriba hacia abajo. Haz clic en cualquier cruce para registrar o modificar el resultado."
                    />
                  </div>
                )}

                {/* Listado Detallado de Partidos del Cuadro de Eliminación */}
                {matches.filter((m) => m.stage !== "zone").length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-sky-400" />
                        Partidos de Eliminación Conformados ({matches.filter((m) => m.stage !== "zone").length})
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={openCreatePlayoffMatchModal}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Agregar otro partido
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {matches
                        .filter((m) => m.stage !== "zone")
                        .sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999))
                        .map((m) => {
                          const isCompleted = m.status === "completed";
                          const isBye = m.score_set1?.includes("BYE") || (!m.couple2_id && isCompleted);
                          const scoreDisplay = [m.score_set1, m.score_set2, m.score_super_tb].filter(Boolean).join(" | ");

                          return (
                            <div
                              key={m.id}
                              className="p-4 bg-dark-900/80 rounded-xl border border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-dark-700"
                            >
                              <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="default" size="xs" className="font-bold">
                                    Partido #{m.match_number ?? "-"}
                                  </Badge>
                                  <Badge variant="warning" size="xs" className="font-bold">
                                    {STAGE_LABELS[m.stage] ?? getStageName(m.stage)}
                                  </Badge>
                                  {isBye ? (
                                    <Badge variant="success" size="xs">
                                      BYE (Pasa directo)
                                    </Badge>
                                  ) : isCompleted ? (
                                    <Badge variant="success" size="xs">
                                      Finalizado
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" size="xs">
                                      Pendiente
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
                                  <span
                                    className={
                                      m.winner_couple_id === m.couple1_id
                                        ? "text-emerald-400 font-bold"
                                        : ""
                                    }
                                  >
                                    {getCoupleLabel(m.couple1, m.couple1_id, "Por definir")}
                                  </span>
                                  <span className="text-dark-500 font-bold text-xs">vs</span>
                                  <span
                                    className={
                                      isBye
                                        ? "text-dark-500 italic"
                                        : m.winner_couple_id === m.couple2_id
                                        ? "text-emerald-400 font-bold"
                                        : ""
                                    }
                                  >
                                    {isBye ? "BYE (Sin rival)" : getCoupleLabel(m.couple2, m.couple2_id, "Por definir")}
                                  </span>
                                </div>

                                {scoreDisplay && !isBye && (
                                  <div className="text-xs font-mono font-bold text-sky-400">
                                    Resultado: {scoreDisplay}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {!isBye && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => openScoreModal(m)}
                                    title="Cargar o modificar resultado"
                                    className="text-xs flex items-center gap-1.5"
                                  >
                                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Resultado</span>
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditPlayoffMatchModal(m)}
                                  title="Editar parejas o instancia"
                                  className="text-xs text-sky-400 hover:text-sky-300"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingPlayoffMatchId(m.id)}
                                  title="Eliminar este partido del cuadro"
                                  className="text-xs text-rose-400 hover:text-rose-300"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
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
                              {getMatchZoneLabel(m) && (
                                <Badge variant="warning" size="xs" className="font-bold">
                                  {getMatchZoneLabel(m)}
                                </Badge>
                              )}
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

          {/* Modal: Programar Cancha, Horario y Modificar Parejas */}
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
                    {schedulingMatch && (STAGE_LABELS[schedulingMatch.stage] ?? getStageName(schedulingMatch.stage))}
                  </span>
                  {schedulingMatch && getMatchZoneLabel(schedulingMatch) && (
                    <Badge variant="warning" size="xs" className="font-bold">
                      {getMatchZoneLabel(schedulingMatch)}
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-dark-400">
                  Partido #{schedulingMatch?.match_number ?? "-"}
                </span>
              </div>

              {/* Selector interactivo de Parejas del Partido */}
              <div className="p-3 bg-dark-900/90 rounded-xl border border-dark-750 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Parejas que disputan el partido
                  </label>
                  {/* Botón rápido para invertir lados */}
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
                          {num ? `[#${num}] ` : ""}{getCoupleLabel(c, c.id)}{inZone ? " ★ (Zona)" : ""}{isOther ? " (ya elegida en Pareja 2)" : ""}
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
                          {num ? `[#${num}] ` : ""}{getCoupleLabel(c, c.id)}{inZone ? " ★ (Zona)" : ""}{isOther ? " (ya elegida en Pareja 1)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 mb-1.5 uppercase tracking-wider">
                  Cancha Asignada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cancha 1 / Cancha Central"
                  value={formCourt}
                  onChange={(e) => setFormCourt(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark-300 mb-1.5 uppercase tracking-wider">
                  Horario Estimado (HH:mm)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 14:30 hs / Sábado 16:00"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
                <Button variant="ghost" onClick={() => setSchedulingMatch(null)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSchedule} disabled={isPending} className="font-bold bg-emerald-500 hover:bg-emerald-600 text-dark-950">
                  {isPending ? "Guardando..." : "Guardar Partido"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Modal: Carga de Marcador */}
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
                        {getCoupleLabel(scoringMatch.couple1, scoringMatch.couple1_id)}
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
                        {getCoupleLabel(scoringMatch.couple2, scoringMatch.couple2_id)}
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
                        ? ["4/6", "3/6", "2/6", "1/6", "0/6", "5/7", "6/7"]
                        : ["6/4", "6/3", "6/2", "6/1", "6/0", "7/5", "7/6"])
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
                        ? ["4/6", "3/6", "2/6", "1/6", "0/6", "5/7", "6/7"]
                        : ["6/4", "6/3", "6/2", "6/1", "6/0", "7/5", "7/6"]
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
                    disabled={isPending}
                    title="Poner el partido en cero y volverlo a Programado"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer a Programado</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setScoringMatch(null)} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveScore} disabled={isPending} className="font-bold bg-emerald-500 hover:bg-emerald-600 text-dark-950">
                    {isPending ? "Guardando..." : "Confirmar Resultado"}
                  </Button>
                </div>
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

          {/* Modal: Armar o Editar Partido de Eliminación */}
          <Modal
            isOpen={isPlayoffMatchModalOpen}
            onClose={() => {
              setIsPlayoffMatchModalOpen(false);
              setEditingPlayoffMatch(null);
            }}
            title={editingPlayoffMatch ? "Editar Cruce de Eliminación" : "Armar Partido de Eliminación"}
          >
            <div className="space-y-4">
              <div className="p-3 bg-dark-900/90 rounded-xl border border-dark-800 text-xs text-dark-300">
                <span className="font-bold text-emerald-400">Regla de Clasificación: </span>
                En zonas de 4 parejas clasifican 3 (1°, 2° y 3°). En zonas de 3 parejas clasifican 2 (1° y 2°).
              </div>

              {/* Instancia / Ronda y Número de Partido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    Instancia / Ronda
                  </label>
                  <select
                    value={playoffStage}
                    onChange={(e) => setPlayoffStage(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="round_of_32">16avos de Final (32 slots)</option>
                    <option value="round_of_16">Octavos de Final (16 slots)</option>
                    <option value="quarter">Cuartos de Final (8 slots)</option>
                    <option value="semi">Semifinales (4 slots)</option>
                    <option value="final">Gran Final</option>
                    <option value="third_place">3° y 4° Puesto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1.5">
                    N° de Partido
                  </label>
                  <input
                    type="number"
                    value={playoffMatchNumber}
                    onChange={(e) => setPlayoffMatchNumber(e.target.value)}
                    placeholder="Ej: 101"
                    className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Selector Pareja 1 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Pareja 1
                </label>
                <select
                  value={playoffCouple1Id}
                  onChange={(e) => setPlayoffCouple1Id(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Seleccionar Pareja 1 --</option>
                  {zoneQualifications.qualified.map((q) => (
                    <option key={q.pairId} value={q.pairId}>
                      [{q.position}° {q.zoneName}] {getCoupleLabel(q.coupleObj)} {q.isAssigned && q.pairId !== editingPlayoffMatch?.couple1_id ? `(Ya en M#${q.assignedMatchNumber ?? ""})` : ""}
                    </option>
                  ))}
                  <option value="Por definir">Por definir (esperando fase previa)</option>
                </select>
              </div>

              {/* Checkbox BYE */}
              <div className="p-3 bg-dark-950/80 rounded-xl border border-dark-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">¿Tiene BYE (Pasa directo de ronda)?</span>
                  <span className="text-[11px] text-dark-400">La Pareja 1 avanzará directamente a la próxima fase sin rival.</span>
                </div>
                <input
                  type="checkbox"
                  checked={playoffIsBye}
                  onChange={(e) => setPlayoffIsBye(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-dark-700 bg-dark-900 cursor-pointer"
                />
              </div>

              {/* Selector Pareja 2 (si no es BYE) */}
              {!playoffIsBye && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Pareja 2 (Rival)
                  </label>
                  <select
                    value={playoffCouple2Id}
                    onChange={(e) => setPlayoffCouple2Id(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Seleccionar Pareja 2 --</option>
                    {zoneQualifications.qualified.map((q) => (
                      <option key={q.pairId} value={q.pairId}>
                        [{q.position}° {q.zoneName}] {getCoupleLabel(q.coupleObj)} {q.isAssigned && q.pairId !== editingPlayoffMatch?.couple2_id ? `(Ya en M#${q.assignedMatchNumber ?? ""})` : ""}
                      </option>
                    ))}
                    <option value="Por definir">Por definir (esperando fase previa)</option>
                  </select>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-3 border-t border-dark-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsPlayoffMatchModalOpen(false);
                    setEditingPlayoffMatch(null);
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSavePlayoffMatch}
                  disabled={isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-bold"
                >
                  {isPending ? "Guardando..." : editingPlayoffMatch ? "Guardar Cambios" : "Crear Partido"}
                </Button>
              </div>
            </div>
          </Modal>

          {/* ConfirmModal: Vaciar Cuadro de Eliminación */}
          <ConfirmModal
            isOpen={isClearPlayoffsModalOpen}
            onClose={() => setIsClearPlayoffsModalOpen(false)}
            onConfirm={handleClearPlayoffs}
            title="¿Vaciar Cuadro de Eliminación?"
            message="Esta acción eliminará todos los partidos conformados del cuadro de eliminación directa de este torneo para que puedas armarlo desde cero. Los resultados y partidos de la fase de zonas no se modificarán."
            confirmLabel="Sí, vaciar cuadro"
            variant="danger"
            loading={isPending}
          />

          {/* ConfirmModal: Eliminar Partido de Eliminación */}
          <ConfirmModal
            isOpen={!!deletingPlayoffMatchId}
            onClose={() => setDeletingPlayoffMatchId(null)}
            onConfirm={() => {
              if (deletingPlayoffMatchId) {
                handleDeletePlayoffMatch(deletingPlayoffMatchId);
              }
            }}
            title="¿Eliminar Partido de Eliminación?"
            message="¿Estás seguro de eliminar este partido del cuadro de eliminación? Podrás armarlo nuevamente cuando lo desees."
            confirmLabel="Eliminar partido"
            variant="danger"
            loading={isPending}
          />

          {/* Modal: Programador Automático de Partidos */}
          {tournament && (
            <AutoScheduleModal
              isOpen={isAutoScheduleOpen}
              onClose={() => setIsAutoScheduleOpen(false)}
              tournamentId={tournamentId}
              tournamentDate={tournament.date}
              matches={matches}
              onScheduleComplete={loadData}
            />
          )}

          {/* Modal: Armado Manual de Cuadro Eliminatorio (Sembrar vs Jugar) */}
          <ManualPlayoffBracketModal
            isOpen={isManualBracketModalOpen}
            onClose={() => setIsManualBracketModalOpen(false)}
            tournamentId={tournamentId}
            qualifiedPairs={zoneQualifications.qualified}
            allCouples={couples}
            onSuccess={() => {
              loadData();
              setNotification({
                type: "success",
                text: "Cuadro de eliminación directa generado exitosamente.",
              });
            }}
          />
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
