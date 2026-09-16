"use client";

import { useEffect, useState, useCallback, useTransition, useMemo } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types/tournament";
import { AlertCircle, CheckCircle2, Eye, Search, Filter, ShieldCheck, UserCheck } from "lucide-react";

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
  const [formSexo, setFormSexo] = useState<string>("Masculino");
  const [formCategoria, setFormCategoria] = useState<string>("5ta");
  const [formObservado, setFormObservado] = useState<boolean>(false);

  // Filtros de tabla
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [onlyObservedFilter, setOnlyObservedFilter] = useState(false);

  const supabase = createClient();

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPlayers(data);
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

  const openCreate = () => {
    setFormNombre("");
    setFormApellido("");
    setFormEmail("");
    setFormTelefono("");
    setFormSexo("Masculino");
    setFormCategoria("5ta");
    setFormObservado(false);
    setShowCreate(true);
  };

  const openEdit = (player: Player) => {
    setFormNombre(player.first_name);
    setFormApellido(player.last_name);
    setFormEmail(player.email ?? "");
    setFormTelefono(player.phone ?? "");
    setFormSexo(player.gender || "Masculino");
    setFormCategoria(player.category || "5ta");
    setFormObservado(!!player.is_observed);
    setEditing(player);
  };

  const handleCreate = async () => {
    if (!formNombre.trim() || !formApellido.trim()) {
      setNotification({ type: "error", text: "Nombre y apellido son obligatorios." });
      return;
    }

    startTransition(async () => {
      try {
        const payloadWithAllFields = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
          gender: formSexo,
          category: formCategoria,
          is_observed: formObservado,
        };

        let result = await supabase
          .from("players")
          .insert(payloadWithAllFields)
          .select()
          .single();

        // Resiliencia: Si la base de datos remota aún no corrió la migración de las 3 columnas
        if (result.error && (result.error.message.includes("column") || result.error.code === "PGRST204")) {
          console.warn("Columnas no migradas aún en Supabase, reintentando con campos base:", result.error);
          const fallbackPayload = {
            first_name: formNombre.trim(),
            last_name: formApellido.trim(),
            email: formEmail.trim() || null,
            phone: formTelefono.trim() || null,
          };
          result = await supabase
            .from("players")
            .insert(fallbackPayload)
            .select()
            .single();

          if (result.error) throw result.error;

          const localData: Player = {
            ...result.data,
            gender: formSexo,
            category: formCategoria,
            is_observed: formObservado,
          };
          setPlayers((prev) => [localData, ...prev]);
          setShowCreate(false);
          setNotification({
            type: "success",
            text: `Jugador ${localData.first_name} ${localData.last_name} (${formCategoria}) registrado exitosamente.`,
          });
          return;
        }

        if (result.error) throw result.error;
        if (result.data) {
          setPlayers((prev) => [result.data, ...prev]);
          setShowCreate(false);
          setNotification({
            type: "success",
            text: `Jugador ${result.data.first_name} ${result.data.last_name} (${result.data.category || formCategoria}) registrado exitosamente.`,
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
        const payloadWithAllFields = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
          gender: formSexo,
          category: formCategoria,
          is_observed: formObservado,
        };

        let result = await supabase
          .from("players")
          .update(payloadWithAllFields)
          .eq("id", editing.id)
          .select()
          .single();

        // Resiliencia: Si la base de datos remota aún no tiene las 3 columnas
        if (result.error && (result.error.message.includes("column") || result.error.code === "PGRST204")) {
          console.warn("Columnas no migradas aún en Supabase, reintentando actualización base:", result.error);
          const fallbackPayload = {
            first_name: formNombre.trim(),
            last_name: formApellido.trim(),
            email: formEmail.trim() || null,
            phone: formTelefono.trim() || null,
          };
          result = await supabase
            .from("players")
            .update(fallbackPayload)
            .eq("id", editing.id)
            .select()
            .single();

          if (result.error) throw result.error;

          const updatedLocal: Player = {
            ...result.data,
            gender: formSexo,
            category: formCategoria,
            is_observed: formObservado,
          };
          setPlayers((prev) =>
            prev.map((p) => (p.id === editing.id ? updatedLocal : p))
          );
          setEditing(null);
          setNotification({
            type: "success",
            text: `Jugador ${updatedLocal.first_name} ${updatedLocal.last_name} actualizado exitosamente.`,
          });
          return;
        }

        if (result.error) throw result.error;
        if (result.data) {
          setPlayers((prev) =>
            prev.map((p) => (p.id === editing.id ? result.data : p))
          );
          setEditing(null);
          setNotification({
            type: "success",
            text: `Jugador ${result.data.first_name} ${result.data.last_name} actualizado exitosamente.`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar jugador";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("players")
          .delete()
          .eq("id", target.id);

        if (error) throw error;

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
                      {/* Nombre del Jugador */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                            {player.first_name} {player.last_name}
                            {player.is_observed && (
                              <span title="Jugador en observación para ascenso">
                                <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-dark-500 sm:hidden">
                            {player.phone || player.email || "Sin contacto"}
                          </span>
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
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(player)}
                            className="text-xs h-8 px-2.5"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleting(player)}
                            disabled={isPending}
                            className="text-xs h-8 px-2.5"
                          >
                            Eliminar
                          </Button>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
    </div>
  );
}

