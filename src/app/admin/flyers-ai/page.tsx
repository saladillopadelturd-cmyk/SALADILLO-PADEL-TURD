"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import {
  renderFlyerOnCanvas,
  ALL_THEMES,
  THEMES,
  ALL_LAYOUTS,
  LAYOUT_CONFIGS,
  type FlyerRenderData,
  type FlyerTheme,
  type FlyerLayout,
} from "@/lib/canvas/flyerRenderer";
import {
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Eye,
  Sliders,
  Maximize2,
  Layers,
  Check,
  Sparkles,
  Palette,
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
  {
    id: "fondo_5",
    filename: "fondo_5.jpg",
    title: "Pista Profesional #5",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_5.jpg",
  },
  {
    id: "fondo_6",
    filename: "fondo_6.jpg",
    title: "Pista Profesional #6",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_6.jpg",
  },
  {
    id: "fondo_7",
    filename: "fondo_7.jpg",
    title: "Pista Profesional #7",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_7.jpg",
  },
  {
    id: "fondo_8",
    filename: "fondo_8.jpg",
    title: "Pista Profesional #8",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_8.jpg",
  },
  {
    id: "fondo_9",
    filename: "fondo_9.jpg",
    title: "Pista Profesional #9",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_9.jpg",
  },
  {
    id: "fondo_10",
    filename: "fondo_10.jpg",
    title: "Pista Profesional #10",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_10.jpg",
  },
  {
    id: "fondo_11",
    filename: "fondo_11.jpg",
    title: "Pista Profesional #11",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_11.jpg",
  },
  {
    id: "fondo_12",
    filename: "fondo_12.jpg",
    title: "Pista Profesional #12",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_12.jpg",
  },
  {
    id: "fondo_13",
    filename: "fondo_13.jpg",
    title: "Pista Profesional #13",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_13.jpg",
  },
  {
    id: "fondo_14",
    filename: "fondo_14.jpg",
    title: "Pista Profesional #14",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_14.jpg",
  },
  {
    id: "fondo_15",
    filename: "fondo_15.jpg",
    title: "Pista Profesional #15",
    description: "Fondo de pádel de alta definición",
    src: "/assets/fondos/fondo_15.jpg",
  },
];

