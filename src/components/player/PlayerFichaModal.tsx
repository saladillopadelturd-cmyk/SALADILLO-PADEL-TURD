"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import PlayerAvatar from "./PlayerAvatar";
import PhotoCropModal from "./PhotoCropModal";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";
import { useAuth } from "@/hooks/useAuth";
import type { Player } from "@/types/tournament";
import {
  User,
  Users,
  UserPlus,
  Mail,
  Phone,
  Camera,
  Crop,
  Trophy,
  Calendar,
  Award,
  Activity,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Edit3,
  Search,
  Sparkles,
  ShieldCheck,
  Medal,
  Eye,
  Shield,
} from "lucide-react";

const CATEGORIES = ["8va", "7ma", "6ta", "5ta", "4ta", "3ra", "2da", "1ra"];

export default function PlayerFichaModal() {
  const {
    player,
    stats,
    isIdentified,
    isLoading,
    isNewUser,
    loggedEmail,
    isFichaOpen,
    closeFicha,
    saveFicha,
    identifyWithEmail,
    clearIdentity,
  } = usePlayerIdentity();

  const { isAdmin, signOut } = useAuth();

  // Modo: "view" (ver ficha identificada), "edit" (editar datos), "lookup" (buscar ficha por correo existente)
  const [mode, setMode] = useState<"view" | "edit" | "lookup">("edit");

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Masculino" | "Femenino">("Masculino");
  const [category, setCategory] = useState("5ta");
  const [isObserved, setIsObserved] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  // Crop modal states
  const [rawSelectedImage, setRawSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Feedback states
  const [lookupEmail, setLookupEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inicializar formulario al abrir o cuando cambia el estado de identificación
  useEffect(() => {
    if (isIdentified && player) {
      // Usuario con perfil ya creado
      setMode("view");
      setFirstName(player.first_name || "");
      setLastName(player.last_name || "");
      setEmail(player.email || loggedEmail || "");
      setPhone(player.phone || "");
      setGender((player.gender as "Masculino" | "Femenino") || "Masculino");
      setCategory(player.category || "5ta");
      setIsObserved(!!player.is_observed);

      const localCachedPhoto =
        typeof window !== "undefined" && player.email
          ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
          : null;

      setPhotoUrl(player.photo_url || player.avatar_url || localCachedPhoto || null);
    } else if (loggedEmail || isNewUser) {
      // Cuenta de correo determinada en el navegador pero es un NUEVO USUARIO sin perfil creado
      setMode("edit");
      setFirstName("");
      setLastName("");
      setEmail(loggedEmail || "");
      setPhone("");
      setGender("Masculino");
      setCategory("5ta");
      setIsObserved(false);
      setPhotoUrl(null);
      setPhotoBlob(null);
    } else {
      // Sin cuenta de correo logueada en el navegador: Modo de determinación de cuenta
      setMode("lookup");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setGender("Masculino");
      setCategory("5ta");
      setIsObserved(false);
      setPhotoUrl(null);
      setPhotoBlob(null);
    }
    setFeedback(null);
  }, [isIdentified, player, loggedEmail, isNewUser, isFichaOpen]);

  // Selección de foto
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFeedback({ type: "error", message: "Selecciona una imagen válida (JPG, PNG o WebP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRawSelectedImage(result);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = (croppedDataUrl: string, croppedBlob: Blob) => {
    setPhotoUrl(croppedDataUrl);
    setPhotoBlob(croppedBlob);
    setShowCropModal(false);
  };

  // Subida de foto
  const uploadPhotoIfAvailable = async (playerId?: string): Promise<string | null> => {
    if (!photoBlob) return photoUrl;

    try {
      const formData = new FormData();
      formData.append("file", photoBlob, "avatar.jpg");
      if (playerId) formData.append("player_id", playerId);

      const res = await fetch("/api/players/avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.photo_url) {
        return json.photo_url;
      }
    } catch (err) {
      console.warn("Aviso al subir foto:", err);
    }
    return photoUrl;
  };

  // Enviar formulario de guardado
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!firstName.trim() || !lastName.trim()) {
      setFeedback({ type: "error", message: "El nombre y el apellido son obligatorios." });
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setFeedback({
        type: "error",
        message: "Ingresa un correo electrónico válido. Será tu nombre de usuario para identificarte en el sistema.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrl = await uploadPhotoIfAvailable(player?.id);

      const res = await saveFicha({
        player_id: player?.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        gender,
        category: isAdmin ? category : (player?.category || category),
        photo_url: uploadedUrl,
        is_observed: isAdmin ? isObserved : !!player?.is_observed,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "¡Ficha guardada con éxito! Tu identidad ha sido reconocida y vinculada a este dispositivo.",
        });
        setMode("view");
      } else {
        setFeedback({ type: "error", message: res.message || "Error al guardar la ficha." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar la solicitud.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Determinar si se trata de un nuevo usuario o de un usuario que ya tiene perfil creado
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanInput = lookupEmail.trim().toLowerCase();
    if (!cleanInput || !cleanInput.includes("@")) {
      setFeedback({ type: "error", message: "Ingresa un correo electrónico válido." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await identifyWithEmail(cleanInput);
      if (res.identified && res.player) {
        // Usuario que ya tiene su perfil creado
        setFeedback({
          type: "success",
          message: `¡Perfil encontrado! Bienvenido/a de nuevo, ${res.player.first_name}. Tu identidad ha sido activada en este navegador.`,
        });
        setMode("view");
      } else if (res.isNew) {
        // Se determina que es un NUEVO USUARIO
        setEmail(cleanInput);
        setFeedback({
          type: "success",
          message: `¡Hola! Detectamos que eres un nuevo usuario. Completa tus datos para crear tu perfil oficial de jugador.`,
        });
        setMode("edit");
      } else {
        setFeedback({
          type: "error",
          message: res.message || "No se encontró ningún jugador registrado con este correo.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    if (player) {
      setFirstName(player.first_name);
      setLastName(player.last_name);
      setEmail(player.email || "");
      setPhone(player.phone || "");
      setGender((player.gender as "Masculino" | "Femenino") || "Masculino");
      setCategory(player.category || "5ta");
      setIsObserved(!!player.is_observed);

      const localCachedPhoto =
        typeof window !== "undefined" && player.email
          ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
          : null;

      setPhotoUrl(player.photo_url || player.avatar_url || localCachedPhoto || null);
    }
    setMode("edit");
    setFeedback(null);
  };

  // Resolución segura de la foto del jugador para garantizar que siempre se vea en su ficha
  const resolvedPhotoUrl =
    photoUrl ||
    player?.photo_url ||
    player?.avatar_url ||
    (typeof window !== "undefined" && player?.email
      ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
      : null);

  const indRank = stats?.individualRanking;
  const coupleRankings = stats?.coupleRankings || [];

  return (
    <>
      <Modal
        isOpen={isFichaOpen}
        onClose={closeFicha}
        title={
          mode === "view"
            ? "Ficha Oficial de Jugador"
            : mode === "lookup"
            ? "Acceso a Saladillo Padel Tour"
            : isIdentified
            ? "Editar mi Ficha de Jugador"
            : "Nuevo Usuario - Crear Perfil de Jugador"
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Alertas y Notificaciones */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm animate-in ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <span className="flex-1 font-medium">{feedback.message}</span>
            </div>
          )}

          {/* VISTA 1: Ficha del Jugador Reconocido / Identificado */}
          {mode === "view" && player && (
            <div className="space-y-6">
              {/* Banner de Identidad Activa */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-dark-900 to-dark-950 border border-emerald-500/30 shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Identidad Reconocida en este dispositivo
                    </span>
                    <p className="text-xs text-dark-300 font-medium">
                      Estás utilizando la aplicación como{" "}
                      <strong className="text-white">
                        {player.first_name} {player.last_name}
                      </strong>
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={handleStartEdit}
                  className="text-xs flex items-center gap-1.5 border border-dark-700 hover:border-emerald-500/40"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar</span>
                </Button>
              </div>

              {/* Ficha Visual con Foto Cuadrada Cargada */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 rounded-2xl bg-dark-900/80 border border-dark-800">
                {/* Zona útil cuadrada estricta (1:1) */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <PlayerAvatar
                      photoUrl={resolvedPhotoUrl}
                      firstName={player.first_name}
                      lastName={player.last_name}
                      category={player.category}
                      size="2xl"
                      showCategoryBorder
                      className="shadow-2xl ring-2 ring-emerald-500/30"
                    />
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-dark-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      title="Cambiar o reencuadrar foto"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {resolvedPhotoUrl ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Foto cargada (1:1)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" /> Subir foto
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Badge variant="success" className="font-bold uppercase text-[11px]">
                      {player.category || "5ta"} Categoría
                    </Badge>
                    <Badge variant="default" className="font-semibold text-[11px]">
                      {player.gender || "Masculino"}
                    </Badge>
                    {isAdmin && player.is_observed && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-sm shadow-amber-500/20">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        JUGADOR OBSERVADO
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {player.first_name} {player.last_name}
                  </h3>

                  {isAdmin && player.is_observed && (
                    <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                      <Eye className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 font-bold block">Estado: Jugador en Observación</strong>
                        <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                          Este jugador se encuentra bajo evaluación técnica de la organización para posible recategorización o ascenso de categoría según su desempeño.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 space-y-1.5 text-xs text-dark-300">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="font-mono text-white">{player.email || "Sin email registrado"}</span>
                      <span className="text-[10px] text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">
                        Usuario de acceso
                      </span>
                    </div>

                    {player.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{player.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN RANKINGS: RANKING INDIVIDUAL Y RANKING POR PAREJAS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-dark-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Rankings Oficiales SPT
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tarjeta 1: Ranking Individual */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-900 via-dark-900/80 to-dark-950 border border-dark-800 shadow-md space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                          <User className="w-4 h-4" />
                        </span>
                        <div>
                          <h5 className="text-sm font-bold text-white">Ranking Individual</h5>
                          <p className="text-[10px] text-dark-400">
                            {indRank?.category || player.category || "5ta"} Categoría
                          </p>
                        </div>
                      </div>

                      {indRank && indRank.position > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                          #{indRank.position} Puesto
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-dark-800 text-dark-400 text-[10px] font-medium">
                          Sin posición
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-xl bg-dark-950/60 border border-dark-800/80">
                        <span className="block text-xl font-black text-amber-400 font-mono">
                          {indRank?.points ?? 0}
                        </span>
                        <span className="text-[10px] text-dark-400 font-semibold">Puntos</span>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-950/60 border border-dark-800/80">
                        <span className="block text-xl font-black text-white font-mono">
                          {indRank?.tournamentsPlayed ?? 0}
                        </span>
                        <span className="text-[10px] text-dark-400 font-semibold">Torneos</span>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-950/60 border border-dark-800/80">
                        <span className="block text-xl font-black text-emerald-400 font-mono">
                          {indRank?.winRate ?? 0}%
                        </span>
                        <span className="text-[10px] text-dark-400 font-semibold">Efectividad</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-dark-400 flex items-center justify-between px-1">
                      <span>Récord partidos:</span>
                      <strong className="text-slate-200">
                        {indRank?.matchesWon ?? 0} Ganados / {indRank?.matchesLost ?? 0} Perdidos
                      </strong>
                    </div>
                  </div>

                  {/* Tarjeta 2: Ranking por Parejas */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-dark-900 via-dark-900/80 to-dark-950 border border-dark-800 shadow-md space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-dark-800">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Users className="w-4 h-4" />
                        </span>
                        <div>
                          <h5 className="text-sm font-bold text-white">Ranking por Parejas</h5>
                          <p className="text-[10px] text-dark-400">
                            {coupleRankings.length > 0
                              ? `${coupleRankings.length} pareja(s) registrada(s)`
                              : "Sin torneos en pareja aún"}
                          </p>
                        </div>
                      </div>

                      {coupleRankings.length > 0 && coupleRankings[0].position > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                          #{coupleRankings[0].position} Mejor Puesto
                        </span>
                      ) : null}
                    </div>

                    {coupleRankings.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {coupleRankings.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800/80 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <PlayerAvatar
                                photoUrl={c.partnerPhotoUrl}
                                firstName={c.partnerName}
                                lastName=""
                                category={c.category}
                                size="sm"
                                showCategoryBorder
                              />
                              <div className="truncate">
                                <span className="font-bold text-white block truncate">
                                  con {c.partnerName}
                                </span>
                                <span className="text-[10px] text-dark-400">
                                  {c.category} • {c.tournamentsPlayed} torneos
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-black text-emerald-400">
                                {c.points} pts
                              </div>
                              <span className="inline-block text-[10px] font-bold text-amber-400">
                                #{c.position}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-dark-950/40 border border-dashed border-dark-800 text-center space-y-1">
                        <Users className="w-5 h-5 text-dark-500 mx-auto" />
                        <p className="text-xs text-dark-300 font-medium">
                          Aún no registras torneos en pareja
                        </p>
                        <p className="text-[10px] text-dark-500">
                          Al disputar torneos con tu compañero/a se generará automáticamente el ranking de la dupla.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de acción en vista */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                <button
                  type="button"
                  onClick={async () => {
                    await clearIdentity();
                    await signOut();
                    closeFicha();
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={closeFicha} className="text-xs">
                    Cerrar
                  </Button>
                  <Button onClick={handleStartEdit} className="text-xs font-bold">
                    Editar Ficha
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: Determinar cuenta de correo / Usuario existente o Nuevo usuario */}
          {mode === "lookup" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-dark-900 to-dark-950 border border-blue-500/30 text-xs sm:text-sm text-blue-200 flex items-start gap-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-white block font-bold mb-0.5">
                    Determinación de Cuenta y Perfil
                  </strong>
                  <p className="text-xs text-blue-200/90 leading-relaxed">
                    Identificaremos la cuenta de correo con la que accedes en este navegador para determinar si ya tienes tu perfil oficial de jugador creado o si se trata de un nuevo usuario.
                  </p>
                </div>
              </div>

              {/* Opción 1: Acceso rápido con Google */}
              <div className="space-y-2">
                <GoogleSignInButton
                  redirectTo="/"
                  label="Continuar con mi cuenta de Google"
                />
                <p className="text-[11px] text-center text-dark-400">
                  Detecta de forma instantánea la cuenta de correo activa en tu navegador.
                </p>
              </div>

              {/* Separador */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-dark-800"></div>
                <span className="flex-shrink mx-4 text-[11px] font-bold uppercase tracking-wider text-dark-500">
                  o ingresa tu correo electrónico
                </span>
                <div className="flex-grow border-t border-dark-800"></div>
              </div>

              {/* Opción 2: Formulario por correo */}
              <form onSubmit={handleLookup} className="space-y-4">
                <Input
                  label="Correo Electrónico (Nombre de Usuario)"
                  type="email"
                  required
                  placeholder="tu_correo@ejemplo.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-xs font-bold py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? "Determinando perfil..." : "Verificar Cuenta y Continuar"}
                </Button>
              </form>

              {/* Pie de navegación */}
              <div className="pt-3 border-t border-dark-800 flex items-center justify-between text-xs">
                {isIdentified ? (
                  <button
                    type="button"
                    onClick={() => setMode("view")}
                    className="text-dark-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Volver a mi Ficha
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem("spt_auth_dismissed", "true");
                      }
                      closeFicha();
                    }}
                    className="text-dark-400 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Continuar como espectador
                  </button>
                )}

                <span className="text-[11px] text-dark-500 font-medium">
                  Saladillo Padel Tour Oficial
                </span>
              </div>
            </div>
          )}

          {/* VISTA 3: Formulario de Carga y Edición de Ficha */}
          {mode === "edit" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Información explicativa para el jugador */}
              {!isIdentified ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-dark-900 to-dark-950 border border-emerald-500/30 text-xs text-dark-200 flex items-start gap-3 shadow-md">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold mb-0.5">
                      Nuevo Usuario Detectado
                    </strong>
                    <span>
                      Estás creando tu perfil oficial para la cuenta{" "}
                      <strong className="text-emerald-300 font-mono">{email || loggedEmail}</strong>. Completa tus datos personales y sube tu foto cuadrada para comenzar a competir en el circuito.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-dark-950/70 border border-emerald-500/20 text-xs text-dark-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Editar Ficha de Jugador</strong>
                    <span>
                      Modifica tus datos de contacto o actualiza tu foto de perfil cuadrada (1:1).
                    </span>
                  </div>
                </div>
              )}

              {/* Subida y Recorte Cuadrado de Foto */}
              <div className="p-4 rounded-2xl bg-dark-950/80 border border-dark-800 space-y-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Foto de Perfil (Zona Útil Cuadrada)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Vista previa en formato cuadrado estricto */}
                  <div className="relative group">
                    <PlayerAvatar
                      photoUrl={resolvedPhotoUrl}
                      firstName={firstName || "P"}
                      lastName={lastName || ""}
                      category={category}
                      size="xl"
                      showCategoryBorder
                      className="shadow-xl ring-2 ring-emerald-500/20"
                    />
                  </div>

                  {/* Acciones de Foto */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95">
                        <Camera className="w-4 h-4" />
                        <span>{resolvedPhotoUrl ? "Cambiar Foto" : "Subir Foto"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      {resolvedPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setRawSelectedImage(resolvedPhotoUrl);
                            setShowCropModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white border border-dark-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reencuadrar</span>
                        </button>
                      )}

                      {resolvedPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl(null);
                            setPhotoBlob(null);
                            if (typeof window !== "undefined" && email) {
                              localStorage.removeItem(`spt_player_photo_${email.toLowerCase()}`);
                            }
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-dark-400 leading-tight">
                      La zona útil es de formato cuadrado (1:1). Podrás ampliar, reducir y reencuadrar tu rostro para que quede centrado en tu perfil.
                    </p>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre *"
                  required
                  placeholder="Ej: Matías"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />

                <Input
                  label="Apellido *"
                  required
                  placeholder="Ej: Vidal"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              {/* Correo Electrónico (Nombre de Usuario de Login) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Correo Electrónico * (Nombre de Usuario para Login)</span>
                  </label>
                  {!isAdmin && isIdentified && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Identidad Protegida
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Modo Administrador
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  disabled={!isAdmin && isIdentified}
                  placeholder="tu_correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm min-h-[44px] transition-all ${
                    !isAdmin && isIdentified
                      ? "bg-dark-900 border border-dark-700/60 text-dark-300 cursor-not-allowed select-none"
                      : "bg-dark-950/80 border border-emerald-500/40 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  }`}
                />
                <p className="text-[11px] text-dark-400">
                  {!isAdmin && isIdentified
                    ? "Tu correo identifica de forma exclusiva tu cuenta de jugador. Los jugadores no pueden modificar la ficha de otro jugador."
                    : "Este correo identifica de forma unívoca al jugador en cualquier dispositivo o navegador."}
                </p>
              </div>

              {/* Teléfono / WhatsApp */}
              <Input
                label="Teléfono / WhatsApp"
                placeholder="Ej: 2345 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {/* Sexo y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    Sexo / Género
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender("Masculino")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        gender === "Masculino"
                          ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm"
                          : "bg-dark-950/60 border-dark-800 text-dark-400 hover:text-white"
                      }`}
                    >
                      ♂ Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("Femenino")}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        gender === "Femenino"
                          ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm"
                          : "bg-dark-950/60 border-dark-800 text-dark-400 hover:text-white"
                      }`}
                    >
                      ♀ Femenino
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-300">
                      Categoría Deportiva
                    </label>
                    {isAdmin ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Poder de Ascenso (Admin)
                      </span>
                    ) : isIdentified ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Ascenso Exclusivo Admin
                      </span>
                    ) : null}
                  </div>

                  {isAdmin || !isIdentified ? (
                    <>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-dark-950/80 rounded-xl text-white text-sm focus:outline-none ${
                          isAdmin
                            ? "border border-emerald-500/40 focus:border-emerald-500"
                            : "border border-dark-700/80 focus:border-emerald-500"
                        }`}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat} Categoría
                          </option>
                        ))}
                      </select>
                      {!isAdmin && !isIdentified && (
                        <p className="text-[11px] text-dark-400 mt-1">
                          Categoría inicial para tu debut. El poder de ascender un jugador únicamente lo tienen los administradores del sitio.
                        </p>
                      )}
                    </>
                  ) : (
                    <div>
                      <div className="w-full px-3.5 py-2.5 bg-dark-900 border border-dark-700/60 rounded-xl text-white text-sm flex items-center justify-between select-none">
                        <span className="font-bold text-emerald-400">{player?.category || category} Categoría</span>
                        <span className="text-[11px] text-dark-400 font-semibold bg-dark-950 px-2 py-0.5 rounded-md border border-dark-800">
                          Oficial Asignada
                        </span>
                      </div>
                      <p className="text-[11px] text-dark-400 mt-1 leading-relaxed">
                        El poder de ascender un jugador únicamente lo tienen los administradores del sitio.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Control de Observado: Exclusivo del Administrador */}
              {isAdmin && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Jugador Observado (Ascenso)</span>
                      <span className="text-[10px] text-dark-300">
                        Marcar si el jugador está bajo evaluación reglamentaria para ascenso de categoría
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isObserved}
                      onChange={(e) => setIsObserved(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded border-dark-700 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Botón "¿Ya tienes ficha? Identifícate aquí" */}
              {!isIdentified && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLookupEmail(email || loggedEmail || "");
                      setMode("lookup");
                      setFeedback(null);
                    }}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>¿Ingresar con otra cuenta o verificar perfil existente?</span>
                  </button>
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!isIdentified && typeof window !== "undefined") {
                        sessionStorage.setItem("spt_auth_dismissed", "true");
                      }
                      if (isIdentified) {
                        setMode("view");
                      } else {
                        closeFicha();
                      }
                    }}
                    className="text-xs"
                  >
                    {isIdentified ? "Cancelar" : "Continuar como espectador"}
                  </Button>

                  {!isIdentified && (email || loggedEmail) && (
                    <button
                      type="button"
                      onClick={async () => {
                        await clearIdentity();
                        await signOut();
                        closeFicha();
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 transition-colors cursor-pointer px-2 py-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Cerrar sesión</span>
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                >
                  {submitting
                    ? "Guardando..."
                    : isIdentified
                    ? "Guardar Cambios"
                    : "Crear Mi Perfil Oficial de Jugador"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal de Recorte Cuadrado (Zona Útil 1:1) */}
      <PhotoCropModal
        isOpen={showCropModal}
        imageSrc={rawSelectedImage}
        onConfirm={handleCropConfirm}
        onClose={() => setShowCropModal(false)}
        onSelectNewFile={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = (e) => handleFileChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
          input.click();
        }}
      />
    </>
  );
}
