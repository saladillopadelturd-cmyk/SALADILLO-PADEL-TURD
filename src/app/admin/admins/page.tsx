"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/user";
import {
  ShieldCheck,
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
  Search,
  UserPlus,
  Loader2,
  Mail,
} from "lucide-react";

const ROOT_ADMIN_EMAILS = [
  "matiasvidal11972@gmail.com",
  "saladillopadelturd@gmail.com",
];

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Formulario para nuevo administrador
  const [emailInput, setEmailInput] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal de confirmación de acción
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"promote" | "demote" | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    async function loadAdmins() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (isMounted && data) {
          // Filtrar estrictamente solo usuarios administradores
          const onlyAdmins = data.filter(
            (p) =>
              p.role === "admin" ||
              ROOT_ADMIN_EMAILS.includes(p.email.toLowerCase())
          );
          setAdmins(onlyAdmins);
        }
      } catch (err: unknown) {
        console.error("Error al obtener administradores:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAdmins();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSearchAndPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setStatusMsg(null);

    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setFormError("Ingresa un correo electrónico.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError("Por favor, ingresa un correo electrónico válido.");
      return;
    }

    // Comprobar si ya está en la lista de administradores
    const alreadyAdmin = admins.some(
      (a) => a.email.toLowerCase() === cleanEmail
    );
    if (alreadyAdmin || ROOT_ADMIN_EMAILS.includes(cleanEmail)) {
      setFormError("Este usuario ya cuenta con permisos de Administrador.");
      return;
    }

    setSearchingUser(true);

    try {
      const { data: foundProfile, error: searchError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (searchError) throw searchError;

      if (!foundProfile) {
        setFormError(
          `No se encontró ningún usuario registrado con el correo "${cleanEmail}". El usuario debe crear una cuenta en la aplicación antes de poder ser designado administrador.`
        );
        return;
      }

      if (foundProfile.role === "admin") {
        setFormError("Este usuario ya cuenta con rol de Administrador.");
        // Si no estaba en la lista local por alguna razón, sincronizarlo
        setAdmins((prev) => [foundProfile, ...prev.filter((p) => p.id !== foundProfile.id)]);
        return;
      }

      // Proceder a confirmar la promoción
      setTargetUser(foundProfile);
      setActionType("promote");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al buscar usuario";
      setFormError(msg);
    } finally {
      setSearchingUser(false);
    }
  };

  const handleRoleChange = async () => {
    if (!targetUser || !actionType) return;

    const newRole: "admin" | "user" = actionType === "promote" ? "admin" : "user";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", targetUser.id);

      if (error) throw error;

      if (actionType === "promote") {
        setStatusMsg({
          type: "success",
          text: `Se otorgaron permisos de Administrador a ${targetUser.email}.`,
        });
        setEmailInput("");
        setFormError(null);
        const updatedAdmin: Profile = { ...targetUser, role: "admin" };
        setAdmins((prev) => [updatedAdmin, ...prev.filter((p) => p.id !== targetUser.id)]);
      } else {
        setStatusMsg({
          type: "success",
          text: `Se revocaron los permisos de Administrador a ${targetUser.email}.`,
        });
        setAdmins((prev) => prev.filter((p) => p.id !== targetUser.id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar rol";
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setTargetUser(null);
      setActionType(null);
    }
  };

  const filteredAdmins = admins.filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name && p.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary-400" />
          Gestión de Administradores
        </h1>
        <p className="text-dark-400 mt-1 text-sm">
          Designa administradores ingresando su correo electrónico o revoca permisos a miembros actuales.
        </p>
      </div>

      {/* Alerta de Estado General */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm transition-all ${
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
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Formulario: Asignar nuevo Administrador por Correo */}
      <Card className="p-6 border-dark-700 bg-dark-850 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Designar Nuevo Administrador
            </h2>
            <p className="text-dark-400 text-xs sm:text-sm">
              Ingresa el correo electrónico del usuario registrado que deseas convertir en administrador.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchAndPromote} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="correo@ejemplo.com"
                className={`w-full bg-dark-900 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none transition-all ${
                  formError
                    ? "border-red-500/60 focus:border-red-500 ring-1 ring-red-500/20"
                    : "border-dark-700 focus:border-primary-500"
                }`}
                disabled={searchingUser}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={searchingUser || !emailInput.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 whitespace-nowrap bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm transition-all disabled:opacity-50"
            >
              {searchingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hacer Administrador</span>
                </>
              )}
            </Button>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
        </form>
      </Card>

      {/* Lista Exclusiva de Administradores */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Administradores Activos</span>
              <span className="text-xs px-2.5 py-0.5 bg-dark-700 text-dark-300 rounded-full font-normal">
                {admins.length}
              </span>
            </h2>
            <p className="text-xs text-dark-400 mt-0.5">
              Usuarios con acceso total a torneos, fixtures, resultados y ajustes del sistema.
            </p>
          </div>

          {/* Filtro / Búsqueda entre administradores */}
          {admins.length > 3 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar administradores..."
                className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          )}
        </div>

        <Card className="overflow-hidden border-dark-700 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-900 text-dark-400 uppercase text-xs border-b border-dark-700">
                  <th className="px-6 py-3.5 text-left">Usuario / Nombre</th>
                  <th className="px-6 py-3.5 text-left">Correo Electrónico</th>
                  <th className="px-6 py-3.5 text-center">Rol</th>
                  <th className="px-6 py-3.5 text-center">Fecha Alta</th>
                  <th className="px-6 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-dark-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                        <span>Cargando lista de administradores...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-dark-400">
                      {search ? (
                        <span>No se encontraron administradores que coincidan con &quot;{search}&quot;.</span>
                      ) : (
                        <span>No hay administradores registrados actualmente.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((profile) => {
                    const isRoot = ROOT_ADMIN_EMAILS.includes(profile.email.toLowerCase());

                    return (
                      <tr
                        key={profile.id}
                        className="bg-dark-800 hover:bg-dark-750 transition-colors"
                      >
                        <td className="px-6 py-4 text-white font-medium">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                              <User className="w-4 h-4" />
                            </div>
                            <span>{profile.full_name || "Sin nombre registrado"}</span>
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
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-500/10 text-primary-400 text-xs rounded-full border border-primary-500/30 font-semibold">
                              <Shield className="w-3.5 h-3.5" /> Administrador
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-dark-400 text-xs">
                          {new Date(profile.created_at).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isRoot ? (
                            <span className="text-dark-500 text-xs font-medium italic">
                              Protegido
                            </span>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setTargetUser(profile);
                                setActionType("demote");
                              }}
                              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
                            >
                              Quitar Admin
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
      </div>

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={!!targetUser && !!actionType}
        onClose={() => {
          setTargetUser(null);
          setActionType(null);
        }}
        onConfirm={handleRoleChange}
        title={
          actionType === "promote"
            ? "Otorgar Permisos de Administrador"
            : "Revocar Permisos de Administrador"
        }
        message={
          actionType === "promote"
            ? `¿Deseas otorgar permisos de Administrador a ${targetUser?.email}${
                targetUser?.full_name ? ` (${targetUser.full_name})` : ""
              }? Tendrá acceso total a gestionar torneos, modificar fixtures y cargar resultados.`
            : `¿Deseas quitar los permisos de Administrador a ${targetUser?.email}? Pasará a tener rol de usuario general.`
        }
        confirmLabel={actionType === "promote" ? "Hacer Administrador" : "Revocar Permisos"}
        variant={actionType === "promote" ? "primary" : "danger"}
      />
    </div>
  );
}
