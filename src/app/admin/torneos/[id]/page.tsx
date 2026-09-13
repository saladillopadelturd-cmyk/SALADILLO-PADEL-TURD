"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function AdminTorneoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = use(params);
  void _id;
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = () => {
    setShowDelete(false);
    router.push("/admin/torneos");
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-dark-400 text-sm mb-2">
        <Link href="/admin/torneos" className="hover:text-white transition-colors">
          Torneos
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-white">Detalle</span>
      </div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Torneo Demo</h1>
          <p className="text-dark-400 mt-1">Configuración y gestión</p>
        </div>
        <Badge variant="success">Activo</Badge>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configurar</TabsTrigger>
          <TabsTrigger value="zonas">Zonas</TabsTrigger>
          <TabsTrigger value="fixture">Fixture</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Configuración del Torneo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-dark-400 mb-1">Nombre</label>
                <p className="text-white font-medium">Torneo Demo</p>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Fecha</label>
                <p className="text-white font-medium">15 de Diciembre, 2026</p>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Modalidad</label>
                <p className="text-white font-medium">Americano 9 games</p>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Zonas</label>
                <p className="text-white font-medium">4 zonas de 4 parejas</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-dark-700">
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                Eliminar Torneo
              </Button>
              <p className="text-dark-500 text-xs mt-2">
                Esta acción eliminará todas las zonas, parejas y partidos asociados. No se puede deshacer.
              </p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="zonas">
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Gestión de Zonas</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Sorteo Automático</Button>
                <Button size="sm">Asignar Manual</Button>
              </div>
            </div>
            <p className="text-dark-400 text-sm">
              Arrastrá las parejas para asignarlas a cada zona, o use el sorteo automático.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="fixture">
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Programación de Partidos</h3>
            <p className="text-dark-400 text-sm">
              Asigná canchas y horarios a cada partido de la fase de zonas y eliminatoria.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Carga de Resultados</h3>
            <p className="text-dark-400 text-sm">
              Ingresá los marcadores de los partidos jugados.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Torneo"
        message="¿Eliminar el torneo Torneo Demo? Se eliminarán todas las zonas, parejas y partidos asociados. Esta acción no se puede deshacer."
      />
    </div>
  );
}
