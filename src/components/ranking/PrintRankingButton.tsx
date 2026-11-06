"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Printer, Eye, ExternalLink } from "lucide-react";
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
  const [isPrinting, setIsPrinting] = useState(false);

  // La impresión siempre saca el documento para papel blanco (ahorro de tinta)
  const theme = "light";

  const isDamas = gender === "Damas";
  const genderLabel = isDamas ? "femenino" : "masculino";
  const formattedDate = getFormattedPrintDate();

  const handleOpenPrintWindow = () => {
    const url = `/rankings/imprimir?gender=${encodeURIComponent(
      gender
    )}&category=${encodeURIComponent(category)}&theme=light&autoPrint=true`;
    window.open(url, "_blank");
  };

  const handlePrintDirect = () => {
    setIsPrinting(true);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const PLAYERS_PER_PAGE = 15;
    const pages: PrintablePlayerItem[][] = [];
    if (players.length === 0) {
      pages.push([]);
    } else {
      for (let i = 0; i < players.length; i += PLAYERS_PER_PAGE) {
        pages.push(players.slice(i, i + PLAYERS_PER_PAGE));
      }
    }

    const bgCol = "#ffffff";
    const textCol = "#0f172a";
    const subCol = "#64748b";
    const borderCol = "#e2e8f0";
    const brandColor = isDamas ? "#be185d" : "#047857";

    let pagesHtml = "";

    pages.forEach((pagePlayers, pIdx) => {
      const pageNum = pIdx + 1;
      const totalPages = pages.length;
      const isFirstPage = pIdx === 0;

      let rowsHtml = "";
      pagePlayers.forEach((p) => {
        const isTop1 = p.position === 1;
        const isTop2 = p.position === 2;
        const isTop3 = p.position === 3;

        const posBg = isTop1 ? "#fef08a" : isTop2 ? "#e2e8f0" : isTop3 ? "#fed7aa" : "#f1f5f9";
        const posText = "#0f172a";

        const rowBg = isTop1 ? "#fefce8" : isTop2 ? "#f8fafc" : isTop3 ? "#fff7ed" : "#ffffff";

        const rowHeight = isFirstPage ? "46px" : "52px";

        rowsHtml += `
          <tr style="background: ${rowBg}; border-bottom: 1px solid ${borderCol}; height: ${rowHeight};">
            <td style="text-align: center; padding: 4px 6px; width: 44px;">
              <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; border-radius: 50%; background: ${posBg}; color: ${posText}; font-weight: 900; font-size: 13px;">
                ${p.position}
              </span>
            </td>
            <td style="padding: 4px 10px; text-align: left;">
              <div style="font-weight: 800; font-size: 15px; color: ${textCol}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;">
                ${p.name}
                <span style="font-weight: 500; font-size: 12px; font-style: italic; color: ${subCol}; margin-left: 6px;">
                  (${p.localidad || "Saladillo"})
                </span>
              </div>
            </td>
            <td style="text-align: center; padding: 4px 6px; width: 68px;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px; text-transform: uppercase; background: #f1f5f9; color: ${brandColor}; border: 1px solid #cbd5e1;">
                ${p.category || category}
              </span>
            </td>
            <td style="text-align: center; padding: 4px 6px; font-weight: 700; font-size: 14px; width: 65px; font-family: monospace;">
              ${p.tournaments}
            </td>
            <td style="text-align: center; padding: 4px 6px; font-size: 13px; font-family: monospace; width: 80px;">
              <span style="color: #047857; font-weight: 700;">${p.matchesWon}</span>
              <span style="color: ${subCol}; margin: 0 2px;">/</span>
              <span style="color: #be123c; font-weight: 600;">${p.matchesLost}</span>
            </td>
            <td style="text-align: center; padding: 4px 8px; font-weight: 900; font-size: 17px; font-family: monospace; color: ${brandColor}; width: 85px;">
              ${p.points}
            </td>
          </tr>
        `;
      });

      const emptyCount = Math.max(0, PLAYERS_PER_PAGE - pagePlayers.length);
      const emptyRowHeight = isFirstPage ? "46px" : "52px";
      for (let e = 0; e < emptyCount; e++) {
        rowsHtml += `
          <tr style="border-bottom: 1px dashed ${borderCol}; height: ${emptyRowHeight}; opacity: 0.25;">
            <td style="text-align: center; font-size: 12px; color: ${subCol}; font-family: monospace;">
              ${pagePlayers.length + e + 1}
            </td>
            <td style="padding: 4px 10px; color: ${subCol}; font-style: italic; font-size: 13px;">—</td>
            <td style="text-align: center; color: ${subCol}; font-size: 12px;">—</td>
            <td style="text-align: center; color: ${subCol}; font-size: 12px;">—</td>
            <td style="text-align: center; color: ${subCol}; font-size: 12px;">—</td>
            <td style="text-align: center; color: ${subCol}; font-size: 12px;">—</td>
          </tr>
        `;
      }

      const headerSection = isFirstPage
        ? `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid ${borderCol}; padding-bottom: 10px;">
              <div>
                <img src="${window.location.origin}/LOGOSPT.png" alt="Saladillo Padel Tour" style="height: 54px; max-width: 200px; object-fit: contain; display: block;" />
              </div>
              <div style="text-align: right;">
                <div style="display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: #f1f5f9; color: ${brandColor}; border: 1px solid #cbd5e1;">
                  🏆 Saladillo Padel Tour
                </div>
                <div style="font-size: 11px; color: ${subCol}; margin-top: 3px; font-weight: 600;">
                  Circuito Oficial Federado
                </div>
              </div>
            </div>

            <!-- LEYENDA OBLIGATORIA REQUERIDA POR EL USUARIO -->
            <div style="text-align: center; margin-top: 10px; margin-bottom: 8px;">
              <h1 style="margin: 0; font-size: 19px; font-weight: 900; letter-spacing: -0.02em; color: ${textCol};">
                Ranking de ${category} categoría (${genderLabel}) al día ${formattedDate}
              </h1>
            </div>
          `
        : "";

      pagesHtml += `
        <div class="print-page" style="page-break-after: ${
          pIdx < totalPages - 1 ? "always" : "auto"
        }; break-after: ${pIdx < totalPages - 1 ? "page" : "auto"};">
          <div style="width: 100%; height: 100%; box-sizing: border-box; padding: ${
            isFirstPage ? "8mm 6mm 6mm 6mm" : "14mm 6mm 6mm 6mm"
          }; display: flex; flex-direction: column; justify-content: space-between; background: ${bgCol}; color: ${textCol};">
            
            <div>
              ${headerSection}

              <!-- TABLA DE 15 PUESTOS REORGANIZADA PARA ALTO A4 -->
              <table style="width: 100%; border-collapse: collapse; margin-top: ${
                isFirstPage ? "6px" : "0"
              }; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <thead>
                  <tr style="background: #f8fafc; border-bottom: 2px solid ${borderCol}; font-size: 11px; line-height: 1.2; text-transform: uppercase; color: ${subCol}; letter-spacing: 0.04em;">
                    <th style="padding: 7px 6px; text-align: center;">Pos.</th>
                    <th style="padding: 7px 10px; text-align: left;">Jugador/a (Localidad)</th>
                    <th style="padding: 7px 6px; text-align: center;">Cat.</th>
                    <th style="padding: 7px 6px; text-align: center;">Torneos</th>
                    <th style="padding: 7px 6px; text-align: center;">PG / PP</th>
                    <th style="padding: 7px 8px; text-align: center; color: ${brandColor}; font-weight: 900;">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>

            <!-- FOOTER DE CADA PÁGINA -->
            <div style="border-top: 1px solid ${borderCol}; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: ${subCol}; font-weight: 600;">
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
        <title>Ranking ${category} ${gender} - Saladillo Padel Tour (A4)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .print-page {
            width: 100%;
            height: calc(297mm - 18mm);
            min-height: calc(297mm - 18mm);
            max-height: calc(297mm - 18mm);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
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
      {/* Botón Principal: IMPRIMIR (Papel Blanco) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer bg-dark-900/90 hover:bg-dark-800 text-slate-200 hover:text-white border border-dark-700/80 hover:border-slate-500"
        title={`Imprimir ranking de ${category} categoría en papel blanco`}
      >
        <Printer className="w-3.5 h-3.5 text-slate-300" />
        <span>Imprimir</span>
        <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-dark-800 text-slate-300 border border-dark-700 font-mono">
          Papel
        </span>
      </button>

      {/* Modal de Impresión en Papel Blanco */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Imprimir Ranking en Papel Blanco • ${category} Categoría (${gender})`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Barra de Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-dark-950/80 border border-dark-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-slate-800 text-slate-200">
                <Printer className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>Impresión en Papel Blanco</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-dark-800 text-slate-300">
                    Ahorro de tinta
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {players.length} {players.length === 1 ? "jugador" : "jugadores"} • {Math.max(1, Math.ceil(players.length / 15))} {Math.ceil(players.length / 15) === 1 ? "página" : "páginas"} (15 puestos por hoja)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenPrintWindow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Abrir vista de impresión en nueva pestaña"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pestaña nueva</span>
              </button>

              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrintDirect}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg cursor-pointer bg-white hover:bg-slate-100 text-slate-950 shadow-white/10"
              >
                <Printer className="w-4 h-4" />
                <span>{isPrinting ? "Preparando..." : "Imprimir en Papel"}</span>
              </button>
            </div>
          </div>

          {/* Vista Previa en Pantalla (Papel Blanco) */}
          <div className="relative rounded-2xl border border-dark-800 bg-dark-950/90 p-4 max-h-[70vh] overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-300" />
                Vista previa de impresión en papel blanco
              </span>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full max-w-[540px] shadow-2xl rounded-2xl overflow-hidden border border-slate-300">
                <RankingPrintDocument
                  category={category}
                  gender={gender}
                  players={players}
                  theme="light"
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
