"use client";

import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  buildManualPlayoffBracket,
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

  // Lista local editable de parejas para ordenar de arriba hacia abajo y definir 'seed' | 'play'
  const [pairsList, setPairsList] = useState<ManualCoupleEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar parejas clasificadas
  useEffect(() => {
    if (!isOpen) return;

    // Si hay parejas clasificadas de zonas, usarlas
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
        // Por defecto: los 1° de zona se sugieren como sembrar si hay excedente, o todos jugar
        action: "play",
      });
    });

    setPairsList(initialEntries);
    setErrorMsg(null);
  }, [isOpen, qualifiedPairs, allCouples, couplesMap]);

  // Funciones para reordenar de arriba hacia abajo
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

  const toggleAction = (index: number, newAction: "seed" | "play") => {
    setPairsList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], action: newAction };
      return next;
    });
  };

  // Cálculo en tiempo real del cuadro de eliminación directa
  const bracketResult = useMemo(() => {
    if (pairsList.length === 0) return null;
    return buildManualPlayoffBracket(pairsList, 101);
  }, [pairsList]);

  // Mapeo informativo de cruces entre parejas 'play' para feedback visual en cada tarjeta
  const pairingsInfo = useMemo(() => {
    const map = new Map<
      string,
      { role: "first" | "second" | "waiting"; opponentName?: string; matchIndex?: number }
    >();
    let firstPlayIndex: number | null = null;
    let matchCounter = 1;

    pairsList.forEach((p, idx) => {
      if (p.action === "seed") return;

      if (firstPlayIndex === null) {
        firstPlayIndex = idx;
      } else {
        const firstPair = pairsList[firstPlayIndex];
        map.set(firstPair.id, {
          role: "first",
          opponentName: p.name,
          matchIndex: matchCounter,
        });
        map.set(p.id, {
          role: "second",
          opponentName: firstPair.name,
          matchIndex: matchCounter,
        });
        matchCounter++;
        firstPlayIndex = null;
      }
    });

    if (firstPlayIndex !== null) {
      const unpaired = pairsList[firstPlayIndex];
      map.set(unpaired.id, { role: "waiting" });
    }

    return map;
  }, [pairsList]);

  // Guardar cuadro manual
  const handleSave = async () => {
    if (!bracketResult) return;
    if (bracketResult.unpairedPlayCouple) {
      setErrorMsg(
        `La pareja "${bracketResult.unpairedPlayCouple.name}" está seleccionada para 'Jugar' pero no tiene rival. Selecciona otra pareja con 'Jugar' o cámbiala a 'Sembrar'.`
      );
      return;
    }

    if (bracketResult.matchesToInsert.length === 0) {
      setErrorMsg("Debe haber al menos 1 partido o pareja sembrada para generar el cuadro.");
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
                Ordena las parejas de arriba hacia abajo y elige si juegan o si se siembran a la próxima ronda.
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

        {/* Contenido Principal con 2 Columnas: Lista Manual y Previsualización Gráfica */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-dark-800">
          {/* Columna Izquierda: Lista de Parejas Clasificadas (5 columnas en LG) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Parejas Clasificadas ({pairsList.length})
              </span>
              <span className="text-[11px] text-dark-400">
                Usa ↑ ↓ para ordenar de arriba a abajo
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pairsList.length === 0 ? (
                <div className="text-center py-10 text-dark-500 text-xs">
                  No se encontraron parejas clasificadas disponibles.
                </div>
              ) : (
                pairsList.map((entry, index) => {
                  const pairing = pairingsInfo.get(entry.id);
                  const isSeed = entry.action === "seed";

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSeed
                          ? "bg-amber-950/20 border-amber-500/40"
                          : pairing?.role === "waiting"
                          ? "bg-rose-950/20 border-rose-500/40"
                          : "bg-dark-900/80 border-dark-800 hover:border-dark-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Indicador de posición y controles de mover */}
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
                              title="Subir"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDown(index)}
                              disabled={index === pairsList.length - 1}
                              className="text-dark-400 hover:text-white disabled:opacity-20 p-0.5"
                              title="Bajar"
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
                            onClick={() => toggleAction(index, "seed")}
                            className={`text-xs px-2.5 py-1 font-bold ${
                              isSeed
                                ? "bg-amber-500 hover:bg-amber-400 text-dark-950 shadow-md shadow-amber-500/20"
                                : "text-dark-300 hover:text-white"
                            }`}
                            title="Sembrar directamente a la siguiente ronda (Pase directo / BYE)"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            Sembrar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={!isSeed ? "primary" : "secondary"}
                            onClick={() => toggleAction(index, "play")}
                            className={`text-xs px-2.5 py-1 font-bold ${
                              !isSeed
                                ? "bg-emerald-500 hover:bg-emerald-400 text-dark-950 shadow-md shadow-emerald-500/20"
                                : "text-dark-300 hover:text-white"
                            }`}
                            title="Jugar contra la próxima pareja con acción 'Jugar'"
                          >
                            <Swords className="w-3 h-3 mr-1" />
                            Jugar
                          </Button>
                        </div>
                      </div>

                      {/* Estado explicativo debajo de la tarjeta */}
                      <div className="mt-2 pt-2 border-t border-dark-800/60 text-[11px]">
                        {isSeed ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Sembrada: pasa automáticamente a la próxima instancia y espera rival.
                          </span>
                        ) : pairing?.role === "waiting" ? (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Esperando rival: marca otra pareja con &apos;Jugar&apos; para conformar el partido.
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            {pairing?.matchIndex ? `Partido #${pairing.matchIndex} vs ` : "Jugará vs "}
                            <span className="underline font-bold text-slate-200">
                              {pairing?.opponentName || "Próxima pareja con 'Jugar'"}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha: Previsualización Gráfica en Tiempo Real (7 columnas en LG) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden p-4 space-y-3 bg-dark-950/60">
            <div className="flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Previsualización Gráfica del Cuadro Resultante
              </span>
              <span className="text-[11px] text-dark-400">
                Se actualiza en tiempo real
              </span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto border border-dark-800 rounded-xl bg-dark-900/40 p-4">
              {!bracketResult || bracketResult.previewRounds.length === 0 ? (
                <div className="h-full flex items-center justify-center text-dark-500 text-xs">
                  Configura las parejas a la izquierda para ver el dibujo del cuadro.
                </div>
              ) : (
                <div className="inline-flex gap-6 min-w-full items-stretch py-2">
                  {bracketResult.previewRounds.map((roundGroup, rIdx) => {
                    const isLast = rIdx === bracketResult.previewRounds.length - 1;

                    return (
                      <div
                        key={roundGroup.stage}
                        className="flex flex-col min-w-[240px] max-w-[280px] flex-shrink-0"
                      >
                        {/* Cabecera de Etapa */}
                        <div className="mb-3 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-dark-800 text-sky-400 border border-dark-700">
                            {roundGroup.stageName}
                          </span>
                        </div>

                        {/* Partidos de la etapa ordenados de arriba hacia abajo */}
                        <div className="flex flex-col justify-around flex-grow gap-4">
                          {roundGroup.matches.map((pm, pmIdx) => {
                            const isBye = pm.isBye;

                            return (
                              <div
                                key={pm.matchNumber}
                                className={`rounded-xl border p-2.5 text-xs transition-colors ${
                                  isBye
                                    ? "bg-amber-950/20 border-amber-500/40"
                                    : "bg-dark-900/90 border-dark-800"
                                }`}
                              >
                                <div className="text-[10px] font-bold text-dark-400 mb-1.5 flex items-center justify-between">
                                  <span>Partido #{pm.matchNumber ?? pmIdx + 1}</span>
                                  {isBye && (
                                    <span className="text-amber-400 font-mono font-bold">
                                      SEMBRADA (BYE)
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  {/* Pareja 1 */}
                                  <div
                                    className={`p-1.5 rounded flex items-center justify-between ${
                                      pm.couple1.isSeed
                                        ? "bg-amber-500/10 text-amber-300 font-semibold"
                                        : "bg-dark-800/70 text-white"
                                    }`}
                                  >
                                    <span className="truncate">{pm.couple1.name}</span>
                                    {pm.couple1.isSeed && (
                                      <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                    )}
                                  </div>

                                  {/* Pareja 2 */}
                                  <div
                                    className={`p-1.5 rounded flex items-center justify-between ${
                                      pm.couple2.isSeed
                                        ? "bg-amber-500/10 text-amber-300 font-semibold"
                                        : isBye
                                        ? "text-dark-500 italic"
                                        : "bg-dark-800/70 text-white"
                                    }`}
                                  >
                                    <span className="truncate">{pm.couple2.name}</span>
                                    {pm.couple2.isSeed && (
                                      <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                    )}
                                  </div>
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
              {bracketResult?.matchesToInsert.length ?? 0} partidos generados para el fixture oficial.
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
              disabled={isSaving || pairsList.length < 2 || !!bracketResult?.unpairedPlayCouple}
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
