"use client";

import Card from "@/components/ui/Card";
import { Trophy, Award, ChevronRight, Flame, Star, Zap, Shield, Medal, Sparkles } from "lucide-react";

export interface BracketMatch {
  id?: string;
  pair1: string;
  pair2: string;
  winner?: string;
  score?: string;
  status?: string;
}

export interface BracketRound {
  round: string;
  matches: BracketMatch[];
}

export interface BracketProps {
  rounds: BracketRound[];
  pairNames: Record<string, string>;
  onMatchClick?: (matchId: string, winningPairId?: string, match?: BracketMatch) => void;
  isAdmin?: boolean;
}

interface StageTheme {
  title: string;
  subtitle: string;
  icon: typeof Trophy;
  // Fondo y bordes de la columna completa de la instancia
  columnBg: string;
  columnBorder: string;
  columnGlow: string;
  // Badge de cabecera de la ronda
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeShadow?: string;
  // Tarjeta de partido dentro de la columna
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  // Conector de avance
  connectorColor: string;
}

const STAGE_THEMES: Record<string, StageTheme> = {
  // 16avos de Final (Dieciseisavos) - Azul Marino / Índigo
  dieciseisavos: {
    title: "16avos de Final",
    subtitle: "Ronda Inicial",
    icon: Shield,
    columnBg: "bg-gradient-to-b from-indigo-950/70 via-indigo-950/30 to-dark-950/80",
    columnBorder: "border-indigo-500/35",
    columnGlow: "shadow-indigo-500/10",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/40",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-indigo-500/30",
    cardHoverBorder: "hover:border-indigo-400/60",
    connectorColor: "from-indigo-500/50 to-sky-500/50",
  },
  round_of_32: {
    title: "16avos de Final",
    subtitle: "Ronda Inicial",
    icon: Shield,
    columnBg: "bg-gradient-to-b from-indigo-950/70 via-indigo-950/30 to-dark-950/80",
    columnBorder: "border-indigo-500/35",
    columnGlow: "shadow-indigo-500/10",
    badgeBg: "bg-indigo-500/20",
    badgeText: "text-indigo-300",
    badgeBorder: "border-indigo-500/40",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-indigo-500/30",
    cardHoverBorder: "hover:border-indigo-400/60",
    connectorColor: "from-indigo-500/50 to-sky-500/50",
  },

  // Octavos de Final - Celeste / Sky Deportivo
  octavos: {
    title: "Octavos de Final",
    subtitle: "Ronda de Octavos",
    icon: Zap,
    columnBg: "bg-gradient-to-b from-sky-950/70 via-sky-950/30 to-dark-950/80",
    columnBorder: "border-sky-500/35",
    columnGlow: "shadow-sky-500/10",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-500/40",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-sky-500/30",
    cardHoverBorder: "hover:border-sky-400/60",
    connectorColor: "from-sky-500/50 to-purple-500/50",
  },
  round_of_16: {
    title: "Octavos de Final",
    subtitle: "Ronda de Octavos",
    icon: Zap,
    columnBg: "bg-gradient-to-b from-sky-950/70 via-sky-950/30 to-dark-950/80",
    columnBorder: "border-sky-500/35",
    columnGlow: "shadow-sky-500/10",
    badgeBg: "bg-sky-500/20",
    badgeText: "text-sky-300",
    badgeBorder: "border-sky-500/40",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-sky-500/30",
    cardHoverBorder: "hover:border-sky-400/60",
    connectorColor: "from-sky-500/50 to-purple-500/50",
  },

  // Cuartos de Final - Violeta / Púrpura Eléctrico
  cuartos: {
    title: "Cuartos de Final",
    subtitle: "Rumbo a las Semis",
    icon: Flame,
    columnBg: "bg-gradient-to-b from-purple-950/75 via-purple-950/35 to-dark-950/80",
    columnBorder: "border-purple-500/40",
    columnGlow: "shadow-purple-500/15",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-purple-500/30",
    cardHoverBorder: "hover:border-purple-400/60",
    connectorColor: "from-purple-500/50 to-emerald-500/50",
  },
  quarter: {
    title: "Cuartos de Final",
    subtitle: "Rumbo a las Semis",
    icon: Flame,
    columnBg: "bg-gradient-to-b from-purple-950/75 via-purple-950/35 to-dark-950/80",
    columnBorder: "border-purple-500/40",
    columnGlow: "shadow-purple-500/15",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-purple-500/30",
    cardHoverBorder: "hover:border-purple-400/60",
    connectorColor: "from-purple-500/50 to-emerald-500/50",
  },

  // Semifinales - Verde Pádel / Esmeralda Eléctrico
  semifinal: {
    title: "Semifinales",
    subtitle: "Paso Previo a la Gran Final",
    icon: Star,
    columnBg: "bg-gradient-to-b from-emerald-950/75 via-emerald-950/35 to-dark-950/80",
    columnBorder: "border-emerald-500/40",
    columnGlow: "shadow-emerald-500/15",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-emerald-500/30",
    cardHoverBorder: "hover:border-emerald-400/60",
    connectorColor: "from-emerald-500/50 to-amber-500/50",
  },
  semi: {
    title: "Semifinales",
    subtitle: "Paso Previo a la Gran Final",
    icon: Star,
    columnBg: "bg-gradient-to-b from-emerald-950/75 via-emerald-950/35 to-dark-950/80",
    columnBorder: "border-emerald-500/40",
    columnGlow: "shadow-emerald-500/15",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-emerald-500/30",
    cardHoverBorder: "hover:border-emerald-400/60",
    connectorColor: "from-emerald-500/50 to-amber-500/50",
  },

  // Gran Final - Oro Trofeo / Ámbar Brillante
  final: {
    title: "Gran Final",
    subtitle: "Definición del Campeonato",
    icon: Trophy,
    columnBg: "bg-gradient-to-b from-amber-950/85 via-amber-950/50 to-dark-950/90",
    columnBorder: "border-amber-400/50 ring-1 ring-amber-400/25",
    columnGlow: "shadow-2xl shadow-amber-500/20",
    badgeBg: "bg-amber-400/25",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-400/50",
    badgeShadow: "shadow-md shadow-amber-400/30",
    cardBg: "bg-dark-900/95",
    cardBorder: "border-amber-400/50",
    cardHoverBorder: "hover:border-amber-300",
    connectorColor: "from-amber-500/50 to-amber-400/50",
  },

  // 3° y 4° Puesto - Bronce / Naranja Cálido
  tercer_puesto: {
    title: "3° y 4° Puesto",
    subtitle: "Duelo por el Podio",
    icon: Medal,
    columnBg: "bg-gradient-to-b from-orange-950/75 via-orange-950/35 to-dark-950/80",
    columnBorder: "border-orange-500/40",
    columnGlow: "shadow-orange-500/15",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    badgeBorder: "border-orange-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-orange-500/30",
    cardHoverBorder: "hover:border-orange-400/60",
    connectorColor: "from-orange-500/50 to-orange-400/50",
  },
  third_place: {
    title: "3° y 4° Puesto",
    subtitle: "Duelo por el Podio",
    icon: Medal,
    columnBg: "bg-gradient-to-b from-orange-950/75 via-orange-950/35 to-dark-950/80",
    columnBorder: "border-orange-500/40",
    columnGlow: "shadow-orange-500/15",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    badgeBorder: "border-orange-500/45",
    cardBg: "bg-dark-900/90",
    cardBorder: "border-orange-500/30",
    cardHoverBorder: "hover:border-orange-400/60",
    connectorColor: "from-orange-500/50 to-orange-400/50",
  },
};

