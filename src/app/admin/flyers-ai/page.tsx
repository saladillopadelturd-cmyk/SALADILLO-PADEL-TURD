"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import { renderFlyerOnCanvas, type FlyerRenderData } from "@/lib/canvas/flyerRenderer";
import {
  Sparkles,
  Download,
  RefreshCw,
  Share2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Palette,
  Eye,
  Sliders,
  Image as ImageIcon,
} from "lucide-react";

interface PresetStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
  accent: string;
}

const PRESET_STYLES: PresetStyle[] = [
  {
    id: "neon",
    name: "Neón / Futurista",
    description: "Luces cian y verde lima con contrastes deportivos modernos",
    prompt: "abstract padel racket on court dark background neon cyan and lime green lights high contrast photorealistic no text",
    accent: "from-cyan-500 to-emerald-400",
  },
  {
    id: "clasico",
    name: "Clásico / Elegante",
    description: "Cancha oscura con destellos dorados y atmósfera premium",
    prompt: "dark elegant padel court background golden highlights dark atmosphere clean photorealistic no text",
    accent: "from-amber-400 to-yellow-600",
  },
  {
    id: "fuego",
    name: "Fuego / Épico",
    description: "Pala de pádel con humo y fuego en iluminación dramática",
    prompt: "dramatic padel racket fire smoke dark background intense lighting photorealistic no text",
    accent: "from-rose-500 to-amber-500",
  },
  {
    id: "nocturno",
    name: "Estadio Nocturno Pro",
    description: "Cancha panorámica bajo focos de estadio cinematográfico",
    prompt: "modern professional panoramic padel court at night with stadium spotlights cinematic 8k photorealistic no text",
    accent: "from-blue-600 to-indigo-500",
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Escribe tu propio prompt para el fondo de IA",
    prompt: "",
    accent: "from-purple-500 to-pink-500",
  },
];

