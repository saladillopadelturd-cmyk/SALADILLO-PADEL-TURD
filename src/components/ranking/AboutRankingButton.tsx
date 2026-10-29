"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  Trophy,
  Medal,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function AboutRankingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-900/90 hover:bg-dark-800 border border-dark-700/80 hover:border-emerald-500/40 text-dark-200 hover:text-white text-xs font-bold tracking-wider uppercase transition-all shadow-sm hover:shadow-emerald-500/10 cursor-pointer"
        title="Ver reglamento oficial y política de puntuación del Saladillo Padel Tour"
      >
        <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sobre el Ranking</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Reglamento Oficial y Política de Puntuación del Ranking"
        size="xl"
      >
        <div className="space-y-6 text-slate-200 text-sm">
          {/* Encabezado introductorio */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4 text-amber-400" /> Saladillo Padel Tour (SPT)
            </div>
            <p className="text-white text-base font-bold leading-snug">
              Sistema de Puntuación Oficial Federado y Proporcional
            </p>
            <p className="text-dark-300 text-xs mt-1 leading-relaxed">
              El ranking del Saladillo Padel Tour se basa en una escala porcentual sobre los puntos totales
              otorgados por cada torneo (<strong>P</strong>, torneo base estándar de <strong>1.000 puntos</strong>).
              Todos los puntajes se computan en tiempo real a medida que se disputan los partidos.
            </p>
          </div>

          {/* 1. Escala Porcentual Oficial */}
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              1. Escala Oficial de Puntos por Instancia Alcanzada
            </h3>

            <div className="overflow-x-auto rounded-xl border border-dark-700/80">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-dark-950 text-dark-400 uppercase text-[11px] border-b border-dark-800">
                    <th className="px-4 py-2.5 text-left font-bold">Instancia Alcanzada</th>
                    <th className="px-4 py-2.5 text-center font-bold">% sobre Torneo (P)</th>
                    <th className="px-4 py-2.5 text-center font-bold text-emerald-400">Torneo 1.000 pts</th>
                    <th className="px-4 py-2.5 text-left font-bold">Condición / Ronda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/60 bg-dark-900/60 font-medium">
                  <tr className="bg-amber-400/5">
                    <td className="px-4 py-2.5 text-white font-bold flex items-center gap-1.5">
                      <Medal className="w-4 h-4 text-amber-400" /> Campeón / Campeona
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-amber-300">100%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-amber-400">1.000 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Ganadores de la Gran Final</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-200 font-bold">Subcampeón / Subcampeona</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-300">60%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-slate-200">600 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Finalistas del torneo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-200 font-bold">Semifinalistas</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-sky-400">35%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-sky-400">350 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Parejas que disputan semifinales</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-200 font-bold">Cuartos de Final</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-400">20%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-400">200 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Parejas que disputan cuartos de final</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-200 font-bold">Octavos de Final</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-400">12%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-400">120 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Sembradas en 8vos o ganadoras de 16avos</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-200 font-bold">16avos de Final</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-emerald-400">7%</td>
                    <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-400">70 pts</td>
                    <td className="px-4 py-2.5 text-dark-300">Parejas clasificadas que disputan 16avos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Fase de Grupos y Piso Garantizado */}
          <div className="p-4 bg-dark-950/70 border border-dark-800 rounded-2xl space-y-2">
            <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              2. Fase de Grupos (Zonas) y Piso de Participación
            </h3>
            <ul className="space-y-2 text-xs text-dark-300 leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-white">Puntaje Base de Participación (3% de P):</strong> Cada pareja inscripta que inicia su participación tiene asegurado un piso mínimo de <strong>30 puntos</strong> (en torneos de 1.000 pts).
              </li>
              <li>
                <strong className="text-white">Bonus por Partido Ganado en Zona (+2% de P):</strong> Aquellas parejas que queden eliminadas en la fase de zonas suman <strong>+20 puntos adicionales</strong> por cada partido ganado en su zona:
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 font-mono">
                  <div className="bg-dark-900 p-2 rounded-lg border border-dark-800 text-center">
                    <span className="text-dark-400 block text-[10px] uppercase">0 Victorias en Zona</span>
                    <strong className="text-white text-sm">30 pts</strong>
                    <span className="text-[10px] text-dark-500 block">(3% base)</span>
                  </div>
                  <div className="bg-dark-900 p-2 rounded-lg border border-dark-800 text-center">
                    <span className="text-dark-400 block text-[10px] uppercase">1 Victoria en Zona</span>
                    <strong className="text-emerald-400 text-sm">50 pts</strong>
                    <span className="text-[10px] text-dark-500 block">(3% base + 2% bonus)</span>
                  </div>
                  <div className="bg-dark-900 p-2 rounded-lg border border-dark-800 text-center">
                    <span className="text-dark-400 block text-[10px] uppercase">2 Victorias en Zona</span>
                    <strong className="text-emerald-400 text-sm">70 pts</strong>
                    <span className="text-[10px] text-dark-500 block">(3% base + 4% bonus)</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* 3. Clasificación a Playoffs */}
          <div className="p-4 bg-dark-950/70 border border-dark-800 rounded-2xl space-y-2">
            <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              3. Parejas Clasificadas a Eliminación Directa (Playoffs)
            </h3>
            <p className="text-xs text-dark-300 leading-relaxed">
              Las parejas que logran la clasificación en sus respectivas zonas <strong className="text-white">abandonan el puntaje de grupos</strong> y adoptan automáticamente el puntaje de la ronda que alcancen en la llave principal:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="bg-dark-900/90 border border-dark-700 p-3 rounded-xl">
                <span className="text-emerald-400 font-bold block mb-1">Cuadro con 16avos de Final</span>
                <p className="text-dark-400 text-[11px]">
                  Toda pareja clasificada asegura al menos <strong className="text-white">70 puntos (7%)</strong> por disputar 16avos. Si posee BYE o fue sembrada directamente en 8vos de final, asegura <strong className="text-white">120 puntos (12%)</strong>.
                </p>
              </div>
              <div className="bg-dark-900/90 border border-dark-700 p-3 rounded-xl">
                <span className="text-emerald-400 font-bold block mb-1">Cuadro desde 8vos de Final</span>
                <p className="text-dark-400 text-[11px]">
                  En llaves de 16 parejas o menos, todas las parejas clasificadas aseguran un piso inicial de <strong className="text-white">120 puntos (12%)</strong> al ingresar directamente a octavos.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Acumulación Individual y Cambio de Pareja */}
          <div className="p-4 bg-dark-950/70 border border-dark-800 rounded-2xl space-y-2">
            <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              4. Puntos 100% Individuales y Duplas
            </h3>
            <p className="text-xs text-dark-300 leading-relaxed">
              Cada jugador o jugadora <strong className="text-white">suma de forma individual el 100% de los puntos</strong> que obtiene su pareja en el torneo.
              Si un jugador compite con un compañero diferente en fechas posteriores, <strong className="text-emerald-400">conserva íntegramente todos sus puntos personales</strong> acumulados en su ranking individual.
            </p>
          </div>

          {/* 5. Discriminación Estricta por Sexo y Categoría */}
          <div className="p-4 bg-dark-950/70 border border-dark-800 rounded-2xl space-y-2">
            <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              5. Discriminación Estricta por Sexo y Categoría
            </h3>
            <p className="text-xs text-dark-300 leading-relaxed">
              En el circuito SPT <strong className="text-white">no existe un ranking general unificado</strong>.
              Cada competidor/a figura única y exclusivamente en el ranking de su rama (<strong className="text-emerald-400">Caballeros ♂</strong> / <strong className="text-pink-400">Damas ♀</strong>) y en su categoría deportiva correspondiente (8va, 7ma, 6ta, 5ta, 4ta, 3ra, 2da, 1ra).
            </p>
          </div>

          {/* Pie de confirmación */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-800 text-xs text-dark-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Reglamento Deportivo SPT Vigente
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black tracking-wide text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
