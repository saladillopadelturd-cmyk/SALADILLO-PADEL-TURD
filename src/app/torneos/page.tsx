import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export default async function TorneosPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Torneos</h1>
        <p className="text-dark-400 mt-1">
          Consultá los torneos activos y sus resultados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card hover className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                Torneo de Prueba
              </h3>
              <p className="text-dark-400 text-sm mt-1">15 de Diciembre, 2026</p>
            </div>
            <Badge variant="success">Activo</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-dark-300">
              <span>Modalidad:</span>
              <span className="text-white">Americano 9 games</span>
            </div>
            <div className="flex justify-between text-dark-300">
              <span>Zonas:</span>
              <span className="text-white">4 zonas de 4 parejas</span>
            </div>
            <div className="flex justify-between text-dark-300">
              <span>Partidos:</span>
              <span className="text-white">24</span>
            </div>
          </div>
          <Link
            href="/torneos/demo"
            className="mt-4 block text-center py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors"
          >
            Ver Detalle
          </Link>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-dark-500">
          No hay más torneos disponibles por el momento.
        </p>
      </div>
    </div>
  );
}
