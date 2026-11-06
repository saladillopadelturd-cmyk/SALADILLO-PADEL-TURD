"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

interface PrintToolbarProps {
  category: string;
  gender: string;
  autoPrint?: boolean;
}

export default function PrintToolbar({
  category,
  gender,
  autoPrint = false,
}: PrintToolbarProps) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="no-print fixed top-4 inset-x-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-dark-950/95 border border-dark-750 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl">
        <Link
          href={`/rankings?gender=${encodeURIComponent(
            gender
          )}&category=${encodeURIComponent(category)}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-dark-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Ranking</span>
        </Link>

        <div className="h-4 w-px bg-dark-800" />

        <div className="text-xs font-bold text-white hidden sm:flex items-center gap-2">
          <span>Ranking en Papel Blanco • {category} ({gender})</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-dark-800 text-slate-300">
            Ahorro de Tinta
          </span>
        </div>

        <div className="h-4 w-px bg-dark-800 hidden sm:block" />

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase bg-white hover:bg-slate-100 text-dark-950 shadow-lg shadow-white/10 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir en Papel</span>
        </button>
      </div>
    </div>
  );
}
