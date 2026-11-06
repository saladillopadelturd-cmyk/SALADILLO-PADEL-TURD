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
            className={`ranking-print-page relative flex flex-col justify-between ${
              isDark
                ? "bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#04070d] text-white border-dark-800"
                : "bg-white text-slate-900 border-slate-200"
            }`}
            style={{
              aspectRatio: "210 / 297",
              width: "100%",
              maxWidth: "850px",
              margin: "0 auto",
              pageBreakAfter: pageIndex < totalPages - 1 ? "always" : "auto",
              breakAfter: pageIndex < totalPages - 1 ? "page" : "auto",
            }}
          >
            {/* Elementos decorativos de fondo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
              <div
                className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${
                  isDamas ? "bg-pink-500/10" : "bg-emerald-500/10"
                }`}
              />
              <div
                className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl ${
                  isDamas ? "bg-rose-500/10" : "bg-lime-500/10"
                }`}
              />
            </div>

            {/* PARTE SUPERIOR (HEADER): Logo oficial + Leyenda SOLO EN LA PRIMERA PÁGINA */}
            {pageIndex === 0 && (
              <header className="relative z-10 px-8 pt-7 pb-3 border-b border-slate-200/80 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo oficial Saladillo Padel Tour */}
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-44 sm:h-16 sm:w-52 flex items-center justify-start">
                      <Image
                        src="/LOGOSPT.png"
                        alt="Saladillo Padel Tour"
                        width={210}
                        height={64}
                        priority
                        className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Insignia / Rama oficial */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                        isDamas
                          ? "bg-pink-50 text-pink-700 border-pink-300"
                          : "bg-emerald-50 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Circuito Oficial SPT</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      Tabla Oficial de Puntuación
                    </div>
                  </div>
                </div>

                {/* LEYENDA OBLIGATORIA REQUERIDA POR EL USUARIO */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 text-center">
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-snug text-slate-900">
                    Ranking de {category} categoría ({genderLabel}) al día {formattedDate}
                  </h1>
                </div>
              </header>
            )}

            {/* CUERPO: 15 Puestos del Ranking distribuidos a lo alto de la hoja A4 */}
            <main
              className={`relative z-10 px-6 py-3 flex-1 flex flex-col justify-between ${
                pageIndex > 0 ? "pt-8" : ""
              }`}
            >
              {pagePlayers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Trophy className="w-16 h-16 text-slate-400 mb-3" />
                  <p className="text-base font-bold text-slate-600">
                    Sin jugadores registrados en {category} categoría ({genderLabel})
                  </p>
                </div>
              ) : (
                <div className="w-full flex-1 flex flex-col justify-between">
                  {/* Encabezado de la tabla */}
                  <div className="grid grid-cols-12 items-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider mb-2 border leading-tight bg-slate-100 text-slate-700 border-slate-300">
                    <div className="col-span-1 text-center">Pos.</div>
                    <div className="col-span-5 text-left pl-2">Jugador/a (Localidad)</div>
                    <div className="col-span-2 text-center">Cat.</div>
                    <div className="col-span-1 text-center">Torneos</div>
                    <div className="col-span-1 text-center">PG / PP</div>
                    <div
                      className={`col-span-2 text-center font-black ${
                        isDamas ? "text-pink-600" : "text-emerald-700"
                      }`}
                    >
                      Puntos
                    </div>
                  </div>

                  {/* 15 Filas de Jugadores ocupando armónicamente la hoja A4 */}
                  <div className="flex-1 flex flex-col justify-between space-y-1">
                    {pagePlayers.map((player) => {
                      const pos = player.position;
                      const isTop1 = pos === 1;
                      const isTop2 = pos === 2;
                      const isTop3 = pos === 3;

                      return (
                        <div
                          key={player.id || `${pos}-${player.name}`}
                          className={`grid grid-cols-12 items-center px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors border ${
                            isTop1
                              ? "bg-amber-50/80 border-amber-300 text-slate-900"
                              : isTop2
                              ? "bg-slate-100/80 border-slate-300 text-slate-900"
                              : isTop3
                              ? "bg-orange-50/80 border-orange-200 text-slate-900"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                          style={{
                            minHeight: pageIndex === 0 ? "44px" : "48px",
                            height: pageIndex === 0 ? "44px" : "48px",
                          }}
                        >
                          {/* 1. Posición */}
                          <div className="col-span-1 flex items-center justify-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shadow-sm ${
                                isTop1
                                  ? "bg-amber-400 text-dark-950 font-black ring-1 ring-amber-300"
                                  : isTop2
                                  ? "bg-slate-300 text-dark-950 font-black ring-1 ring-slate-200"
                                  : isTop3
                                  ? "bg-amber-600 text-white font-black"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {pos}
                            </span>
                          </div>

                          {/* 2. Nombre, Apellido y Localidad */}
                          <div className="col-span-5 text-left pl-2 flex items-center gap-1.5 overflow-hidden">
                            {isTop1 && (
                              <Medal className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-bold text-sm tracking-tight text-slate-950">
                                {player.name}
                              </span>
                              <span className="ml-1.5 text-xs font-medium italic text-slate-500">
                                ({player.localidad || "Saladillo"})
                              </span>
                            </div>
                          </div>

                          {/* 3. Categoría */}
                          <div className="col-span-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wide border ${
                                isDamas
                                  ? "bg-pink-50 text-pink-700 border-pink-300"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {player.category || category}
                            </span>
                          </div>

                          {/* 4. Torneos Jugados */}
                          <div className="col-span-1 text-center font-mono font-bold text-sm text-slate-700">
                            {player.tournaments}
                          </div>

                          {/* 5. PG / PP */}
                          <div className="col-span-1 text-center font-mono text-xs">
                            <span className="text-emerald-700 font-bold">
                              {player.matchesWon}
                            </span>
                            <span className="text-slate-400 mx-0.5">/</span>
                            <span className="text-rose-700 font-medium">
                              {player.matchesLost}
                            </span>
                          </div>

                          {/* 6. Puntos */}
                          <div className="col-span-2 text-center">
                            <span
                              className={`font-mono font-black text-base tracking-tight scoreboard-digit ${
                                isDamas ? "text-pink-600" : "text-emerald-700"
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
                        className="grid grid-cols-12 items-center px-4 py-1.5 rounded-xl text-xs opacity-20 border border-dashed border-slate-300"
                        style={{
                          minHeight: pageIndex === 0 ? "44px" : "48px",
                          height: pageIndex === 0 ? "44px" : "48px",
                        }}
                      >
                        <div className="col-span-1 text-center font-mono text-slate-500">
                          {pagePlayers.length + emptyIdx + 1}
                        </div>
                        <div className="col-span-5 pl-2 text-slate-500 italic">—</div>
                        <div className="col-span-2 text-center text-slate-500">—</div>
                        <div className="col-span-1 text-center text-slate-500">—</div>
                        <div className="col-span-1 text-center text-slate-500">—</div>
                        <div className="col-span-2 text-center text-slate-500">—</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>

            {/* PARTE INFERIOR (FOOTER): Paginación y créditos oficiales */}
            <footer className="relative z-10 px-8 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
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
