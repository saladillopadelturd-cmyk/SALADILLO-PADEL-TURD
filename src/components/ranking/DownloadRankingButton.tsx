"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import { Download, ChevronLeft, ChevronRight, Sparkles, Check, Image as ImageIcon } from "lucide-react";
import { PrintablePlayerItem } from "./RankingPrintDocument";
import { renderRankingFlyerToCanvas } from "@/lib/canvas/rankingFlyerRenderer";

interface DownloadRankingButtonProps {
  category: string;
  gender: "Caballeros" | "Damas";
  players: PrintablePlayerItem[];
}

const PLAYERS_PER_PAGE = 15;

export default function DownloadRankingButton({
  category,
  gender,
  players,
}: DownloadRankingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isRendering, startRendering] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDamas = gender === "Damas";

  // Agrupar en páginas de 15 puestos
  const pages: PrintablePlayerItem[][] = [];
  if (players.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < players.length; i += PLAYERS_PER_PAGE) {
      pages.push(players.slice(i, i + PLAYERS_PER_PAGE));
    }
  }

  const totalPages = pages.length;

  // Renderizar la página activa en el canvas cuando se abre el modal o cambia de página
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    startRendering(async () => {
      const pagePlayers = pages[currentPage] || [];
      await renderRankingFlyerToCanvas(canvasRef.current!, {
        category,
        gender,
        pagePlayers,
        pageIndex: currentPage,
        totalPages,
        printDate: new Date(),
      });
    });
  }, [isOpen, currentPage, category, gender, totalPages]);

  // Descarga una página específica
  const downloadPage = async (pageIdx: number) => {
    // Si la página a descargar no es la actualmente renderizada, renderizarla temporalmente en un canvas offscreen
    let targetCanvas = canvasRef.current;
    if (pageIdx !== currentPage || !targetCanvas) {
      targetCanvas = document.createElement("canvas");
      await renderRankingFlyerToCanvas(targetCanvas, {
        category,
        gender,
        pagePlayers: pages[pageIdx] || [],
        pageIndex: pageIdx,
        totalPages,
        printDate: new Date(),
      });
    }

    const dataUrl = targetCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanGen = gender.toLowerCase();
    link.download = `ranking-spt-${cleanCat}-${cleanGen}-pag${pageIdx + 1}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleDownloadCurrent = () => {
    downloadPage(currentPage);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < totalPages; i++) {
      await downloadPage(i);
      // Pequeña pausa entre descargas
      await new Promise((res) => setTimeout(res, 350));
    }
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <>
      {/* Botón Principal: DESCARGAR (Redes Sociales 9:16) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer border ${
          isDamas
            ? "bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white border-pink-400 shadow-pink-500/20"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400 shadow-emerald-500/20"
        }`}
        title={`Descargar imagen 9:16 para redes sociales (Historias / WhatsApp) de ${category} categoría`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Descargar</span>
        <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-dark-950/40 border border-white/20 font-mono">
          Redes 9:16
        </span>
      </button>

      {/* Modal de Descarga y Previsualización para Redes */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Descargar Flyer 9:16 para Redes • ${category} Categoría (${gender})`}
        size="lg"
      >
        <div className="space-y-4">
          {/* Barra de Acciones y Paginador */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-dark-950/90 border border-dark-800">
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Formato Historias / Redes (1080 × 1920 px)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Página {currentPage + 1} de {totalPages} • {players.length} jugadores en total
              </div>
            </div>

            {/* Selector de Página si hay más de 1 */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 bg-dark-900 border border-dark-700 rounded-xl p-1">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="p-1 rounded-lg hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-white px-2">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="p-1 rounded-lg hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed text-white"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Botones de Descarga */}
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-700 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Descargar todas las páginas en archivos separados"
                >
                  Descargar Todas ({totalPages})
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadCurrent}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg cursor-pointer ${
                  downloadSuccess
                    ? "bg-emerald-500 text-dark-950 shadow-emerald-500/30"
                    : isDamas
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-rose-500/20"
                    : "bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-dark-950 shadow-emerald-500/20"
                }`}
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Descargado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {totalPages > 1 ? `Descargar Pág. ${currentPage + 1}` : "Descargar Imagen PNG"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Vista Previa del Canvas */}
          <div className="relative rounded-2xl border border-dark-800 bg-dark-950/95 p-4 flex flex-col items-center justify-center min-h-[480px] max-h-[70vh] overflow-y-auto">
            {isRendering && (
              <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Generando diseño para redes...</span>
                </div>
              </div>
            )}

            <div className="w-full max-w-[340px] shadow-2xl rounded-2xl overflow-hidden border border-white/10 aspect-[9/16]">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resolución de descarga: 1080 × 1920 px (Formato historias / vertical 9:16)</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
