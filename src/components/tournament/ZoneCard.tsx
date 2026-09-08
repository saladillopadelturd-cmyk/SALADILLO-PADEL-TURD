import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface ZoneCardProps {
  zoneName: string;
  zoneNumber: number;
  standings: {
    position: number;
    pairName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    setsWon: number;
    setsLost: number;
    gamesWon: number;
    gamesLost: number;
    points: number;
  }[];
}

export default function ZoneCard({ zoneName, zoneNumber, standings }: ZoneCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 bg-dark-900 border-b border-dark-700 flex items-center justify-between">
        <h3 className="text-white font-bold">{zoneName}</h3>
        <Badge variant="info">Zona {zoneNumber}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-400 text-xs uppercase">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Pareja</th>
              <th className="px-4 py-2 text-center">PJ</th>
              <th className="px-4 py-2 text-center">PG</th>
              <th className="px-4 py-2 text-center">PP</th>
              <th className="px-4 py-2 text-center">Sets</th>
              <th className="px-4 py-2 text-center">Games</th>
              <th className="px-4 py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {standings.map((s, i) => (
              <tr
                key={i}
                className={`${
                  i < standings.length - 1
                    ? "bg-dark-800"
                    : "bg-red-500/5"
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-bold ${
                      i === 0
                        ? "text-amber-400"
                        : i < standings.length - 1
                          ? "text-dark-300"
                          : "text-red-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-3 text-white font-medium">{s.pairName}</td>
                <td className="px-4 py-3 text-center text-dark-300">{s.matchesPlayed}</td>
                <td className="px-4 py-3 text-center text-green-400">{s.matchesWon}</td>
                <td className="px-4 py-3 text-center text-red-400">{s.matchesLost}</td>
                <td className="px-4 py-3 text-center text-dark-300">
                  {s.setsWon}-{s.setsLost}
                </td>
                <td className="px-4 py-3 text-center text-dark-300">
                  {s.gamesWon}-{s.gamesLost}
                </td>
                <td className="px-4 py-3 text-center text-blue-400 font-bold">
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
