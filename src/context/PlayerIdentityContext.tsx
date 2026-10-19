"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types/tournament";

export interface IndividualRankingData {
  category: string;
  points: number;
  position: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
}

export interface CoupleRankingData {
  id: string;
  partnerName: string;
  partnerPhotoUrl?: string | null;
  category: string;
  points: number;
  position: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
}

export interface PlayerStats {
  points: number;
  tournamentsPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
  individualRanking?: IndividualRankingData | null;
  coupleRankings?: CoupleRankingData[];
}

export interface FichaFormData {
  player_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  category?: string | null;
  photo_url?: string | null;
  is_observed?: boolean;
}

interface PlayerIdentityContextType {
  player: Player | null;
  stats: PlayerStats | null;
  isIdentified: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  loggedEmail: string | null;
  isFichaOpen: boolean;
  openFicha: () => void;
  closeFicha: () => void;
  identifyWithEmail: (email: string) => Promise<{
    success: boolean;
    identified?: boolean;
    isNew?: boolean;
    player?: Player;
    message?: string;
  }>;
  saveFicha: (formData: FichaFormData) => Promise<{ success: boolean; player?: Player; message?: string }>;
  clearIdentity: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

const PlayerIdentityContext = createContext<PlayerIdentityContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "spt_player_email";

export function PlayerIdentityProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isIdentified, setIsIdentified] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedEmail, setLoggedEmail] = useState<string | null>(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);

  const supabase = createClient();

  const openFicha = useCallback(() => setIsFichaOpen(true), []);
  const closeFicha = useCallback(() => setIsFichaOpen(false), []);

  // Función para consultar la API y determinar si se trata de un nuevo usuario o un perfil existente
  const resolveIdentityByEmail = useCallback(
    async (
      email: string
    ): Promise<{
      success: boolean;
      identified: boolean;
      isNew: boolean;
      player?: Player;
      message?: string;
    }> => {
      if (!email || !email.trim()) {
        return { success: false, identified: false, isNew: false, message: "Correo no válido" };
      }

      const cleanEmail = email.trim().toLowerCase();

      try {
        const res = await fetch(`/api/players/identity?email=${encodeURIComponent(cleanEmail)}`);
        const data = await res.json();

        if (data.success && data.identified && data.player) {
          const resolvedPlayer: Player = { ...data.player };

          // Preservar foto de perfil desde almacenamiento local si la BD remota aún no la devuelve
          if (typeof window !== "undefined") {
            const localPhoto = localStorage.getItem(`spt_player_photo_${cleanEmail}`);
            if (!resolvedPlayer.photo_url && localPhoto) {
              resolvedPlayer.photo_url = localPhoto;
            } else if (resolvedPlayer.photo_url) {
              localStorage.setItem(`spt_player_photo_${cleanEmail}`, resolvedPlayer.photo_url);
            }
            localStorage.setItem(LOCAL_STORAGE_KEY, cleanEmail);
          }

          setPlayer(resolvedPlayer);
          setStats(data.stats || null);
          setIsIdentified(true);
          setIsNewUser(false);
          setLoggedEmail(cleanEmail);

          return { success: true, identified: true, isNew: false, player: resolvedPlayer };
        } else {
          // Correo determinado en el navegador pero NO tiene perfil creado -> NUEVO USUARIO
          setIsIdentified(false);
          setPlayer(null);
          setStats(null);
          setIsNewUser(true);
          setLoggedEmail(cleanEmail);

          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_KEY, cleanEmail);
          }

          return {
            success: true,
            identified: false,
            isNew: true,
            message: "Nuevo usuario detectado. Te invitamos a crear tu perfil oficial de jugador.",
          };
        }
      } catch (err: unknown) {
        console.error("Error al resolver identidad del jugador:", err);
        const msg = err instanceof Error ? err.message : "Error de conexión";
        return { success: false, identified: false, isNew: false, message: msg };
      }
    },
    []
  );

  // Determinar la cuenta de correo logueada en el navegador al ingresar a la app (desktop y móvil)
  const checkBrowserIdentity = useCallback(async () => {
    setIsLoading(true);
    try {
      let candidateEmail: string | null = null;

      // 1. Determinar si hay una sesión activa de Supabase Auth en el navegador
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        candidateEmail = user.email;
      }

      // 2. Si no hay auth user, determinar si hay un correo guardado en este navegador/dispositivo
      if (!candidateEmail && typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored && stored.trim()) {
          candidateEmail = stored.trim();
        }
      }

      // 3. Evaluar identidad y determinar si es usuario existente o nuevo usuario
      if (candidateEmail) {
        const res = await resolveIdentityByEmail(candidateEmail);
        if (res.isNew) {
          // Es un nuevo usuario con cuenta de correo en el navegador:
          // Inmediatamente abrimos la ficha para que complete su perfil
          setIsFichaOpen(true);
        }
      } else {
        // NO hay cuenta de correo logueada en el navegador (primer ingreso en desktop o móvil)
        setIsIdentified(false);
        setPlayer(null);
        setStats(null);
        setLoggedEmail(null);
        setIsNewUser(false);

        // Si el usuario aún no determinó su cuenta en esta sesión, abrir el modal inicial de identificación
        if (typeof window !== "undefined") {
          const dismissed = sessionStorage.getItem("spt_auth_dismissed");
          if (!dismissed) {
            setIsFichaOpen(true);
          }
        }
      }
    } catch (err) {
      console.warn("Error comprobando identidad del navegador:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, resolveIdentityByEmail]);

  useEffect(() => {
    checkBrowserIdentity();

    // Escuchar cambios de sesión de autenticación en el navegador
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authEmail = session?.user?.email;
      if (authEmail) {
        const res = await resolveIdentityByEmail(authEmail);
        if (res.isNew) {
          setIsNewUser(true);
          setIsFichaOpen(true);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkBrowserIdentity, resolveIdentityByEmail, supabase]);

  // Identificar manualmente con email
  const identifyWithEmail = async (email: string) => {
    setIsLoading(true);
    try {
      return await resolveIdentityByEmail(email);
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar datos de la ficha
  const saveFicha = async (formData: FichaFormData): Promise<{ success: boolean; player?: Player; message?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = formData.email.trim().toLowerCase();

      // Guardar foto localmente de forma preventiva
      if (formData.photo_url && typeof window !== "undefined") {
        localStorage.setItem(`spt_player_photo_${cleanEmail}`, formData.photo_url);
      }

      const res = await fetch("/api/players/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!json.success) {
        return { success: false, message: json.error || "Error al guardar la ficha" };
      }

      const savedPlayer: Player = {
        ...json.player,
        photo_url: json.player?.photo_url || formData.photo_url || null,
      };

      setPlayer(savedPlayer);
      setIsIdentified(true);
      setIsNewUser(false);
      setLoggedEmail(cleanEmail);

      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, cleanEmail);
      }

      // Refrescar estadísticas completas
      await resolveIdentityByEmail(cleanEmail);

      return {
        success: true,
        player: savedPlayer,
        message: "¡Ficha guardada exitosamente!",
      };
    } catch (err: unknown) {
      console.error("Error guardando ficha:", err);
      const msg = err instanceof Error ? err.message : "Error de red al guardar ficha";
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Limpiar identidad en este dispositivo
  const clearIdentity = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      sessionStorage.removeItem("spt_auth_dismissed");
    }
    setPlayer(null);
    setStats(null);
    setIsIdentified(false);
    setIsNewUser(false);
    setLoggedEmail(null);
  };

  const refreshIdentity = async () => {
    if (loggedEmail) {
      await resolveIdentityByEmail(loggedEmail);
    } else {
      await checkBrowserIdentity();
    }
  };

  return (
    <PlayerIdentityContext.Provider
      value={{
        player,
        stats,
        isIdentified,
        isLoading,
        isNewUser,
        loggedEmail,
        isFichaOpen,
        openFicha,
        closeFicha,
        identifyWithEmail,
        saveFicha,
        clearIdentity,
        refreshIdentity,
      }}
    >
      {children}
    </PlayerIdentityContext.Provider>
  );
}

export function usePlayerIdentity() {
  const context = useContext(PlayerIdentityContext);
  if (!context) {
    throw new Error("usePlayerIdentity debe usarse dentro de un PlayerIdentityProvider");
  }
  return context;
}
