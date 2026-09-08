"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Match, Pair } from "@/types/tournament";

interface MatchCardProps {
  match: Match;
  pair1?: Pair;
  pair2?: Pair;
  onEdit?: (match: Match) => void;
}

export default function MatchCard({ match, pair1, pair2, onEdit }: MatchCardProps) {
  const p1Name = pair1
    ? `${pair1.player1?.first_name} & ${pair1.player2?.first_name}`
    : "Por definir";
  const p2Name = pair2
    ? `${pair2.player1?.first_name} & ${pair2.player2?.first_name}`
    : "Por definir";

  const statusVariant = {
    pending: "default" as const,
    scheduled: "info" as const,
    in_progress: "warning" as const,
    completed: "success" as const,
  };

  const statusLabel = {
    pending: "Pendiente",
    scheduled: "Programado",
    in_progress: "En Juego",
    completed: "Finalizado",
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Badge variant={statusVariant[match.status]}>
          {statusLabel[match.status]}
        </Badge>
        {match.court && (
          <span className="text-dark-400 text-xs">{match.court}</span>
        )}
      </div>

      <div className="space-y-2">
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
            match.winner_id === match.pair1_id
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-dark-700"
          }`}
        >
          <span className="text-white text-sm font-medium truncate">{p1Name}</span>
          {match.score_pair1 && (
            <div className="flex gap-1 ml-2">
              {match.score_pair1.sets?.map((s, i) => (
                <span
                  key={i}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    s > (match.score_pair2?.sets?.[i] ?? 0)
                      ? "bg-green-500/20 text-green-400"
                      : "bg-dark-600 text-dark-300"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg ${
            match.winner_id === match.pair2_id
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-dark-700"
          }`}
        >
          <span className="text-white text-sm font-medium truncate">{p2Name}</span>
          {match.score_pair2 && (
            <div className="flex gap-1 ml-2">
              {match.score_pair2.sets?.map((s, i) => (
                <span
                  key={i}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    s > (match.score_pair1?.sets?.[i] ?? 0)
                      ? "bg-green-500/20 text-green-400"
                      : "bg-dark-600 text-dark-300"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {match.scheduled_at && (
        <p className="text-dark-500 text-xs mt-3">
          {new Date(match.scheduled_at).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {onEdit && match.status !== "completed" && (
        <button
          onClick={() => onEdit(match)}
          className="mt-3 text-blue-400 text-xs hover:text-blue-300 transition-colors"
        >
          Editar resultado
        </button>
      )}
    </Card>
  );
}
