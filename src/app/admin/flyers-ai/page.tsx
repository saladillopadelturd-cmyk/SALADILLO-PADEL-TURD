"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import { renderFlyerOnCanvas, type FlyerRenderData } from "@/lib/canvas/flyerRenderer";
import {
  Download,
  Shuffle,
  Share2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Eye,
  Sliders,
  Maximize2,
  Layers,
  Check,
} from "lucide-react";

export interface LocalBackground {
  id: string;
  filename: string;
  title: string;
  description: string;
  src: string;
}

export const FONDOS_DISPONIBLES: LocalBackground[] = [
  {
    id: "fondo_1",
    filename: "fondo_1.jpg",
    title: "Cancha de Cristal Neón",
    description: "Pista panorámica nocturna con iluminación neón cian y jugadores",
    src: "/assets/fondos/fondo_1.jpg",
  },
  {
    id: "fondo_2",
    filename: "fondo_2.jpg",
    title: "Primer Plano Pala y Pelota",
    description: "Pala de fibra de carbono perforada y pelota oficial sobre césped azul",
    src: "/assets/fondos/fondo_2.jpg",
  },
  {
    id: "fondo_3",
    filename: "fondo_3.jpg",
    title: "Club Panorámico Indoor",
    description: "Instalaciones premium con pistas de pádel techadas e iluminación pro",
    src: "/assets/fondos/fondo_3.jpg",
  },
  {
    id: "fondo_4",
    filename: "fondo_4.jpg",
    title: "Red y Pelota en Movimiento",
    description: "Tomas de acción a nivel de red con líneas perimetrales neón",
    src: "/assets/fondos/fondo_4.jpg",
  },
];

