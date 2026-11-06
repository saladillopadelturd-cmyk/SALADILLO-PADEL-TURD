"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Printer, Eye, ExternalLink, Sparkles, Sun, Moon } from "lucide-react";
import RankingPrintDocument, {
  PrintablePlayerItem,
  getFormattedPrintDate,
} from "./RankingPrintDocument";

interface PrintRankingButtonProps {
  category: string;
  gender: "Caballeros" | "Damas";
  players: PrintablePlayerItem[];
}

export default function PrintRankingButton({
  category,
  gender,
  players,
}: PrintRankingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isPrinting, setIsPrinting] = useState(false);

  const isDamas = gender === "Damas";
  const genderLabel = isDamas ? "femenino" : "masculino";
  const formattedDate = getFormattedPrintDate();

  const handleOpenPrintWindow = () => {
    const url = `/rankings/imprimir?gender=${encodeURIComponent(
      gender
    )}&category=${encodeURIComponent(category)}&theme=${theme}&autoPrint=true`;
    window.open(url, "_blank");
  };

  const handlePrintDirect = () => {
    setIsPrinting(true);

    // Creamos un iframe oculto para aislar los estilos de impresión sin afectar el layout actual
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    // Calcular páginas de 15 jugadores
    const PLAYERS_PER_PAGE = 15;
    const pages: PrintablePlayerItem[][] = [];
    if (players.length === 0) {
      pages.push([]);
    } else {
      for (let i = 0; i < players.length; i += PLAYERS_PER_PAGE) {
        pages.push(players.slice(i, i + PLAYERS_PER_PAGE));
      }
    }

    const isDark = theme === "dark";
    const bgCol = isDark ? "#070b14" : "#ffffff";
    const textCol = isDark ? "#f8fafc" : "#0f172a";
    const subCol = isDark ? "#94a3b8" : "#64748b";
    const borderCol = isDark ? "#1e293b" : "#e2e8f0";
    const brandColor = isDamas ? "#ec4899" : "#10b981";

    let pagesHtml = "";

    pages.forEach((pagePlayers, pIdx) => {
      const pageNum = pIdx + 1;
      const totalPages = pages.length;

      let rowsHtml = "";
      pagePlayers.forEach((p) => {
        const isTop1 = p.position === 1;
        const isTop2 = p.position === 2;
        const isTop3 = p.position === 3;

        const posBg = isTop1
          ? "#fbbf24"
          : isTop2
          ? "#cbd5e1"
          : isTop3
          ? "#d97706"
          : isDark
          ? "#1e293b"
          : "#e2e8f0";
        const posText = isTop1 || isTop2 ? "#020617" : isTop3 ? "#ffffff" : isDark ? "#e2e8f0" : "#334155";

        const rowBg = isDark
          ? isTop1
            ? "rgba(245, 158, 11, 0.12)"
            : isTop2
            ? "rgba(203, 213, 225, 0.08)"
            : isTop3
            ? "rgba(217, 119, 6, 0.08)"
            : "rgba(15, 23, 42, 0.6)"
          : isTop1
          ? "#fef3c7"
          : isTop2
          ? "#f1f5f9"
          : isTop3
          ? "#ffedd5"
          : "#ffffff";

        rowsHtml += `
          <tr style="background: ${rowBg}; border-bottom: 1px solid ${borderCol}; height: 46px;">
            <td style="text-align: center; padding: 6px 10px; width: 48px;">
              <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background: ${posBg}; color: ${posText}; font-weight: 900; font-size: 13px;">
                ${p.position}
              </span>
            </td>
            <td style="padding: 6px 14px; text-align: left;">
              <div style="font-weight: 800; font-size: 15px; color: ${isDark ? "#ffffff" : "#0f172a"};">
                ${p.name}
                <span style="font-weight: 400; font-size: 12px; font-style: italic; color: ${subCol}; margin-left: 6px;">
                  (${p.localidad || "Saladillo"})
                </span>
              </div>
            </td>
            <td style="text-align: center; padding: 6px 10px; width: 75px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; background: ${
                isDamas ? "rgba(236, 72, 153, 0.15)" : "rgba(16, 185, 129, 0.15)"
              }; color: ${brandColor};">
                ${p.category || category}
              </span>
            </td>
            <td style="text-align: center; padding: 6px 10px; font-weight: 700; font-size: 14px; width: 65px; font-family: monospace;">
              ${p.tournaments}
            </td>
            <td style="text-align: center; padding: 6px 10px; font-size: 13px; font-family: monospace; width: 85px;">
              <span style="color: #10b981; font-weight: 700;">${p.matchesWon}</span>
              <span style="color: ${subCol}; margin: 0 2px;">/</span>
              <span style="color: #f43f5e; font-weight: 600;">${p.matchesLost}</span>
            </td>
            <td style="text-align: center; padding: 6px 12px; font-weight: 900; font-size: 17px; font-family: monospace; color: ${brandColor}; width: 85px;">
              ${p.points}
            </td>
          </tr>
        `;
      });

      // Rellenar hasta 15 puestos si hay menos
      const emptyCount = Math.max(0, PLAYERS_PER_PAGE - pagePlayers.length);
      for (let e = 0; e < emptyCount; e++) {
        rowsHtml += `
          <tr style="border-bottom: 1px dashed ${borderCol}; height: 46px; opacity: 0.25;">
            <td style="text-align: center; font-size: 12px; color: ${subCol}; font-family: monospace;">
              ${pagePlayers.length + e + 1}
            </td>
            <td style="padding: 6px 14px; color: ${subCol}; italic">—</td>
            <td style="text-align: center; color: ${subCol};">—</td>
            <td style="text-align: center; color: ${subCol};">—</td>
            <td style="text-align: center; color: ${subCol};">—</td>
            <td style="text-align: center; color: ${subCol};">—</td>
          </tr>
        `;
      }

      pagesHtml += `
        <div class="print-page" style="page-break-after: ${
          pIdx < totalPages - 1 ? "always" : "auto"
        }; break-after: ${pIdx < totalPages - 1 ? "page" : "auto"};">
          <div style="aspect-ratio: 9/16; width: 100%; box-sizing: border-box; padding: 32px 28px; display: flex; flex-direction: column; justify-content: space-between; background: ${bgCol}; color: ${textCol};">
            
            <!-- HEADER DE CADA PÁGINA: Logo de Saladillo Padel Tour + Leyenda oficial requerida -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${borderCol}; padding-bottom: 14px;">
                <div>
                  <img src="${window.location.origin}/LOGOSPT.png" alt="Saladillo Padel Tour" style="height: 64px; max-width: 220px; object-contain: contain; display: block;" />
                </div>
                <div style="text-align: right;">
                  <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: ${
                    isDamas ? "rgba(236,72,153,0.15)" : "rgba(16,185,129,0.15)"
                  }; color: ${brandColor}; border: 1px solid ${brandColor};">
                    🏆 Saladillo Padel Tour
                  </div>
                  <div style="font-size: 11px; color: ${subCol}; margin-top: 4px; font-weight: 600;">
                    Circuito Oficial Federado
                  </div>
                </div>
              </div>

              <!-- LEYENDA OBLIGATORIA REQUERIDA POR EL USUARIO -->
              <div style="text-align: center; margin-top: 14px; margin-bottom: 12px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em; color: ${textCol};">
                  Ranking de ${category} categoría (${genderLabel}) al día ${formattedDate}
                </h1>
                <div style="font-size: 12px; color: ${subCol}; font-weight: 600; margin-top: 2px;">
                  Rama ${gender} • Clasificación Oficial de Jugadores
                </div>
              </div>

              <!-- TABLA DE 15 PUESTOS -->
              <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <thead>
                  <tr style="background: ${
                    isDark ? "#0f172a" : "#f1f5f9"
                  }; border-bottom: 2px solid ${borderCol}; font-size: 11px; text-transform: uppercase; color: ${subCol}; letter-spacing: 0.05em;">
                    <th style="padding: 10px 8px; text-align: center;">Pos.</th>
                    <th style="padding: 10px 14px; text-align: left;">Jugador / Jugadora</th>
                    <th style="padding: 10px 8px; text-align: center;">Cat.</th>
                    <th style="padding: 10px 8px; text-align: center;">Torneos</th>
                    <th style="padding: 10px 8px; text-align: center;">PG / PP</th>
                    <th style="padding: 10px 10px; text-align: center; color: ${brandColor}; font-weight: 900;">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- FOOTER DE CADA PÁGINA -->
            <div style="border-top: 1px solid ${borderCol}; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: ${subCol}; font-weight: 600;">
              <div>Saladillo Padel Tour • www.saladinopadeltour.com.ar</div>
              <div style="font-weight: 900; letter-spacing: 0.05em; color: ${textCol};">
                PÁGINA ${pageNum} DE ${totalPages}
              </div>
            </div>

          </div>
        </div>
      `;
    });

    const docContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Ranking ${category} ${gender} - Saladillo Padel Tour</title>
        <style>
          @page {
            size: portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: ${bgCol};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .print-page {
            width: 100vw;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(docContent);
      iframeDoc.close();

      setTimeout(() => {
        setIsPrinting(false);
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Error al imprimir:", e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }
      }, 500);
    } else {
      setIsPrinting(false);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  };

  return (
    <>
      {/* Botón Principal de Impresión */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer border ${
          isDamas
            ? "bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 text-pink-300 border-pink-500/40 hover:border-pink-400 shadow-rose-500/10"
            : "bg-gradient-to-r from-emerald-500/20 to-lime-500/20 hover:from-emerald-500/30 hover:to-lime-500/30 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10"
        }`}
        title={`Imprimir ranking oficial 9:16 de ${category} categoría (${gender})`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Imprimir Ranking</span>
        <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-dark-950/40 border border-white/10 font-mono">
          9:16
        </span>
      </button>

      {/* Modal de Vista Previa y Opciones de Impresión */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Imprimir Ranking 9:16 • ${category} Categoría (${gender})`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Barra de Controles y Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-dark-950/80 border border-dark-800">
            {/* Información del Formato */}
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-xl ${
                  isDamas
                    ? "bg-pink-500/15 text-pink-400"
                    : "bg-emerald-500/15 text-emerald-400"
                }`}
              >
                <Printer className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Documento 9:16</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-dark-800 text-slate-300">
                    15 puestos / página
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {players.length} {players.length === 1 ? "jugador" : "jugadores"} • {Math.max(1, Math.ceil(players.length / 15))} {Math.ceil(players.length / 15) === 1 ? "página" : "páginas"}
                </div>
              </div>
            </div>

            {/* Selector de Tema & Acciones */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Tema (Dark para redes/historias, Light para ahorro de tinta en papel) */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={
                  theme === "dark"
                    ? "Cambiar a modo Blanco (Ahorro de tinta)"
                    : "Cambiar a modo Oscuro Oficial SPT"
                }
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

              {/* Botón Abrir en Pestaña Nueva */}
              <button
                type="button"
                onClick={handleOpenPrintWindow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Abrir vista imprimible en pestaña completa"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pestaña nueva</span>
              </button>

              {/* Botón Imprimir Directo */}
              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrintDirect}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg cursor-pointer ${
                  isDamas
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-rose-500/20"
                    : "bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-dark-950 shadow-emerald-500/20"
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>{isPrinting ? "Preparando..." : "Imprimir Ahora"}</span>
              </button>
            </div>
          </div>

          {/* Vista Previa en Pantalla del Formato 9:16 */}
          <div className="relative rounded-2xl border border-dark-800 bg-dark-950/90 p-4 max-h-[70vh] overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Vista previa del documento vertical 9:16
              </span>
              <span className="text-[10px] text-slate-500 lowercase">
                (scroll vertical para revisar todas las páginas)
              </span>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-[540px] shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                <RankingPrintDocument
                  category={category}
                  gender={gender}
                  players={players}
                  theme={theme}
                  printDate={new Date()}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
