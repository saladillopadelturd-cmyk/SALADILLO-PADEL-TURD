"use client";

import React from "react";
import Image from "next/image";
import { Trophy, Medal } from "lucide-react";

export interface PrintablePlayerItem {
  position: number;
  id: string;
  playerId?: string;
  name: string;
  firstName: string;
  lastName: string;
  gender: "Masculino" | "Femenino";
  localidad: string;
  category: string;
  tournaments: number;
  points: number;
  matchesWon: number;
  matchesLost: number;
}

interface RankingPrintDocumentProps {
  category: string;
  gender: "Caballeros" | "Damas";
  players: PrintablePlayerItem[];
  theme?: "dark" | "light";
  printDate?: Date;
}

const PLAYERS_PER_PAGE = 15;

/**
 * Retorna la fecha actual formateada en español:
 * Ej: "6 de noviembre de 2026"
 */
export function getFormattedPrintDate(date: Date = new Date()): string {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export default function RankingPrintDocument({
  category,
  gender,
  players,
  theme = "dark",
  printDate = new Date(),
}: RankingPrintDocumentProps) {
  const isDamas = gender === "Damas";
  const genderLabel = isDamas ? "femenino" : "masculino";
  const formattedDate = getFormattedPrintDate(printDate);

  // Dividir los jugadores en lotes de exactamente 15 puestos por página
  const pages: PrintablePlayerItem[][] = [];
  if (players.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < players.length; i += PLAYERS_PER_PAGE) {
      pages.push(players.slice(i, i + PLAYERS_PER_PAGE));
    }
  }

  const isDark = theme === "dark";

  return (
    <div
      className={`ranking-print-wrapper ${
        isDark ? "bg-[#070b14] text-white" : "bg-white text-slate-900"
      }`}
    >
      {pages.map((pagePlayers, pageIndex) => {
        const pageNumber = pageIndex + 1;
        const totalPages = pages.length;

        return (
          <div
            key={pageIndex}
            className={`ranking-print-page relative flex flex-col justify-between overflow-hidden ${
              isDark
                ? "bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#04070d] text-white border-dark-800"
                : "bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 border-slate-200"
            }`}
            style={{
              aspectRatio: "9 / 16",
              width: "100%",
              maxWidth: "1080px",
              margin: "0 auto",
              pageBreakAfter: pageIndex < totalPages - 1 ? "always" : "auto",
              breakAfter: pageIndex < totalPages - 1 ? "page" : "auto",
            }}
          >
            {/* Elementos decorativos de fondo en formato 9:16 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
              <div
                className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${
                  isDamas
                    ? "bg-pink-500/20"
                    : "bg-emerald-500/20"
                }`}
              />
              <div
                className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl ${
                  isDamas
                    ? "bg-rose-500/15"
                    : "bg-lime-500/15"
                }`}
              />
              {/* Líneas sutiles de pista de pádel */}
              <div className="absolute inset-x-8 top-0 bottom-0 border-x border-white/[0.04]" />
              <div className="absolute inset-y-12 left-0 right-0 border-y border-white/[0.04]" />
            </div>

            {/* PARTE SUPERIOR (HEADER): Logo oficial + Leyenda requerida */}
            <header className="relative z-10 px-8 pt-8 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                {/* Logo oficial Saladillo Padel Tour */}
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-44 sm:h-20 sm:w-52 flex items-center justify-start">
                    <Image
                      src="/LOGOSPT.png"
                      alt="Saladillo Padel Tour"
                      width={220}
                      height={70}
                      priority
                      className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    />
                  </div>
                </div>

                {/* Insignia / Rama oficial */}
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                      isDamas
                        ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Circuito Oficial SPT</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400 mt-1">
                    Tabla Oficial de Puntuación
                  </div>
                </div>
              </div>

              {/* LEYENDA OBLIGATORIA REQUERIDA POR EL USUARIO:
                  ¨Ranking de X categoria (femenino o masculino) al dia (fecha del dia que se hizo la impresion)¨ */}
              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <h1
                  className={`text-lg sm:text-2xl font-black tracking-tight leading-snug ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Ranking de {category} categoría ({genderLabel}) al día {formattedDate}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">
                  Rama {gender} • {category} Categoría • Clasificación Oficial Acumulada
                </p>
              </div>
            </header>

            {/* CUERPO: 15 Puestos del Ranking */}
            <main className="relative z-10 px-6 py-4 flex-1 flex flex-col justify-start">
              {pagePlayers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Trophy className="w-16 h-16 text-slate-500 mb-3" />
                  <p className="text-base font-bold text-slate-300">
                    Sin jugadores registrados en {category} categoría ({genderLabel})
                  </p>
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col">
                  {/* Encabezado de la tabla */}
                  <div
                    className={`grid grid-cols-12 items-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider mb-2 border ${
                      isDark
                        ? "bg-dark-900/90 text-slate-300 border-dark-750"
                        : "bg-slate-200 text-slate-700 border-slate-300"
                    }`}
                  >
                    <div className="col-span-1 text-center">Pos.</div>
                    <div className="col-span-5 text-left pl-2">Jugador/a (Localidad)</div>
                    <div className="col-span-2 text-center">Cat.</div>
                    <div className="col-span-1 text-center">Torneos</div>
                    <div className="col-span-1 text-center">PG / PP</div>
                    <div
                      className={`col-span-2 text-center font-black ${
                        isDamas ? "text-pink-400" : "text-emerald-400"
                      }`}
                    >
                      Puntos
                    </div>
                  </div>

                  {/* 15 Filas de Jugadores */}
                  <div className="flex-1 flex flex-col justify-between space-y-1">
                    {pagePlayers.map((player) => {
                      const pos = player.position;
                      const isTop1 = pos === 1;
                      const isTop2 = pos === 2;
                      const isTop3 = pos === 3;

                      return (
                        <div
                          key={player.id || `${pos}-${player.name}`}
                          className={`grid grid-cols-12 items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border ${
                            isDark
                              ? isTop1
                                ? "bg-amber-500/10 border-amber-500/30 text-white"
                                : isTop2
                                ? "bg-slate-300/10 border-slate-300/30 text-white"
                                : isTop3
                                ? "bg-amber-700/10 border-amber-600/30 text-white"
                                : "bg-dark-900/60 border-dark-800/80 text-slate-200"
                              : isTop1
                              ? "bg-amber-50 border-amber-300 text-slate-900"
                              : isTop2
                              ? "bg-slate-100 border-slate-300 text-slate-900"
                              : isTop3
                              ? "bg-orange-50 border-orange-200 text-slate-900"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{ minHeight: "44px" }}
                        >
                          {/* 1. Posición */}
                          <div className="col-span-1 flex items-center justify-center">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-sm ${
                                isTop1
                                  ? "bg-amber-400 text-dark-950 font-black ring-2 ring-amber-300"
                                  : isTop2
                                  ? "bg-slate-300 text-dark-950 font-black ring-1 ring-slate-200"
                                  : isTop3
                                  ? "bg-amber-600 text-white font-black"
                                  : isDark
                                  ? "bg-dark-800 text-slate-300"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {pos}
                            </span>
                          </div>

                          {/* 2. Nombre, Apellido y Localidad */}
                          <div className="col-span-5 text-left pl-2 flex items-center gap-1.5 overflow-hidden">
                            {isTop1 && (
                              <Medal className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <span
                                className={`font-black text-sm tracking-tight ${
                                  isDark ? "text-white" : "text-slate-950"
                                }`}
                              >
                                {player.name}
                              </span>
                              <span
                                className={`ml-1.5 text-xs font-medium italic ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                ({player.localidad || "Saladillo"})
                              </span>
                            </div>
                          </div>

                          {/* 3. Categoría */}
                          <div className="col-span-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide ${
                                isDamas
                                  ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {player.category || category}
                            </span>
                          </div>

                          {/* 4. Torneos Jugados */}
                          <div className="col-span-1 text-center font-mono font-bold text-xs sm:text-sm">
                            {player.tournaments}
                          </div>

                          {/* 5. PG / PP */}
                          <div className="col-span-1 text-center font-mono text-xs">
                            <span className="text-emerald-400 font-bold">
                              {player.matchesWon}
                            </span>
                            <span className="text-slate-500 mx-0.5">/</span>
                            <span className="text-rose-400 font-medium">
                              {player.matchesLost}
                            </span>
                          </div>

                          {/* 6. Puntos */}
                          <div className="col-span-2 text-center">
                            <span
                              className={`font-mono font-black text-base tracking-tight scoreboard-digit ${
                                isDamas ? "text-pink-400" : "text-emerald-400"
                              }`}
                            >
                              {player.points}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Espacios vacíos si la página tiene menos de 15 jugadores */}
                    {Array.from({
                      length: Math.max(0, PLAYERS_PER_PAGE - pagePlayers.length),
                    }).map((_, emptyIdx) => (
                      <div
                        key={`empty-${emptyIdx}`}
                        className={`grid grid-cols-12 items-center px-4 py-2 rounded-xl text-xs opacity-20 border border-dashed ${
                          isDark ? "border-dark-800" : "border-slate-200"
                        }`}
                        style={{ minHeight: "44px" }}
                      >
                        <div className="col-span-1 text-center font-mono text-slate-500">
                          {pagePlayers.length + emptyIdx + 1}
                        </div>
                        <div className="col-span-5 pl-2 text-slate-500 italic">
                          —
                        </div>
                        <div className="col-span-2 text-center text-slate-500">
                          —
                        </div>
                        <div className="col-span-1 text-center text-slate-500">
                          —
                        </div>
                        <div className="col-span-1 text-center text-slate-500">
                          —
                        </div>
                        <div className="col-span-2 text-center text-slate-500">
                          —
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>

            {/* PARTE INFERIOR (FOOTER): Paginación y créditos oficiales */}
            <footer className="relative z-10 px-8 py-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">
                  Saladillo Padel Tour • www.saladinopadeltour.com.ar
                </span>
              </div>
              <div className="font-black text-xs tracking-wider">
                PÁGINA {pageNumber} DE {totalPages}
              </div>
            </footer>
          </div>
        );
      })}
    </div>
  );
}