const DEFAULT_STAGE_THEME: StageTheme = {
  title: "Eliminatoria",
  subtitle: "Ronda de Playoff",
  icon: Award,
  columnBg: "bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-dark-950/80",
  columnBorder: "border-slate-700/50",
  columnGlow: "shadow-slate-700/10",
  badgeBg: "bg-dark-800",
  badgeText: "text-dark-300",
  badgeBorder: "border-dark-700",
  cardBg: "bg-dark-900/90",
  cardBorder: "border-dark-700/80",
  cardHoverBorder: "hover:border-dark-500",
  connectorColor: "from-dark-600 to-dark-700",
};

function getStageTheme(roundKey: string): StageTheme {
  const normalizedKey = roundKey.toLowerCase().trim();
  
  if (normalizedKey.includes('dieciseis') || normalizedKey.includes('16avos') || normalizedKey.includes('32')) return STAGE_THEMES.dieciseisavos;
  if (normalizedKey.includes('octavo') || normalizedKey.includes('16')) return STAGE_THEMES.octavos;
  if (normalizedKey.includes('cuarto') || normalizedKey.includes('quarter')) return STAGE_THEMES.cuartos;
  if (normalizedKey.includes('semi')) return STAGE_THEMES.semifinal;
  if (normalizedKey.includes('final')) return STAGE_THEMES.final;
  if (normalizedKey.includes('tercer') || normalizedKey.includes('3')) return STAGE_THEMES.tercer_puesto;

  return STAGE_THEMES[normalizedKey] ?? DEFAULT_STAGE_THEME;
}

