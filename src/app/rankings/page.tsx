import Card from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

export default function RankingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Rankings</h1>
        <p className="text-dark-400 mt-1">
          Clasificación acumulada de parejas y jugadores
        </p>
      </div>

      <Tabs defaultValue="parejas">
        <TabsList>
          <TabsTrigger value="parejas">Parejas</TabsTrigger>
          <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
        </TabsList>

        <TabsContent value="parejas">
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                    <th className="px-6 py-3 text-left">#</th>
                    <th className="px-6 py-3 text-left">Pareja</th>
                    <th className="px-6 py-3 text-center">Torneos</th>
                    <th className="px-6 py-3 text-center">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-amber-400 font-bold">1</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Juan Pérez &amp; Carlos López
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">5</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      420
                    </td>
                  </tr>
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-dark-300 font-bold">2</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Martín García &amp; Ana Silva
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">4</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      350
                    </td>
                  </tr>
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-dark-300 font-bold">3</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Pedro Ruiz &amp; Laura Díaz
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">3</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      280
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="jugadores">
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                    <th className="px-6 py-3 text-left">#</th>
                    <th className="px-6 py-3 text-left">Jugador</th>
                    <th className="px-6 py-3 text-center">Torneos</th>
                    <th className="px-6 py-3 text-center">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-amber-400 font-bold">1</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Juan Pérez
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">5</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      420
                    </td>
                  </tr>
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-dark-300 font-bold">2</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Carlos López
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">5</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      420
                    </td>
                  </tr>
                  <tr className="bg-dark-800">
                    <td className="px-6 py-4 text-dark-300 font-bold">3</td>
                    <td className="px-6 py-4 text-white font-medium">
                      Martín García
                    </td>
                    <td className="px-6 py-4 text-center text-dark-300">4</td>
                    <td className="px-6 py-4 text-center text-green-400 font-bold">
                      350
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
