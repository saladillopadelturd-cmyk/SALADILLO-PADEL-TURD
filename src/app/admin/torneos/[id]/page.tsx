"use client";

import { use, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminTorneoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .maybeSingle();

        if (error) throw error;
        if (data) setTournament(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cargar torneo";
        console.error(err);
        setNotification({ type: "error", text: msg });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, tournamentId]);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("tournaments")
          .delete()
          .eq("id", tournamentId);

        if (error) throw error;
        setShowDelete(false);
        router.push("/admin/torneos");
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el torneo";
        setNotification({ type: "error", text: msg });
        setShowDelete(false);
      }
    });
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
      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !tournament ? (
        <Card className="p-12 text-center">
          <p className="text-dark-400 text-base mb-4">El torneo no fue encontrado o fue eliminado.</p>
          <Link href="/admin/torneos">
            <Button>Volver a Torneos</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              <p className="text-dark-400 mt-1">Configuración y gestión</p>
            </div>
            <Badge variant="success">{tournament.status.toUpperCase()}</Badge>
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
                    <p className="text-white font-medium">{tournament.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Fecha</label>
                    <p className="text-white font-medium">{tournament.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Modalidad</label>
                    <p className="text-white font-medium">{tournament.game_mode}</p>
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Zonas</label>
                    <p className="text-white font-medium">{tournament.num_zones} zonas de {tournament.zone_size} parejas</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-dark-700">
                  <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} disabled={isPending}>
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
            loading={isPending}
            title="Eliminar Torneo"
            message={`¿Estás seguro de eliminar el torneo "${tournament.name}"? Se eliminarán todas las zonas, parejas y partidos asociados en la base de datos. Esta acción no se puede deshacer.`}
          />
        </>
      )}
    </div>
  );
}
