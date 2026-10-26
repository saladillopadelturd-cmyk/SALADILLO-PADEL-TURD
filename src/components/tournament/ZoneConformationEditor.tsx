"use client";

import { useState, useTransition, useMemo } from "react";
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

  // Modo interactivo de intercambio (pareja en mano para swap)
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  };

  // Restablecer al estado inicial
  const handleReset = () => {
    setAssignments(initialAssignments);
    setSelectedForSwap(null);
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
  const unassignedCouples = couples.filter((c) => !assignments[c.id]);

  // Datos de la pareja seleccionada para swap (si hay alguna)
  const swapCouple = selectedForSwap ? couples.find((c) => c.id === selectedForSwap) : null;
  const swapCoupleZoneId = selectedForSwap ? assignments[selectedForSwap] : null;
  const swapCoupleZone = swapCoupleZoneId ? zones.find((z) => z.id === swapCoupleZoneId) : null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de control superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              Editor de Conformación de Zonas
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Modo Administrador
              </span>
            </h3>
            <p className="text-xs text-dark-300 mt-0.5">
              Cambia, intercambia o reasigna parejas entre las zonas. Al guardar se actualizarán las tablas y el fixture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
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
            title="Quitar todas las parejas de las zonas"
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
            className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg shadow-emerald-500/20 text-xs sm:text-sm"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isPending ? "Guardando..." : "Guardar Conformación"}
          </Button>
        </div>
      </div>

      {/* Banner interactivo cuando hay una pareja seleccionada para Intercambiar (Click to Swap) */}
      {selectedForSwap && swapCouple && (
        <div className="p-4 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />
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

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Resumen de ocupación por zona */}
      <div className="flex items-center gap-2 flex-wrap text-xs bg-dark-950/60 p-3 rounded-xl border border-dark-800">
        <span className="text-dark-400 font-bold uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Ocupación:
        </span>
        {zones.map((zone) => {
          const count = Object.values(assignments).filter((zId) => zId === zone.id).length;
          const isFull = count === targetZoneSize;
          return (
            <span
              key={zone.id}
              className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
                isFull
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : count > targetZoneSize
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  : "bg-blue-500/15 text-blue-300 border-blue-500/30"
              }`}
            >
              <span>{zone.name}:</span>
              <span className="text-white font-extrabold">{count}</span>
              <span className="text-dark-400 font-normal">/ {targetZoneSize}</span>
            </span>
          );
        })}
        {unassignedCouples.length > 0 && (
          <span className="px-2.5 py-1 rounded-lg border font-bold bg-amber-500/15 text-amber-300 border-amber-500/30 ml-auto">
            Sin Asignar: {unassignedCouples.length}
          </span>
        )}
      </div>

      {/* Grilla de Zonas para edición */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {zones.map((zone) => {
          const zoneCoupleIds = Object.entries(assignments)
            .filter(([, zId]) => zId === zone.id)
            .map(([cId]) => cId);

          const zoneCouplesList = zoneCoupleIds
            .map((cId) => couples.find((c) => c.id === cId))
            .filter((c): c is Couple => Boolean(c));

          return (
            <Card
              key={zone.id}
              className={`overflow-hidden border transition-all flex flex-col justify-between ${
                zoneCouplesList.length === targetZoneSize
                  ? "border-dark-700/80 bg-dark-900/90 shadow-xl"
                  : zoneCouplesList.length > targetZoneSize
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
                    variant={zoneCouplesList.length === targetZoneSize ? "success" : "info"}
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

                          {/* Botón interactivo de Intercambio Rápido si hay otra pareja seleccionada */}
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
                                    Seleccionar para swap
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
                                {/* Parejas de otras zonas agrupadas */}
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

                                {/* Parejas sin zona asignada */}
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
                                  Mover a:
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

      {/* Sección de parejas sin asignar */}
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

      {/* Guía rápida de uso */}
      <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-800/80 flex items-start gap-3 text-xs text-dark-400">
        <HelpCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-dark-200 font-semibold">Consejos para conformar las zonas:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-dark-300 text-[11px]">
            <li>
              Usa <strong>&quot;Cambiar pareja por&quot;</strong> en cualquier tarjeta para intercambiar al instante dos parejas entre zonas sin desbalancear la cantidad de participantes.
            </li>
            <li>
              O presiona <strong>&quot;Seleccionar para swap&quot;</strong> en una pareja y luego haz clic en <strong>&quot;Intercambiar aquí&quot;</strong> en la pareja de destino.
            </li>
            <li>
              Al presionar <strong>&quot;Guardar Conformación&quot;</strong>, el sistema persistirá las asignaciones y regenerará automáticamente los partidos de zona para el fixture.
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
          className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {isPending ? "Guardando..." : "Guardar Conformación"}
        </Button>
      </div>
    </div>
  );
}