export default function AdminFlyersPage() {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // Cargar logotipo oficial SPT para el compositor del flyer
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setLogoImage(img);
    };
    img.src = "/LOGOSPT.png";
  }, []);

  // Form State
  const [title, setTitle] = useState("TORNEO ABIERTO DE PÁDEL");
  const [category, setCategory] = useState("5TA LIBRES");
  const [date, setDate] = useState("24 Y 25 DE OCTUBRE");
  const [location, setLocation] = useState("QUINTA LA PISTA - SALADILLO");
  const [prizes, setPrizes] = useState("$200.000 EN PREMIOS");
  const [sponsorsText, setSponsorsText] = useState("Bullpadel, Head, Saladillo Deportes, Padel Pro, Nox");

  // Selection & Theme States
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>("random");
  const [currentActiveFile, setCurrentActiveFile] = useState<string>(FONDOS_DISPONIBLES[0].filename);
  const [currentTheme, setCurrentTheme] = useState<FlyerTheme>("neon_emerald");
  const [currentLayout, setCurrentLayout] = useState<FlyerLayout>("split_card");

  // System & UI State
  const [loadingBg, setLoadingBg] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
      setLoadingBg(false);
    };
    img.onerror = () => {
      console.error(`Error al cargar el fondo local: ${filepath}`);
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
        const available = FONDOS_DISPONIBLES.filter(
          (f) => forceNextRandom ? f.filename !== currentActiveFile : true
        );
        const randomItem =
          available[Math.floor(Math.random() * available.length)] || FONDOS_DISPONIBLES[0];
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

  // Inicialización al montar el componente
  useEffect(() => {
    applyBackground(selectedBackgroundId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar cambio manual en el selector de fondo
  const handleBackgroundChange = (newVal: string) => {
    setSelectedBackgroundId(newVal);
    applyBackground(newVal);
  };

  /**
   * REGENERAR FLYER:
   * Diseñado por @spt-flyer-designer:
   * 1. Cambia imagen de fondo de flyer (FONDOS_DISPONIBLES diferentes del actual).
   * 2. Cambia el diseño y la distribución de títulos y textos del flyer (alineación, escala, disposición).
   * 3. Cambia el diseño general del flyer (distribución de tarjetas: lateral, podio 3 columnas o revista panorámica).
   * 4. Cambia la ubicación del logo SaladilloPadelTour (izq, centro con halo, der o cabecera corrida).
   */
  const handleRegenerateFlyer = () => {
    // 1. Nuevo fondo diferente del actual
    const availableFondos = FONDOS_DISPONIBLES.filter(
      (f) => f.filename !== currentActiveFile
    );
    const nextFondo =
      availableFondos[Math.floor(Math.random() * availableFondos.length)] ||
      FONDOS_DISPONIBLES[0];

    // 2. Nuevo diseño y distribución general (Layout diferente del actual)
    const availableLayouts = ALL_LAYOUTS.filter((l) => l !== currentLayout);
    const nextLayout =
      availableLayouts[Math.floor(Math.random() * availableLayouts.length)] ||
      ALL_LAYOUTS[0];

    // 3. Nuevo estilo visual / paleta cromática diferente de la actual
    const availableThemes = ALL_THEMES.filter((t) => t !== currentTheme);
    const nextTheme =
      availableThemes[Math.floor(Math.random() * availableThemes.length)] ||
      ALL_THEMES[0];

    setCurrentActiveFile(nextFondo.filename);
    setSelectedBackgroundId(nextFondo.id);
    setCurrentLayout(nextLayout);
    setCurrentTheme(nextTheme);
    loadLocalImage(`/assets/fondos/${nextFondo.filename}`);

    const layoutInfo = LAYOUT_CONFIGS[nextLayout];
    setStatusMsg({
      type: "success",
      text: `✨ Flyer regenerado con éxito: Diseño "${layoutInfo.name}" • Logo: ${layoutInfo.logoPosition} • Fondo: ${nextFondo.filename} • Estilo: ${THEMES[nextTheme].name}`,
    });
  };

  // Re-dibujar el Canvas cada vez que cambien datos, imagen o tema
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
      theme: currentTheme,
      layout: currentLayout,
    };

    renderFlyerOnCanvas(canvasRef.current, bgImage, renderData, logoImage);
  }, [title, category, date, location, prizes, sponsorsText, bgImage, currentTheme, currentLayout, logoImage]);

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

  // CONFIRMAR FLYER DEFINITIVO PARA EL TORNEO
  // Lo coloca automáticamente en la aplicación móvil justo debajo del header y arriba de los botones principales
  const handleConfirmFlyer = async () => {
    if (!canvasRef.current) return;
    setConfirming(true);
    setStatusMsg(null);

    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");

      canvasRef.current.toBlob(async (blob) => {
        let finalImageUrl = dataUrl;

        // 1. Intentar subir imagen al storage de Supabase desde cliente
        if (blob) {
          try {
            const fileName = `flyer-confirmado-${Date.now()}.png`;
            const { error: uploadError, data: uploadData } = await supabase.storage
              .from("flyers")
              .upload(fileName, blob, { contentType: "image/png", upsert: true });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from("flyers").getPublicUrl(uploadData.path);
              if (urlData?.publicUrl) finalImageUrl = urlData.publicUrl;
            }
          } catch (storageErr) {
            console.warn("Storage upload warn, will use server sync:", storageErr);
          }
        }

        const flyerTitle = `${title} - ${category}`;
        const flyerLink = selectedTournamentId ? `/torneo/${selectedTournamentId}` : "#torneos-activos";

        // 2. Enviar a /api/flyers para persistencia garantizada en la nube (Supabase Storage + DB)
        try {
          const apiRes = await fetch("/api/flyers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: flyerTitle,
              image_url: finalImageUrl,
              link_url: flyerLink,
              raw_base64: dataUrl,
            }),
          });
          const apiData = await apiRes.json();
          if (apiData && apiData.flyer && apiData.flyer.image_url) {
            finalImageUrl = apiData.flyer.image_url;
          }
        } catch (apiErr) {
          console.warn("API flyers sync error:", apiErr);
        }

        // 3. Guardar en localStorage para hidratación instantánea
        try {
          const confirmedFlyerData = {
            id: `confirmed-${Date.now()}`,
            title: flyerTitle,
            image_url: finalImageUrl,
            link_url: flyerLink,
            active: true,
            sort_order: -1,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("spt_confirmed_flyer", JSON.stringify(confirmedFlyerData));
          // Disparar evento personalizado para notificar a otros componentes
          window.dispatchEvent(new CustomEvent("spt-flyer-confirmed", { detail: confirmedFlyerData }));
        } catch (storageErr) {
          console.error("Local storage error:", storageErr);
        }

        // 4. Intentar guardar en Supabase Database si la tabla existe
        try {
          await supabase
            .from("flyers")
            .insert({
              title: flyerTitle,
              image_url: finalImageUrl,
              link_url: flyerLink,
              active: true,
              sort_order: -1,
            });
        } catch {}

        // 5. Si hay un torneo seleccionado, guardar referencia
        if (selectedTournamentId) {
          try {
            await supabase
              .from("tournaments")
              .update({ flyer_url: finalImageUrl })
              .eq("id", selectedTournamentId);
          } catch {}
        }

        setStatusMsg({
          type: "success",
          text: "✅ ¡Flyer Confirmado Definitivo! Ya fue publicado automáticamente en la aplicación para móviles justo debajo del header y arriba de los botones TORNEO EN VIVO y RANKINGS.",
        });
        setConfirming(false);
      }, "image/png");
    } catch (err: unknown) {
      console.error("Error al confirmar flyer:", err);
      const msg = err instanceof Error ? err.message : "Error al confirmar flyer";
      setStatusMsg({ type: "error", text: msg });
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>LOGO OFICIAL SPT INTEGRADO</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              <span>1920 × 1080 PX (16:9)</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Generador de Flyers
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Diseña flyers oficiales de pádel en formato horizontal (16:9) con fondos locales y composiciones dinámicas exclusivas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleRegenerateFlyer}
            disabled={loadingBg || confirming}
            className="flex items-center gap-2 text-xs font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            REGENERAR FLYER
          </Button>

          <Button
            onClick={handleConfirmFlyer}
            disabled={loadingBg || confirming}
            className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 text-dark-950 font-black hover:from-emerald-400 hover:to-lime-400 shadow-lg shadow-emerald-500/25 px-4"
          >
            <CheckCircle2 className={`w-4 h-4 ${confirming ? "animate-spin" : ""}`} />
            <span>{confirming ? "Confirmando..." : "CONFIRMAR FLYER"}</span>
          </Button>

          <Button
            onClick={handleDownload}
            disabled={loadingBg || confirming}
            className="flex items-center gap-2 text-xs bg-dark-800 hover:bg-dark-700 text-white font-bold border border-dark-700"
          >
            <Download className="w-4 h-4" />
            Descargar Flyer (16:9)
          </Button>
        </div>
      </div>

      {/* Notificación de Estado */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm animate-in ${
            statusMsg.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>

          {statusMsg.type === "success" && (
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-xs font-bold border border-emerald-500/40 transition-colors shadow-sm"
            >
              <span>Ver en Portada / App Móvil</span>
              <Eye className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* SECCIÓN 1: VISTA PREVIA DEL CANVAS HORIZONTAL EN VIVO (16:9) */}
      <Card className="p-4 sm:p-6 border-dark-800 bg-dark-900/90 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Vista Previa • Resolución 1920 × 1080 px (16:9)
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              {LAYOUT_CONFIGS[currentLayout].name}
            </span>
            <span className="text-xs font-medium text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
              Logo: {LAYOUT_CONFIGS[currentLayout].logoPosition}
            </span>
            <span className="text-xs font-medium text-slate-300 bg-dark-800 px-3 py-1 rounded-lg border border-dark-700 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              {THEMES[currentTheme].name}
            </span>
            <span className="text-xs font-mono text-emerald-400/90 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              {currentActiveFile}
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
            <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-sm font-semibold animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                @spt-flyer-designer componiendo nuevo flyer...
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
              onClick={handleRegenerateFlyer}
              disabled={loadingBg}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>REGENERAR FLYER</span>
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
            size="sm"
            onClick={handleConfirmFlyer}
            disabled={loadingBg || confirming}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs py-2 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 text-dark-950 font-black shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-lime-400"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${confirming ? "animate-spin" : ""}`} />
            <span>{confirming ? "Confirmando..." : "CONFIRMAR FLYER (Colocar en App Móvil)"}</span>
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

        {/* Columna Derecha: Galería y Estilos (5 columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-dark-800 space-y-4">
            <div className="border-b border-dark-800 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Galería Local de Fondos ({FONDOS_DISPONIBLES.length})
              </h2>
              <span className="text-[11px] text-emerald-400 font-semibold">
                @spt-flyer-designer
              </span>
            </div>

            {/* Selector de Diseño y Distribución (Layout) */}
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Diseño y Distribución General:
                </span>
                <span className="text-[10px] text-amber-400 font-bold">
                  Logo: {LAYOUT_CONFIGS[currentLayout].logoPosition}
                </span>
              </label>
              <select
                value={currentLayout}
                onChange={(e) => setCurrentLayout(e.target.value as FlyerLayout)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:border-emerald-500 focus:outline-none"
              >
                {ALL_LAYOUTS.map((lay) => (
                  <option key={lay} value={lay}>
                    {LAYOUT_CONFIGS[lay].name} (Logo {LAYOUT_CONFIGS[lay].logoPosition})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-dark-400 mt-1">
                {LAYOUT_CONFIGS[currentLayout].description}
              </p>
            </div>

            {/* Selector de Estilo Visual */}
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Estilo / Paleta Cromática:
              </label>
              <select
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value as FlyerTheme)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {ALL_THEMES.map((th) => (
                  <option key={th} value={th}>
                    {THEMES[th].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown de Fondos */}
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">
                Fondo Seleccionado:
              </label>
              <select
                value={selectedBackgroundId}
                onChange={(e) => handleBackgroundChange(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="random">🎲 Modo Aleatorio (Elegir al azar al regenerar)</option>
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
                O selecciona manualmente cualquier fondo:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[440px] overflow-y-auto pr-1.5">
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
                        sizes="(max-width: 768px) 33vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-1.5">
                        <span className="text-[10px] font-bold text-white truncate leading-tight">
                          {item.title}
                        </span>
                        <span className="text-[8px] font-mono text-dark-300">
                          {item.filename}
                        </span>
                      </div>
                      {isActive && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-dark-950 flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <Button
                onClick={handleRegenerateFlyer}
                disabled={loadingBg}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 font-black text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>REGENERAR FLYER</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
