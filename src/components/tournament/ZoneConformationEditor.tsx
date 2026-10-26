"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Zone, Couple } from "@/types/tournament";
import {
  Users,
  Check,
  X,
  ArrowRightLeft,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  Trash2,
  PlusCircle,
  HelpCircle,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  LayoutGrid,
  Zap,
  ArrowRight,
  Trophy,
} from "lucide-react";

interface ZoneConformationEditorProps {
  tournamentId: string;
  zones: Zone[];
  couples: Couple[];
  zoneCouplesMap: Record<string, string[]>;
  coupleNumberMap: Map<string, number>;
  coupleNamesMap: Record<string, string>;
  targetZoneSize?: number;
  onSaveSuccess: () => Promise<void>;
  onCancel: () => void;
}

export default function ZoneConformationEditor({
  tournamentId,
  zones,
  couples,
  zoneCouplesMap,
  coupleNumberMap,
  coupleNamesMap,
  targetZoneSize = 4,
  onSaveSuccess,
  onCancel,
}: ZoneConformationEditorProps) {
  // Guardar asignación inicial para poder restablecer
  const initialAssignments = useMemo(() => {
    const initial: Record<string, string> = {};
    zones.forEach((z) => {
      const cIds = zoneCouplesMap[z.id] || [];
      cIds.forEach((cId) => {
        initial[cId] = z.id;
      });
    });
    return initial;
  }, [zones, zoneCouplesMap]);

  // Mapa de asignación en edición: coupleId -> zoneId
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);

  // Modo de visualización: "dynamic" (Asistente Dinámico paso a paso) o "grid" (Vista Grilla de Zonas)
  const [viewMode, setViewMode] = useState<"dynamic" | "grid">("dynamic");

  // Zona activa en el Asistente Dinámico
  const [activeZoneId, setActiveZoneId] = useState<string>(() => {
    // Buscar la primera zona que aún no esté cerrada
    const incompleteZone = zones.find((z) => {
      const count = Object.values(initialAssignments).filter((zId) => zId === z.id).length;
      return count < targetZoneSize;
    });
    return incompleteZone ? incompleteZone.id : (zones[0]?.id || "");
  });

  // Filtro de búsqueda y pestañas en el panel de parejas del Asistente Dinámico
  const [searchTerm, setSearchTerm] = useState("");
  const [coupleFilter, setCoupleFilter] = useState<"all" | "unassigned" | "assigned">("all");

  // Modo interactivo de intercambio (en vista Grilla)
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);

  // Mensaje flash de retroalimentación
  const [feedbackNotice, setFeedbackNotice] = useState<{
    text: string;
    type: "success" | "info" | "warning";
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar activeZoneId si cambia la lista de zonas
  useEffect(() => {
    if (!activeZoneId && zones.length > 0) {
      setActiveZoneId(zones[0].id);
    }
  }, [zones, activeZoneId]);

  // Limpiar mensaje de feedback tras unos segundos
  useEffect(() => {
    if (feedbackNotice) {
      const timer = setTimeout(() => setFeedbackNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackNotice]);

  // Helper para formatear nombres en APELLIDO, nombre
  const formatPlayerName = (p?: { first_name?: string; last_name?: string } | null) => {
    if (!p) return "";
    const last = (p.last_name || "").trim().toUpperCase();
    const first = (p.first_name || "").trim();
    if (last && first) return `${last}, ${first}`;
    return last || first || "";
  };

  // Helper para obtener etiqueta de pareja legible
  const getCoupleSummary = (c: Couple) => {
    const p1 = formatPlayerName(c.player1);
    const p2 = formatPlayerName(c.player2);
    if (p1 && p2) return `${p1} & ${p2}`;
    return coupleNamesMap[c.id] || "Pareja sin nombre";
  };

  // Parejas ordenadas alfabéticamente por apellido del Jugador 1
  const sortedCouples = useMemo(() => {
    return [...couples].sort((a, b) => {
      const p1aLast = a.player1?.last_name || "";
      const p1bLast = b.player1?.last_name || "";
      const cmp = p1aLast.localeCompare(p1bLast, "es", { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      const numA = coupleNumberMap.get(a.id) ?? 999;
      const numB = coupleNumberMap.get(b.id) ?? 999;
      return numA - numB;
    });
  }, [couples, coupleNumberMap]);

  // Mover una pareja a una zona específica o desasignarla
  const handleMoveCouple = (coupleId: string, targetZoneId: string) => {
    setAssignments((prev) => {
      const updated = { ...prev };
      if (!targetZoneId || targetZoneId === "none") {
        delete updated[coupleId];
      } else {
        updated[coupleId] = targetZoneId;
      }
      return updated;
    });
    if (selectedForSwap === coupleId) {
      setSelectedForSwap(null);
    }
  };

  // Asignar una pareja a la Zona Activa en el Asistente Dinámico
  const handleAssignToActiveZone = (coupleId: string) => {
    if (!activeZoneId) return;

    const activeZone = zones.find((z) => z.id === activeZoneId);
    if (!activeZone) return;

    const couplesInActive = Object.entries(assignments)
      .filter(([, zId]) => zId === activeZoneId)
      .map(([cId]) => cId);

    // Si ya está en la zona activa, no hacer nada
    if (couplesInActive.includes(coupleId)) return;

    // Verificar si la zona ya está cerrada
    if (couplesInActive.length >= targetZoneSize) {
      setFeedbackNotice({
        type: "warning",
        text: `La ${activeZone.name} ya está cerrada con ${targetZoneSize} parejas. Selecciona otra zona o quita una pareja primero.`,
      });
      return;
    }

    const couple = couples.find((c) => c.id === coupleId);
    const coupleNum = couple ? coupleNumberMap.get(couple.id) : null;
    const coupleName = couple ? getCoupleSummary(couple) : `Pareja ${coupleNum ?? ""}`;

    const newCount = couplesInActive.length + 1;
    const isNowClosed = newCount === targetZoneSize;

    // Asignar
    setAssignments((prev) => ({
      ...prev,
      [coupleId]: activeZoneId,
    }));

    if (isNowClosed) {
      // Buscar siguiente zona abierta
      const nextOpenZone = zones.find((z) => {
        if (z.id === activeZoneId) return false;
        const count = Object.values(assignments).filter((zId) => zId === z.id).length;
        // Cuenta actual antes del cambio
        return count < targetZoneSize;
      });

      if (nextOpenZone) {
        setActiveZoneId(nextOpenZone.id);
        setFeedbackNotice({
          type: "success",
          text: `¡${activeZone.name} CERRADA (${targetZoneSize} de ${targetZoneSize})! Pareja ${coupleNum ?? ""} asignada. Pasando a ${nextOpenZone.name}...`,
        });
      } else {
        setFeedbackNotice({
          type: "success",
          text: `¡${activeZone.name} CERRADA (${targetZoneSize} de ${targetZoneSize})! Todas las zonas están completas.`,
        });
      }
    } else {
      setFeedbackNotice({
        type: "info",
        text: `Pareja ${coupleNum ?? ""} asignada a ${activeZone.name} (${newCount} de ${targetZoneSize}).`,
      });
    }
  };

  // Quitar una pareja de la Zona Activa
  const handleRemoveFromActiveZone = (coupleId: string) => {
    handleMoveCouple(coupleId, "none");
    const couple = couples.find((c) => c.id === coupleId);
    const coupleNum = couple ? coupleNumberMap.get(couple.id) : null;
    setFeedbackNotice({
      type: "info",
      text: `Pareja ${coupleNum ?? ""} desasignada de la zona.`,
    });
  };

  // Intercambiar dos parejas entre zonas (o una asignada con una sin asignar)
  const handleSwapCouples = (coupleId1: string, coupleId2: string) => {
    if (!coupleId1 || !coupleId2 || coupleId1 === coupleId2) {
      setSelectedForSwap(null);
      return;
    }

    setAssignments((prev) => {
      const updated = { ...prev };
      const zone1 = prev[coupleId1];
      const zone2 = prev[coupleId2];

      if (zone2) {
        updated[coupleId1] = zone2;
      } else {
        delete updated[coupleId1];
      }

      if (zone1) {
        updated[coupleId2] = zone1;
      } else {
        delete updated[coupleId2];
      }

      return updated;
    });

    setSelectedForSwap(null);
  };

  // Desasignar todas las parejas para armar de cero
  const handleUnassignAll = () => {
    setAssignments({});
    setSelectedForSwap(null);
    if (zones.length > 0) setActiveZoneId(zones[0].id);
    setFeedbackNotice({
      type: "info",
      text: "Se han vaciado todas las zonas. Puedes comenzar a seleccionarlas una a una.",
    });
  };

  // Restablecer al estado inicial
  const handleReset = () => {
    setAssignments(initialAssignments);
    setSelectedForSwap(null);
    setFeedbackNotice({
      type: "info",
      text: "Conformación restablecida al estado original.",
    });
  };

  // Guardar conformación de zonas
  const handleSave = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payloadAssignments = Object.entries(assignments).map(([coupleId, zoneId]) => ({
          coupleId,
          zoneId,
        }));

        const res = await fetch("/api/zonas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId,
            action: "manual",
            assignments: payloadAssignments,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al guardar la conformación de zonas");
        }

        await onSaveSuccess();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al guardar cambios";
        setErrorMessage(msg);
      }
    });
  };

  // Parejas no asignadas actualmente
  const unassignedCouples = useMemo(() => {
    return couples.filter((c) => !assignments[c.id]);
  }, [couples, assignments]);

  // Datos de la zona activa en el asistente dinámico
  const activeZone = zones.find((z) => z.id === activeZoneId) || zones[0];
  const activeZoneCouples = useMemo(() => {
    if (!activeZone) return [];
    return Object.entries(assignments)
      .filter(([, zId]) => zId === activeZone.id)
      .map(([cId]) => couples.find((c) => c.id === cId))
      .filter((c): c is Couple => Boolean(c));
  }, [assignments, activeZone, couples]);

  const isActiveZoneClosed = activeZoneCouples.length === targetZoneSize;
  const isActiveZoneOverfilled = activeZoneCouples.length > targetZoneSize;

  // Filtrado de parejas para la lista del Asistente Dinámico
  const filteredCouplesForAssistant = useMemo(() => {
    return sortedCouples.filter((c) => {
      const isAssigned = Boolean(assignments[c.id]);
      if (coupleFilter === "unassigned" && isAssigned) return false;
      if (coupleFilter === "assigned" && !isAssigned) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const num = coupleNumberMap.get(c.id)?.toString() || "";
      const p1 = `${c.player1?.last_name || ""} ${c.player1?.first_name || ""}`.toLowerCase();
      const p2 = `${c.player2?.last_name || ""} ${c.player2?.first_name || ""}`.toLowerCase();
      const cat = `${c.player1?.category || ""} ${c.player2?.category || ""}`.toLowerCase();

      return num.includes(q) || p1.includes(q) || p2.includes(q) || cat.includes(q);
    });
  }, [sortedCouples, assignments, coupleFilter, searchTerm, coupleNumberMap]);

  // Cantidad total de zonas cerradas
  const closedZonesCount = useMemo(() => {
    return zones.filter((z) => {
      const count = Object.values(assignments).filter((zId) => zId === z.id).length;
      return count === targetZoneSize;
    }).length;
  }, [zones, assignments, targetZoneSize]);

  const allZonesClosed = zones.length > 0 && closedZonesCount === zones.length;

  // Datos de la pareja seleccionada para swap en vista Grilla
  const swapCouple = selectedForSwap ? couples.find((c) => c.id === selectedForSwap) : null;
  const swapCoupleZoneId = selectedForSwap ? assignments[selectedForSwap] : null;
  const swapCoupleZone = swapCoupleZoneId ? zones.find((z) => z.id === swapCoupleZoneId) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de control superior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white">
                Editor de Conformación de Zonas
              </h3>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {targetZoneSize} parejas por zona
              </span>
            </div>
            <p className="text-xs text-dark-300 mt-0.5">
              Selecciona una a una las parejas para cada zona. Al llegar a {targetZoneSize} parejas la zona se da por cerrada automáticamente.
            </p>
          </div>
        </div>

        {/* Selector de modo y botones de acción */}
        <div className="flex items-center gap-2.5 flex-wrap self-end lg:self-center">
          {/* Alternar modo de vista */}
          <div className="inline-flex rounded-xl p-1 bg-dark-950 border border-dark-750">
            <button
              type="button"
              onClick={() => setViewMode("dynamic")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "dynamic"
                  ? "bg-emerald-500 text-dark-950 shadow-md"
                  : "text-dark-300 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Asistente Dinámico
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-emerald-500 text-dark-950 shadow-md"
                  : "text-dark-300 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Vista Grilla
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
            className="text-dark-300 hover:text-white text-xs"
            title="Restablecer conformación original"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Restablecer
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnassignAll}
            disabled={isPending}
            className="text-dark-400 hover:text-rose-400 text-xs"
            title="Quitar todas las parejas de las zonas para armar de cero"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Vaciar Zonas
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="text-dark-300 hover:text-white text-xs"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg shadow-emerald-500/25 text-xs sm:text-sm px-4"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isPending ? "Guardando..." : "Guardar Conformación"}
          </Button>
        </div>
      </div>

      {/* Banner de retroalimentación en tiempo real */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold shadow-md animate-fadeIn ${
            feedbackNotice.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : feedbackNotice.type === "warning"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
              : "bg-blue-500/15 border-blue-500/40 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span>{feedbackNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-dark-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Resumen de ocupación y estado de cierre de cada zona */}
      <div className="flex items-center gap-2 flex-wrap text-xs bg-dark-950/70 p-3.5 rounded-xl border border-dark-800">
        <span className="text-dark-400 font-bold uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          Estado de Zonas ({closedZonesCount}/{zones.length} cerradas):
        </span>
        {zones.map((zone) => {
          const count = Object.values(assignments).filter((zId) => zId === zone.id).length;
          const isClosed = count === targetZoneSize;
          const isOver = count > targetZoneSize;
          const isActive = viewMode === "dynamic" && activeZoneId === zone.id;

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                setActiveZoneId(zone.id);
                if (viewMode !== "dynamic") setViewMode("dynamic");
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? "ring-2 ring-emerald-400 shadow-md"
                  : "hover:scale-[1.02]"
              } ${
                isClosed
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : isOver
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-dark-900 text-blue-300 border-dark-700"
              }`}
            >
              <span>{zone.name}:</span>
              <span className="text-white font-black">{count}</span>
              <span className="text-dark-400 font-normal">/ {targetZoneSize}</span>
              {isClosed ? (
                <Lock className="w-3 h-3 text-emerald-400 ml-0.5" />
              ) : (
                <Unlock className="w-3 h-3 text-dark-500 ml-0.5" />
              )}
            </button>
          );
        })}
        {unassignedCouples.length > 0 && (
          <span className="px-3 py-1.5 rounded-lg border font-bold bg-amber-500/15 text-amber-300 border-amber-500/30 ml-auto">
            Sin Asignar: {unassignedCouples.length}
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: ASISTENTE DINÁMICO DE CONFORMACIÓN (SELECCIÓN PASO A PASO) */}
      {/* ========================================================================= */}
      {viewMode === "dynamic" && activeZone && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* PANEL IZQUIERDO (5 cols): Zona Activa en Conformación */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
            <Card
              className={`overflow-hidden border-2 shadow-2xl transition-all ${
                isActiveZoneClosed
                  ? "border-emerald-500/60 bg-dark-900/95 ring-2 ring-emerald-500/20"
                  : isActiveZoneOverfilled
                  ? "border-rose-500/60 bg-dark-900/95"
                  : "border-blue-500/50 bg-dark-900/95"
              }`}
            >
              {/* Cabecera de la Zona Activa */}
              <div className="p-4 bg-dark-950 border-b border-dark-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${
                      isActiveZoneClosed
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    }`}
                  >
                    {activeZone.zone_number}
                  </div>
                  <div>
                    <h4 className="text-white font-black text-base flex items-center gap-2">
                      {activeZone.name}
                      {isActiveZoneClosed && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-dark-950 flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" /> Cerrada
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-dark-400">
                      Zona configurada a {targetZoneSize} parejas
                    </p>
                  </div>
                </div>

                <Badge
                  variant={isActiveZoneClosed ? "success" : isActiveZoneOverfilled ? "danger" : "info"}
                  size="md"
                  className="font-black text-xs"
                >
                  {activeZoneCouples.length} / {targetZoneSize} parejas
                </Badge>
              </div>

              {/* Selector de pestañas para cambiar rápidamente de zona */}
              <div className="p-2.5 bg-dark-950/70 border-b border-dark-800 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-dark-400 px-1 uppercase tracking-wider">
                  Zona:
                </span>
                {zones.map((z) => {
                  const zCouples = Object.values(assignments).filter((zId) => zId === z.id);
                  const isClosed = zCouples.length === targetZoneSize;
                  const isCurrent = z.id === activeZone.id;

                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setActiveZoneId(z.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-emerald-500 text-dark-950 shadow-md font-black"
                          : isClosed
                          ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                          : "bg-dark-850 text-dark-300 hover:text-white border border-dark-750"
                      }`}
                    >
                      <span>{z.name}</span>
                      <span className="text-[10px] opacity-80 font-mono">
                        ({zCouples.length}/{targetZoneSize})
                      </span>
                      {isClosed && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>

              {/* Estado y parejas de esta zona */}
              <div className="p-4 space-y-3">
                {/* Banner de estado de la zona */}
                {isActiveZoneClosed ? (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs text-emerald-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-black text-emerald-200">
                          ¡Zona {activeZone.name} Cerrada!
                        </p>
                        <p className="text-[11px] text-emerald-300/80">
                          Se alcanzaron las {targetZoneSize} parejas requeridas para esta zona.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isActiveZoneOverfilled ? (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold">Zona excedida</p>
                      <p className="text-[11px]">
                        Tiene {activeZoneCouples.length} parejas (máximo {targetZoneSize}). Quita {activeZoneCouples.length - targetZoneSize} para cerrarla.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-white">
                        Conformando {activeZone.name}: {activeZoneCouples.length} de {targetZoneSize} parejas
                      </p>
                      <p className="text-[11px] text-blue-200/80">
                        Selecciona {targetZoneSize - activeZoneCouples.length} {targetZoneSize - activeZoneCouples.length === 1 ? "pareja más" : "parejas más"} de la lista para darla por cerrada.
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de parejas ya seleccionadas en esta zona */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-dark-400 uppercase tracking-wider block">
                    Parejas en {activeZone.name} ({activeZoneCouples.length}):
                  </span>

                  {activeZoneCouples.map((c, idx) => {
                    const num = coupleNumberMap.get(c.id);
                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-dark-950/90 border border-dark-800 hover:border-dark-700 transition-all flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-black text-xs flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-emerald-400">
                                Pareja {num ?? "-"}
                              </span>
                              <span className="text-[10px] text-dark-400 font-semibold">
                                ({c.player1?.category ?? "?"} / {c.player2?.category ?? "?"})
                              </span>
                            </div>
                            <p className="text-xs font-bold text-white truncate mt-0.5">
                              {getCoupleSummary(c)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromActiveZone(c.id)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                          title={`Quitar de ${activeZone.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Slots vacíos pendientes */}
                  {Array.from({ length: Math.max(0, targetZoneSize - activeZoneCouples.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="p-3.5 rounded-xl border border-dashed border-dark-800 bg-dark-950/40 text-center flex items-center justify-center gap-2 text-xs text-dark-500"
                    >
                      <PlusCircle className="w-4 h-4 text-dark-600" />
                      <span>
                        Espacio {activeZoneCouples.length + i + 1} de {targetZoneSize}: Haz clic en una pareja de la lista para sumar
                      </span>
                    </div>
                  ))}
                </div>

                {/* Acciones de la zona activa */}
                <div className="pt-2 border-t border-dark-800 flex items-center justify-between gap-2">
                  {activeZoneCouples.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        activeZoneCouples.forEach((c) => handleMoveCouple(c.id, "none"));
                        setFeedbackNotice({
                          type: "info",
                          text: `Se vació la ${activeZone.name}.`,
                        });
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Vaciar {activeZone.name}
                    </button>
                  )}

                  {isActiveZoneClosed && (
                    <div className="ml-auto">
                      {(() => {
                        const nextZone = zones.find((z) => {
                          const count = Object.values(assignments).filter((zId) => zId === z.id).length;
                          return count < targetZoneSize;
                        });
                        if (nextZone) {
                          return (
                            <Button
                              size="sm"
                              onClick={() => setActiveZoneId(nextZone.id)}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5"
                            >
                              <span>Ir a {nextZone.name}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          );
                        }
                        return (
                          <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Todas cerradas
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Mensaje de finalización si todas las zonas están cerradas */}
            {allZonesClosed && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-emerald-500/20 border-2 border-emerald-500/50 shadow-xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-300">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-black text-white">
                  ¡Todas las Zonas han sido Cerradas!
                </h4>
                <p className="text-xs text-emerald-200/90 max-w-sm mx-auto">
                  Las {zones.length} zonas cuentan exactamente con {targetZoneSize} parejas reglamentarias.
                </p>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black px-6 shadow-lg shadow-emerald-500/30 text-xs sm:text-sm mt-1"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {isPending ? "Guardando..." : "Confirmar y Guardar Todo"}
                </Button>
              </div>
            )}
          </div>

          {/* PANEL DERECHO (7 cols): Lista Completa de Parejas para Selección Dinámica */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 border-dark-750 bg-dark-900/95 shadow-xl">
              {/* Encabezado del Panel de Parejas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-dark-800">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Padrón de Parejas del Torneo ({couples.length})
                  </h4>
                  <p className="text-[11px] text-dark-400">
                    Haz clic en una pareja para sumarla a{" "}
                    <strong className="text-emerald-400">{activeZone.name}</strong>.
                  </p>
                </div>

                {/* Filtros rápidos: Todas / Disponibles / Asignadas */}
                <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-lg border border-dark-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("all")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      coupleFilter === "all"
                        ? "bg-dark-800 text-white"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Todas ({couples.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("unassigned")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      coupleFilter === "unassigned"
                        ? "bg-amber-500/20 text-amber-300 font-black"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Libres ({unassignedCouples.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("assigned")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                      coupleFilter === "assigned"
                        ? "bg-emerald-500/20 text-emerald-300 font-black"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Asignadas ({couples.length - unassignedCouples.length})
                  </button>
                </div>
              </div>

              {/* Buscador */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar pareja por apellido, nombre o número (#)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-950 text-xs text-white placeholder-dark-500 rounded-xl pl-9 pr-8 py-2.5 border border-dark-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lista dinámica de parejas */}
              <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {filteredCouplesForAssistant.length === 0 ? (
                  <div className="py-12 text-center text-dark-500 text-xs border border-dashed border-dark-800 rounded-xl space-y-1">
                    <p className="font-bold">No se encontraron parejas con ese criterio.</p>
                    <p className="text-[11px] text-dark-600">
                      Prueba con otro término de búsqueda o cambia el filtro.
                    </p>
                  </div>
                ) : (
                  filteredCouplesForAssistant.map((c) => {
                    const num = coupleNumberMap.get(c.id);
                    const assignedZoneId = assignments[c.id];
                    const assignedZone = assignedZoneId ? zones.find((z) => z.id === assignedZoneId) : null;
                    const isInActiveZone = assignedZoneId === activeZone.id;

                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isInActiveZone
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                            : assignedZone
                            ? "bg-dark-950/70 border-dark-800 opacity-80 hover:opacity-100"
                            : "bg-dark-950 border-dark-800 hover:border-emerald-500/40 hover:bg-dark-900 shadow-sm"
                        }`}
                      >
                        {/* Info de la pareja */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Pareja {num ?? "-"}
                            </span>
                            {c.seed && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                #{c.seed}
                              </span>
                            )}
                            <span className="text-[11px] text-dark-400 font-semibold">
                              Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-white leading-snug">
                            {getCoupleSummary(c)}
                          </h5>
                        </div>

                        {/* Botón de acción para asignar/mover */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                          {isInActiveZone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" /> En {activeZone.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveFromActiveZone(c.id)}
                                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 h-auto"
                                title="Quitar de esta zona"
                              >
                                Quitar
                              </Button>
                            </div>
                          ) : assignedZone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-dark-400 px-2 py-1 rounded bg-dark-900 border border-dark-800">
                                En {assignedZone.name}
                              </span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleAssignToActiveZone(c.id)}
                                disabled={isActiveZoneClosed}
                                className="text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 px-2.5 py-1 h-auto"
                              >
                                Mover a {activeZone.name}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignToActiveZone(c.id)}
                              disabled={isActiveZoneClosed}
                              className={`text-xs font-black px-3 py-1.5 h-auto flex items-center gap-1.5 shadow-sm ${
                                isActiveZoneClosed
                                  ? "bg-dark-800 text-dark-500 cursor-not-allowed"
                                  : "bg-emerald-500 hover:bg-emerald-400 text-dark-950"
                              }`}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Sumar a {activeZone.name}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: VISTA GRILLA DE TODAS LAS ZONAS (CON SWAP Y REORDENAMIENTO) */}
      {/* ========================================================================= */}
      {viewMode === "grid" && (
        <div className="space-y-6">
          {/* Banner interactivo de swap en grilla */}
          {selectedForSwap && swapCouple && (
            <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                  <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
                    Modo Intercambio Activo
                  </p>
                  <p className="text-sm font-bold text-white">
                    Pareja {coupleNumberMap.get(swapCouple.id) ?? "-"}: {getCoupleSummary(swapCouple)} ({swapCoupleZone ? swapCoupleZone.name : "Sin zona"})
                  </p>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Haz clic en el botón <strong>&quot;Intercambiar aquí&quot;</strong> de cualquier otra pareja para cambiar sus posiciones entre zonas.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedForSwap(null)}
                className="bg-dark-900 hover:bg-dark-800 text-amber-300 border border-amber-500/40 font-bold self-start sm:self-center"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar Intercambio
              </Button>
            </div>
          )}

          {/* Grilla de Zonas para edición */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {zones.map((zone) => {
              const zoneCoupleIds = Object.entries(assignments)
                .filter(([, zId]) => zId === zone.id)
                .map(([cId]) => cId);

              const zoneCouplesList = zoneCoupleIds
                .map((cId) => couples.find((c) => c.id === cId))
                .filter((c): c is Couple => Boolean(c));

              const isZoneClosed = zoneCouplesList.length === targetZoneSize;
              const isZoneOver = zoneCouplesList.length > targetZoneSize;

              return (
                <Card
                  key={zone.id}
                  className={`overflow-hidden border transition-all flex flex-col justify-between ${
                    isZoneClosed
                      ? "border-emerald-500/40 bg-dark-900/90 shadow-xl"
                      : isZoneOver
                      ? "border-rose-500/40 bg-dark-900/95 shadow-xl ring-1 ring-rose-500/30"
                      : "border-blue-500/40 bg-dark-900/95 shadow-xl"
                  }`}
                >
                  <div>
                    {/* Cabecera de Zona */}
                    <div className="px-4 py-3 bg-dark-950 border-b border-dark-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                          <span className="text-blue-400 font-bold text-xs">{zone.zone_number}</span>
                        </div>
                        <h4 className="text-white font-black text-sm">{zone.name}</h4>
                      </div>
                      <Badge
                        variant={isZoneClosed ? "success" : isZoneOver ? "danger" : "info"}
                        size="sm"
                      >
                        {zoneCouplesList.length} / {targetZoneSize} parejas
                      </Badge>
                    </div>

                    {/* Lista de parejas en esta zona */}
                    <div className="p-3.5 space-y-3">
                      {zoneCouplesList.length === 0 ? (
                        <div className="py-8 text-center text-dark-500 text-xs border border-dashed border-dark-800 rounded-xl px-4 space-y-2">
                          <Users className="w-6 h-6 mx-auto text-dark-600" />
                          <p>Zona vacía actualmente.</p>
                          {selectedForSwap && swapCouple && (
                            <Button
                              size="sm"
                              onClick={() => handleMoveCouple(selectedForSwap, zone.id)}
                              className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold"
                            >
                              Mover Pareja {coupleNumberMap.get(swapCouple.id)} aquí
                            </Button>
                          )}
                        </div>
                      ) : (
                        zoneCouplesList.map((c) => {
                          const num = coupleNumberMap.get(c.id);
                          const isSelected = selectedForSwap === c.id;

                          return (
                            <div
                              key={c.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col gap-2.5 ${
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500 shadow-lg ring-2 ring-amber-500/50"
                                  : "bg-dark-950/90 border-dark-800 hover:border-dark-700"
                              }`}
                            >
                              {/* Encabezado de la Pareja: Número, Siembra y Categoría */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    Pareja {num ?? "-"}
                                  </span>
                                  {c.seed && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      #{c.seed}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-dark-400 font-semibold truncate">
                                  Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                                </span>
                              </div>

                              {/* Integrantes en formato APELLIDO, nombre */}
                              <div className="text-xs font-bold leading-tight">
                                <div className="truncate text-white">
                                  {c.player1 ? formatPlayerName(c.player1) : "Jugador 1"}
                                </div>
                                <div className="truncate text-dark-300 text-[11px] mt-0.5">
                                  &amp; {c.player2 ? formatPlayerName(c.player2) : "Jugador 2"}
                                </div>
                              </div>

                              {/* Botón interactivo de Intercambio Rápido */}
                              {selectedForSwap && !isSelected && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSwapCouples(selectedForSwap, c.id)}
                                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs py-1.5 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  Intercambiar aquí con Pareja {coupleNumberMap.get(selectedForSwap)}
                                </Button>
                              )}

                              {/* Barra de Controles: Cambiar Pareja y Mover */}
                              <div className="pt-2 border-t border-dark-850/80 space-y-2">
                                {/* Selector Directo: Cambiar por otra pareja */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <ArrowRightLeft className="w-3 h-3" />
                                      Cambiar pareja por:
                                    </span>
                                    {!selectedForSwap && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedForSwap(c.id)}
                                        className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                                      >
                                        Seleccionar swap
                                      </button>
                                    )}
                                  </div>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleSwapCouples(c.id, e.target.value);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="w-full bg-dark-900 hover:bg-dark-850 text-emerald-300 font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-emerald-500/30 hover:border-emerald-500/60 focus:outline-none focus:border-emerald-400 cursor-pointer transition-colors"
                                  >
                                    <option value="" disabled>
                                      ↔ Cambiar por otra pareja...
                                    </option>
                                    {zones
                                      .filter((z) => z.id !== zone.id)
                                      .map((otherZone) => {
                                        const couplesInOtherZone = Object.entries(assignments)
                                          .filter(([, zId]) => zId === otherZone.id)
                                          .map(([cId]) => couples.find((co) => co.id === cId))
                                          .filter((co): co is Couple => Boolean(co));

                                        if (couplesInOtherZone.length === 0) return null;

                                        return (
                                          <optgroup key={otherZone.id} label={`── ${otherZone.name} ──`}>
                                            {couplesInOtherZone.map((otherC) => {
                                              const otherNum = coupleNumberMap.get(otherC.id);
                                              return (
                                                <option key={otherC.id} value={otherC.id}>
                                                  {otherZone.name}: Pareja {otherNum ?? "-"} - {getCoupleSummary(otherC)}
                                                </option>
                                              );
                                            })}
                                          </optgroup>
                                        );
                                      })}

                                    {unassignedCouples.length > 0 && (
                                      <optgroup label="── Parejas sin Zona (Reemplazar) ──">
                                        {unassignedCouples.map((otherC) => {
                                          const otherNum = coupleNumberMap.get(otherC.id);
                                          return (
                                            <option key={otherC.id} value={otherC.id}>
                                              Sin Zona: Pareja {otherNum ?? "-"} - {getCoupleSummary(otherC)}
                                            </option>
                                          );
                                        })}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* Selector Secundario: Mover de zona o Quitar */}
                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-dark-900">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="text-dark-400 text-[10px] uppercase font-bold flex-shrink-0">
                                      Mover:
                                    </span>
                                    <select
                                      value={zone.id}
                                      onChange={(e) => handleMoveCouple(c.id, e.target.value)}
                                      className="w-full bg-dark-900 text-dark-300 text-[11px] font-medium rounded px-2 py-1 border border-dark-800 focus:outline-none focus:border-dark-600 cursor-pointer"
                                    >
                                      {zones.map((z) => (
                                        <option key={z.id} value={z.id}>
                                          {z.name} {z.id === zone.id ? "(actual)" : ""}
                                        </option>
                                      ))}
                                      <option value="none">Quitar de zona</option>
                                    </select>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleMoveCouple(c.id, "none")}
                                    title="Quitar pareja de esta zona"
                                    className="p-1 rounded text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Sección inferior para agregar o traer parejas a esta zona */}
                  <div className="p-3 bg-dark-950/70 border-t border-dark-800">
                    <label className="block text-[11px] font-bold text-dark-300 mb-1.5 flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      + Asignar / Traer pareja a {zone.name}:
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveCouple(e.target.value, zone.id);
                          e.target.value = "";
                        }
                      }}
                      className="w-full bg-dark-900 text-emerald-300 font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-dark-700 hover:border-emerald-500/40 focus:outline-none focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="" disabled>
                        Seleccionar pareja para sumar a {zone.name}...
                      </option>

                      {unassignedCouples.length > 0 && (
                        <optgroup label="── Parejas sin Zona ──">
                          {unassignedCouples.map((c) => {
                            const num = coupleNumberMap.get(c.id);
                            return (
                              <option key={c.id} value={c.id}>
                                Pareja {num ?? "-"}: {getCoupleSummary(c)}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {zones
                        .filter((z) => z.id !== zone.id)
                        .map((otherZone) => {
                          const otherCouples = Object.entries(assignments)
                            .filter(([, zId]) => zId === otherZone.id)
                            .map(([cId]) => couples.find((co) => co.id === cId))
                            .filter((co): co is Couple => Boolean(co));

                          if (otherCouples.length === 0) return null;

                          return (
                            <optgroup key={otherZone.id} label={`── Traer desde ${otherZone.name} ──`}>
                              {otherCouples.map((c) => {
                                const num = coupleNumberMap.get(c.id);
                                return (
                                  <option key={c.id} value={c.id}>
                                    Traer Pareja {num ?? "-"}: {getCoupleSummary(c)}
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        })}
                    </select>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Sección de parejas sin asignar en vista Grilla */}
          {unassignedCouples.length > 0 && (
            <Card className="p-5 border border-amber-500/30 bg-dark-950/80 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-dark-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Parejas sin zona asignada ({unassignedCouples.length})
                  </h4>
                </div>
                <span className="text-[11px] text-dark-400">
                  Asígnalas o selecciónalas para sustituir parejas en las zonas.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unassignedCouples.map((c) => {
                  const num = coupleNumberMap.get(c.id);
                  const isSelected = selectedForSwap === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-500"
                          : "bg-dark-900 border-dark-800 hover:border-dark-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Pareja {num ?? "-"}
                          </span>
                          <span className="text-[10px] text-dark-400">
                            Cat. {c.player1?.category ?? "?"} / {c.player2?.category ?? "?"}
                          </span>
                        </div>

                        <h5 className="text-xs font-bold text-white truncate">
                          {getCoupleSummary(c)}
                        </h5>
                      </div>

                      {selectedForSwap && !isSelected && (
                        <Button
                          size="sm"
                          onClick={() => handleSwapCouples(selectedForSwap, c.id)}
                          className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs py-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                          Intercambiar con Pareja {coupleNumberMap.get(selectedForSwap)}
                        </Button>
                      )}

                      <div className="space-y-1.5 pt-2 border-t border-dark-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-dark-400 font-medium">Asignar a:</span>
                          {!selectedForSwap && (
                            <button
                              type="button"
                              onClick={() => setSelectedForSwap(c.id)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                            >
                              Seleccionar
                            </button>
                          )}
                        </div>

                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleMoveCouple(c.id, e.target.value);
                          }}
                          className="w-full bg-dark-800 text-xs font-bold text-emerald-300 rounded-lg px-2 py-1.5 border border-dark-700 hover:border-emerald-500/40 cursor-pointer focus:outline-none"
                        >
                          <option value="" disabled>
                            Elegir zona...
                          </option>
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Guía rápida de uso */}
      <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800/80 flex items-start gap-3 text-xs text-dark-400">
        <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-dark-200 font-semibold">Consejos para conformar las zonas de forma dinámica:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-dark-300 text-[11px]">
            <li>
              En el <strong>Asistente Dinámico</strong>, haz clic en cualquier pareja del listado para sumarla a la zona activa.
            </li>
            <li>
              Al alcanzar las <strong>{targetZoneSize} parejas</strong>, la zona se da por <strong>Cerrada ✔</strong> automáticamente y el foco avanza a la siguiente zona abierta.
            </li>
            <li>
              Puedes alternar entre el <strong>Asistente Dinámico</strong> y la <strong>Vista Grilla</strong> en cualquier momento sin perder los cambios.
            </li>
            <li>
              Al presionar <strong>&quot;Guardar Conformación&quot;</strong>, se actualizarán las zonas y se regenerará automáticamente el fixture de partidos.
            </li>
          </ul>
        </div>
      </div>

      {/* Botones inferiores */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg shadow-emerald-500/25 px-5"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {isPending ? "Guardando..." : "Guardar Conformación"}
        </Button>
      </div>
    </div>
  );
}
