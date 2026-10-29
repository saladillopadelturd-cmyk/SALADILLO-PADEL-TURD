"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Swords,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  buildManualPlayoffBracketFromSlots,
  initializeR1Slots,
  assignSeedToSlots,
  assignPlayToSlots,
  removeCoupleFromSlots,
  type AnchoredMatchSlot,
  type ManualCoupleEntry,
} from "@/lib/tournament/manual-bracket";
import type { Couple } from "@/types/tournament";

export interface QualifiedPairItem {
  pairId: string;
  coupleObj?: Couple;
  zoneName?: string;
  position?: number;
  points?: number;
}

interface ManualPlayoffBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  qualifiedPairs: QualifiedPairItem[];
  allCouples?: Couple[];
  onSuccess: () => void;
}

export function ManualPlayoffBracketModal({
  isOpen,
  onClose,
  tournamentId,
  qualifiedPairs,
  allCouples = [],
  onSuccess,
}: ManualPlayoffBracketModalProps) {
  // Mapa de parejas
  const couplesMap = useMemo(() => {
    const map = new Map<string, Couple>();
    allCouples.forEach((c) => map.set(c.id, c));
    return map;
  }, [allCouples]);

  // Lista local editable de parejas
  const [pairsList, setPairsList] = useState<ManualCoupleEntry[]>([]);
  // Slots anclados y fijos de Ronda 1
  const [r1Slots, setR1Slots] = useState<AnchoredMatchSlot[]>([]);
  // Nivel de Zoom para explorar el cuadro completo o ver de cerca
  const [zoomLevel, setZoomLevel] = useState<number>(0.8);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(1.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.45, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

  const handleZoomFull = () => {
    setZoomLevel(0.55);
  };

  // Inicializar parejas clasificadas y slots vacíos
  useEffect(() => {
    if (!isOpen) return;

    const initialEntries: ManualCoupleEntry[] = [];

    const sourceList =
      qualifiedPairs.length > 0
        ? qualifiedPairs
        : allCouples.map((c) => ({
            pairId: c.id,
            coupleObj: c,
            zoneName: "General",
            position: 1,
            points: 0,
          }));

    sourceList.forEach((q, idx) => {
      const couple = q.coupleObj || couplesMap.get(q.pairId);
      const p1 = couple?.player1
        ? `${couple.player1.last_name || ""} ${couple.player1.first_name || ""}`.trim()
        : "";
      const p2 = couple?.player2
        ? `${couple.player2.last_name || ""} ${couple.player2.first_name || ""}`.trim()
        : "";
      const label = p1 && p2 ? `${p1} / ${p2}` : `Pareja #${idx + 1}`;

      initialEntries.push({
        id: q.pairId,
        name: label,
        zoneName: q.zoneName,
        zonePosition: q.position,
        action: null,
      });
    });

    setPairsList(initialEntries);
    setR1Slots(initializeR1Slots(sourceList.length));
    setErrorMsg(null);
  }, [isOpen, qualifiedPairs, allCouples, couplesMap]);

  // Funciones para reordenar la vista de parejas en la lista (no altera las llaves ya ancladas)
  const moveUp = (index: number) => {
    if (index === 0) return;
    setPairsList((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === pairsList.length - 1) return;
    setPairsList((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  // Mapa de ubicación actual de cada pareja en los slots
  const coupleSlotMap = useMemo(() => {
    const map = new Map<
      string,
      {
        type: "seed" | "play";
        matchIndex: number;
        slot: 1 | 2;
        opponentName?: string;
        isWaiting?: boolean;
      }
    >();

    r1Slots.forEach((slot, idx) => {
      if (slot.type === "seed" && slot.couple1Id) {
        map.set(slot.couple1Id, {
          type: "seed",
          matchIndex: idx,
          slot: 1,
        });
      } else if (slot.type === "match" && slot.couple1Id) {
        const c1 = pairsList.find((p) => p.id === slot.couple1Id);
        const c2 = slot.couple2Id ? pairsList.find((p) => p.id === slot.couple2Id) : undefined;

        map.set(slot.couple1Id, {
          type: "play",
          matchIndex: idx,
          slot: 1,
          opponentName: c2?.name,
          isWaiting: !slot.couple2Id,
        });

        if (slot.couple2Id) {
          map.set(slot.couple2Id, {
            type: "play",
            matchIndex: idx,
            slot: 2,
            opponentName: c1?.name,
          });
        }
      }
    });

    return map;
  }, [r1Slots, pairsList]);

  // Manejador para botón "Sembrar" (Anclaje fijo)
  const handleToggleSeed = (coupleId: string) => {
    const currentLoc = coupleSlotMap.get(coupleId);
    if (currentLoc && currentLoc.type === "seed") {
      // Si ya está sembrada, al presionar de nuevo se desasigna de su slot
      setR1Slots((prev) => removeCoupleFromSlots(prev, coupleId));
    } else {
      // Si no estaba sembrada, se coloca en el primer slot libre sin mover a ninguna otra pareja
      setR1Slots((prev) => assignSeedToSlots(prev, coupleId));
    }
  };

  // Manejador para botón "Jugar" (Anclaje fijo)
  const handleTogglePlay = (coupleId: string) => {
    const currentLoc = coupleSlotMap.get(coupleId);
    if (currentLoc && currentLoc.type === "play") {
      // Si ya está jugando, al presionar de nuevo se desasigna de su slot
      setR1Slots((prev) => removeCoupleFromSlots(prev, coupleId));
    } else {
      // Si no estaba jugando, se completa un cruce disponible o se abre uno nuevo sin mover a nadie
      setR1Slots((prev) => assignPlayToSlots(prev, coupleId));
    }
  };

  // Quitar una pareja de su lugar asignado mediante la pequeña (x)
  const handleRemoveCouple = (coupleId: string) => {
    setR1Slots((prev) => removeCoupleFromSlots(prev, coupleId));
  };

  // Limpiar todas las asignaciones
  const clearAllSelections = () => {
    setR1Slots(initializeR1Slots(pairsList.length));
  };

  // Cálculo en tiempo real del cuadro de eliminación directa a partir de los slots anclados
  const bracketResult = useMemo(() => {
    if (pairsList.length === 0) return null;
    const namesMap = new Map<string, { id: string; name: string }>();
    pairsList.forEach((p) => namesMap.set(p.id, { id: p.id, name: p.name }));

    return buildManualPlayoffBracketFromSlots(namesMap, r1Slots, pairsList.length, 101);
  }, [pairsList, r1Slots]);

  // Referencias y cálculo geométrico de líneas conectoras de la previsualización
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewLines, setPreviewLines] = useState<{ id: string; d: string }[]>([]);

  const updatePreviewLines = useCallback(() => {
    const container = previewContainerRef.current;
    if (!container || !bracketResult) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const scale =
      container.offsetWidth > 0
        ? containerRect.width / container.offsetWidth
        : 1;

    const lines: { id: string; d: string }[] = [];
    const rounds = bracketResult.previewRounds;

    for (let rIdx = 0; rIdx < rounds.length - 1; rIdx++) {
      const curRound = rounds[rIdx];
      const nextRound = rounds[rIdx + 1];

      for (let nextIdx = 0; nextIdx < nextRound.matches.length; nextIdx++) {
        const destEl = container.querySelector<HTMLElement>(
          `[data-bracket-card="${rIdx + 1}-${nextIdx}"]`
        );
        if (!destEl) continue;

        const destRect = destEl.getBoundingClientRect();
        const destX = (destRect.left - containerRect.left) / scale;
        const destY =
          (destRect.top + destRect.height / 2 - containerRect.top) / scale;

        let topIdx = -1;
        let botIdx = -1;

        if (curRound.stage === "round_of_32") {
          const destM = nextRound.matches[nextIdx];
          if (destM.originatingMatch1Number != null) {
            topIdx = curRound.matches.findIndex(
              (m) => m.matchNumber === destM.originatingMatch1Number
            );
          }
          if (destM.originatingMatch2Number != null) {
            botIdx = curRound.matches.findIndex(
              (m) => m.matchNumber === destM.originatingMatch2Number
            );
          }
        } else {
          topIdx = nextIdx * 2;
          botIdx = nextIdx * 2 + 1;
        }

        const topEl = topIdx >= 0
          ? container.querySelector<HTMLElement>(`[data-bracket-card="${rIdx}-${topIdx}"]`)
          : null;
        const botEl = botIdx >= 0
          ? container.querySelector<HTMLElement>(`[data-bracket-card="${rIdx}-${botIdx}"]`)
          : null;

        const topRect = topEl ? topEl.getBoundingClientRect() : null;
        const botRect = botEl ? botEl.getBoundingClientRect() : null;

        const topX = topRect
          ? (topRect.right - containerRect.left) / scale
          : null;
        const topY = topRect
          ? (topRect.top + topRect.height / 2 - containerRect.top) / scale
          : null;

        const botX = botRect
          ? (botRect.right - containerRect.left) / scale
          : null;
        const botY = botRect
          ? (botRect.top + botRect.height / 2 - containerRect.top) / scale
          : null;

        if (topX !== null && topY !== null && botX !== null && botY !== null) {
          const startX = Math.max(topX, botX);
          const midX = startX + (destX - startX) / 2;
          const radius = Math.min(
            8,
            Math.max(0, Math.abs(destY - topY) / 2),
            Math.max(0, Math.abs(botY - destY) / 2),
            (destX - startX) / 4
          );

          const pathTop =
            radius >= 3
              ? `M ${topX} ${topY} L ${midX - radius} ${topY} Q ${midX} ${topY} ${midX} ${
                  topY + radius
                } L ${midX} ${destY - radius} Q ${midX} ${destY} ${
                  midX + radius
                } ${destY} L ${destX} ${destY}`
              : `M ${topX} ${topY} L ${midX} ${topY} L ${midX} ${destY} L ${destX} ${destY}`;

          const pathBot =
            radius >= 3
              ? `M ${botX} ${botY} L ${midX - radius} ${botY} Q ${midX} ${botY} ${midX} ${
                  botY - radius
                } L ${midX} ${destY + radius} Q ${midX} ${destY} ${
                  midX + radius
                } ${destY} L ${destX} ${destY}`
              : `M ${botX} ${botY} L ${midX} ${botY} L ${midX} ${destY} L ${destX} ${destY}`;

          lines.push({
            id: `pline-${rIdx}-${topIdx}-to-${rIdx + 1}-${nextIdx}`,
            d: pathTop,
          });
          lines.push({
            id: `pline-${rIdx}-${botIdx}-to-${rIdx + 1}-${nextIdx}`,
            d: pathBot,
          });
        } else if (topX !== null && topY !== null) {
          const midX = topX + (destX - topX) / 2;
          lines.push({
            id: `pline-${rIdx}-${topIdx}-to-${rIdx + 1}-${nextIdx}`,
            d: `M ${topX} ${topY} L ${midX} ${topY} L ${midX} ${destY} L ${destX} ${destY}`,
          });
        } else if (botX !== null && botY !== null) {
          const midX = botX + (destX - botX) / 2;
          lines.push({
            id: `pline-${rIdx}-${botIdx}-to-${rIdx + 1}-${nextIdx}`,
            d: `M ${botX} ${botY} L ${midX} ${botY} L ${midX} ${destY} L ${destX} ${destY}`,
          });
        }
      }
    }

    setPreviewLines(lines);
  }, [bracketResult]);

  useEffect(() => {
    updatePreviewLines();
    const tId = setTimeout(updatePreviewLines, 60);

    const container = previewContainerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updatePreviewLines();
      });
      observer.observe(container);
    }

    window.addEventListener("resize", updatePreviewLines);
    return () => {
      clearTimeout(tId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updatePreviewLines);
    };
  }, [updatePreviewLines, zoomLevel, bracketResult]);

  // Total de parejas con acción asignada
  const assignedCount = bracketResult?.assignedCount ?? 0;

  // Guardar cuadro manual
  const handleSave = async () => {
    if (!bracketResult) return;
    if (bracketResult.unpairedPlayCouples.length > 0) {
      const waitingId = bracketResult.unpairedPlayCouples[0];
      const waitingCouple = pairsList.find((p) => p.id === waitingId);
      setErrorMsg(
        `La pareja "${waitingCouple?.name || "Pareja"}" está colocada para 'Jugar' pero no tiene rival asignado. Asigna otra pareja con 'Jugar' para completar el cruce o quítala con (X).`
      );
      return;
    }

    if (bracketResult.matchesToInsert.length === 0) {
      setErrorMsg("Debe haber al menos 1 cruce conformado o pareja sembrada para generar el cuadro.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const res = await fetch("/api/playoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          action: "save_manual_bracket",
          matches: bracketResult.matchesToInsert,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar el cuadro de eliminación directa");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar el cuadro");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-dark-950 border border-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-dark-900 border-b border-dark-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Generador Manual de Cuadro de Eliminación Directa
              </h2>
              <p className="text-xs text-dark-400">
                Cada pareja sembrada o colocada queda fija en su llave. Solo dejará su lugar si presionas (X).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Contenido Principal con 2 Columnas */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-dark-800">
          {/* Columna Izquierda: Lista de Parejas Clasificadas */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Clasificadas ({pairsList.length})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-800 text-amber-400 border border-dark-700">
                  {assignedCount} / {pairsList.length} asignadas
                </span>
              </div>
              {assignedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllSelections}
                  className="text-[11px] text-dark-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  title="Vaciar todas las llaves"
                >
                  <RotateCcw className="w-3 h-3" />
                  Vaciar
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pairsList.length === 0 ? (
                <div className="text-center py-10 text-dark-500 text-xs">
                  No se encontraron parejas clasificadas disponibles.
                </div>
              ) : (
                pairsList.map((entry, index) => {
                  const location = coupleSlotMap.get(entry.id);
                  const isSeed = location?.type === "seed";
                  const isPlay = location?.type === "play";
                  const isUnassigned = !location;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSeed
                          ? "bg-amber-950/20 border-amber-500/50 shadow-sm"
                          : isPlay && location?.isWaiting
                          ? "bg-rose-950/20 border-rose-500/50 shadow-sm"
                          : isPlay
                          ? "bg-emerald-950/20 border-emerald-500/40 shadow-sm"
                          : "bg-dark-900/60 border-dark-800 hover:border-dark-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Controles de posición en la lista */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="w-6 h-6 rounded-md bg-dark-800 text-dark-300 flex items-center justify-center text-xs font-mono font-bold">
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                              className="text-dark-400 hover:text-white disabled:opacity-20 p-0.5"
                              title="Subir en la lista"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDown(index)}
                              disabled={index === pairsList.length - 1}
                              className="text-dark-400 hover:text-white disabled:opacity-20 p-0.5"
                              title="Bajar en la lista"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Datos de la Pareja */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {entry.name}
                          </div>
                          {entry.zoneName && (
                            <div className="text-[11px] text-dark-400 flex items-center gap-1.5 mt-0.5">
                              <Badge variant="default" size="xs">
                                {entry.zonePosition ? `${entry.zonePosition}° ` : ""}{entry.zoneName}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Botones de Acción: Sembrar vs Jugar */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={isSeed ? "primary" : "secondary"}
                            onClick={() => handleToggleSeed(entry.id)}
                            className={`text-xs px-2.5 py-1 font-bold ${
                              isSeed
                                ? "bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-md shadow-amber-500/20"
                                : "text-dark-400 hover:text-white"
                            }`}
                            title={isSeed ? "Click para desasignar" : "Sembrar en la próxima llave disponible"}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Sembrar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={isPlay ? "primary" : "secondary"}
                            onClick={() => handleTogglePlay(entry.id)}
                            className={`text-xs px-2.5 py-1 font-bold ${
                              isPlay
                                ? "bg-emerald-500 hover:bg-emerald-400 text-dark-950 shadow-md shadow-emerald-500/20"
                                : "text-dark-400 hover:text-white"
                            }`}
                            title={isPlay ? "Click para desasignar" : "Colocar para jugar cruce"}
                          >
                            <Swords className="w-3 h-3 mr-1" />
                            Jugar
                          </Button>
                        </div>
                      </div>

                      {/* Estado explicativo y fijo debajo de la tarjeta */}
                      <div className="mt-2 pt-2 border-t border-dark-800/60 text-[11px]">
                        {isUnassigned ? (
                          <span className="text-dark-500 italic">
                            Sin asignar. Elige si jugará en 16vos de Final o se siembra en 8vos de Final.
                          </span>
                        ) : isSeed ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3 flex-shrink-0" />
                            Sembrada en 8vos de Final (Partido #{Math.floor(location.matchIndex / 2) + 1}): pasa directo a 8vos y espera rival.
                          </span>
                        ) : location?.isWaiting ? (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            Cruce en 16vos de Final (Partido #{location.matchIndex + 1}) (esperando rival). Marca otra pareja con &apos;Jugar&apos;.
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Swords className="w-3 h-3 flex-shrink-0" />
                            Cruce en 16vos de Final (Partido #{location.matchIndex + 1}) vs{" "}
                            <span className="underline font-bold text-slate-200">
                              {location.opponentName || "Rival"}
                            </span>
                            . Ganador avanza a 8vos.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha: Previsualización Gráfica con Llaves Ancladas y Controles de Zoom */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden p-4 space-y-3 bg-dark-950/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Previsualización Gráfica del Cuadro Resultante
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botón para Imprimir en A4 */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 font-bold text-xs transition-colors shadow-sm"
                  title="Imprimir el cuadro completo en hoja A4 horizontal"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir A4</span>
                </button>

                {/* Controles de Zoom (Alejar para ver cuadro completo / Acercar para ver detalle) */}
                <div className="flex items-center gap-1 bg-dark-900 border border-dark-800 rounded-lg p-1 self-start sm:self-auto shadow-sm">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 0.45}
                    className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-25 transition-colors"
                    title="Alejar (ver más instancias del torneo)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-amber-400 px-1 min-w-[38px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 1.5}
                    className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-25 transition-colors"
                    title="Acercar (ver instancias de cerca)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3.5 bg-dark-800 mx-0.5" />
                  <button
                    type="button"
                    onClick={handleZoomFull}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      zoomLevel <= 0.6
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "text-dark-400 hover:text-white hover:bg-dark-800"
                    }`}
                    title="Ver cuadro completo del torneo de un solo vistazo"
                  >
                    Cuadro Completo
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      zoomLevel === 1.0
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "text-dark-400 hover:text-white hover:bg-dark-800"
                    }`}
                    title="Restablecer tamaño normal (100%)"
                  >
                    100%
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto border border-dark-800 rounded-xl bg-dark-900/40 p-4 relative bracket-scroll-container">
              {!bracketResult || bracketResult.previewRounds.length === 0 ? (
                <div className="h-full flex items-center justify-center text-dark-500 text-xs">
                  Cargando estructura del cuadro...
                </div>
              ) : (
                <div
                  ref={previewContainerRef}
                  className="bracket-columns-container inline-flex gap-10 min-w-full items-stretch py-2 origin-top-left transition-all duration-150 relative"
                  style={{
                    zoom: zoomLevel,
                  }}
                >
                  {/* Capa SVG de Líneas Conectoras entre Rondas */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    style={{ overflow: "visible" }}
                  >
                    {previewLines.map((line) => (
                      <path
                        key={line.id}
                        d={line.d}
                        fill="none"
                        stroke="#475569"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="bracket-connector-line opacity-70"
                      />
                    ))}
                  </svg>

                  {bracketResult.previewRounds.map((roundGroup, rIdx) => {
                    return (
                      <div
                        key={roundGroup.stage}
                        className="flex flex-col min-w-[240px] max-w-[280px] flex-shrink-0 relative z-10"
                      >
                        {/* Cabecera de Etapa */}
                        <div className="mb-3 text-center">
                          <span className="bracket-stage-badge inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-dark-800 text-sky-400 border border-dark-700">
                            {roundGroup.stageName}
                          </span>
                        </div>

                        {/* Partidos de la etapa ordenados de arriba hacia abajo */}
                        <div className="flex flex-col justify-around flex-grow gap-4">
                          {roundGroup.matches.map((pm, pmIdx) => {
                            const isBye = pm.isBye;
                            const isC1Empty = pm.couple1.isEmpty;
                            const isC2Empty = pm.couple2.isEmpty;
                            const isC2Waiting = pm.couple2.isWaiting;

                            return (
                              <div
                                key={pm.matchNumber}
                                data-bracket-card={`${rIdx}-${pmIdx}`}
                                className={`bracket-match-card rounded-xl border p-2.5 text-xs transition-colors relative z-10 ${
                                  isBye
                                    ? "bg-amber-950/20 border-amber-500/40 shadow-sm"
                                    : !isC1Empty && !isC2Empty && !isC2Waiting
                                    ? "bg-dark-900/90 border-emerald-500/30 shadow-sm"
                                    : isC2Waiting
                                    ? "bg-dark-900/90 border-rose-500/30"
                                    : "bg-dark-900/40 border-dark-800/80"
                                }`}
                              >
                                <div className="text-[10px] font-bold text-dark-400 mb-1.5 flex items-center justify-between">
                                  <span>Partido #{pm.matchNumber ?? pmIdx + 1}</span>
                                  {isBye ? (
                                    <span className="text-amber-400 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10">
                                      SEMBRADA (BYE)
                                    </span>
                                  ) : isC1Empty && isC2Empty ? (
                                    <span className="text-dark-600 font-mono text-[10px]">
                                      Campo Vacío
                                    </span>
                                  ) : null}
                                </div>

                                <div className="space-y-1.5">
                                  {/* Ranura Pareja 1 */}
                                  {isC1Empty ? (
                                    <div className="p-2 rounded-lg border border-dashed border-dark-800 bg-dark-950/40 text-dark-500 italic text-[11px] flex items-center justify-between">
                                      <span>[ Ranura vacía ]</span>
                                      <span className="text-[10px] text-dark-600 font-mono">Sin asignar</span>
                                    </div>
                                  ) : (
                                    <div
                                      className={`p-2 rounded-lg flex items-center justify-between gap-1.5 ${
                                        pm.couple1.isSeed
                                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                          : pm.couple1.isFeeder
                                          ? "bg-sky-500/10 border border-sky-500/30 text-sky-300 italic text-[11px]"
                                          : "bg-dark-800/90 border border-dark-700 text-white font-medium"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="truncate">{pm.couple1.name}</span>
                                        {pm.couple1.isSeed && (
                                          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                        )}
                                      </div>
                                      {/* Pequeña (X) para eliminar la pareja de la llave si fue colocada por error */}
                                      {pm.couple1.id && !pm.couple1.isFeeder && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCouple(pm.couple1.id!);
                                          }}
                                          className="p-1 rounded text-dark-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors flex-shrink-0"
                                          title="Quitar pareja de esta llave (deshacer colocación)"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Ranura Pareja 2 */}
                                  {isC2Empty ? (
                                    <div className="p-2 rounded-lg border border-dashed border-dark-800 bg-dark-950/40 text-dark-500 italic text-[11px] flex items-center justify-between">
                                      <span>[ Ranura vacía ]</span>
                                      <span className="text-[10px] text-dark-600 font-mono">Sin asignar</span>
                                    </div>
                                  ) : isC2Waiting ? (
                                    <div className="p-2 rounded-lg border border-dashed border-rose-500/40 bg-rose-950/20 text-rose-300 italic text-[11px] flex items-center justify-between">
                                      <span>Esperando rival...</span>
                                      <span className="text-[10px] text-rose-400 font-mono">Elige &apos;Jugar&apos;</span>
                                    </div>
                                  ) : isBye ? (
                                    <div className="p-2 rounded-lg bg-dark-900/60 border border-dark-800 text-dark-400 italic text-[11px] flex items-center justify-between">
                                      <span>BYE (Pase directo)</span>
                                    </div>
                                  ) : (
                                    <div
                                      className={`p-2 rounded-lg flex items-center justify-between gap-1.5 ${
                                        pm.couple2.isSeed
                                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                                          : pm.couple2.isFeeder
                                          ? "bg-sky-500/10 border border-sky-500/30 text-sky-300 italic text-[11px]"
                                          : "bg-dark-800/90 border border-dark-700 text-white font-medium"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="truncate">{pm.couple2.name}</span>
                                        {pm.couple2.isSeed && (
                                          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                        )}
                                      </div>
                                      {/* Pequeña (X) para eliminar la pareja de la llave si fue colocada por error */}
                                      {pm.couple2.id && !pm.couple2.isFeeder && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCouple(pm.couple2.id!);
                                          }}
                                          className="p-1 rounded text-dark-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors flex-shrink-0"
                                          title="Quitar pareja de esta llave (deshacer colocación)"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="px-6 py-4 bg-dark-900 border-t border-dark-800 flex items-center justify-between flex-shrink-0 gap-3">
          <div className="text-xs text-dark-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {assignedCount} de {pairsList.length} parejas asignadas ({bracketResult?.matchesToInsert.length ?? 0} cruces conformados).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                isSaving ||
                assignedCount < 2 ||
                (bracketResult?.unpairedPlayCouples.length ?? 0) > 0
              }
              className="bg-emerald-500 hover:bg-emerald-600 text-dark-950 font-bold"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  Guardando cuadro...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Confirmar Cuadro Oficial
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
