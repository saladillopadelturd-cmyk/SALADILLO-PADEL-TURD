"use client";

import Card from "@/components/ui/Card";
import type { Match } from "@/types/tournament";
import { formatPlayerShortName } from "@/lib/tournament/couples";

interface ScheduleGridProps {
  matches: Match[];
  courts: string[];
  onUpdateMatch: (matchId: string, updates: Partial<Match>) => void;
}

export default function ScheduleGrid({
  matches,
  courts,
  onUpdateMatch: _onUpdateMatch,
}: ScheduleGridProps) {
  void _onUpdateMatch;
  const scheduledMatches = matches.filter((m) => m.scheduled_at);

  const groupedByDate = scheduledMatches.reduce(
    (acc, match) => {
      const date = new Date(match.scheduled_at!).toLocaleDateString("es-AR");
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    },
    {} as Record<string, Match[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dayMatches]) => (
        <div key={date}>
          <h4 className="text-white font-semibold mb-3">{date}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courts.map((court) => {
              const courtMatch = dayMatches.find((m) => m.court === court);
              return (
                <Card key={court} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-400 text-sm font-medium">
                      {court}
                    </span>
                    {courtMatch && (
                      <span className="text-dark-500 text-xs">
                        {new Date(courtMatch.scheduled_at!).toLocaleTimeString(
                           "es-AR",
                           { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                    )}
                  </div>
                  {courtMatch ? (
                    <div className="space-y-1">
                      <p className="text-white text-sm">
                        {courtMatch.pair1
                          ? `${formatPlayerShortName(courtMatch.pair1.player1)} / ${formatPlayerShortName(courtMatch.pair1.player2)}`
                          : "TBD"}
                      </p>
                      <p className="text-dark-500 text-xs text-center">vs</p>
                      <p className="text-white text-sm">
                        {courtMatch.pair2
                          ? `${formatPlayerShortName(courtMatch.pair2.player1)} / ${formatPlayerShortName(courtMatch.pair2.player2)}`
                          : "TBD"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-dark-600 text-sm text-center py-4">
                      Disponible
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(groupedByDate).length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-dark-400">
            No hay partidos programados aún. Asigná canchas y horarios desde el
            panel de admin.
          </p>
        </Card>
      )}
    </div>
  );
}
