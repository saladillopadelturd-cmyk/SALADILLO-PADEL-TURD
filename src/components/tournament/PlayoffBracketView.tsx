"use client";

import React, { useMemo, useState } from "react";
import { Trophy, CheckCircle2, Clock, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { getStageName, normalizeStage } from "@/lib/tournament/elimination";
import type { Match, Couple } from "@/types/tournament";

interface PlayoffBracketViewProps {
  matches: Match[];
  couples?: Couple[];
  isAdmin?: boolean;
  onMatchClick?: (match: Match) => void;
  title?: string;
  subtitle?: string;
}

export function PlayoffBracketView({
  matches,
  couples = [],
  isAdmin = false,
  onMatchClick,
  title = "Cuadro Principal de Eliminación Directa",
  subtitle = "Estructura interactiva de llaves conformada de arriba hacia abajo.",
}: PlayoffBracketViewProps) {
  // Nivel de zoom para explorar el cuadro
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);

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

  // Mapa rápido de parejas por id
  const couplesMap = useMemo(() => {
    const map = new Map<string, Couple>();
    couples.forEach((c) => map.set(c.id, c));
    return map;
  }, [couples]);

  const getCoupleLabel = (coupleId: string | null | undefined): { name: string; isSeed?: boolean; isBye?: boolean } => {
    if (!coupleId) return { name: "Por definir" };
    const c = couplesMap.get(coupleId);
    if (!c) return { name: "Pareja" };
    const p1 = c.player1 ? `${c.player1.last_name || ""} ${c.player1.first_name || ""}`.trim() : "";
    const p2 = c.player2 ? `${c.player2.last_name || ""} ${c.player2.first_name || ""}`.trim() : "";
    return { name: p1 && p2 ? `${p1} / ${p2}` : "Pareja" };
  };

  // Filtrar y agrupar los partidos por etapa en orden secuencial
  const bracketStages = useMemo(() => {
    const playoffMatches = matches.filter((m) => m.stage !== "zone");
    if (playoffMatches.length === 0) return [];

    // Detectar qué etapas existen
    const stageOrder = ["round_of_32", "round_of_16", "quarter", "semi", "final"] as const;
    const stagesFound: (typeof stageOrder)[number][] = [];

    stageOrder.forEach((stg) => {
      const hasStage = playoffMatches.some((m) => normalizeStage(m.stage) === stg);
      if (hasStage) {
        stagesFound.push(stg);
      }
    });

    return stagesFound.map((stg) => {
      const stageMatches = playoffMatches
        .filter((m) => normalizeStage(m.stage) === stg)
        .sort((a, b) => (a.match_number ?? 999) - (b.match_number ?? 999));

      return {
        stage: stg,
        stageName: getStageName(stg),
        matches: stageMatches,
      };
    });
  }, [matches]);

  if (bracketStages.length === 0) {
    return (
      <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-12 text-center">
        <Trophy className="w-12 h-12 text-dark-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">
          Aún no se ha generado el cuadro de eliminación directa
        </h3>
        <p className="text-sm text-dark-400 max-w-md mx-auto">
          Genera el cuadro manual seleccionando las parejas clasificadas para conformar los partidos y sembradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900/90 p-4 rounded-xl border border-dark-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            {title}
          </h3>
          <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs text-dark-400">
          {/* Controles de Zoom */}
          <div className="flex items-center gap-1 bg-dark-950/80 border border-dark-800 rounded-lg p-1 shadow-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.45}
              className="p-1 rounded text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-25 transition-colors"
              title="Alejar (ver más del cuadro)"
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
              title="Vista panorámica de todo el torneo"
            >
              Completo
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

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dark-800/80 border border-dark-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Ganador avanza
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dark-800/80 border border-dark-700">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Sembrada
          </span>
        </div>
      </div>

      {/* Visor Gráfico de Llaves en Columnas de Arriba hacia Abajo con Zoom */}
      <div className="overflow-x-auto pb-6 pt-2">
        <div
          className="inline-flex gap-8 min-w-full px-2 items-stretch origin-top-left transition-all duration-150"
          style={{
            zoom: zoomLevel,
          }}
        >
          {bracketStages.map((stageGroup, stageIdx) => {
            const isLastStage = stageIdx === bracketStages.length - 1;

            return (
              <div
                key={stageGroup.stage}
                className="flex flex-col min-w-[280px] sm:min-w-[320px] max-w-[340px] flex-shrink-0"
              >
                {/* Cabecera de la Ronda */}
                <div className="mb-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-dark-800 text-sky-400 border border-dark-700">
                    {stageGroup.stageName}
                  </span>
                  <div className="text-[11px] text-dark-500 mt-1">
                    {stageGroup.matches.length} {stageGroup.matches.length === 1 ? "partido" : "partidos"}
                  </div>
                </div>

                {/* Lista de partidos de la etapa distribuidos verticalmente */}
                <div className="flex flex-col justify-around flex-grow gap-6 relative">
                  {stageGroup.matches.map((m, matchIdx) => {
                    const isCompleted = m.status === "completed";
                    const isBye =
                      m.score_set1?.includes("BYE") || (!m.couple2_id && isCompleted);

                    const c1 = getCoupleLabel(m.couple1_id);
                    const c2 = isBye
                      ? { name: "BYE (Pase directo)", isBye: true }
                      : getCoupleLabel(m.couple2_id);

                    const isC1Winner = isCompleted && m.winner_couple_id === m.couple1_id;
                    const isC2Winner = isCompleted && !isBye && m.winner_couple_id === m.couple2_id;

                    const isClickable =
                      isAdmin && !isBye && !!m.couple1_id && !!m.couple2_id && onMatchClick;

                    const scoreFormatted = [m.score_set1, m.score_set2, m.score_super_tb]
                      .filter(Boolean)
                      .join(" | ");

                    return (
                      <div key={m.id} className="relative group">
                        <div
                          onClick={() => {
                            if (isClickable && onMatchClick) {
                              onMatchClick(m);
                            }
                          }}
                          className={`rounded-xl border transition-all duration-200 shadow-md ${
                            isClickable
                              ? "cursor-pointer hover:border-amber-400/80 hover:shadow-lg hover:shadow-amber-500/10"
                              : ""
                          } ${
                            isCompleted
                              ? "bg-dark-900/90 border-dark-700/80"
                              : "bg-dark-900/70 border-dark-800"
                          }`}
                        >
                          {/* Barra superior de partido */}
                          <div className="px-3 py-1.5 border-b border-dark-800/80 flex items-center justify-between text-[11px] bg-dark-950/40 rounded-t-xl">
                            <span className="font-bold text-dark-400">
                              Partido #{m.match_number ?? matchIdx + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isBye ? (
                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Pase Directo
                                </span>
                              ) : isCompleted ? (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Finalizado
                                </span>
                              ) : (
                                <span className="text-[10px] text-dark-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pareja 1 */}
                          <div
                            className={`p-2.5 flex items-center justify-between gap-2 border-b border-dark-800/60 ${
                              isC1Winner
                                ? "bg-emerald-500/15 text-emerald-300 font-bold"
                                : m.couple1_id
                                ? "text-white"
                                : "text-dark-500 italic"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isC1Winner && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="truncate text-xs">
                                {c1.name}
                              </span>
                            </div>
                            {isBye && (
                              <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 flex-shrink-0">
                                SEMBRADA
                              </span>
                            )}
                          </div>

                          {/* Pareja 2 */}
                          <div
                            className={`p-2.5 flex items-center justify-between gap-2 rounded-b-xl ${
                              isC2Winner
                                ? "bg-emerald-500/15 text-emerald-300 font-bold"
                                : isBye
                                ? "text-dark-500 italic text-[11px]"
                                : m.couple2_id
                                ? "text-white"
                                : "text-dark-500 italic"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isC2Winner && (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span className="truncate text-xs">
                                {c2.name}
                              </span>
                            </div>
                          </div>

                          {/* Marcador si está finalizado */}
                          {scoreFormatted && !isBye && (
                            <div className="px-3 py-1 bg-dark-950/60 border-t border-dark-800/80 text-[11px] font-mono font-bold text-sky-400 flex items-center justify-between">
                              <span>Resultado:</span>
                              <span>{scoreFormatted}</span>
                            </div>
                          )}
                        </div>

                        {/* Conector gráfico horizontal hacia la siguiente columna (si no es la última etapa) */}
                        {!isLastStage && (
                          <div
                            className="hidden lg:block absolute top-1/2 -right-8 w-8 h-px bg-dark-700 pointer-events-none"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
