"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Match, Pair } from "@/types/tournament";
import { Trophy, Clock, MapPin, Edit3 } from "lucide-react";
import { formatPlayerShortName } from "@/lib/tournament/couples";

interface MatchCardProps {
  match: Match;
  pair1?: Pair;
  pair2?: Pair;
  hasGoldenPoint?: boolean;
  onEdit?: (match: Match) => void;
}

export default function MatchCard({
  match,
  pair1,
  pair2,
  hasGoldenPoint = true,
  onEdit,
}: MatchCardProps) {
  // Resolve pair 1 name con formato abreviado "I. Apellido"
  const p1 = pair1 || match.couple1 || match.pair1;
  const p1Name = p1?.player1 && p1?.player2
    ? `${formatPlayerShortName(p1.player1)} / ${formatPlayerShortName(p1.player2)}`
    : p1?.player1
    ? `${formatPlayerShortName(p1.player1)} / Pareja`
    : "Por definir";

  // Resolve pair 2 name con formato abreviado "I. Apellido"
  const p2 = pair2 || match.couple2 || match.pair2;
  const p2Name = p2?.player1 && p2?.player2
    ? `${formatPlayerShortName(p2.player1)} / ${formatPlayerShortName(p2.player2)}`
    : p2?.player1
    ? `${formatPlayerShortName(p2.player1)} / Pareja`
    : "Por definir";

  const isLive = match.status === "in_progress";
  const isCompleted = match.status === "completed";
  const isP1Winner =
    (match.winner_id && (match.winner_id === match.pair1_id || match.winner_id === match.couple1_id)) ||
    (match.winner_couple_id && (match.winner_couple_id === match.couple1_id || match.winner_couple_id === match.pair1_id));
  const isP2Winner =
    (match.winner_id && (match.winner_id === match.pair2_id || match.winner_id === match.couple2_id)) ||
    (match.winner_couple_id && (match.winner_couple_id === match.couple2_id || match.winner_couple_id === match.pair2_id));

  // Extract set scores
  let p1Sets: (number | string)[] = [];
  let p2Sets: (number | string)[] = [];

  if (match.score_pair1?.sets && match.score_pair2?.sets) {
    p1Sets = match.score_pair1.sets;
    p2Sets = match.score_pair2.sets;
  } else if (match.score_set1 || match.score_set2) {
    if (match.score_set1) {
      const parts = match.score_set1.split("-");
      if (parts.length === 2) {
        p1Sets.push(parts[0].trim());
        p2Sets.push(parts[1].trim());
      }
    }
    if (match.score_set2) {
      const parts = match.score_set2.split("-");
      if (parts.length === 2) {
        p1Sets.push(parts[0].trim());
        p2Sets.push(parts[1].trim());
      }
    }
    if (match.score_super_tb) {
      const parts = match.score_super_tb.split("-");
      if (parts.length === 2) {
        p1Sets.push(`(${parts[0].trim()})`);
        p2Sets.push(`(${parts[1].trim()})`);
      }
    }
  }

  const court = match.court || match.court_name;
  const matchTime = match.scheduled_at || match.scheduled_time;

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        isLive
          ? "border-rose-500/60 bg-gradient-to-b from-rose-950/20 via-dark-900/90 to-dark-900/95 shadow-lg shadow-rose-950/30"
          : isCompleted
          ? "border-dark-700/60 bg-dark-900/80"
          : "border-dark-700/80 bg-dark-900/90"
      }`}
    >
      {/* Header: Status & Court info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isLive ? (
            <Badge variant="live" pulse size="sm">
              EN JUEGO
            </Badge>
          ) : isCompleted ? (
            <Badge variant="default" size="sm">
              Finalizado
            </Badge>
          ) : (
            <Badge variant="info" size="sm">
              Programado
            </Badge>
          )}

          {hasGoldenPoint && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
              <span>⭐</span> Pto de Oro
            </span>
          )}
        </div>

        {court && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            <MapPin className="w-3 h-3" />
            {court}
          </span>
        )}
      </div>

      {/* Electronic Scoreboard Box */}
      <div className="space-y-2 bg-dark-950/70 p-2.5 rounded-xl border border-dark-800">
        {/* Pair 1 */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            isP1Winner
              ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10"
              : "bg-dark-850/80 text-white border border-dark-700/40"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {isP1Winner && (
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold truncate tracking-tight">
              {p1Name}
            </span>
          </div>

          {/* Digital Scoreboard Numbers */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {p1Sets.length > 0 ? (
              p1Sets.map((score, idx) => {
                const s1 = Number(score);
                const s2 = Number(p2Sets[idx]);
                const isWonSet = !isNaN(s1) && !isNaN(s2) && s1 > s2;
                return (
                  <span
                    key={idx}
                    className={`scoreboard-digit px-2.5 py-1 rounded-md text-sm font-black border ${
                      isWonSet
                        ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                        : "bg-dark-900 border-dark-700 text-slate-300"
                    }`}
                  >
                    {score}
                  </span>
                );
              })
            ) : (
              <span className="scoreboard-digit px-2.5 py-1 rounded-md text-sm font-bold bg-dark-900/60 border border-dark-800 text-dark-500">
                -
              </span>
            )}
          </div>
        </div>

        {/* Pair 2 */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
            isP2Winner
              ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10"
              : "bg-dark-850/80 text-white border border-dark-700/40"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {isP2Winner && (
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-semibold truncate tracking-tight">
              {p2Name}
            </span>
          </div>

          {/* Digital Scoreboard Numbers */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {p2Sets.length > 0 ? (
              p2Sets.map((score, idx) => {
                const s1 = Number(p1Sets[idx]);
                const s2 = Number(score);
                const isWonSet = !isNaN(s1) && !isNaN(s2) && s2 > s1;
                return (
                  <span
                    key={idx}
                    className={`scoreboard-digit px-2.5 py-1 rounded-md text-sm font-black border ${
                      isWonSet
                        ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                        : "bg-dark-900 border-dark-700 text-slate-300"
                    }`}
                  >
                    {score}
                  </span>
                );
              })
            ) : (
              <span className="scoreboard-digit px-2.5 py-1 rounded-md text-sm font-bold bg-dark-900/60 border border-dark-800 text-dark-500">
                -
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Schedule & Actions */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-dark-800/80 text-xs">
        {matchTime ? (
          <span className="flex items-center gap-1 text-dark-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-dark-500" />
            {new Date(matchTime).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : (
          <span className="text-dark-500">Horario por confirmar</span>
        )}

        {onEdit && !isCompleted && (
          <button
            type="button"
            onClick={() => onEdit(match)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Cargar tanteo
          </button>
        )}
      </div>
    </Card>
  );
}