export default function AdminFlyersPage() {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [loadedBgSrc, setLoadedBgSrc] = useState<string>("");

  // Form State
  const [title, setTitle] = useState("TORNEO ABIERTO DE PÁDEL");
  const [category, setCategory] = useState("5TA LIBRES");
  const [date, setDate] = useState("24 Y 25 DE OCTUBRE");
  const [location, setLocation] = useState("QUINTA LA PISTA - SALADILLO");
  const [prizes, setPrizes] = useState("$200.000 EN PREMIOS");
  const [sponsorsText, setSponsorsText] = useState("Bullpadel, Head, Saladillo Deportes, Padel Pro, Nox");

  // Background Selection Mode: 'random' | string (filename)
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>("random");
  const [currentActiveFile, setCurrentActiveFile] = useState<string>(FONDOS_DISPONIBLES[0].filename);

  // System & UI State
  const [loadingBg, setLoadingBg] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  // Cargar torneos existentes para autocompletar
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

  // Autocompletar desde torneo existente
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

  // Función para cargar una imagen local en memoria para el Canvas
  const loadLocalImage = useCallback((filepath: string) => {
    setLoadingBg(true);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBgImage(img);
      setLoadedBgSrc(filepath);
      setLoadingBg(false);
    };
    img.onerror = () => {
      console.error(`Error al cargar el fondo local: ${filepath}`);
      // Fallback intentando sin /assets/ si fuera necesario
      const fallbackPath = filepath.replace("/assets/fondos/", "/fondos/");
      if (fallbackPath !== filepath) {
        img.src = fallbackPath;
      } else {
        setLoadingBg(false);
      }
    };
    img.src = filepath;
  }, []);

  // Seleccionar fondo según modo o archivo específico
  const applyBackground = useCallback(
    (targetId: string, forceNextRandom = false) => {
      let chosenFile = FONDOS_DISPONIBLES[0].filename;

      if (targetId === "random" || forceNextRandom) {
        // Elegir uno al azar diferente al actual si hay más de 1
        const available = FONDOS_DISPONIBLES.filter(
          (f) => forceNextRandom ? f.filename !== currentActiveFile : true
        );
        const randomItem = available[Math.floor(Math.random() * available.length)] || FONDOS_DISPONIBLES[0];
        chosenFile = randomItem.filename;
      } else {
        const found = FONDOS_DISPONIBLES.find((f) => f.id === targetId || f.filename === targetId);
        if (found) chosenFile = found.filename;
      }

      setCurrentActiveFile(chosenFile);
      loadLocalImage(`/assets/fondos/${chosenFile}`);
    },
    [currentActiveFile, loadLocalImage]
  );

  // Inicialización del fondo al montar el componente
  useEffect(() => {
    applyBackground(selectedBackgroundId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar cambio en el selector de fondo
  const handleBackgroundChange = (newVal: string) => {
    setSelectedBackgroundId(newVal);
    applyBackground(newVal);
  };

  // Botón "Otro Fondo Al Azar"
  const handleShuffleBackground = () => {
    applyBackground("random", true);
    setStatusMsg({
      type: "success",
      text: "Se cambió el fondo por otra imagen de la galería local.",
    });
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
      link.download = `flyer-spt-${cleanTitle || "torneo"}.png`;
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

        const fileName = `flyer-spt-${Date.now()}.png`;
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
            <Layers className="w-3.5 h-3.5" />
            <span>FORMATO HORIZONTAL 16:9 • GALERÍA LOCAL</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Generador de Flyers
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Diseña flyers horizontales oficiales (1920 × 1080 px) combinando fondos locales de pádel y gráficos vectoriales de alta definición.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleShuffleBackground}
            disabled={loadingBg}
            className="flex items-center gap-2 text-xs"
          >
            <Shuffle className="w-4 h-4" />
            Otro Fondo Al Azar
          </Button>

          <Button
            onClick={handleDownload}
            disabled={loadingBg}
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
            <span className="text-xs font-mono text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              Fondo activo: {currentActiveFile}
            </span>
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

          {loadingBg && (
            <div className="absolute inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-sm font-semibold animate-pulse">
                Cargando fondo local...
              </span>
            </div>
          )}
        </div>

        {/* Barra de Acciones Rápidas del Canvas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-800">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShuffleBackground}
              disabled={loadingBg}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Cambiar Fondo Al Azar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={loadingBg}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Flyer (PNG 1920x1080)</span>
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePublishToNews}
            disabled={loadingBg || publishing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs py-2 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 font-semibold"
          >
            <Share2 className={`w-3.5 h-3.5 ${publishing ? "animate-spin" : ""}`} />
            <span>{publishing ? "Publicando..." : "Publicar Directo en Portada (Novedades)"}</span>
          </Button>
        </div>
      </Card>

      {/* SECCIÓN 2: FORMULARIO Y SELECCIÓN DE FONDOS LOCALES */}
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

        {/* Columna Derecha: Galería de Fondos Locales (5 columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-dark-800 space-y-4">
            <div className="border-b border-dark-800 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Galería Local de Fondos (assets/fondos/)
              </h2>
              <span className="text-[11px] text-dark-400">
                {FONDOS_DISPONIBLES.length} disponibles
              </span>
            </div>

            {/* Dropdown de Selección */}
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Modo de Selección de Fondo:
              </label>
              <select
                value={selectedBackgroundId}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="random">🎲 Modo Aleatorio (Elegir al azar al generar)</option>
                <optgroup label="Fondos en carpeta local:">
                  {FONDOS_DISPONIBLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.filename})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Galería Visual de Miniaturas Clickeables */}
            <div className="space-y-2.5 pt-2">
              <span className="block text-xs font-medium text-dark-400">
                O haz clic directamente en una miniatura para aplicarla:
              </span>
              <div className="grid grid-cols-2 gap-3">
                {FONDOS_DISPONIBLES.map((item) => {
                  const isActive = currentActiveFile === item.filename;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleBackgroundChange(item.id)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                        isActive
                          ? "border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                          : "border-dark-700/80 hover:border-dark-500 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={item.src}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                        <span className="text-[11px] font-bold text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-dark-300">
                          {item.filename}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-dark-950 flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <Button
                onClick={handleShuffleBackground}
                disabled={loadingBg}
                className="w-full py-3 bg-dark-800 hover:bg-dark-700 text-white font-bold text-sm rounded-xl border border-dark-700 flex items-center justify-center gap-2"
              >
                <Shuffle className="w-4 h-4 text-emerald-400" />
                <span>Rotar Fondo Al Azar</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
