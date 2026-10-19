"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PlayerAvatar from "./PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import type { Player } from "@/types/tournament";
import {
  Trophy,
  Phone,
  Mail,
  Eye,
  Camera,
  Activity,
  Award,
  Calendar,
  MessageCircle,
} from "lucide-react";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onEdit?: (player: Player) => void;
  stats?: {
    points?: number;
    tournamentsPlayed?: number;
    matchesWon?: number;
    matchesLost?: number;
  };
}

export default function PlayerProfileModal({
  isOpen,
  onClose,
  player,
  onEdit,
  stats,
}: PlayerProfileModalProps) {
  const { isAdmin } = useAuth();
  if (!player) return null;

  const isFemenino = (player.gender || "").toLowerCase() === "femenino";
  const playerCat = player.category || "5ta";
  const cleanPhone = (player.phone || "").replace(/[^0-9]/g, "");

  const totalMatches = (stats?.matchesWon || 0) + (stats?.matchesLost || 0);
  const winRate = totalMatches > 0 ? Math.round(((stats?.matchesWon || 0) / totalMatches) * 100) : 0;

  const profilePhoto =
    player.photo_url ||
    player.avatar_url ||
    (typeof window !== "undefined" && player.email
      ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
      : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Perfil de Jugador"
      size="md"
    >
      <div className="space-y-6">
        {/* Cabecera con Foto Cuadrada de Zona Útil */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-br from-dark-900/90 via-dark-900/60 to-dark-950 border border-dark-800 shadow-xl">
          {/* Zona útil cuadrada de la foto del jugador */}
          <div className="relative group">
            <PlayerAvatar
              photoUrl={profilePhoto}
              firstName={player.first_name}
              lastName={player.last_name}
              category={playerCat}
              size="2xl"
              showCategoryBorder
              className="shadow-2xl ring-2 ring-emerald-500/20"
            />
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(player);
                }}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-dark-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Información Principal del Perfil */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <Badge
                  variant={
                    playerCat === "1ra" || playerCat === "2da"
                      ? "gold"
                      : playerCat === "3ra" || playerCat === "4ta"
                      ? "neon"
                      : "success"
                  }
                  className="font-bold uppercase text-[11px]"
                >
                  {playerCat} Categoría
                </Badge>

                {isFemenino ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                    ♀ Femenino
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    ♂ Masculino
                  </span>
                )}

                {isAdmin && player.is_observed && (
                  <Badge variant="warning" className="font-bold text-[11px] flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Observado (Ascenso)
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {player.first_name} {player.last_name}
              </h2>
              <p className="text-xs text-dark-400 font-medium">
                Jugador Oficial • Saladillo Padel Tour
              </p>

              {isAdmin && player.is_observed && (
                <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-200">
                  <Eye className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-bold block text-xs">Jugador en Observación</strong>
                    <p className="text-[11px] text-amber-200/80 leading-tight">
                      En evaluación reglamentaria para ascenso o recategorización deportiva.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contacto rápido */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              {player.phone && (
                <a
                  href={`https://wa.me/549${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
              {player.phone && (
                <a
                  href={`tel:${player.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border border-dark-700 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{player.phone}</span>
                </a>
              )}
              {player.email && (
                <a
                  href={`mailto:${player.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border border-dark-700 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{player.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas de Rendimiento en Padel */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Estadísticas Oficiales
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-dark-900/60 border border-dark-800 text-center">
              <span className="block text-2xl font-black text-emerald-400 font-mono">
                {stats?.points ?? 0}
              </span>
              <span className="text-[11px] font-semibold text-dark-400 flex items-center justify-center gap-1 mt-0.5">
                <Trophy className="w-3 h-3 text-amber-400" /> Puntos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900/60 border border-dark-800 text-center">
              <span className="block text-2xl font-black text-white font-mono">
                {stats?.tournamentsPlayed ?? 0}
              </span>
              <span className="text-[11px] font-semibold text-dark-400 flex items-center justify-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-blue-400" /> Torneos
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900/60 border border-dark-800 text-center">
              <span className="block text-2xl font-black text-sky-400 font-mono">
                {stats?.matchesWon ?? 0} <span className="text-dark-500 text-lg">/</span>{" "}
                <span className="text-rose-400 text-lg">{stats?.matchesLost ?? 0}</span>
              </span>
              <span className="text-[11px] font-semibold text-dark-400 flex items-center justify-center gap-1 mt-0.5">
                <Award className="w-3 h-3 text-emerald-400" /> PG / PP
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-900/60 border border-dark-800 text-center">
              <span className="block text-2xl font-black text-amber-400 font-mono">
                {winRate}%
              </span>
              <span className="text-[11px] font-semibold text-dark-400 flex items-center justify-center gap-1 mt-0.5">
                <Activity className="w-3 h-3 text-amber-400" /> Efectividad
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-800">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cerrar
          </Button>

          {onEdit && (
            <Button
              onClick={() => {
                onClose();
                onEdit(player);
              }}
              className="text-xs font-bold"
            >
              Editar Perfil / Foto
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
