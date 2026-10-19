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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (data && !error) {
        setProfile(data);
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

  const isRootAdmin = user?.email?.toLowerCase() === "matiasvidal11972@gmail.com";
  const isAdmin = isRootAdmin || profile?.role === "admin" || (profile as unknown as { role: string })?.role === "super_admin";

  return {
    user,
    profile,
    loading,
    signOut,
    isAdmin,
    isSuperAdmin: isRootAdmin || (profile as unknown as { role: string })?.role === "super_admin",
  };
}
