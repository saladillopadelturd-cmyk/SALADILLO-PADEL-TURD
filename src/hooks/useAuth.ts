"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user" | "public" | "super_admin";
  created_at?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async (currentUser: User) => {
      try {
        const { data, error, status } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error) {
          if (status === 401) {
            setProfile(null);
            return;
          }
          console.warn("Aviso al consultar perfil:", error.message);
          setProfile(null);
          return;
        }

        if (data) {
          setProfile(data);
        }
      } catch {
        setProfile(null);
      }
    };

    const getUser = async () => {
      try {
        if (typeof window !== "undefined" && localStorage.getItem("spt_logged_out") === "true") {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          await fetchProfile(user);
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        return;
      }

      if (typeof window !== "undefined" && localStorage.getItem("spt_logged_out") === "true" && event !== "SIGNED_IN") {
        return;
      }

      if (event === "SIGNED_IN" && typeof window !== "undefined") {
        localStorage.removeItem("spt_logged_out");
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      console.warn("Error in signOut:", e);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("spt_logged_out", "true");
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("sb-") || k.includes("supabase"))) {
            localStorage.removeItem(k);
          }
        }
      } catch (e) {}
    }
    setUser(null);
    setProfile(null);
  };

  const [adminModeEnabled, setAdminModeEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("spt_admin_mode_enabled") !== "false";
    }
    return true;
  });

  useEffect(() => {
    const handleAdminModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (customEvent.detail !== undefined) {
        setAdminModeEnabled(Boolean(customEvent.detail));
      } else if (typeof window !== "undefined") {
        setAdminModeEnabled(localStorage.getItem("spt_admin_mode_enabled") !== "false");
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("spt_admin_mode_change", handleAdminModeChange);
      window.addEventListener("storage", handleAdminModeChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("spt_admin_mode_change", handleAdminModeChange);
        window.removeEventListener("storage", handleAdminModeChange);
      }
    };
  }, []);

  const toggleAdminMode = () => {
    const nextVal = !adminModeEnabled;
    setAdminModeEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("spt_admin_mode_enabled", nextVal ? "true" : "false");
      window.dispatchEvent(new CustomEvent("spt_admin_mode_change", { detail: nextVal }));
    }
    return nextVal;
  };

  const setAdminMode = (enabled: boolean) => {
    setAdminModeEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("spt_admin_mode_enabled", enabled ? "true" : "false");
      window.dispatchEvent(new CustomEvent("spt_admin_mode_change", { detail: enabled }));
    }
  };

  const storedEmail = typeof window !== "undefined" ? localStorage.getItem("spt_player_email") : null;
  const effectiveEmail = user?.email || storedEmail || "";
  const isRootAdmin = effectiveEmail.toLowerCase() === "matiasvidal11972@gmail.com";
  const isActualAdmin = isRootAdmin || profile?.role === "admin" || (profile as unknown as { role: string })?.role === "super_admin";
  
  // Con el botón ADMIN apagado verá la app como un usuario normal; con el botón ADMIN encendido verá las opciones de administrador
  const isAdmin = Boolean(isActualAdmin && adminModeEnabled);

  return {
    user,
    profile,
    loading,
    signOut,
    isAdmin,
    isActualAdmin,
    adminModeEnabled,
    toggleAdminMode,
    setAdminMode,
    isSuperAdmin: isRootAdmin || (profile as unknown as { role: string })?.role === "super_admin",
  };
}
