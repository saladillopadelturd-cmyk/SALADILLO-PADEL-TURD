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
  Maximize2,
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
    id: "cancha-neon",
    name: "Cancha Nocturna / Neón",
    description: "Cancha de cristal con iluminación neón cian y verde, pala de carbono y pelota sobre césped sintético",
    prompt:
      "cinematic wide shot of a modern glass padel court at night, yellow padel ball and carbon padel racket on turf, glowing neon cyan and green lighting, highly detailed photorealistic, no text, 8k resolution --ar 16:9",
    accent: "from-cyan-500 to-emerald-400",
  },
  {
    id: "pala-pelota",
    name: "Cerrado en Pala y Pelota",
    description: "Primer plano extremo de pala de fibra de carbono perforada y pelota oficial con iluminación dramática",
    prompt:
      "extreme close up of a professional carbon fiber padel racket and official yellow padel ball with perforations, padel court grid background, dramatic studio lighting, dark background, photorealistic, no text --ar 16:9",
    accent: "from-amber-400 to-yellow-600",
  },
  {
    id: "accion-epica",
    name: "Acción / Épico",
    description: "Pelota de pádel rebotando con dinamismo sobre césped azul, paredes de cristal y red de fondo",
    prompt:
      "dramatic action shot of a padel ball bouncing on blue turf court, glass walls and net in background, motion blur, intense sports atmosphere, high contrast photorealistic, no text --ar 16:9",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    id: "custom",
    name: "Personalizado...",
    description: "Escribe tu propia instrucción en inglés orientada a pádel",
    prompt: "",
    accent: "from-purple-500 to-pink-500",
  },
];

