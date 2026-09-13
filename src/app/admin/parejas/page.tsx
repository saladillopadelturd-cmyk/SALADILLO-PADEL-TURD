"use client";

import { useEffect, useState, useCallback, useMemo, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Couple, Player, Tournament } from "@/types/tournament";
import {
  getAvailablePlayersForTournament,
  getAssignedPlayerIdsInTournament,
  validateCoupleFormation,
} from "@/lib/tournament/couples";
import { AlertCircle, CheckCircle2, Users, Filter } from "lucide-react";

export default function AdminParejasPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Couple | null>(null);
  const [deleting, setDeleting] = useState<Couple | null>(null);
  const [filterTorneo, setFilterTorneo] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formTorneo, setFormTorneo] = useState("");
  const [formJugador1, setFormJugador1] = useState("");
  const [formJugador2, setFormJugador2] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [couplesRes, tournamentsRes, playersRes] = await Promise.all([
        supabase
          .from("couples")
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tournaments")
          .select("id, name")
          .order("created_at", { ascending: false }),
        supabase
          .from("players")
          .select("id, first_name, last_name")
          .order("first_name", { ascending: true }),
      ]);

      if (couplesRes.data) setCouples(couplesRes.data as unknown as Couple[]);
      if (tournamentsRes.data) setTournaments(tournamentsRes.data as unknown as Tournament[]);
      if (playersRes.data) setPlayers(playersRes.data as unknown as Player[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar parejas";
      console.error("Error al cargar parejas:", err);
      setNotification({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    const defaultTorneo = filterTorneo !== "all" ? filterTorneo : (tournaments[0]?.id ?? "");
    setFormTorneo(defaultTorneo);
    setFormJugador1("");
    setFormJugador2("");
    setShowCreate(true);
  };

  const openEdit = (pair: Couple) => {
    setFormTorneo(pair.tournament_id);
    setFormJugador1(pair.player1_id);
    setFormJugador2(pair.player2_id);
    setEditing(pair);
  };

  const handleTorneoChange = (newTorneoId: string) => {
    setFormTorneo(newTorneoId);
    // Si algún jugador seleccionado ya pertenece a otra pareja en el nuevo torneo, limpiarlo
    const assigned = getAssignedPlayerIdsInTournament(couples, newTorneoId, editing?.id);
    if (formJugador1 && assigned.has(formJugador1)) {
      setFormJugador1("");
    }
    if (formJugador2 && assigned.has(formJugador2)) {
      setFormJugador2("");
    }
  };

  const getPlayerLabel = (p: Player | undefined | null) => {
    if (!p) return "Desconocido";
    return `${p.first_name} ${p.last_name}`.trim();
  };

  const tournamentOptions = tournaments.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  // Jugadores disponibles para el torneo seleccionado (los que no integran ya una pareja)
  const availablePlayersInSelectedTorneo = useMemo(() => {
    return getAvailablePlayersForTournament(players, couples, formTorneo, editing?.id);
  }, [players, couples, formTorneo, editing]);

  // Opciones para Jugador 1: excluye los ya asignados y al Jugador 2 (si fue seleccionado)
  const player1Options = useMemo(() => {
    const available = getAvailablePlayersForTournament(
      players,
      couples,
      formTorneo,
      editing?.id,
      formJugador2 || null
    );
    return available.map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name}`,
    }));
  }, [players, couples, formTorneo, editing, formJugador2]);

  // Opciones para Jugador 2: excluye los ya asignados y al Jugador 1 (si fue seleccionado)
  const player2Options = useMemo(() => {
    const available = getAvailablePlayersForTournament(
      players,
      couples,
      formTorneo,
      editing?.id,
      formJugador1 || null
    );
    return available.map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name}`,
    }));
  }, [players, couples, formTorneo, editing, formJugador1]);

  // Filtrar parejas en la lista según el torneo seleccionado en el filtro
  const filteredCouples = useMemo(() => {
    if (filterTorneo === "all") return couples;
    return couples.filter((c) => c.tournament_id === filterTorneo);
  }, [couples, filterTorneo]);

  const handleCreate = async () => {
    const validation = validateCoupleFormation(formTorneo, formJugador1, formJugador2, couples);
    if (!validation.isValid) {
      setNotification({ type: "error", text: validation.error || "Datos inválidos para formar la pareja." });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          tournament_id: formTorneo,
          player1_id: formJugador1,
          player2_id: formJugador2,
        };

        const { data, error } = await supabase
          .from("couples")
          .insert(payload)
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name)")
          .single();

        if (error) throw error;
        if (data) {
          setCouples((prev) => [data as unknown as Couple, ...prev]);
          setShowCreate(false);
          setNotification({ type: "success", text: "Pareja creada exitosamente." });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al crear la pareja";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleEdit = async () => {
    if (!editing) return;
    const validation = validateCoupleFormation(formTorneo, formJugador1, formJugador2, couples, editing.id);
    if (!validation.isValid) {
      setNotification({ type: "error", text: validation.error || "Datos inválidos para editar la pareja." });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          tournament_id: formTorneo,
          player1_id: formJugador1,
          player2_id: formJugador2,
        };

        const { data, error } = await supabase
          .from("couples")
          .update(payload)
          .eq("id", editing.id)
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name)")
          .single();

        if (error) throw error;
        if (data) {
          setCouples((prev) =>
            prev.map((c) => (c.id === editing.id ? (data as unknown as Couple) : c))
          );
          setEditing(null);
          setNotification({ type: "success", text: "Pareja actualizada con éxito." });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar la pareja";
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
          .from("couples")
          .delete()
          .eq("id", target.id);

        if (error) throw error;

        setCouples((prev) => prev.filter((c) => c.id !== target.id));
        setDeleting(null);
        setNotification({
          type: "success",
          text: "Pareja eliminada correctamente.",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar la pareja";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Parejas</h1>
          <p className="text-dark-400 mt-1">
            Formar y administrar parejas. Cada jugador solo puede pertenecer a una pareja por torneo.
          </p>
        </div>
        <Button onClick={openCreate} disabled={tournaments.length === 0 || players.length < 2}>
          + Nueva Pareja
        </Button>
      </div>

      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
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
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-bold tracking-wider hover:opacity-80 px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtro por Torneo */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900/60 p-4 rounded-xl border border-dark-700">
        <div className="flex items-center gap-2 text-sm text-dark-300">
          <Filter className="w-4 h-4 text-primary-400" />
          <span className="font-medium">Filtrar por Torneo:</span>
        </div>
        <select
          value={filterTorneo}
          onChange={(e) => setFilterTorneo(e.target.value)}
          className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Todos los Torneos ({couples.length} parejas)</option>
          {tournaments.map((t) => {
            const count = couples.filter((c) => c.tournament_id === t.id).length;
            return (
              <option key={t.id} value={t.id}>
                {t.name} ({count} parejas)
              </option>
            );
          })}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCouples.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-dark-400 text-base mb-4">
            {filterTorneo === "all"
              ? "No hay parejas formadas todavía."
              : "No hay parejas registradas en el torneo seleccionado."}
          </p>
          <Button onClick={openCreate} disabled={tournaments.length === 0 || players.length < 2}>
            Formar Nueva Pareja
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                  <th className="px-6 py-3 text-left">Jugador 1</th>
                  <th className="px-6 py-3 text-left">Jugador 2</th>
                  <th className="px-6 py-3 text-left">Torneo</th>
                  <th className="px-6 py-3 text-left">Siembra (Seed)</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredCouples.map((pair) => (
                  <tr key={pair.id} className="bg-dark-800 hover:bg-dark-700/50 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">
                      {getPlayerLabel(pair.player1)}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {getPlayerLabel(pair.player2)}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {(pair as unknown as { tournament?: { name: string } }).tournament?.name ?? "Torneo"}
                    </td>
                    <td className="px-6 py-4 text-dark-300">
                      {pair.seed ? `Cabeza de serie #${pair.seed}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(pair)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleting(pair)}
                          disabled={isPending}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Formar Pareja */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Formar Pareja"
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={tournamentOptions}
            value={formTorneo}
            onChange={(e) => handleTorneoChange(e.target.value)}
          />

          {/* Información de disponibilidad */}
          <div className="p-3 bg-dark-800/80 border border-dark-700 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Jugadores disponibles en este torneo:</span>
              <span className="font-bold text-primary-400">
                {availablePlayersInSelectedTorneo.length} de {players.length}
              </span>
            </div>
            <p className="text-dark-400 text-[11px]">
              * Regla: cada jugador no puede integrar más de una pareja. Los jugadores ya asignados no aparecen en la lista.
            </p>
          </div>

          {availablePlayersInSelectedTorneo.length < 2 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                No hay suficientes jugadores libres en este torneo (mínimo 2 requeridos). Todos los jugadores ya forman una pareja o faltan registrar jugadores.
              </span>
            </div>
          )}

          <Select
            label="Jugador 1"
            placeholder={
              player1Options.length === 0
                ? "No hay jugadores libres disponibles"
                : "Seleccionar jugador"
            }
            options={player1Options}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
            disabled={player1Options.length === 0}
          />

          <Select
            label="Jugador 2"
            placeholder={
              player2Options.length === 0
                ? "No hay jugadores libres disponibles"
                : "Seleccionar jugador"
            }
            options={player2Options}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
            disabled={player2Options.length === 0}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isPending ||
                !formTorneo ||
                !formJugador1 ||
                !formJugador2 ||
                availablePlayersInSelectedTorneo.length < 2
              }
            >
              {isPending ? "Creando..." : "Crear Pareja"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Pareja */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar Pareja"
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={tournamentOptions}
            value={formTorneo}
            onChange={(e) => handleTorneoChange(e.target.value)}
          />

          <div className="p-3 bg-dark-800/80 border border-dark-700 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Jugadores disponibles para esta pareja:</span>
              <span className="font-bold text-primary-400">
                {availablePlayersInSelectedTorneo.length} jugadores
              </span>
            </div>
            <p className="text-dark-400 text-[11px]">
              * Se muestran los jugadores integrantes actuales y aquellos que no pertenezcan a ninguna otra pareja en este torneo.
            </p>
          </div>

          <Select
            label="Jugador 1"
            placeholder="Seleccionar jugador"
            options={player1Options}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
          />

          <Select
            label="Jugador 2"
            placeholder="Seleccionar jugador"
            options={player2Options}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isPending || !formTorneo || !formJugador1 || !formJugador2}
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirmar Eliminación */}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={isPending}
        title="Eliminar Pareja"
        message={`¿Estás seguro de eliminar la pareja ${
          deleting ? `${getPlayerLabel(deleting.player1)} / ${getPlayerLabel(deleting.player2)}` : ""
        }? Al eliminarla, los jugadores volverán a estar disponibles para integrar nuevas parejas.`}
      />
    </div>
  );
}
