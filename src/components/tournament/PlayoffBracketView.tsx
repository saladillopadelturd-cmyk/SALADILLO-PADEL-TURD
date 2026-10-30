"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Printer,
} from "lucide-react";
import { getStageName, normalizeStage, findNextPlayoffMatchSlot } from "@/lib/tournament/elimination";
import type { Match, Couple } from "@/types/tournament";

interface PlayoffBracketViewProps {
  matches: Match[];
  couples?: Couple[];
  isAdmin?: boolean;
  onMatchClick?: (match: Match, preselectedWinnerId?: string) => void;
  title?: string;
  subtitle?: string;
  tournamentName?: string;
  categoryName?: string;
}

interface BracketLinePath {
  id: string;
  d: string;
  isHighlighted?: boolean;
}

export function PlayoffBracketView({
  matches,
  couples = [],
  isAdmin = false,
  onMatchClick,
  title = "Cuadro Principal de Eliminación Directa",
  subtitle = "Estructura interactiva de llaves conformada de arriba hacia abajo.",
  tournamentName,
  categoryName,
}: PlayoffBracketViewProps) {
  // Nivel de zoom para explorar el cuadro
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [bracketLines, setBracketLines] = useState<BracketLinePath[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = () => {
    window.print();
  };

  // Mapa rápido de parejas por id
  const couplesMap = useMemo(() => {
    const map = new Map<string, Couple>();
    couples.forEach((c) => map.set(c.id, c));
    return map;
  }, [couples]);

  const getCoupleLabel = (
    coupleId: string | null | undefined
  ): { name: string; isSeed?: boolean; isBye?: boolean } => {
    if (!coupleId) return { name: "Por definir" };
    const c = couplesMap.get(coupleId);
    if (!c) return { name: "Pareja" };
    const p1 = c.player1
      ? `${c.player1.last_name || ""} ${c.player1.first_name || ""}`.trim()
      : "";
    const p2 = c.player2
      ? `${c.player2.last_name || ""} ${c.player2.first_name || ""}`.trim()
      : "";
    return { name: p1 && p2 ? `${p1} / ${p2}` : "Pareja" };
  };

  // Filtrar y agrupar los partidos por etapa en orden secuencial
  const bracketStages = useMemo(() => {
    const playoffMatches = matches.filter((m) => m.stage !== "zone");
    if (playoffMatches.length === 0) return [];

    // Detectar qué etapas existen
    const stageOrder = [
      "round_of_32",
      "round_of_16",
      "quarter",
      "semi",
      "final",
    ] as const;
    const stagesFound: (typeof stageOrder)[number][] = [];

    stageOrder.forEach((stg) => {
      const hasStage = playoffMatches.some(
        (m) => normalizeStage(m.stage) === stg
      );
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

  // Cálculo geométrico de las líneas que unen las instancias
  const updateLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    // Si hay zoom CSS, escala real entre bounding y offset
    const scale =
      container.offsetWidth > 0
        ? containerRect.width / container.offsetWidth
        : 1;

    const lines: BracketLinePath[] = [];

    for (let sIdx = 0; sIdx < bracketStages.length - 1; sIdx++) {
      const curStage = bracketStages[sIdx];
      const nextStage = bracketStages[sIdx + 1];

      for (let nextIdx = 0; nextIdx < nextStage.matches.length; nextIdx++) {
        const destMatch = nextStage.matches[nextIdx];
        const destEl = container.querySelector<HTMLElement>(
          `[data-bracket-card="${sIdx + 1}-${nextIdx}"]`
        );
        if (!destEl) continue;

        const destRect = destEl.getBoundingClientRect();
        const destX = (destRect.left - containerRect.left) / scale;
        const destY =
          (destRect.top + destRect.height / 2 - containerRect.top) / scale;

        let topMatch: (typeof curStage.matches)[0] | undefined;
        let botMatch: (typeof curStage.matches)[0] | undefined;
        let topIdx = -1;
        let botIdx = -1;

        if (curStage.stage === "round_of_32") {
          for (let m16Idx = 0; m16Idx < curStage.matches.length; m16Idx++) {
            const m16 = curStage.matches[m16Idx];
            const nextSlot = findNextPlayoffMatchSlot(matches, m16);
            if (nextSlot && nextSlot.targetMatchId === destMatch.id) {
              if (nextSlot.slotField === "couple1_id") {
                topMatch = m16;
                topIdx = m16Idx;
              } else {
                botMatch = m16;
                botIdx = m16Idx;
              }
            }
          }
        } else {
          topIdx = nextIdx * 2;
          botIdx = nextIdx * 2 + 1;
          topMatch = curStage.matches[topIdx];
          botMatch = curStage.matches[botIdx];
        }

        const topEl = topIdx >= 0
          ? container.querySelector<HTMLElement>(`[data-bracket-card="${sIdx}-${topIdx}"]`)
          : null;
        const botEl = botIdx >= 0
          ? container.querySelector<HTMLElement>(`[data-bracket-card="${sIdx}-${botIdx}"]`)
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

        const isTopWinnerAdvanced =
          topMatch?.winner_couple_id &&
          (destMatch?.couple1_id === topMatch.winner_couple_id ||
            destMatch?.couple2_id === topMatch.winner_couple_id);

        const isBotWinnerAdvanced =
          botMatch?.winner_couple_id &&
          (destMatch?.couple1_id === botMatch.winner_couple_id ||
            destMatch?.couple2_id === botMatch.winner_couple_id);

        if (topX !== null && topY !== null && botX !== null && botY !== null) {
          const startX = Math.max(topX, botX);
          const midX = startX + (destX - startX) / 2;
          const radius = Math.min(
            8,
            Math.max(0, Math.abs(destY - topY) / 2),
            Math.max(0, Math.abs(botY - destY) / 2),
            (destX - startX) / 4
          );

          // Trazo rama superior hacia el centro y partido destino
          const pathTop =
            radius >= 3
              ? `M ${topX} ${topY} L ${midX - radius} ${topY} Q ${midX} ${topY} ${midX} ${
                  topY + radius
                } L ${midX} ${destY - radius} Q ${midX} ${destY} ${
                  midX + radius
                } ${destY} L ${destX} ${destY}`
              : `M ${topX} ${topY} L ${midX} ${topY} L ${midX} ${destY} L ${destX} ${destY}`;

          // Trazo rama inferior hacia el centro y partido destino
          const pathBot =
            radius >= 3
              ? `M ${botX} ${botY} L ${midX - radius} ${botY} Q ${midX} ${botY} ${midX} ${
                  botY - radius
                } L ${midX} ${destY + radius} Q ${midX} ${destY} ${
                  midX + radius
                } ${destY} L ${destX} ${destY}`
              : `M ${botX} ${botY} L ${midX} ${botY} L ${midX} ${destY} L ${destX} ${destY}`;

          lines.push({
            id: `line-${sIdx}-${topIdx}-to-${sIdx + 1}-${nextIdx}`,
            d: pathTop,
            isHighlighted: !!isTopWinnerAdvanced,
          });

          lines.push({
            id: `line-${sIdx}-${botIdx}-to-${sIdx + 1}-${nextIdx}`,
            d: pathBot,
            isHighlighted: !!isBotWinnerAdvanced,
          });
        } else if (topX !== null && topY !== null) {
          const midX = topX + (destX - topX) / 2;
          lines.push({
            id: `line-${sIdx}-${topIdx}-to-${sIdx + 1}-${nextIdx}`,
            d: `M ${topX} ${topY} L ${midX} ${topY} L ${midX} ${destY} L ${destX} ${destY}`,
            isHighlighted: !!isTopWinnerAdvanced,
          });
        } else if (botX !== null && botY !== null) {
          const midX = botX + (destX - botX) / 2;
          lines.push({
            id: `line-${sIdx}-${botIdx}-to-${sIdx + 1}-${nextIdx}`,
            d: `M ${botX} ${botY} L ${midX} ${botY} L ${midX} ${destY} L ${destX} ${destY}`,
            isHighlighted: !!isBotWinnerAdvanced,
          });
        }
      }
    }

    setBracketLines(lines);
  }, [bracketStages]);

  // Recalcular líneas ante cambios de zoom, redimensionamiento o impresión
  useEffect(() => {
    updateLines();
    const tId = setTimeout(updateLines, 60);

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;

    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateLines();
      });
      observer.observe(container);
    }

    window.addEventListener("resize", updateLines);
    window.addEventListener("beforeprint", updateLines);

    return () => {
      clearTimeout(tId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateLines);
      window.removeEventListener("beforeprint", updateLines);
    };
  }, [updateLines, zoomLevel]);

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
    <div className="space-y-4 bracket-print-area">
      {/* Cabecera Exclusiva para Impresión en Hoja A4 Horizontal */}
      <div className="hidden print:block mb-4 text-center border-b-2 border-slate-700 pb-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">
          <span>SPT PÁDEL TOUR • CIRCUITO OFICIAL</span>
          <span>
            {new Date().toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
          {tournamentName || title}
        </h1>
        {categoryName && (
          <p className="text-xs font-bold text-slate-700 mt-0.5 uppercase tracking-wider">
            Categoría: {categoryName}
          </p>
        )}
      </div>

      {/* Encabezado en Pantalla con Controles de Zoom y Botón de Impresión */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900/90 p-4 rounded-xl border border-dark-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            {title}
          </h3>
          <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-dark-400">
          {/* Botón para Imprimir el Cuadro Completo en Hoja A4 */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300 font-bold text-xs transition-colors shadow-sm"
            title="Imprimir el cuadro completo de eliminación directa en hoja A4 horizontal"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Cuadro (A4)</span>
          </button>

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

      {/* Visor Gráfico de Llaves en Columnas con Líneas Conectoras y Zoom */}
      <div className="overflow-x-auto pb-6 pt-2 bracket-scroll-container">
        <div
          ref={containerRef}
          className="bracket-columns-container inline-flex gap-14 min-w-full px-4 items-stretch origin-top-left transition-all duration-150 relative"
          style={{
            zoom: zoomLevel,
          }}
        >
          {/* Capa SVG de Líneas Conectoras entre Instancias */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: "visible" }}
          >
            {bracketLines.map((line) => (
              <path
                key={line.id}
                d={line.d}
                fill="none"
                stroke={line.isHighlighted ? "#10b981" : "#475569"}
                strokeWidth={line.isHighlighted ? 2.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`bracket-connector-line transition-all duration-200 ${
                  line.isHighlighted ? "opacity-100" : "opacity-70"
                }`}
              />
            ))}
          </svg>

          {bracketStages.map((stageGroup, stageIdx) => {
            return (
              <div
                key={stageGroup.stage}
                className="flex flex-col min-w-[280px] sm:min-w-[320px] max-w-[340px] flex-shrink-0 relative z-10"
              >
                {/* Cabecera de la Ronda */}
                <div className="mb-4 text-center">
                  <span className="bracket-stage-badge inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-dark-800 text-sky-400 border border-dark-700">
                    {stageGroup.stageName}
                  </span>
                  <div className="text-[11px] text-dark-500 mt-1">
                    {stageGroup.matches.length}{" "}
                    {stageGroup.matches.length === 1 ? "partido" : "partidos"}
                  </div>
                </div>

                {/* Lista de partidos de la etapa distribuidos verticalmente */}
                <div className="flex flex-col justify-around flex-grow gap-6 relative">
                  {stageGroup.matches.map((m, matchIdx) => {
                    const isCompleted = m.status === "completed";
                    const isBye =
                      m.score_set1?.includes("BYE") ||
                      (!m.couple2_id && isCompleted);

                    const c1 = getCoupleLabel(m.couple1_id);
                    const c2 = isBye
                      ? { name: "BYE (Pase directo)", isBye: true }
                      : getCoupleLabel(m.couple2_id);

                    const isC1Winner =
                      isCompleted && m.winner_couple_id === m.couple1_id;
                    const isC2Winner =
                      isCompleted && !isBye && m.winner_couple_id === m.couple2_id;

                    const isClickable =
                      !isBye &&
                      !!m.couple1_id &&
                      !!m.couple2_id &&
                      Boolean(onMatchClick);

                    const scoreFormatted = [
                      m.score_set1,
                      m.score_set2,
                      m.score_super_tb,
                    ]
                      .filter(Boolean)
                      .join(" | ");

                    return (
                      <div
                        key={m.id}
                        data-bracket-card={`${stageIdx}-${matchIdx}`}
                        className="relative group z-10"
                      >
                        <div
                          className={`bracket-match-card rounded-xl border transition-all duration-200 shadow-md ${
                            isCompleted
                              ? "bg-dark-900/90 border-dark-700/80"
                              : "bg-dark-900/70 border-dark-800"
                          }`}
                        >
                          {/* Barra superior de partido */}
                          <div
                            onClick={() => {
                              if (isClickable && onMatchClick) {
                                onMatchClick(m);
                              }
                            }}
                            className={`bracket-match-header px-3 py-1.5 border-b border-dark-800/80 flex items-center justify-between text-[11px] bg-dark-950/40 rounded-t-xl ${
                              isClickable ? "cursor-pointer hover:bg-dark-800/60 transition-colors" : ""
                            }`}
                            title={isClickable ? "Clic para abrir opciones del partido" : undefined}
                          >
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

                          {/* Pareja 1: Tocar para elegir como ganadora y abrir campo de resultado */}
                          <div
                            onClick={(e) => {
                              if (isClickable && onMatchClick && m.couple1_id) {
                                e.stopPropagation();
                                onMatchClick(m, m.couple1_id);
                              }
                            }}
                            className={`bracket-couple-row p-2.5 flex items-center justify-between gap-2 border-b border-dark-800/60 transition-all select-none ${
                              isClickable && m.couple1_id
                                ? "cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-[0.99]"
                                : ""
                            } ${
                              isC1Winner
                                ? "bracket-row-winner bg-emerald-500/15 text-emerald-300 font-bold"
                                : m.couple1_id
                                ? "text-white"
                                : "text-dark-500 italic"
                            }`}
                            title={
                              isClickable && m.couple1_id
                                ? `Tocar para elegir a ${c1.name} como ganadora y anotar el resultado`
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isC1Winner ? (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              ) : isClickable && m.couple1_id ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-dark-600 group-hover:bg-emerald-400 flex-shrink-0 transition-colors" />
                              ) : null}
                              <span className="truncate text-xs font-medium">
                                {c1.name}
                              </span>
                            </div>
                            {isBye ? (
                              <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 flex-shrink-0">
                                SEMBRADA
                              </span>
                            ) : isClickable && m.couple1_id && !isC1Winner ? (
                              <span className="text-[10px] font-bold text-dark-400 hover:text-emerald-300 bg-dark-800/80 px-1.5 py-0.5 rounded border border-dark-700/80 flex items-center gap-1 flex-shrink-0 transition-colors">
                                <Trophy className="w-3 h-3 text-amber-400/80" />
                                Ganador
                              </span>
                            ) : null}
                          </div>

                          {/* Pareja 2: Tocar para elegir como ganadora y abrir campo de resultado */}
                          <div
                            onClick={(e) => {
                              if (isClickable && onMatchClick && m.couple2_id) {
                                e.stopPropagation();
                                onMatchClick(m, m.couple2_id);
                              }
                            }}
                            className={`bracket-couple-row p-2.5 flex items-center justify-between gap-2 rounded-b-xl transition-all select-none ${
                              isClickable && m.couple2_id
                                ? "cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-[0.99]"
                                : ""
                            } ${
                              isC2Winner
                                ? "bracket-row-winner bg-emerald-500/15 text-emerald-300 font-bold"
                                : isBye
                                ? "text-dark-500 italic text-[11px]"
                                : m.couple2_id
                                ? "text-white"
                                : "text-dark-500 italic"
                            }`}
                            title={
                              isClickable && m.couple2_id
                                ? `Tocar para elegir a ${c2.name} como ganadora y anotar el resultado`
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isC2Winner ? (
                                <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              ) : isClickable && m.couple2_id && !isBye ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-dark-600 group-hover:bg-emerald-400 flex-shrink-0 transition-colors" />
                              ) : null}
                              <span className="truncate text-xs font-medium">
                                {c2.name}
                              </span>
                            </div>
                            {isClickable && m.couple2_id && !isBye && !isC2Winner ? (
                              <span className="text-[10px] font-bold text-dark-400 hover:text-emerald-300 bg-dark-800/80 px-1.5 py-0.5 rounded border border-dark-700/80 flex items-center gap-1 flex-shrink-0 transition-colors">
                                <Trophy className="w-3 h-3 text-amber-400/80" />
                                Ganador
                              </span>
                            ) : null}
                          </div>

                          {/* Marcador si está finalizado */}
                          {scoreFormatted && !isBye && (
                            <div className="px-3 py-1 bg-dark-950/60 border-t border-dark-800/80 text-[11px] font-mono font-bold text-sky-400 flex items-center justify-between">
                              <span>Resultado:</span>
                              <span>{scoreFormatted}</span>
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
      </div>

      {/* Pie de Página Exclusivo para Impresión en Hoja A4 */}
      <div className="hidden print:flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-300 pt-2 mt-4 font-medium">
        <span>Cuadro Oficial de Eliminación Directa • Circuito SPT Pádel Tour</span>
        <span>www.sptpadeltour.com</span>
      </div>
    </div>
  );
}
