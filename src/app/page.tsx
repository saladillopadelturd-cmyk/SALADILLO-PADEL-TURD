import Link from "next/link";
import Card from "@/components/ui/Card";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-b from-dark-900 to-dark-950 py-20 sm:py-32">
        <div className="absolute inset-0 bg-[url('/padel-court.svg')] opacity-5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-2xl">SPT</span>
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            Saladillo{" "}
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              Padel Tour
            </span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-dark-400 max-w-2xl mx-auto">
            Seguimiento en tiempo real de torneos de pádel. Consulta zonas,
            cuadros de eliminación, horarios y rankings.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/torneos"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
            >
              Ver Torneos
            </Link>
            <Link
              href="/rankings"
              className="inline-flex items-center justify-center px-6 py-3 bg-dark-700 text-white font-semibold rounded-xl hover:bg-dark-600 transition-colors border border-dark-600"
            >
              Rankings
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-12">
          Todo lo que necesitás saber
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Zonas en Vivo</h3>
            <p className="text-dark-400 text-sm">
              Tablas de posiciones actualizadas en tiempo real durante los
              partidos.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Playoffs</h3>
            <p className="text-dark-400 text-sm">
              Cuadro de eliminación directa generado automáticamente.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Rankings</h3>
            <p className="text-dark-400 text-sm">
              Ranking de parejas e individual acumulado en todos los torneos.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-5 h-5 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Horarios</h3>
            <p className="text-dark-400 text-sm">
              Programación de partidos con canchas y horarios asignados.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
