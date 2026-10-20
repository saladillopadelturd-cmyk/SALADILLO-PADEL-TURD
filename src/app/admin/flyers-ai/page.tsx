"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Tournament } from "@/types/tournament";
import { formatDate } from "@/lib/dateUtils";
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
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
  ArrowRight,
  Trash2,
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

  // Selection & Theme States
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>("random");
  const [currentActiveFile, setCurrentActiveFile] = useState<string>(FONDOS_DISPONIBLES[0].filename);
  const [currentTheme, setCurrentTheme] = useState<FlyerTheme>("neon_emerald");
  const [currentLayout, setCurrentLayout] = useState<FlyerLayout>("split_card");

  // Pestaña Activa: "generator" (Diseñador Canvas SPT) o "upload" (Subir Flyer de Otra App)
  const [activeTab, setActiveTab] = useState<"generator" | "upload">("generator");

  // Estados para Flyer Externo Subido
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedDimensions, setUploadedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploadedTitle, setUploadedTitle] = useState("");
  const [uploadedLink, setUploadedLink] = useState("#torneos-activos");
  const [uploadedTournamentId, setUploadedTournamentId] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingExternal, setUploadingExternal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handlePendingFlyerData = (event?: Event) => {
      let raw: string | null = null;
      if (event && "detail" in event) {
        const customEvent = event as CustomEvent;
        if (customEvent.detail) {
          const data = customEvent.detail;
          setTitle(data.title || "");
          setCategory(data.category || "");
          setDate(data.date || "");
          if (data.tournamentId) setSelectedTournamentId(data.tournamentId);
          return;
        }
      }
      raw = localStorage.getItem("spt_pending_flyer_data");
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setTitle(data.title || "");
          setCategory(data.category || "");
          setDate(data.date || "");
          if (data.tournamentId) setSelectedTournamentId(data.tournamentId);
          localStorage.removeItem("spt_pending_flyer_data");
        } catch (e) {
          console.error("Error al parsear datos del torneo pendiente:", e);
        }
      }
    };

    async function loadLatestTournament() {
      try {
        const { data } = await supabase
          .from("tournaments")
          .select("id, name, category, date")
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          const t = data[0];
          setTitle((t.name || "").toUpperCase());
          setCategory((t.category || "").toUpperCase());
          if (t.date) {
            setDate(formatDate(t.date));
          }
          setSelectedTournamentId(t.id);
        }
      } catch (err) {
        console.error("Error al cargar torneo más reciente:", err);
      }
    }

    handlePendingFlyerData();
    loadLatestTournament();

    window.addEventListener("storage", handlePendingFlyerData as EventListener);
    window.addEventListener("spt-pending-flyer-data", handlePendingFlyerData as EventListener);

    return () => {
      window.removeEventListener("storage", handlePendingFlyerData as EventListener);
      window.removeEventListener("spt-pending-flyer-data", handlePendingFlyerData as EventListener);
    };
  }, [supabase]);

  // Autocompletar desde torneo existente
  const handleTournamentSelect = (tourId: string) => {
    setSelectedTournamentId(tourId);
    const tour = tournaments.find((t) => t.id === tourId);
    if (!tour) return;

    setTitle(tour.name?.toUpperCase() || "");
    setCategory(tour.category?.toUpperCase() || "5TA LIBRES");
    if (tour.date) {
      setDate(formatDate(tour.date));
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

    const renderData: FlyerRenderData = {
      title,
      category,
      date,
      location,
      prizes,
      theme: currentTheme,
      layout: currentLayout,
    };

    renderFlyerOnCanvas(canvasRef.current, bgImage, renderData, logoImage);
  }, [title, category, date, location, prizes, bgImage, currentTheme, currentLayout, logoImage]);

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
        text: "Flyer horizontal descargado en alta resolución (1920x864 px - 20:9).",
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
      // Convertir canvas a blob (más eficiente que dataURL)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current!.toBlob(resolve, "image/png", 0.9);
      });
      
      if (!blob) throw new Error("No se pudo generar la imagen del flyer");

      const formData = new FormData();
      formData.append("file", blob, "flyer.png");
      formData.append("title", `${title} - ${category}`);
      formData.append("link_url", selectedTournamentId ? `/torneo/${selectedTournamentId}` : "#torneos-activos");

      const apiRes = await fetch("/api/flyers", {
        method: "POST",
        body: formData,
      });
      const apiData = await apiRes.json();
      
      if (apiData && apiData.success && apiData.flyer && apiData.flyer.image_url) {
        // Guardar en localStorage para hidratación instantánea
        try {
          const confirmedFlyerData = {
            id: apiData.flyer.id,
            title: apiData.flyer.title,
            image_url: apiData.flyer.image_url,
            link_url: apiData.flyer.link_url,
            active: true,
            sort_order: -1,
            created_at: apiData.flyer.created_at,
          };
          localStorage.setItem("spt_confirmed_flyer", JSON.stringify(confirmedFlyerData));
          window.dispatchEvent(new CustomEvent("spt-flyer-confirmed", { detail: confirmedFlyerData }));
        } catch (storageErr) {
          console.error("Local storage error:", storageErr);
        }

        setStatusMsg({
          type: "success",
          text: "✅ ¡Flyer Confirmado Definitivo! Ya fue publicado automáticamente en la aplicación para móviles justo debajo del header y arriba de los botones TORNEO EN VIVO y RANKINGS.",
        });
      } else {
        throw new Error(apiData.error || "Error al guardar el flyer en el servidor");
      }
    } catch (err: unknown) {
      console.error("Error al confirmar flyer:", err);
      const msg = err instanceof Error ? err.message : "Error al confirmar flyer";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setConfirming(false);
    }
  };

  // Manejo de Selección de Archivo Externo (desde otra app)
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatusMsg({
        type: "error",
        text: "El archivo seleccionado debe ser una imagen válida (PNG, JPG, WEBP).",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({
        type: "error",
        text: "La imagen es demasiado pesada. El tamaño máximo permitido es 10 MB.",
      });
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedPreview(result);

      // Medir dimensiones reales
      const img = new window.Image();
      img.onload = () => {
        setUploadedDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);

    // Sugerir título si aún está vacío
    if (!uploadedTitle) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .toUpperCase();
      setUploadedTitle(cleanName || "TORNEO SALADILLO PADEL TOUR");
    }

    setStatusMsg({
      type: "success",
      text: `Imagen cargada: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB). Lista para publicar.`,
    });
  };

  // Autocompletar datos del flyer subido a partir de un torneo
  const handleUploadedTournamentSelect = (tourId: string) => {
    setUploadedTournamentId(tourId);
    const tour = tournaments.find((t) => t.id === tourId);
    if (!tour) return;

    setUploadedTitle(`${tour.name?.toUpperCase()} - ${tour.category?.toUpperCase() || ""}`.trim());
    setUploadedLink(`/torneo/${tour.id}`);
  };

  // CONFIRMAR Y PUBLICAR FLYER SUBIDO DIRECTAMENTE EN LA APP MÓVIL
  const handleConfirmUploadedFlyer = async () => {
    if (!uploadedFile) {
      setStatusMsg({
        type: "error",
        text: "Primero selecciona o arrastra una imagen de flyer para subir.",
      });
      return;
    }

    setUploadingExternal(true);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("title", uploadedTitle.trim() || "Torneo Saladillo Padel Tour");
      formData.append("link_url", uploadedLink.trim() || "#torneos-activos");

      const apiRes = await fetch("/api/flyers", {
        method: "POST",
        body: formData,
      });

      const apiData = await apiRes.json();

      if (apiData && apiData.success && apiData.flyer && apiData.flyer.image_url) {
        try {
          const confirmedFlyerData = {
            id: apiData.flyer.id,
            title: apiData.flyer.title,
            image_url: apiData.flyer.image_url,
            link_url: apiData.flyer.link_url,
            active: true,
            sort_order: -1,
            created_at: apiData.flyer.created_at,
          };
          localStorage.setItem("spt_confirmed_flyer", JSON.stringify(confirmedFlyerData));
          window.dispatchEvent(new CustomEvent("spt-flyer-confirmed", { detail: confirmedFlyerData }));
        } catch (storageErr) {
          console.error("Local storage error:", storageErr);
        }

        setStatusMsg({
          type: "success",
          text: "✅ ¡Flyer externo confirmado y publicado! Ya se muestra en la portada de la app móvil debajo del encabezado.",
        });
      } else {
        throw new Error(apiData.error || "Error al subir el flyer al servidor");
      }
    } catch (err: unknown) {
      console.error("Error al publicar flyer externo:", err);
      const msg = err instanceof Error ? err.message : "Error al subir flyer";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setUploadingExternal(false);
    }
  };

  // Usar el flyer externo subido como fondo en el Generador Canvas de SPT
  const handleUseUploadedAsBackground = () => {
    if (!uploadedPreview) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBgImage(img);
      setCurrentActiveFile(uploadedFile?.name || "flyer_externo.png");
      setSelectedBackgroundId("custom_upload");
      setActiveTab("generator");
      setStatusMsg({
        type: "success",
        text: "🎨 Flyer externo cargado como fondo en el Generador SPT. Ahora podés ajustar los textos y la composición.",
      });
    };
    img.src = uploadedPreview;
  };

  // Subir un fondo personalizado directamente al Generador Canvas
  const handleCustomBgSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatusMsg({
        type: "error",
        text: "El fondo seleccionado debe ser una imagen válida (PNG, JPG, WEBP).",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setBgImage(img);
        setCurrentActiveFile(file.name);
        setSelectedBackgroundId("custom_bg");
        setStatusMsg({
          type: "success",
          text: `Fondo personalizado "${file.name}" cargado en el canvas en tiempo real.`,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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
              <span>1920 × 864 PX (20:9)</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Generador de Flyers
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Diseña flyers oficiales de pádel en formato horizontal panorámico (20:9) con fondos locales y composiciones dinámicas exclusivas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "generator" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setActiveTab("upload")}
                className="flex items-center gap-2 text-xs font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>SUBIR FLYER (OTRA APP)</span>
              </Button>

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
                className="flex items-center gap-2 text-xs bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 text-dark-950 font-black hover:from-emerald-400 hover:to-lime-400 shadow-lg shadow-emerald-500/25 px-4 cursor-pointer"
              >
                <CheckCircle2 className={`w-4 h-4 ${confirming ? "animate-spin" : ""}`} />
                <span>{confirming ? "Confirmando..." : "CONFIRMAR FLYER"}</span>
              </Button>

              <Button
                onClick={handleDownload}
                disabled={loadingBg || confirming}
                className="flex items-center gap-2 text-xs bg-dark-800 hover:bg-dark-700 text-white font-bold border border-dark-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Descargar Flyer (20:9)
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setActiveTab("generator")}
                className="flex items-center gap-2 text-xs font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>DISEÑAR CON PLANTILLAS</span>
              </Button>

              <Button
                onClick={handleConfirmUploadedFlyer}
                disabled={!uploadedFile || uploadingExternal}
                className={`flex items-center gap-2 text-xs font-black px-4 shadow-lg ${
                  !uploadedFile || uploadingExternal
                    ? "bg-dark-800 text-dark-500 border border-dark-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 text-dark-950 hover:from-emerald-400 hover:to-lime-400 shadow-emerald-500/25 cursor-pointer"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${uploadingExternal ? "animate-spin" : ""}`} />
                <span>{uploadingExternal ? "Publicando..." : "CONFIRMAR FLYER SUBIDO"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selector de Modo: Diseñar con Plantillas vs Subir Flyer de Otra App */}
      <div className="flex border-b border-dark-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("generator")}
          className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "generator"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl"
              : "border-transparent text-dark-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Diseñar con Plantillas SPT</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "upload"
              ? "border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl"
              : "border-transparent text-dark-400 hover:text-white"
          }`}
        >
          <Upload className="w-4 h-4 text-amber-400" />
          <span>Subir Flyer (Canva / Otra App)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-black border border-amber-400/30">
            NUEVO
          </span>
        </button>
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

      {/* PESTAÑA 1: GENERADOR Y COMPOSITOR CON PLANTILLAS SPT */}
      {activeTab === "generator" && (
        <div className="space-y-8">
          {/* SECCIÓN 1: VISTA PREVIA DEL CANVAS HORIZONTAL EN VIVO (20:9) */}
          <Card className="p-3 sm:p-6 border-dark-800 bg-dark-900/90 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Vista Previa • Resolución 1920 × 864 px (20:9)
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

        {/* Contenedor Responsivo del Canvas 20:9 */}
        <div className="relative w-full aspect-[20/9] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-dark-700/80 bg-black flex items-center justify-center">
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
              <span>Descargar Flyer (PNG 1920x864)</span>
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
                    {t.name} ({t.category}) - {formatDate(t.date)}
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

            {/* Input oculto para subir fondo propio */}
            <input
              ref={customBgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleCustomBgSelect(e.target.files[0]);
                }
              }}
            />

            {/* Opción de Subir Fondo Propio desde Archivo */}
            <div className="p-3.5 rounded-xl border border-dashed border-dark-700 hover:border-emerald-500/50 bg-dark-950/40 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">¿Querés usar una foto propia?</p>
                  <p className="text-[10px] text-dark-400 truncate">Subí una foto de tu club o pista como fondo</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => customBgInputRef.current?.click()}
                className="text-xs font-bold flex-shrink-0 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
              >
                Subir Foto
              </Button>
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
      )}

      {/* PESTAÑA 2: SUBIR FLYER EXTERNO (CANVA / PHOTOSHOP / OTRA APP) */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* Input oculto para subir flyer externo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {!uploadedPreview ? (
            /* ZONA DE ARRASTRAR Y SOLTAR / SELECCIONAR ARCHIVO */
            <Card
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 sm:p-16 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? "border-amber-400 bg-amber-500/10 scale-[1.01] shadow-2xl shadow-amber-500/20"
                  : "border-dark-700 hover:border-amber-500/60 bg-dark-900/60 hover:bg-dark-900/90"
              }`}
            >
              <div className="max-w-xl mx-auto flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex items-center justify-center mb-5 shadow-lg shadow-amber-500/10">
                  <Upload className="w-10 h-10 text-amber-400 animate-bounce" />
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                  Arrastrá tu flyer aquí o hacé clic para seleccionarlo
                </h3>
                <p className="text-sm text-dark-300 mb-6 max-w-md">
                  Utilizá flyers generados en <strong>Canva</strong>, <strong>Photoshop</strong>, <strong>Illustrator</strong> o cualquier otra aplicación para publicarlos directamente en la app oficial de Saladillo Padel Tour.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-dark-800 text-slate-300 border border-dark-700">
                    Formatos: PNG, JPG, WEBP
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-dark-800 text-slate-300 border border-dark-700">
                    Tamaño máx: 10 MB
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Cualquier resolución y aspecto
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Explorar Archivos del Dispositivo</span>
                </Button>
              </div>
            </Card>
          ) : (
            /* FLYER CARGADO: VISTA PREVIA Y OPCIONES DE PUBLICACIÓN */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna Izquierda: Vista Previa (7 columnas) */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="p-4 sm:p-6 border-dark-700 bg-dark-900/90 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 border-b border-dark-800 pb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Vista Previa del Flyer Subido
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedPreview(null);
                        setUploadedDimensions(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar / Cambiar</span>
                    </button>
                  </div>

                  {/* Contenedor de la Imagen */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-black/90 border border-dark-700/80 shadow-2xl flex items-center justify-center p-2 min-h-[320px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview}
                      alt="Flyer Subido"
                      className="max-h-[500px] w-auto max-w-full rounded-xl object-contain shadow-xl"
                    />
                  </div>

                  {/* Barra de Datos Técnicos */}
                  <div className="mt-4 pt-3 border-t border-dark-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {uploadedDimensions && (
                        <span className="px-2.5 py-1 rounded-md bg-dark-800 text-slate-300 border border-dark-700 font-mono font-medium">
                          📐 {uploadedDimensions.width} × {uploadedDimensions.height} px
                        </span>
                      )}
                      {uploadedFile && (
                        <>
                          <span className="px-2.5 py-1 rounded-md bg-dark-800 text-slate-300 border border-dark-700 font-mono font-medium">
                            💾 {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold uppercase">
                            {uploadedFile.type.replace("image/", "")}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Elegir otro archivo</span>
                    </button>
                  </div>
                </Card>
              </div>

              {/* Columna Derecha: Configuración y Publicación Oficial (5 columnas) */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="p-6 border-dark-800 space-y-5 bg-dark-900/90 shadow-2xl">
                  <div className="border-b border-dark-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Publicación Oficial del Flyer
                    </h3>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Configurá el destino y confirmá para mostrarlo inmediatamente en la app móvil.
                    </p>
                  </div>

                  {/* Autocompletar desde Torneo */}
                  {tournaments.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        Vincular a un Torneo (Opcional):
                      </label>
                      <select
                        value={uploadedTournamentId}
                        onChange={(e) => handleUploadedTournamentSelect(e.target.value)}
                        className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Seleccionar torneo para vincular destino --</option>
                        {tournaments.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category}) - {formatDate(t.date)}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-dark-400 mt-1">
                        Al seleccionar un torneo, se vinculará automáticamente el enlace y el título.
                      </p>
                    </div>
                  )}

                  {/* Título del Flyer */}
                  <div>
                    <label className="block text-xs font-medium text-dark-300 mb-1.5">
                      Título o Descripción del Flyer:
                    </label>
                    <input
                      type="text"
                      value={uploadedTitle}
                      onChange={(e) => setUploadedTitle(e.target.value)}
                      placeholder="Ej: TORNEO ABIERTO 5TA LIBRES - QUINTA LA PISTA"
                      className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white uppercase focus:border-emerald-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Enlace de Destino */}
                  <div>
                    <label className="block text-xs font-medium text-dark-300 mb-1.5 flex items-center justify-between">
                      <span>Enlace al Tocar el Flyer:</span>
                      <span className="text-[10px] text-dark-500">Ej: /torneo/xxx o #torneos-activos</span>
                    </label>
                    <input
                      type="text"
                      value={uploadedLink}
                      onChange={(e) => setUploadedLink(e.target.value)}
                      placeholder="Ej: /torneos o #torneos-activos"
                      className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Botones de Acción */}
                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={handleConfirmUploadedFlyer}
                      disabled={uploadingExternal}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500 text-dark-950 font-black text-sm rounded-xl hover:from-emerald-400 hover:to-lime-400 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className={`w-5 h-5 ${uploadingExternal ? "animate-spin" : ""}`} />
                      <span>{uploadingExternal ? "Publicando en App Móvil..." : "CONFIRMAR Y PUBLICAR EN APP MÓVIL"}</span>
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleUseUploadedAsBackground}
                      className="w-full py-2.5 text-xs font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                      title="Carga esta imagen dentro del Diseñador Canvas de SPT para superponer textos o logos oficiales"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Usar como Fondo en Generador SPT</span>
                    </Button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-dark-950/60 border border-dark-800 text-[11px] text-dark-400 leading-relaxed">
                    💡 <strong>Ubicación automática:</strong> Al confirmar, este flyer se convertirá de inmediato en el flyer destacado de la portada para todos los usuarios en la aplicación móvil y web.
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
