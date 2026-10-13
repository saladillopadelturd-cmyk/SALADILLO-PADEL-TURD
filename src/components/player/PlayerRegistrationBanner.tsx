"use client";

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";

interface PlayerRegistrationBannerProps {
  variant?: "home" | "compact";
  className?: string;
}

export default function PlayerRegistrationBanner({
  variant = "home",
  className = "",
}: PlayerRegistrationBannerProps) {
  const { isIdentified, isLoading } = usePlayerIdentity();

  // Si está verificando identidad o si ya hay un jugador logueado identificado en la base de datos, NO APARECE
  if (isLoading || isIdentified) {
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
              Creá tu perfil en forma autónoma. Para cada torneo, el administrador solo podrá convocar a los jugadores que cumplan con las reglas de categoría del torneo.
            </p>
          </div>
        </div>
        <Link
          href="/jugadores"
          className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all whitespace-nowrap active:scale-95"
        >
          Mi Perfil de Jugador
        </Link>
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
              Creá tu perfil en forma autónoma con tu foto de rostro (encuadre cuadrado 1:1), categoría y datos de contacto. Al registrarte con tu correo, el administrador podrá seleccionarte al conformar las parejas para los torneos habilitados según tu categoría reglamentaria.
            </p>
          </div>
          <Link
            href="/jugadores"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            <span>CARGAR MI PERFIL</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
