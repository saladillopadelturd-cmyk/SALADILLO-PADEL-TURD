"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/user";
import { ShieldCheck, Shield, User, AlertCircle, CheckCircle2, Search } from "lucide-react";

const ROOT_ADMIN_EMAIL = "matiasvidal11972@gmail.com";

export default function AdminAdminsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (isMounted && data) setProfiles(data);
      } catch (err: unknown) {
        console.error("Error fetching profiles:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleRoleChange = async () => {
    if (!targetUser || !actionType) return;

    const newRole: "admin" | "user" = actionType === "promote" ? "admin" : "user";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", targetUser.id);

      if (error) throw error;

      setStatusMsg({
        type: "success",
        text: `El rol de ${targetUser.email} se actualizó a ${newRole.toUpperCase()}.`,
      });

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetUser.id ? { ...p, role: newRole } : p))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar rol";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setTargetUser(null);
      setActionType(null);
    }
  };

  const filtered = profiles.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name && p.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gestión de Administradores
          </h1>
          <p className="text-dark-400 mt-1 text-sm">
            Otorga o revoca permisos de administración a usuarios registrados en el sistema.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
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

      {/* Filter / Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-dark-700 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-900 text-dark-400 uppercase text-xs border-b border-dark-700">
                <th className="px-6 py-3.5 text-left">Usuario / Nombre</th>
                <th className="px-6 py-3.5 text-left">Correo Electrónico</th>
                <th className="px-6 py-3.5 text-center">Rol Actual</th>
                <th className="px-6 py-3.5 text-center">Fecha Registro</th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-dark-400">
                    Cargando usuarios registrados...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-dark-400">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((profile) => {
                  const isRoot = profile.email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
                  const isAdmin = profile.role === "admin" || isRoot;

                  return (
                    <tr key={profile.id} className="bg-dark-800 hover:bg-dark-750 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                            <User className="w-4 h-4" />
                          </div>
                          <span>{profile.full_name || "Sin nombre"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-300 font-mono text-xs">
                        {profile.email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isRoot ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/30 font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Administrador Raíz
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-500/10 text-primary-400 text-xs rounded-full border border-primary-500/30 font-semibold">
                            <Shield className="w-3.5 h-3.5" /> Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-dark-700 text-dark-400 text-xs rounded-full">
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-dark-400 text-xs">
                        {new Date(profile.created_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isRoot ? (
                          <span className="text-dark-500 text-xs">Protegido</span>
                        ) : isAdmin ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setTargetUser(profile);
                              setActionType("demote");
                            }}
                            className="text-xs"
                          >
                            Quitar Admin
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setTargetUser(profile);
                              setActionType("promote");
                            }}
                            className="text-xs bg-primary-600 hover:bg-primary-500"
                          >
                            Hacer Admin
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        isOpen={!!targetUser && !!actionType}
        onClose={() => {
          setTargetUser(null);
          setActionType(null);
        }}
        onConfirm={handleRoleChange}
        title={actionType === "promote" ? "Otorgar Permisos de Admin" : "Revocar Permisos de Admin"}
        message={
          actionType === "promote"
            ? `¿Deseas otorgar permisos de Administrador a ${targetUser?.email}? Podrá crear torneos, modificar fixture y cargar resultados.`
            : `¿Deseas quitar los permisos de Administrador a ${targetUser?.email}? Pasará a tener rol de usuario general.`
        }
      />
    </div>
  );
}
