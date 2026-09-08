import Link from "next/link";
import Card from "@/components/ui/Card";

export default function AdminDashboard() {
  const stats = [
    { label: "Torneos Activos", value: "2", color: "text-blue-400" },
    { label: "Jugadores", value: "32", color: "text-green-400" },
    { label: "Parejas", value: "16", color: "text-amber-400" },
    { label: "Partidos Pendientes", value: "8", color: "text-purple-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
        <p className="text-dark-400 mt-1">Gestioná los torneos de pádel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-dark-400 text-sm">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/torneos">
          <Card hover className="p-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Torneos</h3>
            <p className="text-dark-400 text-sm">
              Crear y gestionar torneos, configurar zonas y fixtures.
            </p>
          </Card>
        </Link>

        <Link href="/admin/jugadores">
          <Card hover className="p-6">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Jugadores</h3>
            <p className="text-dark-400 text-sm">
              Registrar y administrar jugadores del torneo.
            </p>
          </Card>
        </Link>

        <Link href="/admin/parejas">
          <Card hover className="p-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Parejas</h3>
            <p className="text-dark-400 text-sm">
              Formar parejas y asignarlas a zonas.
            </p>
          </Card>
        </Link>

        <Link href="/admin/admins">
          <Card hover className="p-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Administradores</h3>
            <p className="text-dark-400 text-sm">
              Gestionar permisos de administradores.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