export default function AdminFlyersAiPage() {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Form State
  const [title, setTitle] = useState("TORNEO ABIERTO DE PÁDEL");
  const [category, setCategory] = useState("5TA LIBRES");
  const [date, setDate] = useState("24 Y 25 DE OCTUBRE");
  const [location, setLocation] = useState("QUINTA LA PISTA - SALADILLO");
  const [prizes, setPrizes] = useState("$200.000 EN PREMIOS");
  const [sponsorsText, setSponsorsText] = useState("Bullpadel, Head, Saladillo Deportes, Padel Pro, Nox");

  const [selectedPreset, setSelectedPreset] = useState("cancha-neon");
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

  // Autocompletar campos desde torneo existente
  const handleTournamentSelect = (tourId: string) => {
    setSelectedTournamentId(tourId);
    const tour = tournaments.find((t) => t.id === tourId);
    if (!tour) return;

    setTitle(tour.name?.toUpperCase() || "");
    setCategory(tour.category?.toUpperCase() || "5TA LIBRES");
    if (tour.date) {
      const parsedDate = new Date(tour.date).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
      });
      setDate(parsedDate.toUpperCase());
    }
    if (tour.location) setLocation(tour.location.toUpperCase());
  };

  // Re-dibujar el Canvas cada vez que cambien datos o imagen
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

  // Generar o regenerar fondo con Pollinations.ai (1920x1080)
  const generateBackground = async (newSeed?: number) => {
    const currentSeed = newSeed ?? Math.floor(Math.random() * 999999);
    setSeed(currentSeed);
    setLoadingAI(true);
    setStatusMsg(null);

    try {
      const activePreset = PRESET_STYLES.find((p) => p.id === selectedPreset);
      const promptText =
        selectedPreset === "custom"
          ? customPrompt || "cinematic wide shot of a modern glass padel court at night with padel racket"
          : activePreset?.prompt || PRESET_STYLES[0].prompt;

      // URL en formato horizontal 1920x1080 px
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        promptText
      )}?width=1920&height=1080&nologo=true&seed=${currentSeed}`;

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
          text: "¡Fondo de pádel generado con éxito! Renderizado horizontal aplicado.",
        });
      };
      img.onerror = () => {
        throw new Error("Error al procesar el mapa de bits del fondo.");
      };
      img.src = objectUrl;
    } catch (err: unknown) {
      console.error("Error generando imagen:", err);
      const msg = err instanceof Error ? err.message : "Error al conectar con Pollinations.ai";
      setStatusMsg({ type: "error", text: msg });
      setLoadingAI(false);
    }
  };

  // Descargar el Canvas como PNG horizontal (1920x1080 px)
  const handleDownload = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      link.download = `flyer-horizontal-spt-${cleanTitle || "torneo"}.png`;
      link.href = dataUrl;
      link.click();

      setStatusMsg({
        type: "success",
        text: "Flyer horizontal descargado en alta resolución (1920x1080 px - 16:9).",
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

        const fileName = `flyer-banner-${Date.now()}.png`;
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
          text: "¡Flyer horizontal publicado con éxito en el Visor de Novedades de la Portada!",
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FORMATO HORIZONTAL 16:9 (1920 × 1080 PX)</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Generador de Flyers con IA
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Crea flyers horizontales de pádel para publicaciones, pantallas y banners combinando fondos de IA y gráficos vectoriales SPT.
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
            className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-bold hover:from-emerald-400 hover:to-lime-400 shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            Descargar Flyer (16:9)
          </Button>
        </div>
      </div>

      {/* Notificación de Estado */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in ${
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

      {/* SECCIÓN 1: VISTA PREVIA DEL CANVAS HORIZONTAL EN VIVO (16:9) */}
      <Card className="p-4 sm:p-6 border-dark-800 bg-dark-900/90 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Vista Previa en Vivo • Resolución Nativa 1920 × 1080 px (16:9)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-dark-500 hidden sm:inline">Seed: #{seed}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-xs text-emerald-400 hover:text-white flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Guardar PNG
            </Button>
          </div>
        </div>

        {/* Contenedor Responsivo del Canvas 16:9 */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-dark-700/80 bg-black flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Overlay de Carga durante la Generación de IA */}
          {loadingAI && (
            <div className="absolute inset-0 bg-dark-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
              <h4 className="text-base font-bold text-white">Generando Fondo de Pádel 16:9 con IA...</h4>
              <p className="text-xs text-dark-400 mt-1 max-w-sm">
                Conectando con Pollinations.ai para sintetizar una imagen cinematográfica en alta resolución sin marcas de agua.
              </p>
            </div>
          )}
        </div>

        {/* Barra de Acciones Rápidas del Canvas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateBackground(Math.floor(Math.random() * 999999))}
              disabled={loadingAI}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerar con Nuevo Seed</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={loadingAI}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG (1920x1080)</span>
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePublishToNews}
            disabled={loadingAI || publishing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs py-2 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 font-semibold"
          >
            <Share2 className={`w-3.5 h-3.5 ${publishing ? "animate-spin" : ""}`} />
            <span>{publishing ? "Publicando..." : "Publicar Directo en Portada (Novedades)"}</span>
          </Button>
        </div>
      </Card>

      {/* SECCIÓN 2: FORMULARIO Y CONFIGURACIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Datos del Torneo (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Autocompletar desde Torneo Existente */}
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
                <option value="">-- Seleccionar torneo para cargar sus datos automáticamente --</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category}) - {new Date(t.date).toLocaleDateString("es-AR")}
                  </option>
                ))}
              </select>
            </Card>
          )}

          {/* Formulario de Textos */}
          <Card className="p-6 border-dark-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Sliders className="w-4 h-4 text-primary-400" />
              Información y Textos del Flyer
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
                  placeholder="Ej: TORNEO ABIERTO DE PÁDEL"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:border-primary-500 focus:outline-none"
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
                  placeholder="Ej: 5TA LIBRES / SUMA 11"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:border-primary-500 focus:outline-none"
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
                  placeholder="Ej: 24 Y 25 DE OCTUBRE"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:border-primary-500 focus:outline-none"
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
                  placeholder="Ej: QUINTA LA PISTA - SALADILLO"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white uppercase focus:border-primary-500 focus:outline-none"
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
                placeholder="Ej: $200.000 EN PREMIOS"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-amber-400 font-semibold uppercase focus:border-primary-500 focus:outline-none"
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
                placeholder="Ej: Bullpadel, Head, Saladillo Deportes, Padel Pro, Nox"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-primary-500 focus:outline-none"
              />
              <p className="text-[11px] text-dark-500 mt-1">
                Se ubicarán ordenadas automáticamente en la barra inferior del flyer.
              </p>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Presets Visuales de Pádel (5 columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-dark-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Palette className="w-4 h-4 text-emerald-400" />
              Fondos de Pádel con IA (Pollinations.ai)
            </h2>

            <div className="space-y-3">
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
                    <p className="text-xs text-dark-400 leading-relaxed">{preset.description}</p>
                  </div>
                );
              })}
            </div>

            {selectedPreset === "custom" && (
              <div className="pt-2 animate-in">
                <label className="block text-xs font-medium text-dark-300 mb-1.5">
                  Prompt personalizado en inglés (incluye siempre --ar 16:9):
                </label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="cinematic wide shot of padel court glass wall, padel ball on blue turf, neon lights --ar 16:9"
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl p-3 text-xs text-white focus:border-primary-500 focus:outline-none"
                />
              </div>
            )}

            <div className="pt-3">
              <Button
                onClick={() => generateBackground()}
                disabled={loadingAI}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-black text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${loadingAI ? "animate-spin" : ""}`} />
                <span>{loadingAI ? "Generando Fondo con IA..." : "Generar Fondo de Pádel"}</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
