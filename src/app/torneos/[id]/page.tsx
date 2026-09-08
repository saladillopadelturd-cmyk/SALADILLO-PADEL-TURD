"use client";

import { use } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

export default function TorneoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
          <Link href="/torneos" className="hover:text-white transition-colors">
            Torneos
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white">Detalle</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Torneo Demo</h1>
            <p className="text-dark-400 mt-1">15 de Diciembre, 2026</p>
          </div>
          <Badge variant="success">Activo</Badge>
        </div>
      </div>

      <Tabs defaultValue="zonas">
        <TabsList>
          <TabsTrigger value="zonas">Zonas</TabsTrigger>
          <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="zonas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Zona A</h3>
              <div className="space-y-3">
                {["Pareja 1", "Pareja 2", "Pareja 3", "Pareja 4"].map(
                  (name, i) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-dark-500 text-sm w-6">{i + 1}°</span>
                        <span className="text-white text-sm">{name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-dark-400">
                        <span>PJ: 3</span>
                        <span>PG: 2</span>
                        <span className="text-green-400">Pts: 4</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Zona B</h3>
              <div className="space-y-3">
                {["Pareja 5", "Pareja 6", "Pareja 7", "Pareja 8"].map(
                  (name, i) => (
                    <div
                      key={name}
                      className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-dark-500 text-sm w-6">{i + 1}°</span>
                        <span className="text-white text-sm">{name}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-dark-400">
                        <span>PJ: 3</span>
                        <span>PG: 1</span>
                        <span className="text-green-400">Pts: 2</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="playoffs">
          <div className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Cuadro Eliminatorio
              </h3>
              <p className="text-dark-400 text-sm">
                El cuadro de eliminatoria se generará automáticamente cuando
                finalice la fase de zonas.
              </p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings">
          <div className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                Rankings del Torneo
              </h3>
              <p className="text-dark-400 text-sm">
                Los rankings se actualizarán al finalizar el torneo.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