export default function AdminFlyersAiPage() {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Form State
  const [title, setTitle] = useState("Torneo Abierto de Pádel");
  const [category, setCategory] = useState("5ta Libres");
  const [date, setDate] = useState("24 y 25 de Octubre");
  const [location, setLocation] = useState("Quinta La Pista - Saladillo");
  const [prizes, setPrizes] = useState("$200.000 en Premios");
  const [sponsorsText, setSponsorsText] = useState("Bullpadel, Head, Saladillo Deportes, Padel Pro");

  const [selectedPreset, setSelectedPreset] = useState("neon");
  const [customPrompt, setCustomPrompt] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));

  // System & UI State
  const [loadingAI, setLoadingAI] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  // Cargar torneos para autocompletar
  useEffect(() => {
    async function loadTournaments() {
      try {
        const { data } = await supabase
          .from("tournaments")
          .select("*")
          .order("date", { ascending: false });
        if (data) setTournaments(data);
      } catch (err) {
        console.error("Error al cargar torneos:", err);
      }
    }
    loadTournaments();
  }, [supabase]);

  // Si selecciona un torneo existente, autocompletar campos
  const handleTournamentSelect = (tourId: string) => {
    setSelectedTournamentId(tourId);
    const tour = tournaments.find((t) => t.id === tourId);
    if (!tour) return;

    setTitle(tour.name || "");
    setCategory(tour.category || "5ta Libres");
    if (tour.date) {
      const parsedDate = new Date(tour.date).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
      });
      setDate(parsedDate);
    }
    if (tour.location) setLocation(tour.location);
  };

  // Re-dibujar el Canvas cada vez que cambien los textos o la imagen de fondo
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const sponsorsList = sponsorsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const renderData: FlyerRenderData = {
      title,
      category,
      date,
      location,
      prizes,
      sponsors: sponsorsList,
    };

    renderFlyerOnCanvas(canvasRef.current, bgImage, renderData);
  }, [title, category, date, location, prizes, sponsorsText, bgImage]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Generar o regenerar fondo con Pollinations.ai
  const generateBackground = async (newSeed?: number) => {
    const currentSeed = newSeed ?? Math.floor(Math.random() * 999999);
    setSeed(currentSeed);
    setLoadingAI(true);
    setStatusMsg(null);

    try {
      const activePreset = PRESET_STYLES.find((p) => p.id === selectedPreset);
      const promptText =
        selectedPreset === "custom"
          ? customPrompt || "modern padel court abstract background dark neon lights"
          : activePreset?.prompt || PRESET_STYLES[0].prompt;

      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        promptText
      )}?width=1080&height=1920&nologo=true&seed=${currentSeed}`;

      // Descargamos la imagen con fetch como Blob para evitar problemas de CORS en canvas
      const response = await fetch(url);
      if (!response.ok) throw new Error("No se pudo obtener la imagen de Pollinations.ai");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setBgImage(img);
        setLoadingAI(false);
        setStatusMsg({
          type: "success",
          text: "¡Fondo generado con éxito por la IA! Textos vectoriales aplicados.",
        });
      };
      img.onerror = () => {
        throw new Error("Error al renderizar el mapa de bits en el cliente.");
      };
      img.src = objectUrl;
    } catch (err: unknown) {
      console.error("Error generando imagen:", err);
      const msg = err instanceof Error ? err.message : "Error al conectar con Pollinations.ai";
      setStatusMsg({ type: "error", text: msg });
      setLoadingAI(false);
    }
  };

  // Descargar el Canvas como PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      link.download = `flyer-spt-${cleanTitle || "torneo"}.png`;
      link.href = dataUrl;
      link.click();

      setStatusMsg({
        type: "success",
        text: "Flyer descargado en alta resolución (1080x1920 px).",
      });
    } catch (err) {
      console.error("Error al descargar:", err);
      setStatusMsg({
        type: "error",
        text: "Error al exportar el canvas a imagen.",
      });
    }
  };

  // Publicar directamente en el carrusel de Novedades de la Portada
  const handlePublishToNews = async () => {
    if (!canvasRef.current) return;
    setPublishing(true);
    setStatusMsg(null);

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("No se pudo generar el archivo del flyer.");
        }

        const fileName = `flyer-ai-${Date.now()}.png`;
        const filePath = `public/${fileName}`;

        // Subir al bucket 'flyers'
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("flyers")
          .upload(filePath, blob, { contentType: "image/png", upsert: true });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from("flyers").getPublicUrl(uploadData.path);

        // Guardar en la tabla 'flyers'
        const { error: dbError } = await supabase.from("flyers").insert({
          title: `${title} - ${category}`,
          image_url: publicUrl,
          link_url: selectedTournamentId ? `/torneo/${selectedTournamentId}` : null,
          active: true,
          sort_order: 0,
        });

        if (dbError) throw dbError;

        setStatusMsg({
          type: "success",
          text: "¡Flyer publicado con éxito en el Visor de Novedades de la Portada!",
        });
        setPublishing(false);
      }, "image/png");
    } catch (err: unknown) {
      console.error("Error al publicar:", err);
      const msg = err instanceof Error ? err.message : "Error al publicar en novedades";
      setStatusMsg({ type: "error", text: msg });
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HERRAMIENTA CREATIVA IA</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Generador de Flyers con IA
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Crea flyers profesionales en formato Story (1080x1920 px) combinando fondos de IA y tipografías oficiales SPT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => generateBackground()}
            disabled={loadingAI}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAI ? "animate-spin" : ""}`} />
            Regenerar Fondo
          </Button>

          <Button
            onClick={handleDownload}
            disabled={loadingAI}
            className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-bold hover:from-emerald-400 hover:to-lime-400"
          >
            <Download className="w-4 h-4" />
            Descargar Flyer
          </Button>
        </div>
      </div>

      {/* Notificación de Estado */}
      {statusMsg && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm animate-in ${
            statusMsg.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Grid Principal: Formulario a la Izquierda y Canvas Preview a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Controles & Formulario (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tarjeta: Selección de Torneo para Autocompletar */}
          {tournaments.length > 0 && (
            <Card className="p-5 border-emerald-500/20 bg-emerald-950/10">
              <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Autocompletar con un Torneo Creado
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => handleTournamentSelect(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Seleccionar torneo para cargar sus datos --</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category}) - {new Date(t.date).toLocaleDateString("es-AR")}
                  </option>
                ))}
              </select>
            </Card>
          )}

          {/* Tarjeta: Datos del Flyer */}
          <Card className="p-6 border-dark-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Sliders className="w-4 h-4 text-primary-400" />
              1. Información del Torneo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Título del Torneo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Torneo Abierto de Pádel"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Categoría
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: 5ta Libres / Suma 11"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Fecha del Evento
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Ej: 24 y 25 de Octubre"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Sede / Lugar
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Quinta La Pista - Saladillo"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Premios y Trofeos
              </label>
              <input
                type="text"
                value={prizes}
                onChange={(e) => setPrizes(e.target.value)}
                placeholder="Ej: $200.000 en Premios + Trofeos"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-amber-400 font-semibold focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Sponsors y Marcas (separadas por comas)
              </label>
              <input
                type="text"
                value={sponsorsText}
                onChange={(e) => setSponsorsText(e.target.value)}
                placeholder="Ej: Bullpadel, Head, Padel Pro, Saladillo Deportes"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              />
              <p className="text-[11px] text-dark-500 mt-1">
                Se renderizarán automáticamente como insignias al pie del flyer.
              </p>
            </div>
          </Card>

          {/* Tarjeta: Estilo de Fondo (Presets IA) */}
          <Card className="p-6 border-dark-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Palette className="w-4 h-4 text-emerald-400" />
              2. Estilo de Fondo con IA (Pollinations.ai)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_STYLES.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-dark-800 border-emerald-400 shadow-md shadow-emerald-500/10"
                        : "bg-dark-900/60 border-dark-700/60 hover:border-dark-600 hover:bg-dark-850"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${preset.accent}`}
                      />
                      <span className="text-sm font-bold text-white">{preset.name}</span>
                    </div>
                    <p className="text-xs text-dark-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {selectedPreset === "custom" && (
              <div className="pt-2 animate-in">
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Prompt personalizado en inglés (para mayor fidelidad):
                </label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="ej. cinematic close up of a padel ball breaking through glass wall dark lightning atmosphere..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs text-white focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={() => generateBackground()}
                disabled={loadingAI}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-black text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${loadingAI ? "animate-spin" : ""}`} />
                <span>{loadingAI ? "Generando Fondo con IA..." : "Generar Fondo con IA"}</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Canvas Visualizer & Acciones Rápidas (5 columnas) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <Card className="p-4 border-dark-800 bg-dark-900/90 shadow-2xl overflow-hidden flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Vista Previa (1080 × 1920)
              </span>
              <span className="text-[11px] font-mono text-dark-500">Seed: #{seed}</span>
            </div>

            {/* Contenedor del Canvas con loader */}
            <div className="relative w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-dark-700/80 bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Overlay de Carga */}
              {loadingAI && (
                <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-emerald-400 animate-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Generando Arte con IA...</h4>
                  <p className="text-xs text-dark-400 mt-1 max-w-[200px]">
                    Consultando modelo generativo de Pollinations.ai sin marcas de agua.
                  </p>
                </div>
              )}
            </div>

            {/* Acciones del Canvas */}
            <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateBackground(Math.floor(Math.random() * 999999))}
                disabled={loadingAI}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Nuevo Seed</span>
              </Button>

              <Button
                size="sm"
                onClick={handleDownload}
                disabled={loadingAI}
                className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PNG</span>
              </Button>
            </div>

            {/* Botón Destacado: Publicar en Novedades */}
            <div className="w-full mt-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePublishToNews}
                disabled={loadingAI || publishing}
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 font-semibold"
              >
                <Share2 className={`w-3.5 h-3.5 ${publishing ? "animate-spin" : ""}`} />
                <span>
                  {publishing ? "Subiendo a Portada..." : "Publicar Directo en Portada (Novedades)"}
                </span>
              </Button>
              <p className="text-[10px] text-dark-500 text-center mt-1">
                Guarda este flyer en Supabase y lo activa en el carrusel de inicio.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
