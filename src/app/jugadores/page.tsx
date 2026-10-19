"use client";

import { useEffect } from "react";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";
import { useAuth } from "@/hooks/useAuth";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Users,
  ShieldCheck,
  Trophy,
  Calendar,
  Award,
  Activity,
  UserPlus,
  Mail,
  Phone,
  Sparkles,
  User,
  CheckCircle2,
  Eye,
  LogOut,
} from "lucide-react";

export default function JugadoresPage() {
  const { player, stats, isIdentified, isLoading, openFicha, clearIdentity } = usePlayerIdentity();
  const { isAdmin, signOut } = useAuth();

  // Si no está identificado, abrir la ficha automáticamente al entrar a /jugadores
  useEffect(() => {
    if (!isLoading && !isIdentified) {
      openFicha();
    }
  }, [isLoading, isIdentified, openFicha]);

  const resolvedPhoto =
    player?.photo_url ||
    player?.avatar_url ||
    (typeof window !== "undefined" && player?.email
      ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
      : null);

  const indRank = stats?.individualRanking;
  const coupleRankings = stats?.coupleRankings || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Comunidad y Padrón
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Perfil de Usuario • Ficha de Jugador
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Gestiona tu perfil personal, sube tu foto con encuadre cuadrado y consulta tus estadísticas y rankings oficiales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            onClick={openFicha}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20"
          >
            {isIdentified ? "Ver / Editar Mi Perfil" : "Cargar Mi Perfil de Jugador"}
          </Button>

          {isIdentified && (
            <Button
              onClick={async () => {
                await clearIdentity();
                await signOut();
              }}
              variant="danger"
              size="sm"
              className="text-xs font-bold shadow-md shadow-rose-600/20"
              title="Cerrar sesión en este dispositivo"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Cerrar Sesión
            </Button>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      {isLoading ? (
        <div className="p-12 text-center text-dark-400">
          <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Verificando identidad del jugador en este navegador...</p>
        </div>
      ) : isIdentified && player ? (
        <div className="space-y-6">
          {/* Tarjeta de Identidad Reconocida con Foto Cargada */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-dark-900/90 via-dark-900/60 to-dark-950 border border-emerald-500/30 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Foto Cuadrada Zona Útil */}
              <div className="flex flex-col items-center gap-2">
                <PlayerAvatar
                  photoUrl={resolvedPhoto}
                  firstName={player.first_name}
                  lastName={player.last_name}
                  category={player.category}
                  size="2xl"
                  showCategoryBorder
                  className="shadow-2xl ring-2 ring-emerald-500/30"
                />
                {resolvedPhoto && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Foto activa (1:1)
                  </span>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Identidad Activa en este Dispositivo
                  </span>
                  <Badge variant="success" className="font-bold uppercase text-xs">
                    {player.category || "5ta"} Categoría
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {player.gender || "Masculino"}
                  </Badge>
                  {isAdmin && player.is_observed && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-sm shadow-amber-500/20">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      JUGADOR OBSERVADO
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {player.first_name} {player.last_name}
                  </h2>
                  <p className="text-xs text-dark-400 mt-0.5">
                    Jugador Federado • Saladillo Padel Tour
                  </p>
                </div>

                {isAdmin && player.is_observed && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                    <Eye className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 font-bold block">Estado: Jugador en Observación</strong>
                      <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                        Este jugador se encuentra bajo evaluación técnica reglamentaria de la organización para posible recategorización o ascenso de categoría.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-dark-300 pt-1">
                  <div className="flex items-center gap-1.5 font-mono text-white">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{player.email}</span>
                  </div>
                  {player.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{player.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Button onClick={openFicha} variant="secondary" className="text-xs font-bold">
                    Editar Datos y Foto
                  </Button>
                  <Button
                    onClick={async () => {
                      await clearIdentity();
                      await signOut();
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/30"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Cerrar Sesión
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN RANKINGS: RANKING INDIVIDUAL Y RANKING POR PAREJAS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-dark-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Rankings Oficiales SPT
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ranking Individual */}
              <div className="p-5 rounded-2xl bg-dark-900/70 border border-dark-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                      <User className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white">Ranking Individual</h4>
                      <p className="text-xs text-dark-400">
                        {indRank?.category || player.category || "5ta"} Categoría
                      </p>
                    </div>
                  </div>

                  {indRank && indRank.position > 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                      #{indRank.position} Puesto
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-dark-800 text-dark-400 text-xs font-medium">
                      Sin clasificar
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center pt-1">
                  <div className="p-3 rounded-xl bg-dark-950/80 border border-dark-800">
                    <span className="block text-2xl font-black text-amber-400 font-mono">
                      {indRank?.points ?? 0}
                    </span>
                    <span className="text-[11px] text-dark-400 font-semibold">Puntos</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-950/80 border border-dark-800">
                    <span className="block text-2xl font-black text-white font-mono">
                      {indRank?.tournamentsPlayed ?? 0}
                    </span>
                    <span className="text-[11px] text-dark-400 font-semibold">Torneos</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-950/80 border border-dark-800">
                    <span className="block text-2xl font-black text-emerald-400 font-mono">
                      {indRank?.winRate ?? 0}%
                    </span>
                    <span className="text-[11px] text-dark-400 font-semibold">Efectividad</span>
                  </div>
                </div>

                <div className="text-xs text-dark-400 flex items-center justify-between px-1 pt-1">
                  <span>Partidos jugados:</span>
                  <strong className="text-slate-200">
                    {indRank?.matchesWon ?? 0} Ganados / {indRank?.matchesLost ?? 0} Perdidos
                  </strong>
                </div>
              </div>

              {/* Ranking por Parejas */}
              <div className="p-5 rounded-2xl bg-dark-900/70 border border-dark-800 shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-dark-800">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Users className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-white">Ranking por Parejas</h4>
                      <p className="text-xs text-dark-400">
                        {coupleRankings.length > 0
                          ? `${coupleRankings.length} dupla(s) en competencia`
                          : "Sin torneos en pareja"}
                      </p>
                    </div>
                  </div>

                  {coupleRankings.length > 0 && coupleRankings[0].position > 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                      #{coupleRankings[0].position} Mejor Puesto
                    </span>
                  ) : null}
                </div>

                {coupleRankings.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {coupleRankings.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-dark-950/70 border border-dark-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatar
                            photoUrl={c.partnerPhotoUrl}
                            firstName={c.partnerName}
                            lastName=""
                            category={c.category}
                            size="md"
                            showCategoryBorder
                          />
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">
                              con {c.partnerName}
                            </span>
                            <span className="text-[11px] text-dark-400">
                              {c.category} • {c.tournamentsPlayed} torneos disputados
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-black text-emerald-400 text-sm">
                            {c.points} pts
                          </div>
                          <span className="inline-block text-[11px] font-bold text-amber-400">
                            #{c.position} en ranking
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-dark-950/40 border border-dashed border-dark-800 text-center space-y-1.5">
                    <Users className="w-6 h-6 text-dark-500 mx-auto" />
                    <p className="text-xs text-dark-300 font-medium">
                      Aún no registras torneos en pareja
                    </p>
                    <p className="text-[11px] text-dark-500 max-w-xs mx-auto">
                      Al disputar torneos con tu compañero/a se generará automáticamente el ranking de la dupla en el torneo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 sm:p-12 rounded-2xl bg-dark-900/60 border border-dark-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <UserPlus className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">¿Aún no has cargado tu ficha?</h2>
            <p className="text-xs sm:text-sm text-dark-400 leading-relaxed">
              Crea tu perfil de jugador con tu foto de formato cuadrado. Tu correo electrónico servirá como nombre de usuario para identificarte en cualquier dispositivo.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={openFicha}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm"
            >
              Completar Ficha de Jugador
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
