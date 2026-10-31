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
  RotateCcw,
  Trash2,
  PlusCircle,
  HelpCircle,
  Search,
  LayoutGrid,
  Zap,
  ArrowRight,
  Plus,
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
  onSaveSuccess,
  onCancel,
}: ZoneConformationEditorProps) {
  // 1. Zonas administrables manualmente por el usuario
  const [localZones, setLocalZones] = useState<Zone[]>(() => {
    if (zones && zones.length > 0) return zones;
    // Si el torneo no tiene zonas aún, inicializar con 2 zonas vacías
    return [
      {
        id: "temp-1",
        tournament_id: tournamentId,
        name: "Zona A",
        zone_number: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: "temp-2",
        tournament_id: tournamentId,
        name: "Zona B",
        zone_number: 2,
        created_at: new Date().toISOString(),
      },
    ];
  });

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

  // Modo de visualización: "dynamic" (Asistente Dinámico) o "grid" (Vista Grilla de Zonas)
  const [viewMode, setViewMode] = useState<"dynamic" | "grid">("dynamic");

  // Zona activa en el Asistente Dinámico
  const [activeZoneId, setActiveZoneId] = useState<string>(() => {
    if (zones && zones.length > 0) return zones[0].id;
    return "temp-1";
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

  // Sincronizar activeZoneId si cambia localZones
  useEffect(() => {
    if (!activeZoneId && localZones.length > 0) {
      setActiveZoneId(localZones[0].id);
    } else if (activeZoneId && !localZones.some((z) => z.id === activeZoneId)) {
      if (localZones.length > 0) setActiveZoneId(localZones[0].id);
      else setActiveZoneId("");
    }
  }, [localZones, activeZoneId]);

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

  // Agregar una nueva zona manualmente
  const handleAddZone = () => {
    const nextIdx = localZones.length;
    const nextName = `Zona ${String.fromCharCode(65 + nextIdx)}`;
    const newZone: Zone = {
      id: `temp-${Date.now()}-${nextIdx}`,
      tournament_id: tournamentId,
      name: nextName,
      zone_number: nextIdx + 1,
      created_at: new Date().toISOString(),
    };
    setLocalZones((prev) => [...prev, newZone]);
    setActiveZoneId(newZone.id);
    setFeedbackNotice({
      type: "success",
      text: `Se agregó ${nextName}. Ya puedes asignarle las parejas que desees.`,
    });
  };

  // Eliminar una zona manualmente
  const handleDeleteZone = (zoneId: string) => {
    const targetZone = localZones.find((z) => z.id === zoneId);

    // Desasignar parejas que estaban en esta zona
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((cId) => {
        if (next[cId] === zoneId) delete next[cId];
      });
      return next;
    });

    // Quitar la zona y renumerar las restantes correlativamente (Zona A, Zona B, etc.)
    setLocalZones((prev) => {
      const filtered = prev.filter((z) => z.id !== zoneId);
      return filtered.map((z, idx) => ({
        ...z,
        name: `Zona ${String.fromCharCode(65 + idx)}`,
        zone_number: idx + 1,
      }));
    });

    if (activeZoneId === zoneId) {
      const remaining = localZones.filter((z) => z.id !== zoneId);
      if (remaining.length > 0) setActiveZoneId(remaining[0].id);
      else setActiveZoneId("");
    }

    setFeedbackNotice({
      type: "info",
      text: `${targetZone?.name || "Zona"} eliminada. Sus parejas quedaron disponibles.`,
    });
  };

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

  // Asignar una pareja a la Zona Activa en el Asistente Dinámico (SIN límite rígido)
  const handleAssignToActiveZone = (coupleId: string) => {
    if (!activeZoneId) return;

    const activeZone = localZones.find((z) => z.id === activeZoneId);
    if (!activeZone) return;

    const couplesInActive = Object.entries(assignments)
      .filter(([, zId]) => zId === activeZoneId)
      .map(([cId]) => cId);

    // Si ya está en la zona activa, no hacer nada
    if (couplesInActive.includes(coupleId)) return;

    const couple = couples.find((c) => c.id === coupleId);
    const coupleNum = couple ? coupleNumberMap.get(couple.id) : null;
    const newCount = couplesInActive.length + 1;

    setAssignments((prev) => ({
      ...prev,
      [coupleId]: activeZoneId,
    }));

    setFeedbackNotice({
      type: "info",
      text: `Pareja ${coupleNum ?? ""} asignada a ${activeZone.name} (${newCount} ${
        newCount === 1 ? "pareja" : "parejas"
      }).`,
    });
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

  // Avanzar a la siguiente zona en el Asistente Dinámico
  const handleNextZone = () => {
    const currentIndex = localZones.findIndex((z) => z.id === activeZoneId);
    if (currentIndex >= 0 && currentIndex < localZones.length - 1) {
      setActiveZoneId(localZones[currentIndex + 1].id);
    } else if (localZones.length > 0) {
      setActiveZoneId(localZones[0].id);
    }
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
    if (localZones.length > 0) setActiveZoneId(localZones[0].id);
    setFeedbackNotice({
      type: "info",
      text: "Se han vaciado todas las zonas. Puedes comenzar a seleccionarlas una a una.",
    });
  };

  // Restablecer al estado inicial
  const handleReset = () => {
    setLocalZones(zones);
    setAssignments(initialAssignments);
    setSelectedForSwap(null);
    setFeedbackNotice({
      type: "info",
      text: "Conformación restablecida al estado original.",
    });
  };

  // Guardar conformación manual de zonas
  const handleSave = () => {
    setErrorMessage(null);

    if (localZones.length === 0) {
      setErrorMessage("Debes crear al menos una zona para el torneo.");
      return;
    }

    // Validación reglamentaria: Las zonas con parejas deben tener al menos 2 parejas.
    let activeZonesCount = 0;
    for (const zone of localZones) {
      const count = Object.values(assignments).filter((zId) => zId === zone.id).length;
      if (count === 1) {
        setErrorMessage(
          `No se puede guardar: la ${zone.name} tiene una sola pareja. Asigna al menos 2 parejas para poder jugar partidos, o elimina la zona.`
        );
        return;
      }
      if (count >= 2) {
        activeZonesCount++;
      }
    }

    if (activeZonesCount === 0) {
      setErrorMessage("Debes asignar al menos 2 parejas a una zona para conformar el torneo.");
      return;
    }

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
            zones: localZones.map((z, idx) => ({
              id: z.id,
              name: `Zona ${String.fromCharCode(65 + idx)}`,
              zone_number: idx + 1,
            })),
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
  const activeZone = localZones.find((z) => z.id === activeZoneId) || localZones[0];

  const activeZoneCouples = useMemo(() => {
    if (!activeZone) return [];
    return Object.entries(assignments)
      .filter(([, zId]) => zId === activeZone.id)
      .map(([cId]) => couples.find((c) => c.id === cId))
      .filter((c): c is Couple => Boolean(c));
  }, [assignments, activeZone, couples]);

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

  // Pareja seleccionada para swap en vista Grilla
  const swapCouple = selectedForSwap ? couples.find((c) => c.id === selectedForSwap) : null;

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
                Confección Manual de Zonas
              </h3>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Libertad total (zonas de 3, 4, 5 parejas o más)
              </span>
            </div>
            <p className="text-xs text-dark-300 mt-0.5">
              Crea las zonas que desees y determina a tu gusto cuántas y cuáles parejas juegan en cada una.
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
            variant="secondary"
            size="sm"
            onClick={handleAddZone}
            disabled={isPending}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            + Agregar Zona
          </Button>

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
          <span>{feedbackNotice.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tarjeta de Resumen General */}
      <Card className="p-4 border-dark-800 bg-dark-950/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-800">
          <div>
            <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider">
              Estado de la Confección
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm font-bold text-white">
                {localZones.length} {localZones.length === 1 ? "zona creada" : "zonas creadas"}
              </span>
              <span className="text-dark-500">·</span>
              <span className="text-sm font-bold text-emerald-400">
                {Object.keys(assignments).length} de {couples.length} parejas asignadas
              </span>
              {unassignedCouples.length > 0 && (
                <>
                  <span className="text-dark-500">·</span>
                  <span className="text-xs text-amber-300 font-medium">
                    ({unassignedCouples.length} pendientes de asignar)
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddZone}
              className="bg-dark-850 hover:bg-dark-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Agregar Zona</span>
            </Button>
          </div>
        </div>

        {/* Resumen de Zonas y sus cantidades */}
        <div className="flex flex-wrap gap-2 pt-3">
          {localZones.map((z) => {
            const count = Object.values(assignments).filter((zId) => zId === z.id).length;
            const isValid = count >= 2;
            return (
              <div
                key={z.id}
                onClick={() => setActiveZoneId(z.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  z.id === activeZoneId
                    ? "bg-emerald-500/20 text-white border-emerald-500 ring-2 ring-emerald-500/30"
                    : isValid
                    ? "bg-dark-900 text-slate-200 border-dark-750 hover:border-dark-600"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                }`}
              >
                <span>{z.name}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded font-black ${
                    isValid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {count} {count === 1 ? "pareja" : "parejas"}
                </span>
                {!isValid && count === 1 && (
                  <span className="text-[10px] text-amber-400 font-normal">(mín. 2)</span>
                )}
                {!isValid && count === 0 && (
                  <span className="text-[10px] text-dark-400 font-normal">(vacía)</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* VISTA 1: ASISTENTE DINÁMICO                                               */}
      {/* ========================================================================= */}
      {viewMode === "dynamic" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: ZONA ACTIVA EN CONFECCIÓN */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border border-dark-750 bg-dark-950/80 shadow-2xl overflow-hidden">
              {/* Encabezado de la zona activa */}
              <div className="p-4 bg-dark-900 border-b border-dark-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-base">
                    {activeZone?.zone_number || 1}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      {activeZone?.name || "Zona"}
                    </h4>
                    <p className="text-[11px] text-dark-400">
                      {activeZoneCouples.length} {activeZoneCouples.length === 1 ? "pareja asignada" : "parejas asignadas"} a esta zona
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={activeZoneCouples.length >= 2 ? "success" : activeZoneCouples.length === 1 ? "warning" : "default"}
                    size="md"
                    className="font-black text-xs"
                  >
                    {activeZoneCouples.length} parejas
                    {activeZoneCouples.length < 2 && " (mín. 2)"}
                  </Badge>

                  {localZones.length > 1 && activeZone && (
                    <button
                      type="button"
                      onClick={() => handleDeleteZone(activeZone.id)}
                      className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar esta zona"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selector de pestañas para cambiar rápidamente de zona */}
              <div className="p-2.5 bg-dark-950/70 border-b border-dark-800 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-dark-400 px-1 uppercase tracking-wider">
                  Zonas:
                </span>
                {localZones.map((z) => {
                  const zCouples = Object.values(assignments).filter((zId) => zId === z.id);
                  const isCurrent = z.id === activeZone?.id;

                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setActiveZoneId(z.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-emerald-500 text-dark-950 shadow-md font-black"
                          : zCouples.length >= 2
                          ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                          : "bg-dark-850 text-dark-300 hover:text-white border border-dark-750"
                      }`}
                    >
                      <span>{z.name}</span>
                      <span className="text-[10px] opacity-80 font-mono">
                        ({zCouples.length})
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddZone}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all flex items-center gap-1"
                  title="Agregar otra zona"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Zona</span>
                </button>
              </div>

              {/* Parejas en la zona activa */}
              <div className="p-4 space-y-3">
                {activeZoneCouples.length === 0 ? (
                  <div className="p-8 text-center text-dark-400 border border-dashed border-dark-800 rounded-xl space-y-2">
                    <Users className="w-8 h-8 mx-auto text-dark-500" />
                    <p className="text-xs font-semibold text-dark-300">
                      Esta zona aún no tiene parejas asignadas
                    </p>
                    <p className="text-[11px] text-dark-500">
                      Haz clic en cualquier pareja de la columna derecha para sumarla a {activeZone?.name || "esta zona"}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeZoneCouples.map((c, index) => {
                      const num = coupleNumberMap.get(c.id);
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-dark-900 border border-dark-755 hover:border-dark-600 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-dark-800 text-dark-300 border border-dark-700 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white truncate">
                                  {getCoupleSummary(c)}
                                </span>
                                {c.seed && (
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    #{c.seed}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-dark-400 truncate">
                                Pareja #{num ?? "-"} · Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromActiveZone(c.id)}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                            title="Quitar de esta zona"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botón para pasar a la siguiente zona */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-dark-800">
                  <span className="text-[11px] text-dark-400">
                    Puedes asignar tantas parejas como desees a esta zona.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleNextZone}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <span>Siguiente Zona</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* COLUMNA DERECHA: BANCO DE PAREJAS DISPONIBLES */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border border-dark-750 bg-dark-950/80 shadow-2xl overflow-hidden">
              <div className="p-4 bg-dark-900 border-b border-dark-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Parejas Inscriptas ({couples.length})
                  </h4>
                  <span className="text-xs text-dark-400 font-medium">
                    {unassignedCouples.length} sin asignar
                  </span>
                </div>

                {/* Búsqueda */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por jugador, apellido o número de pareja..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-dark-950 border border-dark-750 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("all")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      coupleFilter === "all"
                        ? "bg-dark-750 text-white"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Todas ({couples.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("unassigned")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      coupleFilter === "unassigned"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Sin asignar ({unassignedCouples.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupleFilter("assigned")}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      coupleFilter === "assigned"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-dark-400 hover:text-white"
                    }`}
                  >
                    Asignadas ({Object.keys(assignments).length})
                  </button>
                </div>
              </div>

              {/* Lista de parejas */}
              <div className="p-3 max-h-[580px] overflow-y-auto space-y-2">
                {filteredCouplesForAssistant.length === 0 ? (
                  <div className="py-10 text-center text-dark-400 text-xs">
                    No se encontraron parejas con los filtros aplicados.
                  </div>
                ) : (
                  filteredCouplesForAssistant.map((c) => {
                    const num = coupleNumberMap.get(c.id);
                    const assignedZoneId = assignments[c.id];
                    const assignedZone = assignedZoneId ? localZones.find((z) => z.id === assignedZoneId) : null;
                    const isInActiveZone = assignedZoneId === activeZone?.id;

                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isInActiveZone
                            ? "bg-emerald-500/10 border-emerald-500/40"
                            : assignedZone
                            ? "bg-dark-900/60 border-dark-800 opacity-75"
                            : "bg-dark-900 border-dark-750 hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {getCoupleSummary(c)}
                            </span>
                            {c.seed && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                #{c.seed}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-dark-400">
                            <span>Pareja #{num ?? "-"}</span>
                            <span>·</span>
                            <span>Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}</span>
                            {assignedZone && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400 font-bold">
                                  En {assignedZone.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Botón de Asignar / Mover a la Zona Activa */}
                        <div>
                          {isInActiveZone ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromActiveZone(c.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
                            >
                              Quitar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssignToActiveZone(c.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-dark-950 text-xs font-black transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Sumar a {activeZone?.name || "Zona"}</span>
                            </button>
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
      {/* VISTA 2: VISTA GRILLA DE ZONAS                                            */}
      {/* ========================================================================= */}
      {viewMode === "grid" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {localZones.map((zone) => {
              const zoneCouplesList = Object.entries(assignments)
                .filter(([, zId]) => zId === zone.id)
                .map(([cId]) => couples.find((c) => c.id === cId))
                .filter((c): c is Couple => Boolean(c));

              const isComplete = zoneCouplesList.length >= 2;

              return (
                <Card
                  key={zone.id}
                  className={`overflow-hidden border transition-all ${
                    isComplete
                      ? "border-dark-750 bg-dark-950/90"
                      : "border-amber-500/30 bg-dark-950/90"
                  }`}
                >
                  {/* Cabecera de la tarjeta de zona */}
                  <div className="p-3.5 bg-dark-900 border-b border-dark-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs">
                        {zone.zone_number}
                      </span>
                      <h4 className="text-sm font-black text-white">{zone.name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isComplete ? "success" : "warning"}
                        size="sm"
                        className="font-bold text-[11px]"
                      >
                        {zoneCouplesList.length} {zoneCouplesList.length === 1 ? "pareja" : "parejas"}
                        {zoneCouplesList.length < 2 && " (mín. 2)"}
                      </Badge>

                      {localZones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1 text-dark-400 hover:text-rose-400 transition-colors"
                          title="Eliminar esta zona"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parejas en esta zona */}
                  <div className="p-3.5 space-y-2.5">
                    {zoneCouplesList.length === 0 ? (
                      <div className="py-6 text-center text-dark-400 border border-dashed border-dark-800 rounded-xl space-y-1">
                        <Users className="w-6 h-6 mx-auto text-dark-500" />
                        <p className="text-xs text-dark-300">Zona vacía</p>
                        <p className="text-[10px] text-dark-500">Asigna parejas con el selector inferior</p>
                      </div>
                    ) : (
                      zoneCouplesList.map((c) => {
                        const num = coupleNumberMap.get(c.id);
                        const isSelected = selectedForSwap === c.id;

                        return (
                          <div
                            key={c.id}
                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40"
                                : "bg-dark-900 border-dark-800 hover:border-dark-700"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">
                                  {getCoupleSummary(c)}
                                </span>
                                {c.seed && (
                                  <span className="text-[10px] font-black px-1 rounded bg-amber-500/20 text-amber-300">
                                    #{c.seed}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-dark-400 truncate">
                                Pareja #{num ?? "-"} · Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedForSwap && selectedForSwap !== c.id) {
                                    handleSwapCouples(selectedForSwap, c.id);
                                  } else {
                                    setSelectedForSwap(isSelected ? null : c.id);
                                  }
                                }}
                                className={`p-1 rounded text-xs transition-colors ${
                                  isSelected
                                    ? "bg-amber-500 text-dark-950 font-bold"
                                    : "text-dark-400 hover:text-white"
                                }`}
                                title="Intercambiar con otra pareja"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveCouple(c.id, "none")}
                                className="p-1 rounded text-dark-400 hover:text-rose-400 transition-colors"
                                title="Quitar de esta zona"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Selector para sumar pareja a esta zona */}
                    {unassignedCouples.length > 0 && (
                      <div className="pt-1.5">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMoveCouple(e.target.value, zone.id);
                              e.target.value = "";
                            }
                          }}
                          className="w-full bg-dark-900 text-dark-300 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-dark-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="" disabled>
                            + Asignar pareja a {zone.name}...
                          </option>
                          {unassignedCouples.map((c) => (
                            <option key={c.id} value={c.id}>
                              Pareja #{coupleNumberMap.get(c.id) ?? "-"} - {getCoupleSummary(c)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Tarjeta para agregar una nueva zona */}
            <button
              type="button"
              onClick={handleAddZone}
              className="p-8 rounded-2xl border-2 border-dashed border-dark-750 hover:border-emerald-500/50 bg-dark-950/40 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-2 text-dark-400 hover:text-emerald-400 min-h-[160px] cursor-pointer"
            >
              <PlusCircle className="w-8 h-8" />
              <span className="text-sm font-black text-white">
                + Agregar Nueva Zona
              </span>
              <span className="text-xs text-dark-400">
                Crea otra zona para asignar parejas
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Guía rápida de uso */}
      <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800/80 flex items-start gap-3 text-xs text-dark-400">
        <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-dark-200 font-semibold">Confección manual de zonas sin límites rígidos:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-dark-300 text-[11px]">
            <li>
              El administrador define libremente cuántas zonas conformar y cuántas parejas juegan en cada una (por ejemplo: una zona de 3 parejas, otra de 5 parejas, otra de 4 parejas, etc.).
            </li>
            <li>
              Puedes crear nuevas zonas con el botón <strong>&quot;+ Agregar Zona&quot;</strong> o eliminar las que no utilices.
            </li>
            <li>
              Cada zona que dispute partidos debe contar con al menos <strong>2 parejas</strong> para poder competir.
            </li>
            <li>
              Al hacer clic en <strong>&quot;Guardar Conformación&quot;</strong>, se actualizarán las zonas y se generará automáticamente el fixture de partidos correspondiente.
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
