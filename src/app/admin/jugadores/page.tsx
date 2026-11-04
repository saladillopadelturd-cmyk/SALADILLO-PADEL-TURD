"use client";

import { useEffect, useState, useCallback, useTransition, useMemo, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PhotoCropModal from "@/components/player/PhotoCropModal";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import PlayerProfileModal from "@/components/player/PlayerProfileModal";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types/tournament";
import { AlertCircle, CheckCircle2, Eye, Search, Filter, ShieldCheck, UserCheck, Camera, Upload, Trash2, Move, Sparkles, User, MapPin, Trophy, Award, Calendar, Activity } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "8va", label: "8va Categoría (Iniciación)" },
  { value: "7ma", label: "7ma Categoría" },
  { value: "6ta", label: "6ta Categoría" },
  { value: "5ta", label: "5ta Categoría" },
  { value: "4ta", label: "4ta Categoría" },
  { value: "3ra", label: "3ra Categoría" },
  { value: "2da", label: "2da Categoría" },
  { value: "1ra", label: "1ra Categoría (Avanzado / Pro)" },
];

const GENDER_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Femenino", label: "Femenino" },
];

export default function AdminJugadoresPage() {
  const { isAdmin, user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formLocalidad, setFormLocalidad] = useState("");
  const [formSexo, setFormSexo] = useState<string>("Masculino");
  const [formCategoria, setFormCategoria] = useState<string>("5ta");
  const [formObservado, setFormObservado] = useState<boolean>(false);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formPhotoBlob, setFormPhotoBlob] = useState<Blob | null>(null);

  // Estados para Estadísticas y Puntos de Ranking (Administradores)
  const [formPuntos, setFormPuntos] = useState<number>(0);
  const [formTorneosJugados, setFormTorneosJugados] = useState<number>(0);
  const [formPartidosGanados, setFormPartidosGanados] = useState<number>(0);
  const [formPartidosPerdidos, setFormPartidosPerdidos] = useState<number>(0);

  // Estado para Modal Rápido de Estadísticas de Ranking
  const [editingStatsPlayer, setEditingStatsPlayer] = useState<Player | null>(null);
  const [statsPuntos, setStatsPuntos] = useState<number>(0);
  const [statsTorneos, setStatsTorneos] = useState<number>(0);
  const [statsGanados, setStatsGanados] = useState<number>(0);
  const [statsPerdidos, setStatsPerdidos] = useState<number>(0);

  // Estados de recorte de foto (Zona útil cuadrada)
  const [rawSelectedImage, setRawSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para ver Ficha Oficial de Perfil del Jugador
  const [viewingProfilePlayer, setViewingProfilePlayer] = useState<Player | null>(null);
  const [playerStatsMap, setPlayerStatsMap] = useState<Map<string, { points: number; tournamentsPlayed: number; matchesWon: number; matchesLost: number; rankingPosition?: number; category?: string }>>(new Map());

  // Filtros de tabla
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [onlyObservedFilter, setOnlyObservedFilter] = useState(false);

  const supabase = createClient();

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);

      // Cargar jugadores a través de la API que enriquece automáticamente con fotos desde Supabase Storage
      try {
        const res = await fetch("/api/players");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.players)) {
            setPlayers(json.players);
          }
        } else {
          // Fallback directo a Supabase
          const { data, error } = await supabase
            .from("players")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          if (data) setPlayers(data);
        }
      } catch {
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) setPlayers(data);
      }

      // Traer estadísticas individuales para la ficha de perfil
      try {
        const { data: rankData } = await supabase
          .from("rankings")
          .select("player_id, points, tournaments_played, matches_won, matches_lost")
          .eq("ranking_type", "individual");

        if (rankData) {
          const map = new Map<string, { points: number; tournamentsPlayed: number; matchesWon: number; matchesLost: number; rankingPosition?: number; category?: string }>();
          rankData.forEach((r) => {
            if (r.player_id) {
              const current = map.get(r.player_id) || { points: 0, tournamentsPlayed: 0, matchesWon: 0, matchesLost: 0 };
              map.set(r.player_id, {
                points: current.points + (r.points || 0),
                tournamentsPlayed: current.tournamentsPlayed + (r.tournaments_played || 0),
                matchesWon: current.matchesWon + (r.matches_won || 0),
                matchesLost: current.matchesLost + (r.matches_lost || 0),
              });
            }
          });

          // Enriquecer con overrides manuales guardados por administradores
          try {
            const statsRes = await fetch("/api/admin/players/stats");
            if (statsRes.ok) {
              const statsJson = await statsRes.json();
              if (statsJson.overrides && typeof statsJson.overrides === "object") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.values(statsJson.overrides).forEach((ov: any) => {
                  if (ov && ov.playerId) {
                    const current = map.get(ov.playerId) || { points: 0, tournamentsPlayed: 0, matchesWon: 0, matchesLost: 0 };
                    map.set(ov.playerId, {
                      ...current,
                      points: Number(ov.points) ?? current.points,
                      tournamentsPlayed: Number(ov.tournamentsPlayed) ?? current.tournamentsPlayed,
                      matchesWon: Number(ov.matchesWon) ?? current.matchesWon,
                      matchesLost: Number(ov.matchesLost) ?? current.matchesLost,
                    });
                  }
                });
              }
            }
          } catch (ovErr) {
            console.warn("Aviso al consultar overrides de estadísticas:", ovErr);
          }

          // Computar posición de ranking oficial por categoría y rama
          const loadedPlayers = (Array.isArray(players) && players.length > 0) ? players : [];
          const categoryGroups = new Map<string, Array<{ playerId: string; points: number; matchesWon: number }>>();
          map.forEach((stat, pId) => {
            const p = loadedPlayers.find((x) => x.id === pId);
            const key = `${p?.gender || "Masculino"}_${p?.category || "5ta"}`;
            const group = categoryGroups.get(key) || [];
            group.push({ playerId: pId, points: stat.points, matchesWon: stat.matchesWon });
            categoryGroups.set(key, group);
          });

          categoryGroups.forEach((group) => {
            group.sort((a, b) => b.points - a.points || b.matchesWon - a.matchesWon);
            group.forEach((item, idx) => {
              const cur = map.get(item.playerId);
              if (cur) cur.rankingPosition = idx + 1;
            });
          });

          setPlayerStatsMap(map);
        }
      } catch (rankErr) {
        console.warn("Rankings fetch warning:", rankErr);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar jugadores";
      console.error("Error cargando jugadores:", err);
      setNotification({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotification({ type: "error", text: "Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP)." });
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
    setFormPhotoUrl(croppedDataUrl);
    setFormPhotoBlob(croppedBlob);
    setShowCropModal(false);
  };

  const uploadPhotoIfAvailable = async (playerId?: string): Promise<string | null> => {
    if (!formPhotoBlob) return formPhotoUrl;

    try {
      const formData = new FormData();
      formData.append("file", formPhotoBlob, "avatar.jpg");
      if (playerId) formData.append("player_id", playerId);

      const res = await fetch("/api/players/avatar", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.photo_url) {
        return json.photo_url;
      }
    } catch (uploadErr) {
      console.warn("Error al subir foto a la API:", uploadErr);
    }
    return formPhotoUrl;
  };

  const openCreate = () => {
    setFormNombre("");
    setFormApellido("");
    setFormEmail("");
    setFormTelefono("");
    setFormLocalidad("");
    setFormSexo("Masculino");
    setFormCategoria("5ta");
    setFormObservado(false);
    setFormPhotoUrl(null);
    setFormPhotoBlob(null);
    setFormPuntos(0);
    setFormTorneosJugados(0);
    setFormPartidosGanados(0);
    setFormPartidosPerdidos(0);
    setShowCreate(true);
  };

  const openEdit = (player: Player) => {
    setFormNombre(player.first_name);
    setFormApellido(player.last_name);
    setFormEmail(player.email ?? "");
    setFormTelefono(player.phone ?? "");
    setFormLocalidad(player.localidad || player.city || "");
    setFormSexo(player.gender || "Masculino");
    setFormCategoria(player.category || "5ta");
    setFormObservado(!!player.is_observed);
    setFormPhotoUrl(player.photo_url || player.avatar_url || null);
    setFormPhotoBlob(null);

    const st = playerStatsMap.get(player.id);
    setFormPuntos(st?.points ?? 0);
    setFormTorneosJugados(st?.tournamentsPlayed ?? 0);
    setFormPartidosGanados(st?.matchesWon ?? 0);
    setFormPartidosPerdidos(st?.matchesLost ?? 0);

    setEditing(player);
  };

  const openEditStats = (player: Player) => {
    const st = playerStatsMap.get(player.id);
    setEditingStatsPlayer(player);
    setStatsPuntos(st?.points ?? 0);
    setStatsTorneos(st?.tournamentsPlayed ?? 0);
    setStatsGanados(st?.matchesWon ?? 0);
    setStatsPerdidos(st?.matchesLost ?? 0);
  };

  const handleSaveStats = async () => {
    if (!editingStatsPlayer) return;
    startTransition(async () => {
      try {
        const adminEmail =
          user?.email ||
          (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
          "";

        const res = await fetch("/api/admin/players/stats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-email": adminEmail,
          },
          body: JSON.stringify({
            playerId: editingStatsPlayer.id,
            points: Number(statsPuntos) || 0,
            tournamentsPlayed: Number(statsTorneos) || 0,
            matchesWon: Number(statsGanados) || 0,
            matchesLost: Number(statsPerdidos) || 0,
            category: editingStatsPlayer.category,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar estadísticas de ranking");
        }

        setPlayerStatsMap((prev) => {
          const next = new Map(prev);
          const cur = next.get(editingStatsPlayer.id) || { points: 0, tournamentsPlayed: 0, matchesWon: 0, matchesLost: 0 };
          next.set(editingStatsPlayer.id, {
            ...cur,
            points: Number(statsPuntos) || 0,
            tournamentsPlayed: Number(statsTorneos) || 0,
            matchesWon: Number(statsGanados) || 0,
            matchesLost: Number(statsPerdidos) || 0,
          });
          return next;
        });

        setEditingStatsPlayer(null);
        setNotification({
          type: "success",
          text: `Estadísticas actualizadas para ${editingStatsPlayer.first_name} ${editingStatsPlayer.last_name}: ${statsPuntos} pts, ${statsTorneos} torneos, ${statsGanados}G / ${statsPerdidos}P.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar estadísticas";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleCreate = async () => {
    if (!formNombre.trim() || !formApellido.trim()) {
      setNotification({ type: "error", text: "Nombre y apellido son obligatorios." });
      return;
    }

    startTransition(async () => {
      try {
        const finalPhotoUrl = await uploadPhotoIfAvailable();
        const cleanLoc = formLocalidad.trim();

        const dbPayload: Record<string, unknown> = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
          localidad: cleanLoc || null,
          gender: formSexo,
          category: formCategoria,
          is_observed: formObservado,
        };

        let result = await supabase
          .from("players")
          .insert(dbPayload)
          .select()
          .single();

        // Resiliencia: Si ocurre algún error de columnas, reintentar preservando la categoría
        if (result.error && (result.error.message.includes("column") || result.error.code === "PGRST204")) {
          console.warn("Reintentando insert con campos esenciales:", result.error);
          const fallbackPayload = {
            first_name: formNombre.trim(),
            last_name: formApellido.trim(),
            email: formEmail.trim() || null,
            phone: formTelefono.trim() || null,
            gender: formSexo,
            category: formCategoria,
            is_observed: formObservado,
          };
          result = await supabase
            .from("players")
            .insert(fallbackPayload)
            .select()
            .single();

          if (result.error) throw result.error;
        }

        if (result.error) throw result.error;
        if (result.data) {
          const newPlayer: Player = {
            ...result.data,
            localidad: cleanLoc || null,
            city: cleanLoc || null,
            photo_url: finalPhotoUrl,
          };

          // Persistir en respaldo de localidades por API
          try {
            await fetch("/api/players/identity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                player_id: newPlayer.id,
                first_name: newPlayer.first_name,
                last_name: newPlayer.last_name,
                email: newPlayer.email || `player_${newPlayer.id}@sptpadeltour.com`,
                phone: newPlayer.phone,
                gender: newPlayer.gender,
                category: newPlayer.category,
                localidad: cleanLoc || null,
                photo_url: finalPhotoUrl,
                is_observed: newPlayer.is_observed,
              }),
            });
          } catch (syncErr) {
            console.warn("Aviso al sincronizar localidad de nuevo jugador:", syncErr);
          }

          // Guardar estadísticas de ranking iniciales si fueron cargadas
          if (isAdmin && (formPuntos > 0 || formTorneosJugados > 0 || formPartidosGanados > 0 || formPartidosPerdidos > 0)) {
            try {
              const adminEmail =
                user?.email ||
                (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
                "";

              await fetch("/api/admin/players/stats", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-admin-email": adminEmail,
                },
                body: JSON.stringify({
                  playerId: newPlayer.id,
                  points: Number(formPuntos) || 0,
                  tournamentsPlayed: Number(formTorneosJugados) || 0,
                  matchesWon: Number(formPartidosGanados) || 0,
                  matchesLost: Number(formPartidosPerdidos) || 0,
                  category: newPlayer.category || formCategoria,
                }),
              });

              setPlayerStatsMap((prev) => {
                const next = new Map(prev);
                next.set(newPlayer.id, {
                  points: Number(formPuntos) || 0,
                  tournamentsPlayed: Number(formTorneosJugados) || 0,
                  matchesWon: Number(formPartidosGanados) || 0,
                  matchesLost: Number(formPartidosPerdidos) || 0,
                });
                return next;
              });
            } catch (statsErr) {
              console.warn("Aviso al guardar estadísticas iniciales de nuevo jugador:", statsErr);
            }
          }

          setPlayers((prev) => [newPlayer, ...prev]);
          setShowCreate(false);
          setNotification({
            type: "success",
            text: `Jugador ${newPlayer.first_name} ${newPlayer.last_name} (${newPlayer.category || formCategoria}) registrado exitosamente.`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al registrar jugador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleEdit = async () => {
    if (!editing) return;

    startTransition(async () => {
      try {
        const finalPhotoUrl = await uploadPhotoIfAvailable(editing.id);
        const cleanLoc = formLocalidad.trim();

        const dbPayload: Record<string, unknown> = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
          localidad: cleanLoc || null,
          gender: formSexo,
          category: formCategoria,
          is_observed: formObservado,
        };

        let result = await supabase
          .from("players")
          .update(dbPayload)
          .eq("id", editing.id)
          .select()
          .single();

        // Resiliencia: Reintentar preservando categoría y sexo
        if (result.error && (result.error.message.includes("column") || result.error.code === "PGRST204")) {
          console.warn("Reintentando actualización con campos esenciales:", result.error);
          const fallbackPayload = {
            first_name: formNombre.trim(),
            last_name: formApellido.trim(),
            email: formEmail.trim() || null,
            phone: formTelefono.trim() || null,
            gender: formSexo,
            category: formCategoria,
            is_observed: formObservado,
          };
          result = await supabase
            .from("players")
            .update(fallbackPayload)
            .eq("id", editing.id)
            .select()
            .single();

          if (result.error) throw result.error;
        }

        if (result.error) throw result.error;
        if (result.data) {
          const updatedPlayer: Player = {
            ...result.data,
            localidad: cleanLoc || null,
            city: cleanLoc || null,
            photo_url: finalPhotoUrl || editing.photo_url || null,
          };

          // Persistir en respaldo de localidades por API
          try {
            await fetch("/api/players/identity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                player_id: updatedPlayer.id,
                first_name: updatedPlayer.first_name,
                last_name: updatedPlayer.last_name,
                email: updatedPlayer.email || `player_${updatedPlayer.id}@sptpadeltour.com`,
                phone: updatedPlayer.phone,
                gender: updatedPlayer.gender,
                category: updatedPlayer.category,
                localidad: cleanLoc || null,
                photo_url: updatedPlayer.photo_url,
                is_observed: updatedPlayer.is_observed,
              }),
            });
          } catch (syncErr) {
            console.warn("Aviso al sincronizar localidad de jugador:", syncErr);
          }

          // Guardar estadísticas de ranking si el usuario es administrador
          if (isAdmin) {
            try {
              const adminEmail =
                user?.email ||
                (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
                "";

              await fetch("/api/admin/players/stats", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-admin-email": adminEmail,
                },
                body: JSON.stringify({
                  playerId: editing.id,
                  points: Number(formPuntos) || 0,
                  tournamentsPlayed: Number(formTorneosJugados) || 0,
                  matchesWon: Number(formPartidosGanados) || 0,
                  matchesLost: Number(formPartidosPerdidos) || 0,
                  category: updatedPlayer.category || formCategoria,
                }),
              });

              setPlayerStatsMap((prev) => {
                const next = new Map(prev);
                const cur = next.get(editing.id) || { points: 0, tournamentsPlayed: 0, matchesWon: 0, matchesLost: 0 };
                next.set(editing.id, {
                  ...cur,
                  points: Number(formPuntos) || 0,
                  tournamentsPlayed: Number(formTorneosJugados) || 0,
                  matchesWon: Number(formPartidosGanados) || 0,
                  matchesLost: Number(formPartidosPerdidos) || 0,
                });
                return next;
              });
            } catch (statsErr) {
              console.warn("Aviso al guardar estadísticas de ranking en edición:", statsErr);
            }
          }

          setPlayers((prev) =>
            prev.map((p) => (p.id === editing.id ? updatedPlayer : p))
          );
          setEditing(null);
          setNotification({
            type: "success",
            text: `Jugador ${updatedPlayer.first_name} ${updatedPlayer.last_name} (${updatedPlayer.category || formCategoria}) actualizado exitosamente.`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar jugador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleDelete = async () => {
    if (!deleting || !isAdmin) return;
    const target = deleting;

    startTransition(async () => {
      try {
        const effectiveEmail =
          user?.email ||
          (typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : "") ||
          "";

        const res = await fetch(`/api/players?id=${encodeURIComponent(target.id)}`, {
          method: "DELETE",
          headers: {
            "x-admin-email": effectiveEmail,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar el jugador");
        }

        setPlayers((prev) => prev.filter((p) => p.id !== target.id));
        setDeleting(null);
        setNotification({
          type: "success",
          text: `Jugador ${target.first_name} ${target.last_name} eliminado correctamente.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el jugador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  // Jugadores filtrados en la vista
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        const emailMatch = p.email?.toLowerCase().includes(q);
        const phoneMatch = p.phone?.includes(q);
        if (!fullName.includes(q) && !emailMatch && !phoneMatch) {
          return false;
        }
      }
      if (categoryFilter !== "all" && (p.category || "5ta") !== categoryFilter) {
        return false;
      }
      if (genderFilter !== "all" && (p.gender || "Masculino") !== genderFilter) {
        return false;
      }
      if (onlyObservedFilter && !p.is_observed) {
        return false;
      }
      return true;
    });
  }, [players, searchFilter, categoryFilter, genderFilter, onlyObservedFilter]);

  const totalObserved = useMemo(() => {
    return players.filter((p) => p.is_observed).length;
  }, [players]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Padrón de Jugadores</span>
            {totalObserved > 0 && (
              <Badge variant="warning" className="text-xs font-bold">
                <Eye className="w-3.5 h-3.5" />
                {totalObserved} en observación
              </Badge>
            )}
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Gestión integral de jugadores con control de sexo, categoría deportiva y estado de observación para ascensos.
          </p>
        </div>
        <Button onClick={openCreate} className="shadow-lg shadow-emerald-500/20 font-bold">
          + Nuevo Jugador
        </Button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 px-2 py-1 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <Card className="p-4 bg-dark-900/60 border-dark-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Búsqueda */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-dark-400" />
              Buscar Jugador
            </label>
            <Input
              placeholder="Buscar por nombre, email..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-dark-950 border-dark-700 h-10 text-xs"
            />
          </div>

          {/* Filtro Categoría */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-dark-400" />
              Filtrar por Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-xs h-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Todas las categorías</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Sexo */}
          <div>
            <label className="block text-xs font-semibold text-dark-400 mb-1.5">
              Sexo
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white text-xs h-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Todos los sexos</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </div>

          {/* Toggle Solo Observados */}
          <div>
            <button
              type="button"
              onClick={() => setOnlyObservedFilter(!onlyObservedFilter)}
              className={`w-full h-10 px-3.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                onlyObservedFilter
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10"
                  : "bg-dark-950 border-dark-700 text-dark-400 hover:text-white hover:border-dark-600"
              }`}
            >
              <Eye className={`w-4 h-4 ${onlyObservedFilter ? "text-amber-400" : "text-dark-500"}`} />
              <span>Solo Observados ({totalObserved})</span>
            </button>
          </div>
        </div>

        {/* Resumen de resultados filtrados */}
        {(searchFilter || categoryFilter !== "all" || genderFilter !== "all" || onlyObservedFilter) && (
          <div className="mt-3 pt-3 border-t border-dark-800 flex items-center justify-between text-xs text-dark-400">
            <span>
              Mostrando <strong className="text-white">{filteredPlayers.length}</strong> de{" "}
              <strong>{players.length}</strong> jugadores registrados
            </span>
            <button
              onClick={() => {
                setSearchFilter("");
                setCategoryFilter("all");
                setGenderFilter("all");
                setOnlyObservedFilter(false);
              }}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {/* Lista / Tabla de Jugadores */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : players.length === 0 ? (
        <Card className="p-12 text-center bg-dark-900/40 border-dark-800">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center text-dark-400">
            <UserCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No hay jugadores registrados</h3>
          <p className="text-dark-400 text-sm mb-5 max-w-sm mx-auto">
            Registra a los jugadores del circuito con su sexo, categoría de juego y estado de observación.
          </p>
          <Button onClick={openCreate}>Registrar el Primer Jugador</Button>
        </Card>
      ) : filteredPlayers.length === 0 ? (
        <Card className="p-8 text-center bg-dark-900/40 border-dark-800">
          <p className="text-dark-400 text-sm mb-3">No se encontraron jugadores con los filtros seleccionados.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchFilter("");
              setCategoryFilter("all");
              setGenderFilter("all");
              setOnlyObservedFilter(false);
            }}
          >
            Restablecer filtros
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border-dark-800 bg-dark-900/50 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-950/80 text-dark-400 uppercase text-[11px] font-bold tracking-wider border-b border-dark-800">
                  <th className="px-5 py-3.5 text-left">Jugador</th>
                  <th className="px-4 py-3.5 text-center">Sexo</th>
                  <th className="px-4 py-3.5 text-center">Categoría</th>
                  <th className="px-4 py-3.5 text-left">Localidad</th>
                  <th className="px-4 py-3.5 text-center">Ranking SPT</th>
                  <th className="px-5 py-3.5 text-center">Observado</th>
                  <th className="px-4 py-3.5 text-left hidden sm:table-cell">Contacto</th>
                  <th className="px-5 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/60">
                {filteredPlayers.map((player) => {
                  const isFemenino = (player.gender || "").toLowerCase() === "femenino";
                  const playerCat = player.category || "5ta";

                  return (
                    <tr
                      key={player.id}
                      className={`transition-colors hover:bg-dark-800/40 ${
                        player.is_observed ? "bg-amber-500/[0.03]" : ""
                      }`}
                    >
                      {/* Nombre y Foto Cuadrada del Jugador (Zona Útil) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setViewingProfilePlayer(player)}
                            className="transition-transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                            title="Ver perfil oficial del jugador"
                          >
                            <PlayerAvatar
                              id={player.id}
                              playerId={player.id}
                              email={player.email}
                              photoUrl={player.photo_url || player.avatar_url}
                              firstName={player.first_name}
                              lastName={player.last_name}
                              category={playerCat}
                              size="md"
                              showCategoryBorder
                            />
                          </button>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => setViewingProfilePlayer(player)}
                              className="text-white hover:text-emerald-400 font-bold text-sm tracking-tight flex items-center gap-2 text-left cursor-pointer transition-colors"
                            >
                              <span>{player.first_name} {player.last_name}</span>
                              {player.is_observed && (
                                <span title="Jugador en observación para ascenso">
                                  <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                </span>
                              )}
                            </button>
                            <span className="text-[11px] text-dark-500 sm:hidden">
                              {player.phone || player.email || "Sin contacto"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sexo */}
                      <td className="px-4 py-4 text-center">
                        {isFemenino ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                            ♀ Femenino
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            ♂ Masculino
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant={
                            playerCat === "1ra" || playerCat === "2da"
                              ? "gold"
                              : playerCat === "3ra" || playerCat === "4ta"
                              ? "neon"
                              : playerCat === "5ta"
                              ? "success"
                              : "default"
                          }
                          className="font-bold uppercase text-[11px]"
                        >
                          {playerCat}
                        </Badge>
                      </td>

                      {/* Localidad */}
                      <td className="px-4 py-4 text-left">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {player.localidad || player.city || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Ranking SPT (Puntos, Torneos, PG / PP) */}
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const st = playerStatsMap.get(player.id);
                          const pts = st?.points ?? 0;
                          const t = st?.tournamentsPlayed ?? 0;
                          const won = st?.matchesWon ?? 0;
                          const lost = st?.matchesLost ?? 0;
                          return (
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-mono font-black text-emerald-400 text-xs">
                                {pts} pts
                              </span>
                              <span className="text-[10px] text-dark-400 font-medium">
                                {t} {t === 1 ? "torneo" : "torneos"} • {won}G/{lost}P
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Estado Observado */}
                      <td className="px-5 py-4 text-center">
                        {player.is_observed ? (
                          <Badge
                            variant="warning"
                            pulse
                            className="font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Próximo ascenso</span>
                          </Badge>
                        ) : (
                          <span className="text-dark-500 text-xs">-</span>
                        )}
                      </td>

                      {/* Contacto (Email y Teléfono) */}
                      <td className="px-4 py-4 text-dark-300 hidden sm:table-cell">
                        <div className="flex flex-col text-xs">
                          {player.email && <span className="text-dark-300">{player.email}</span>}
                          {player.phone && <span className="text-dark-400 font-mono text-[11px]">{player.phone}</span>}
                          {!player.email && !player.phone && <span className="text-dark-500">-</span>}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setViewingProfilePlayer(player)}
                            className="text-xs h-8 px-2.5 flex items-center gap-1 text-emerald-400 hover:text-white border-emerald-500/30 hover:bg-emerald-500/10"
                            title="Ver Perfil Oficial"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Perfil</span>
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openEditStats(player)}
                              className="text-xs h-8 px-2.5 flex items-center gap-1 text-amber-400 hover:text-white border-amber-500/30 hover:bg-amber-500/10"
                              title="Modificar puntos de ranking, torneos jugados, PG y PP"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Ranking</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(player)}
                            className="text-xs h-8 px-2.5"
                          >
                            Editar
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleting(player)}
                              disabled={isPending}
                              className="text-xs h-8 px-2.5"
                              title="Eliminar jugador (solo administradores)"
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: REGISTRAR NUEVO JUGADOR */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Registrar Nuevo Jugador"
      >
        <div className="space-y-4">
          {/* Selector y Previsualización de Foto de Perfil (Zona útil cuadrada) */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-dark-900 border border-dark-700/80">
            <div className="relative group">
              <PlayerAvatar
                photoUrl={formPhotoUrl}
                firstName={formNombre || "J"}
                lastName={formApellido || "P"}
                category={formCategoria}
                size="xl"
                showCategoryBorder
                className="shadow-md"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <span className="text-xs font-bold text-white">Foto de Perfil</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Zona Útil Cuadrada (1:1)
                </span>
              </div>
              <p className="text-[11px] text-dark-400 leading-relaxed">
                Al subir tu foto podrás ampliar, reducir y reencuadrar para que tu rostro quede en la zona útil cuadrada.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-7 px-2.5 flex items-center gap-1.5 border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/10"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formPhotoUrl ? "Cambiar Foto" : "Subir Foto"}</span>
                </Button>

                {formPhotoUrl && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRawSelectedImage(formPhotoUrl);
                        setShowCropModal(true);
                      }}
                      className="text-xs h-7 px-2.5 text-dark-300 hover:text-white flex items-center gap-1"
                    >
                      <Move className="w-3 h-3 text-emerald-400" />
                      <span>Reencuadrar</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setFormPhotoUrl(null);
                        setFormPhotoBlob(null);
                      }}
                      className="text-xs h-7 px-2 text-rose-400 hover:text-rose-300"
                      title="Quitar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              placeholder="Ej. Juan"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
            />
            <Input
              label="Apellido *"
              placeholder="Ej. Pérez"
              value={formApellido}
              onChange={(e) => setFormApellido(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sexo *"
              options={GENDER_OPTIONS}
              value={formSexo}
              onChange={(e) => setFormSexo(e.target.value)}
            />
            <Select
              label="Categoría (Nivel de juego) *"
              options={CATEGORY_OPTIONS}
              value={formCategoria}
              onChange={(e) => setFormCategoria(e.target.value)}
            />
          </div>

          {/* Checkbox Observado */}
          <div className="pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 hover:border-amber-500/40 transition-all cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={formObservado}
                onChange={(e) => setFormObservado(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-dark-600 bg-dark-950 text-amber-500 focus:ring-amber-400/30 cursor-pointer accent-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Jugador Observado
                  </span>
                  {formObservado && (
                    <Badge variant="warning" size="xs">
                      Próximo ascenso
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">
                  Indicativo si el jugador tiene un nivel destacado y está próximo a cambiar de categoría por una superior (ej. ascender de 6ta a 5ta).
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              label="Localidad (Lugar de origen)"
              placeholder="Ej. Saladillo"
              value={formLocalidad}
              onChange={(e) => setFormLocalidad(e.target.value)}
            />
            <Input
              label="Email (opcional)"
              type="email"
              placeholder="email@ejemplo.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label="Teléfono (opcional)"
              placeholder="Ej. 2344-123456"
              value={formTelefono}
              onChange={(e) => setFormTelefono(e.target.value)}
            />
          </div>

          {/* Estadísticas de Ranking Iniciales (Solo Administradores) */}
          {isAdmin && (
            <div className="p-3.5 rounded-xl bg-dark-900 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Puntos y Estadísticas de Ranking
                  </span>
                </div>
                <Badge variant="warning" size="xs">
                  Opcional
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Puntos Ranking
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPuntos}
                    onChange={(e) => setFormPuntos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Torneos Jugados
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTorneosJugados}
                    onChange={(e) => setFormTorneosJugados(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Partidos Ganados
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPartidosGanados}
                    onChange={(e) => setFormPartidosGanados(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Partidos Perdidos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPartidosPerdidos}
                    onChange={(e) => setFormPartidosPerdidos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-rose-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending} className="font-bold">
              {isPending ? "Registrando..." : "Registrar Jugador"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: EDITAR JUGADOR */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar Jugador"
      >
        <div className="space-y-4">
          {/* Selector y Previsualización de Foto de Perfil en Edición */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-dark-900 border border-dark-700/80">
            <div className="relative group">
              <PlayerAvatar
                photoUrl={formPhotoUrl}
                firstName={formNombre || "J"}
                lastName={formApellido || "P"}
                category={formCategoria}
                size="xl"
                showCategoryBorder
                className="shadow-md"
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <span className="text-xs font-bold text-white">Foto de Perfil</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Zona Útil Cuadrada (1:1)
                </span>
              </div>
              <p className="text-[11px] text-dark-400 leading-relaxed">
                Amplía, reduce y reencuadra para que tu rostro quede en la zona útil cuadrada.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-7 px-2.5 flex items-center gap-1.5 border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/10"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formPhotoUrl ? "Cambiar Foto" : "Subir Foto"}</span>
                </Button>

                {formPhotoUrl && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRawSelectedImage(formPhotoUrl);
                        setShowCropModal(true);
                      }}
                      className="text-xs h-7 px-2.5 text-dark-300 hover:text-white flex items-center gap-1"
                    >
                      <Move className="w-3 h-3 text-emerald-400" />
                      <span>Reencuadrar</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setFormPhotoUrl(null);
                        setFormPhotoBlob(null);
                      }}
                      className="text-xs h-7 px-2 text-rose-400 hover:text-rose-300"
                      title="Quitar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              placeholder="Nombre del jugador"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
            />
            <Input
              label="Apellido *"
              placeholder="Apellido del jugador"
              value={formApellido}
              onChange={(e) => setFormApellido(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Sexo *"
              options={GENDER_OPTIONS}
              value={formSexo}
              onChange={(e) => setFormSexo(e.target.value)}
            />
            <Select
              label="Categoría (Nivel de juego) *"
              options={CATEGORY_OPTIONS}
              value={formCategoria}
              onChange={(e) => setFormCategoria(e.target.value)}
            />
          </div>

          {/* Checkbox Observado */}
          <div className="pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-dark-900 border border-dark-700/80 hover:border-amber-500/40 transition-all cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={formObservado}
                onChange={(e) => setFormObservado(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-dark-600 bg-dark-950 text-amber-500 focus:ring-amber-400/30 cursor-pointer accent-amber-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    Jugador Observado
                  </span>
                  {formObservado && (
                    <Badge variant="warning" size="xs">
                      Próximo ascenso
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">
                  Indicativo si el jugador tiene un nivel destacado y está próximo a cambiar de categoría por una superior (ej. ascender de 6ta a 5ta).
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              label="Localidad (Lugar de origen)"
              placeholder="Ej. Saladillo"
              value={formLocalidad}
              onChange={(e) => setFormLocalidad(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@ejemplo.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label="Teléfono"
              placeholder="123456789"
              value={formTelefono}
              onChange={(e) => setFormTelefono(e.target.value)}
            />
          </div>

          {/* Estadísticas de Ranking Iniciales (Solo Administradores) */}
          {isAdmin && (
            <div className="p-3.5 rounded-xl bg-dark-900 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Puntos y Estadísticas de Ranking
                  </span>
                </div>
                <Badge variant="warning" size="xs">
                  Opcional
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Puntos Ranking
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPuntos}
                    onChange={(e) => setFormPuntos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Torneos Jugados
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTorneosJugados}
                    onChange={(e) => setFormTorneosJugados(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Partidos Ganados
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPartidosGanados}
                    onChange={(e) => setFormPartidosGanados(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-dark-300 mb-1">
                    Partidos Perdidos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formPartidosPerdidos}
                    onChange={(e) => setFormPartidosPerdidos(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-700 rounded-lg text-rose-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isPending} className="font-bold">
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={isPending}
        title="Eliminar Jugador"
        message={`¿Estás seguro de eliminar a ${deleting?.first_name} ${deleting?.last_name}? Esta acción no se puede deshacer.`}
      />

      {/* INPUT FILE INVISIBLE PARA CARGAR FOTOS DE PERFIL */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* MODAL INTERACTIVO DE RECORTE Y ENCUADRE (ZONA ÚTIL CUADRADA) */}
      <PhotoCropModal
        isOpen={showCropModal}
        imageSrc={rawSelectedImage}
        onConfirm={handleCropConfirm}
        onClose={() => setShowCropModal(false)}
        onSelectNewFile={() => fileInputRef.current?.click()}
      />

      {/* MODAL DE FICHA OFICIAL DE PERFIL DE JUGADOR */}
      <PlayerProfileModal
        isOpen={!!viewingProfilePlayer}
        onClose={() => setViewingProfilePlayer(null)}
        player={viewingProfilePlayer}
        onEdit={(p) => {
          setViewingProfilePlayer(null);
          openEdit(p);
        }}
        stats={viewingProfilePlayer ? playerStatsMap.get(viewingProfilePlayer.id) : undefined}
      />

      {/* MODAL DEDICADO: MODIFICAR ESTADÍSTICAS Y PUNTOS DE RANKING */}
      <Modal
        isOpen={!!editingStatsPlayer}
        onClose={() => setEditingStatsPlayer(null)}
        title={`Estadísticas de Ranking: ${editingStatsPlayer?.first_name || ""} ${editingStatsPlayer?.last_name || ""}`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <strong className="block text-amber-300 font-bold mb-0.5">Control Oficial de Administrador</strong>
              Ajusta los puntos de ranking, torneos jugados y el historial de partidos ganados y perdidos. Se actualizará de inmediato en los rankings oficiales.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Puntos de Ranking
              </label>
              <input
                type="number"
                min="0"
                value={statsPuntos}
                onChange={(e) => setStatsPuntos(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-dark-950 border border-dark-600 rounded-lg text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <span className="text-[11px] text-dark-400 mt-1 block">Puntaje oficial acumulado</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Torneos Jugados
              </label>
              <input
                type="number"
                min="0"
                value={statsTorneos}
                onChange={(e) => setStatsTorneos(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-dark-950 border border-dark-600 rounded-lg text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <span className="text-[11px] text-dark-400 mt-1 block">Total torneos disputados</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
              <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                Partidos Ganados (PG)
              </label>
              <input
                type="number"
                min="0"
                value={statsGanados}
                onChange={(e) => setStatsGanados(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-dark-950 border border-dark-600 rounded-lg text-emerald-400 font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <span className="text-[11px] text-dark-400 mt-1 block">Victorias oficiales</span>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-700/80">
              <label className="block text-xs font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-rose-400" />
                Partidos Perdidos (PP)
              </label>
              <input
                type="number"
                min="0"
                value={statsPerdidos}
                onChange={(e) => setStatsPerdidos(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-dark-950 border border-dark-600 rounded-lg text-rose-400 font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <span className="text-[11px] text-dark-400 mt-1 block">Derrotas oficiales</span>
            </div>
          </div>

          {/* Resumen de efectividad calculado en vivo */}
          {(() => {
            const total = (Number(statsGanados) || 0) + (Number(statsPerdidos) || 0);
            const eff = total > 0 ? Math.round(((Number(statsGanados) || 0) / total) * 100) : 0;
            return (
              <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 flex items-center justify-between text-xs">
                <span className="text-dark-300">Total Partidos: <strong className="text-white">{total}</strong></span>
                <span className="text-dark-300">Efectividad calculada: <strong className="text-amber-400">{eff}%</strong></span>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
            <Button variant="ghost" onClick={() => setEditingStatsPlayer(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStats} disabled={isPending} className="font-bold">
              {isPending ? "Guardando..." : "Guardar Estadísticas"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

