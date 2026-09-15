"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { Sparkles, ShieldCheck, Users, Clock, ChevronDown } from "lucide-react";

export default function RulesSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-dark-800">
      <div 
        className="flex items-center justify-between sm:justify-center cursor-pointer sm:cursor-default mb-2 sm:mb-8"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-xl sm:text-2xl font-black text-white sm:text-center flex-1">
          Reglas y Formato del Circuito SPT
        </h2>
        <button className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-300 sm:hidden transition-transform">
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-hidden transition-all duration-300 sm:!max-h-[1000px] sm:!opacity-100 sm:!mt-0 ${isOpen ? "max-h-[1000px] opacity-100 mt-6" : "max-h-0 opacity-0 m-0"}`}>
        <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-amber-400/40 transition-colors">
          <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/30 rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-white font-bold text-sm mb-1">Punto de Oro</h3>
          <p className="text-dark-400 text-xs leading-relaxed">
            En todos los partidos al llegar a 40-40 se juega la bola decisiva sin ventajas. Quien gana el punto, gana el game.
          </p>
        </Card>

        <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-rose-400/40 transition-colors">
          <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
          </div>
          <h3 className="text-white font-bold text-sm mb-1">Eliminación en Zonas</h3>
          <p className="text-dark-400 text-xs leading-relaxed">
            En cada zona de 3 o 4 parejas, la última pareja posicionada queda eliminada. Las mejores clasifican a Playoffs.
          </p>
        </Card>

        <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-emerald-400/40 transition-colors">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-white font-bold text-sm mb-1">Doble Ranking Oficial</h3>
          <p className="text-dark-400 text-xs leading-relaxed">
            Puntos por pareja fija y ranking individual que se preserva aunque cambies de compañero en la temporada.
          </p>
        </Card>

        <Card className="p-5 bg-dark-900/80 border-dark-800 hover:border-blue-400/40 transition-colors">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-white font-bold text-sm mb-1">Sistema Americano</h3>
          <p className="text-dark-400 text-xs leading-relaxed">
            A 9 games (empate 8-8 con TB a 7 muere en 7) o a 2 sets de 3 games con super TB a 10 (muere en 11).
          </p>
        </Card>
      </div>
    </section>
  );
}
