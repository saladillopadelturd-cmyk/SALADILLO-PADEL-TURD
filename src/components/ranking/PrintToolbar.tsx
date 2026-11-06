"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Sun, Moon } from "lucide-react";

interface PrintToolbarProps {
  category: string;
  gender: string;
  autoPrint?: boolean;
  initialTheme?: "dark" | "light";
  onThemeChange?: (theme: "dark" | "light") => void;
}

export default function PrintToolbar({
  category,
  gender,
  autoPrint = false,
  initialTheme = "dark",
  onThemeChange,
}: PrintToolbarProps) {
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

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

        <div className="text-xs font-bold text-white hidden sm:block">
          Ranking 9:16 • {category} ({gender})
        </div>

        <div className="h-4 w-px bg-dark-800 hidden sm:block" />

        <button
          type="button"
          onClick={handleToggleTheme}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-dark-900 border border-dark-700 hover:bg-dark-800 transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Papel Blanco</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>SPT Oscuro</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-dark-950 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / PDF</span>
        </button>
      </div>
    </div>
  );
}
