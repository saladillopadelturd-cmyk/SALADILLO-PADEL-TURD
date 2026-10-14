"use client";

import { useState, useTransition } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Zone, Couple } from "@/types/tournament";
import { Users, Check, X, ArrowRightLeft, ShieldAlert, Sparkles } from "lucide-react";

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
  // Inicializar mapa de asignación: coupleId -> zoneId
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    zones.forEach((z) => {
      const cIds = zoneCouplesMap[z.id] || [];
      cIds.forEach((cId) => {
        initial[cId] = z.id;
      });
    });
    return initial;
  });

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  };

  // Guardar conformación
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

  // Parejas no asignadas
  const unassignedCouples = couples.filter((c) => !assignments[c.id]);

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
              Reasigna o cambia las parejas de zona libremente. Al guardar se sincronizarán las zonas y el fixture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="text-dark-300 hover:text-white"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isPending ? "Guardando..." : "Guardar Conformación"}
          </Button>
        </div>
      </div>

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
              className="overflow-hidden border border-dark-700/80 bg-dark-900/90 shadow-xl flex flex-col justify-between"
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
                <div className="p-3.5 space-y-2.5">
                  {zoneCouplesList.length === 0 ? (
                    <div className="py-6 text-center text-dark-500 text-xs border border-dashed border-dark-800 rounded-xl">
                      Zona vacía. Selecciona una pareja para mover aquí.
                    </div>
                  ) : (
                    zoneCouplesList.map((c) => {
                      const num = coupleNumberMap.get(c.id);
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-dark-950/80 border border-dark-800 hover:border-dark-700 transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              Pareja {num ?? "-"}
                            </span>
                            <span className="text-[11px] text-dark-400 font-semibold truncate">
                              Cat. {c.player1?.category ?? "?"} + {c.player2?.category ?? "?"}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-white truncate">
                            {coupleNamesMap[c.id] || `${c.player1?.first_name} & ${c.player2?.first_name}`}
                          </h5>

                          {/* Selector de zona destino */}
                          <div className="pt-1 border-t border-dark-850 flex items-center justify-between gap-2 text-xs">
                            <span className="text-dark-400 text-[11px] font-medium flex-shrink-0">
                              Mover a:
                            </span>
                            <select
                              value={zone.id}
                              onChange={(e) => handleMoveCouple(c.id, e.target.value)}
                              className="w-full bg-dark-850 hover:bg-dark-800 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-dark-700 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
                            >
                              {zones.map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.name} {z.id === zone.id ? "(actual)" : ""}
                                </option>
                              ))}
                              <option value="none">Quitar de zona</option>
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {zoneCouplesList.length < targetZoneSize && unassignedCouples.length > 0 && (
                <div className="p-3 bg-dark-950/50 border-t border-dark-800">
                  <label className="block text-[11px] font-semibold text-dark-400 mb-1.5">
                    + Asignar pareja disponible a {zone.name}:
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleMoveCouple(e.target.value, zone.id);
                        e.target.value = "";
                      }
                    }}
                    className="w-full bg-dark-850 text-emerald-300 font-semibold text-xs rounded-lg px-2.5 py-1.5 border border-emerald-500/30 focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="" disabled>
                      Seleccionar pareja para sumar...
                    </option>
                    {unassignedCouples.map((c) => {
                      const num = coupleNumberMap.get(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          Pareja {num ?? "-"}: {coupleNamesMap[c.id]}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Sección de parejas sin asignar */}
      {unassignedCouples.length > 0 && (
        <Card className="p-5 border border-amber-500/30 bg-dark-950/80">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-dark-800">
            <Users className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Parejas sin zona asignada ({unassignedCouples.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unassignedCouples.map((c) => {
              const num = coupleNumberMap.get(c.id);
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-dark-900 border border-dark-800 flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Pareja {num ?? "-"}
                    </span>
                    <h5 className="text-xs font-bold text-white mt-1">
                      {coupleNamesMap[c.id]}
                    </h5>
                  </div>
                  <div className="pt-2 border-t border-dark-800">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleMoveCouple(c.id, e.target.value);
                      }}
                      className="w-full bg-dark-800 text-xs font-bold text-emerald-300 rounded-lg px-2 py-1.5 border border-dark-700 cursor-pointer"
                    >
                      <option value="" disabled>
                        Asignar a una zona...
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
