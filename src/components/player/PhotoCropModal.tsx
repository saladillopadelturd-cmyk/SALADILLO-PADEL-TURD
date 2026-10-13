"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ZoomIn, ZoomOut, RotateCcw, Check, Upload, Move, Sparkles } from "lucide-react";

interface PhotoCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onConfirm: (croppedDataUrl: string, croppedBlob: Blob) => void;
  onClose: () => void;
  onSelectNewFile?: () => void;
}

const CROP_BOX_SIZE = 300; // Tamaño del visor cuadrado en pantalla (px)
const OUTPUT_SIZE = 600;   // Tamaño de la imagen cuadrada resultante (px) en alta resolución

export default function PhotoCropModal({
  isOpen,
  imageSrc,
  onConfirm,
  onClose,
  onSelectNewFile,
}: PhotoCropModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar la imagen cuando cambie el source
  useEffect(() => {
    if (!imageSrc) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);

      // Calcular la escala mínima requerida para que la imagen cubra completamente el cuadrado CROP_BOX_SIZE
      const scaleX = CROP_BOX_SIZE / img.naturalWidth;
      const scaleY = CROP_BOX_SIZE / img.naturalHeight;
      const baseFitScale = Math.max(scaleX, scaleY);

      setMinScale(baseFitScale);
      setScale(baseFitScale);
      setPosition({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Manejador de Zoom (Ampliar / Reducir)
  const handleZoomChange = (newScale: number) => {
    const clamped = Math.max(minScale * 0.9, Math.min(newScale, minScale * 4));
    setScale(clamped);
  };

  const handleZoomIn = () => {
    handleZoomChange(scale * 1.15);
  };

  const handleZoomOut = () => {
    handleZoomChange(scale / 1.15);
  };

  const handleReset = () => {
    setScale(minScale);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom con rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // ── Drag / Pan con Mouse ──
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ ...position });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: initialPos.x + dx,
        y: initialPos.y + dy,
      });
    },
    [isDragging, dragStart, initialPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Drag / Pan con Touch (Móviles) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setInitialPos({ ...position });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    setPosition({
      x: initialPos.x + dx,
      y: initialPos.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ── Confirmar y recortar la zona útil cuadrada ──
  const handleConfirmCrop = () => {
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const ratio = OUTPUT_SIZE / CROP_BOX_SIZE;

    ctx.save();
    // Centrar en el canvas de salida
    ctx.translate(OUTPUT_SIZE / 2 + position.x * ratio, OUTPUT_SIZE / 2 + position.y * ratio);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onConfirm(dataUrl, blob);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Encuadre de Foto de Perfil"
      size="md"
    >
      <div className="space-y-5">
        {/* Instrucciones de zona útil */}
        <div className="bg-dark-900/90 border border-emerald-500/30 rounded-xl p-3 text-xs text-dark-300 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white block">Ajusta tu rostro en la zona útil cuadrada</span>
            <p className="text-dark-400">
              Arrastra la foto con el dedo o mouse para reencuadrar y usa los controles de zoom para ampliar o reducir. En tu perfil solo se verá la zona dentro del recuadro.
            </p>
          </div>
        </div>

        {/* Viewport de recorte interactivo */}
        <div className="flex flex-col items-center justify-center">
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative rounded-2xl overflow-hidden bg-black select-none border-2 border-emerald-500/60 shadow-2xl ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
          >
            {/* Imagen manipulable */}
            {image && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
              >
                <img
                  src={image.src}
                  alt="Previsualización para encuadre"
                  draggable={false}
                  className="max-w-none pointer-events-none select-none transition-none"
                  style={{
                    width: `${image.naturalWidth * scale}px`,
                    height: `${image.naturalHeight * scale}px`,
                  }}
                />
              </div>
            )}

            {/* Guías visuales de zona útil (Grilla de tercios y silueta facial) */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-emerald-400/40">
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-b border-white/15" />
              <div className="border-r border-b border-white/15" />
              <div className="border-r border-b border-white/15 flex items-center justify-center">
                {/* Círculo guía centrado para el rostro */}
                <div className="w-24 h-24 rounded-full border border-dashed border-emerald-400/35" />
              </div>
              <div className="border-b border-white/15" />
              <div className="border-r border-white/15" />
              <div className="border-r border-white/15" />
              <div />
            </div>

            {/* Badge de zona útil en la esquina */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none">
              <span className="bg-dark-950/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 shadow-sm flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                Zona útil cuadrada (1:1)
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Controles de Zoom (Ampliar / Reducir) y Reencuadre */}
        <div className="space-y-3 bg-dark-900/60 p-3.5 rounded-xl border border-dark-800">
          <div className="flex items-center justify-between text-xs font-semibold text-dark-300">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
              Ampliar / Reducir
            </span>
            <span className="font-mono text-emerald-400 text-[11px]">
              {Math.round((scale / minScale) * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 text-dark-200 hover:text-white flex items-center justify-center border border-dark-700 transition-all cursor-pointer"
              title="Reducir tamaño"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={minScale}
              max={minScale * 3.5}
              step={minScale * 0.05}
              value={scale}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 text-dark-200 hover:text-white flex items-center justify-center border border-dark-700 transition-all cursor-pointer"
              title="Ampliar tamaño"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:scale-95 text-dark-400 hover:text-white flex items-center justify-center border border-dark-700 transition-all cursor-pointer"
              title="Restablecer posición y zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-dark-800">
          <div>
            {onSelectNewFile && (
              <button
                type="button"
                onClick={onSelectNewFile}
                className="text-xs text-dark-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Elegir otra imagen</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCrop}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 font-black hover:from-emerald-400 hover:to-teal-400 text-xs shadow-md shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Encuadre</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