export default function Bracket({ rounds, pairNames, onMatchClick, isAdmin }: BracketProps) {
  const canInteract = isAdmin !== false && Boolean(onMatchClick);

  if (!rounds || rounds.length === 0) {
    return (
      <div className="text-center py-10 text-dark-400 text-sm">
        No hay partidos de eliminación disponibles.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Indicador de ayuda */}
      {canInteract && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-dark-900 to-dark-950 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong>Carga rápida de resultados:</strong> Hacé clic sobre la <strong>pareja ganadora</strong> de cualquier partido para anotar el resultado. La pareja ganadora se pintará de <strong className="text-emerald-400">verde</strong>, la perdedora de <strong className="text-rose-400">rojo</strong> y avanzará automáticamente a la próxima instancia del cuadro.
          </span>
        </div>
      )}

      {/* Mobile Swipe Hint */}
      <div className="flex items-center justify-between text-xs text-dark-400 mb-3 px-1 sm:hidden">
        <span className="flex items-center gap-1 font-medium">
          <ChevronRight className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Deslizá para ver el cuadro completo
        </span>
        <span className="text-[11px] text-dark-500">Playoffs SPT</span>
      </div>

      {/* Horizontal Scrollable Tree Container */}
      <div className="overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-dark-700">
        <div className="flex gap-4 sm:gap-6 min-w-max items-stretch px-1">
          {rounds.map((round, roundIndex) => {
            const isFinal =
              round.round.toLowerCase().includes("final") &&
              !round.round.toLowerCase().includes("semi") &&
              !round.round.toLowerCase().includes("cuarto") &&
              !round.round.toLowerCase().includes("octavo") &&
              !round.round.toLowerCase().includes("dieciseis");
            const theme = getStageTheme(round.round);
            const Icon = theme.icon;
            const roundTitle = theme.title;

            return (
              <div key={round.round} className="flex items-center">
                {/* Columna completa con color de fondo personalizado por instancia */}
                <div
                  className={`flex flex-col relative rounded-2xl border p-4 sm:p-5 transition-all w-72 sm:w-80 flex-shrink-0 shadow-xl backdrop-blur-md ${theme.columnBg} ${theme.columnBorder} ${theme.columnGlow}`}
                >
                  {/* Cabecera de la Instancia */}
                  <div className="mb-5 text-center">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} ${theme.badgeShadow ?? ""}`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{roundTitle}</span>
                    </div>
                    <p className="text-[11px] text-dark-400 mt-1 font-medium">
                      {round.matches.length === 1
                        ? isFinal
                          ? "Definición del Campeonato"
                          : "1 Partido Decisivo"
                        : `${round.matches.length} Partidos`}
                    </p>
                  </div>

                  {/* Lista de partidos en la columna */}
                  <div
                    className="flex flex-col justify-around gap-5 flex-1 relative py-1"
                    style={{
                      minHeight: `${Math.max(1, round.matches.length) * 140}px`,
                    }}
                  >
                    {round.matches.map((match, matchIndex) => {
                      const hasWinner = Boolean(match.winner && match.winner !== "BYE");
                      const isP1Winner = Boolean(hasWinner && match.winner === match.pair1);
                      const isP2Winner = Boolean(hasWinner && match.winner === match.pair2);
                      const p1DisplayName = pairNames[match.pair1] ?? match.pair1;
                      const p2DisplayName = pairNames[match.pair2] ?? match.pair2;

                      const isP1Pending = match.pair1 === "Por definir" || p1DisplayName === "Por definir";
                      const isP2Pending = match.pair2 === "Por definir" || p2DisplayName === "Por definir";

                      const isP1Loser = Boolean(hasWinner && !isP1Winner && !isP1Pending && match.pair1 !== "BYE");
                      const isP2Loser = Boolean(hasWinner && !isP2Winner && !isP2Pending && match.pair2 !== "BYE");

                      const matchIdentifier = match.id || `proj_${round.round}_${matchIndex}_${match.pair1}_${match.pair2}`;

                      const isP1Clickable = Boolean(
                        canInteract &&
                        !isP1Pending &&
                        !isP2Pending &&
                        match.pair1 !== "BYE" &&
                        match.pair2 !== "BYE"
                      );

                      const isP2Clickable = Boolean(
                        canInteract &&
                        !isP1Pending &&
                        !isP2Pending &&
                        match.pair1 !== "BYE" &&
                        match.pair2 !== "BYE"
                      );

                      const isMatchClickable = isP1Clickable || isP2Clickable;

                      return (
                        <div key={`${round.round}_${matchIndex}`} className="relative flex items-center">
                          <Card
                            onClick={() => {
                              if (isMatchClickable && onMatchClick) {
                                onMatchClick(matchIdentifier, match.winner || match.pair1, match);
                              }
                            }}
                            className={`p-3.5 w-full border transition-all relative z-10 ${
                              isMatchClickable ? "cursor-pointer hover:border-emerald-400/60 hover:scale-[1.01] active:scale-[0.99]" : ""
                            } ${
                              isFinal && match.winner
                                ? "border-amber-400/70 bg-dark-900/95 shadow-xl shadow-amber-400/20"
                                : `${theme.cardBorder} ${theme.cardBg} ${theme.cardHoverBorder} shadow-lg`
                            }`}
                          >
                            {/* Pareja 1 */}
                            <div
                              onClick={(e) => {
                                if (isP1Clickable && onMatchClick) {
                                  e.stopPropagation();
                                  onMatchClick(matchIdentifier, match.pair1, match);
                                }
                              }}
                              title={
                                isP1Clickable
                                  ? "Hacé clic para marcar a esta pareja como ganadora y anotar el resultado"
                                  : undefined
                              }
                              className={`group/p1 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all mb-1.5 ${
                                isP1Winner
                                  ? "bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500/80 font-bold shadow-md shadow-emerald-500/20"
                                  : isP1Loser
                                  ? "bg-rose-500/20 text-rose-300 border-2 border-rose-500/60 font-medium shadow-sm shadow-rose-500/10"
                                  : isP1Pending
                                  ? "bg-dark-950/40 text-dark-400 italic font-normal border border-dark-800/50"
                                  : `bg-dark-950/70 text-slate-200 border border-dark-800 ${
                                      isP1Clickable
                                        ? "hover:bg-emerald-500/15 hover:border-emerald-400/70 hover:text-emerald-200 cursor-pointer"
                                        : ""
                                    }`
                              } ${isP1Clickable && (isP1Winner || isP1Loser) ? "cursor-pointer hover:opacity-95 hover:scale-[1.01]" : ""}`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                {isP1Winner ? (
                                  <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                ) : isP1Loser ? (
                                  <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                                ) : isP1Clickable ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400/40 group-hover/p1:bg-emerald-400 flex-shrink-0 transition-colors" />
                                ) : null}
                                <span className="truncate">{p1DisplayName}</span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isP1Winner && (
                                  <span className="scoreboard-digit text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                    GANADOR
                                  </span>
                                )}
                                {isP1Loser && (
                                  <span className="scoreboard-digit text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                                    ELIMINADO
                                  </span>
                                )}
                                {!hasWinner && isP1Clickable && (
                                  <span className="opacity-0 group-hover/p1:opacity-100 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 transition-opacity">
                                    Elegir Ganador
                                  </span>
                                )}
                                {match.score && isP1Winner && (
                                  <span className="scoreboard-digit text-xs font-mono font-bold text-emerald-400 flex-shrink-0">
                                    VICTORIA
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Pareja 2 */}
                            <div
                              onClick={(e) => {
                                if (isP2Clickable && onMatchClick) {
                                  e.stopPropagation();
                                  onMatchClick(matchIdentifier, match.pair2, match);
                                }
                              }}
                              title={
                                isP2Clickable
                                  ? "Hacé clic para marcar a esta pareja como ganadora y anotar el resultado"
                                  : undefined
                              }
                              className={`group/p2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                isP2Winner
                                  ? "bg-emerald-500/25 text-emerald-300 border-2 border-emerald-500/80 font-bold shadow-md shadow-emerald-500/20"
                                  : isP2Loser
                                  ? "bg-rose-500/20 text-rose-300 border-2 border-rose-500/60 font-medium shadow-sm shadow-rose-500/10"
                                  : isP2Pending
                                  ? "bg-dark-950/40 text-dark-400 italic font-normal border border-dark-800/50"
                                  : `bg-dark-950/70 text-slate-200 border border-dark-800 ${
                                      isP2Clickable
                                        ? "hover:bg-emerald-500/15 hover:border-emerald-400/70 hover:text-emerald-200 cursor-pointer"
                                        : ""
                                    }`
                              } ${isP2Clickable && (isP2Winner || isP2Loser) ? "cursor-pointer hover:opacity-95 hover:scale-[1.01]" : ""}`}
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                {isP2Winner ? (
                                  <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                ) : isP2Loser ? (
                                  <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                                ) : isP2Clickable ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400/40 group-hover/p2:bg-emerald-400 flex-shrink-0 transition-colors" />
                                ) : null}
                                <span className="truncate">{p2DisplayName}</span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isP2Winner && (
                                  <span className="scoreboard-digit text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                                    GANADOR
                                  </span>
                                )}
                                {isP2Loser && (
                                  <span className="scoreboard-digit text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                                    ELIMINADO
                                  </span>
                                )}
                                {!hasWinner && isP2Clickable && (
                                  <span className="opacity-0 group-hover/p2:opacity-100 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 transition-opacity">
                                    Elegir Ganador
                                  </span>
                                )}
                                {match.score && isP2Winner && (
                                  <span className="scoreboard-digit text-xs font-mono font-bold text-emerald-400 flex-shrink-0">
                                    VICTORIA
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Resultado del Partido */}
                            {match.score && (
                              <div className="mt-2.5 pt-2 border-t border-dark-800/80 flex items-center justify-between text-[11px]">
                                <span className="text-dark-400 font-medium">Resultado:</span>
                                <span className="scoreboard-digit font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {match.score}
                                </span>
                              </div>
                            )}

                            {/* Indicador de acción para el administrador */}
                            {isMatchClickable && (
                              <div className="mt-2 pt-1.5 border-t border-dark-800/80 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                                <span>{match.status === "completed" ? "Modificar marcador" : "Hacé clic en el ganador para anotar marcador"}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* Banner de Campeones si es la Final y finalizó */}
                            {isFinal && match.winner && (
                              <div className="mt-2.5 pt-2 border-t border-amber-400/30 flex items-center justify-center gap-1.5 text-xs font-black text-amber-300 bg-amber-400/15 py-1.5 rounded-lg shadow-sm">
                                <Award className="w-4 h-4 text-amber-400" />
                                <span>¡CAMPEONES DEL TORNEO!</span>
                              </div>
                            )}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Indicador conector entre rondas */}
                {roundIndex < rounds.length - 1 && (
                  <div className="hidden sm:flex items-center justify-center px-1.5 sm:px-2 z-20 self-center text-dark-500">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-dark-900 border border-dark-700/80 text-dark-400 shadow-md">
                      <ChevronRight className="w-4 h-4 text-dark-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
