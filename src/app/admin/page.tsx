"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  Trophy,
  Users,
  UserCheck,
  Clock,
  Shield,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface DashboardStats {
  activeTournaments: number;
  totalTournaments: number;
  players: number;
  couples: number;
  pendingMatches: number;
  completedMatches: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeTournaments: 0,
    totalTournaments: 0,
    players: 0,
    couples: 0,
    pendingMatches: 0,
    completedMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      const [
        activeTournamentsRes,
        totalTournamentsRes,
        playersRes,
        couplesRes,
        pendingMatchesRes,
        completedMatchesRes,
      ] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*", { count: "exact", head: true })
          .not("status", "in", '("finished","completed","cancelled")'),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase.from("couples").select("*", { count: "exact", head: true }),
        supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .neq("status", "completed"),
        supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
      ]);

      setStats({
        activeTournaments: activeTournamentsRes.count ?? 0,
        totalTournaments: totalTournamentsRes.count ?? 0,
        players: playersRes.count ?? 0,
        couples: couplesRes.count ?? 0,
        pendingMatches: pendingMatchesRes.count ?? 0,
        completedMatches: completedMatchesRes.count ?? 0,
      });
    } catch (err) {
      console.error("Error al cargar estadísticas del panel:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statCards = [
    {
      label: "Torneos Activos",
      value: stats.activeTournaments,
      subValue: `${stats.totalTournaments} en total`,
      color: "text-blue-400",
      bgBadge: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      icon: Trophy,
      href: "/admin/torneos",
    },
    {
      label: "Jugadores",
      value: stats.players,
      subValue: "Registrados en el sistema",
      color: "text-emerald-400",
      bgBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      icon: Users,
      href: "/admin/jugadores",
    },
    {
      label: "Parejas",
      value: stats.couples,
      subValue: "Formadas para torneos",
      color: "text-amber-400",
      bgBadge: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      icon: UserCheck,
      href: "/admin/parejas",
    },
    {
      label: "Partidos Pendientes",
      value: stats.pendingMatches,
      subValue: `${stats.completedMatches} finalizados`,
      color: "text-purple-400",
      bgBadge: "bg-purple-500/10 text-purple-400 border-purple-500/25",
      icon: Clock,
      href: "/admin/torneos",
    },
  ];

  return (
    <div>
      {/* Header del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Panel de Administración</h1>
          <p className="text-dark-400 mt-1">Gestión general y control de torneos de Saladillo Padel Tour</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-dark-300 hover:text-white border border-dark-700 text-xs font-medium transition-all cursor-pointer w-fit"
          title="Actualizar datos en tiempo real"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary-400" : ""}`} />
          <span>Actualizar datos</span>
        </button>
      </div>

      {/* 4 Fichas de Métricas Principales (Conectadas con Supabase) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group">
              <Card hover className="p-5 h-full transition-all duration-200 border-dark-700/80 group-hover:border-dark-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-400 text-xs font-semibold uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <div className={`p-2 rounded-xl border ${stat.bgBadge}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-9 w-16 bg-dark-700 animate-pulse rounded my-1" />
                ) : (
                  <p className={`text-3xl sm:text-4xl font-black tracking-tight ${stat.color}`}>
                    {stat.value}
                  </p>
                )}
                <p className="text-dark-500 text-xs mt-1">{stat.subValue}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Accesos Rápidos de Navegación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/admin/torneos" className="group">
          <Card hover className="p-6 h-full border-dark-700/80 group-hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base group-hover:text-blue-400 transition-colors">
                Torneos
              </h3>
              <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-dark-400 text-xs leading-relaxed">
              Crear y gestionar torneos, sorteo de zonas, programación de fixtures y resultados.
            </p>
          </Card>
        </Link>

        <Link href="/admin/jugadores" className="group">
          <Card hover className="p-6 h-full border-dark-700/80 group-hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base group-hover:text-emerald-400 transition-colors">
                Jugadores
              </h3>
              <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-dark-400 text-xs leading-relaxed">
              Registrar, buscar, editar y administrar todos los jugadores del circuito SPT.
            </p>
          </Card>
        </Link>

        <Link href="/admin/parejas" className="group">
          <Card hover className="p-6 h-full border-dark-700/80 group-hover:border-amber-500/40 transition-all">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base group-hover:text-amber-400 transition-colors">
                Parejas
              </h3>
              <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-dark-400 text-xs leading-relaxed">
              Formar y administrar parejas por torneo con validación de disponibilidad única.
            </p>
          </Card>
        </Link>

        <Link href="/admin/admins" className="group">
          <Card hover className="p-6 h-full border-dark-700/80 group-hover:border-purple-500/40 transition-all">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-base group-hover:text-purple-400 transition-colors">
                Administradores
              </h3>
              <ArrowRight className="w-4 h-4 text-dark-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-dark-400 text-xs leading-relaxed">
              Gestionar accesos, roles de usuario y permisos administrativos en la plataforma.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
