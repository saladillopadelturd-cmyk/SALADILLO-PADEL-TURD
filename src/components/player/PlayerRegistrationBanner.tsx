"use client";

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";
import { useAuth } from "@/hooks/useAuth";

interface PlayerRegistrationBannerProps {
  variant?: "home" | "compact";
  className?: string;
}

export default function PlayerRegistrationBanner({
  variant = "home",
  className = "",
}: PlayerRegistrationBannerProps) {
  const { isIdentified, isLoading, player, loggedEmail, openCreateProfile } = usePlayerIdentity();
  const { user, isAdmin, isActualAdmin } = useAuth();

  const isAdministrator = Boolean(
    isAdmin ||
    isActualAdmin ||
    loggedEmail?.toLowerCase() === "matiasvidal11972@gmail.com" ||
    user?.email?.toLowerCase() === "matiasvidal11972@gmail.com" ||
    player?.email?.toLowerCase() === "matiasvidal11972@gmail.com"
  );

  const isKnownUser = Boolean(isIdentified || player !== null || isAdministrator);

  // Si está verificando identidad o si ya hay un administrador o usuario conocido logueado, NO MOSTRAR
  if (isLoading || isKnownUser || isAdministrator) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div
        className={`mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-900/90 to-blue-950/30 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg ${className}`}
      >
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">¿Querés que te anoten en los próximos torneos?</h3>
            <p className="text-xs text-dark-300">
              Creá tu perfil en forma autónoma para participar en los torneos habilitados según tu categoría reglamentaria.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateProfile}
          className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer"
        >
          Crear Mi Perfil
        </button>
      </div>
    );
  }

  return (
    <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2 ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-dark-900 via-dark-900/95 to-blue-950/40 border border-emerald-500/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <Users className="w-3.5 h-3.5" />
              <span>REGISTRO AUTÓNOMO DE JUGADORES</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              ¿Querés participar en los torneos oficiales SPT?
            </h3>
            <p className="text-sm text-dark-300 max-w-2xl leading-relaxed">
              Creá tu perfil en forma autónoma con tu foto de rostro (encuadre cuadrado 1:1), categoría y datos de contacto. Al registrarte con tu correo, el administrador podrá convocarte y asignarte a los torneos oficiales.
            </p>
            <p className="text-xs sm:text-sm text-emerald-300/90 max-w-2xl leading-relaxed pt-2 border-t border-emerald-500/20">
              <strong className="text-white">Rankings Oficiales SPT:</strong> Al competir sumás puntos en el <strong className="text-white">Ranking Individual</strong> (que refleja tu desempeño personal acumulado en cada torneo de tu categoría) y en el <strong className="text-white">Ranking por Parejas</strong> (que registra automáticamente los puntos que consigas junto a cada compañero/a como dupla, clave para clasificaciones y definiciones de temporada).
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateProfile}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            <span>CREAR MI PERFIL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
