"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuthAndRole = async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser && requireAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .maybeSingle();

        const isRootAdmin = currentUser.email?.toLowerCase() === "matiasvidal11972@gmail.com";
        const userIsAdmin = isRootAdmin || profile?.role === "admin";
        setIsAdmin(userIsAdmin);
        if (!userIsAdmin) {
          router.push("/");
        }
      }
      setLoading(false);
    };

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await checkAuthAndRole(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await checkAuthAndRole(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase, requireAdmin, router]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
