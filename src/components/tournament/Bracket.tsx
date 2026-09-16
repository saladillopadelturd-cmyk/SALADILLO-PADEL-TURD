"use client";

import Card from "@/components/ui/Card";
import { Trophy, Award, ChevronRight, Flame, Star, Zap, Shield, Medal } from "lucide-react";

interface BracketRound {
  round: string;
  matches: {
    pair1: string;
    pair2: string;
    winner?: string;
    score?: string;
  }[];
}

interface BracketProps {
  rounds: BracketRound[];
  pairNames: Record<string, string>;
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

export default function Bracket({ rounds, pairNames }: BracketProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <div className="text-center py-10 text-dark-400 text-sm">
        No hay partidos de eliminación disponibles.
      </div>
    );
  }

  return (
    <div className="relative">
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
                      const isP1Winner = match.winner && match.winner === match.pair1;
                      const isP2Winner = match.winner && match.winner === match.pair2;
                      const p1DisplayName = pairNames[match.pair1] ?? match.pair1;
                      const p2DisplayName = pairNames[match.pair2] ?? match.pair2;

                      const isP1Pending = match.pair1 === "Por definir" || p1DisplayName === "Por definir";
                      const isP2Pending = match.pair2 === "Por definir" || p2DisplayName === "Por definir";

                      return (
                        <div key={`${round.round}_${matchIndex}`} className="relative flex items-center">
                          <Card
                            className={`p-3.5 w-full border transition-all relative z-10 ${
                              isFinal && match.winner
                                ? "border-amber-400/70 bg-dark-900/95 shadow-xl shadow-amber-400/20"
                                : `${theme.cardBorder} ${theme.cardBg} ${theme.cardHoverBorder} shadow-lg`
                            }`}
                          >
                            {/* Pareja 1 */}
                            <div
                              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors mb-1.5 ${
                                isP1Winner
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                                  : isP1Pending
                                  ? "bg-dark-950/40 text-dark-400 italic font-normal border border-dark-800/50"
                                  : "bg-dark-950/70 text-slate-200 border border-dark-800"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate pr-2">
                                {isP1Winner && (
                                  <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{p1DisplayName}</span>
                              </div>
                              {match.score && (
                                <span className="scoreboard-digit text-xs font-mono font-bold text-dark-300 flex-shrink-0">
                                  {isP1Winner ? "VICTORIA" : ""}
                                </span>
                              )}
                            </div>

                            {/* Pareja 2 */}
                            <div
                              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                                isP2Winner
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                                  : isP2Pending
                                  ? "bg-dark-950/40 text-dark-400 italic font-normal border border-dark-800/50"
                                  : "bg-dark-950/70 text-slate-200 border border-dark-800"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate pr-2">
                                {isP2Winner && (
                                  <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{p2DisplayName}</span>
                              </div>
                              {match.score && (
                                <span className="scoreboard-digit text-xs font-mono font-bold text-dark-300 flex-shrink-0">
                                  {isP2Winner ? "VICTORIA" : ""}
                                </span>
                              )}
                            </div>

                            {/* Resultado del Partido */}
                            {match.score && (
                              <div className="mt-2 pt-1.5 border-t border-dark-800/80 flex items-center justify-between text-[11px]">
                                <span className="text-dark-400 font-medium">Resultado:</span>
                                <span className="scoreboard-digit font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {match.score}
                                </span>
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
