"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Couple, Player, Tournament } from "@/types/tournament";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminParejasPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Couple | null>(null);
  const [deleting, setDeleting] = useState<Couple | null>(null);
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
    setFormTorneo(tournaments[0]?.id ?? "");
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

  const getPlayerLabel = (p: Player | undefined | null) => {
    if (!p) return "Desconocido";
    return `${p.first_name} ${p.last_name}`.trim();
  };

  const tournamentOptions = tournaments.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const playerOptions = players.map((p) => ({
    value: p.id,
    label: `${p.first_name} ${p.last_name}`,
  }));

  const handleCreate = async () => {
    if (!formTorneo || !formJugador1 || !formJugador2) {
      setNotification({ type: "error", text: "Debes seleccionar un torneo y ambos jugadores." });
      return;
    }

    if (formJugador1 === formJugador2) {
      setNotification({ type: "error", text: "El Jugador 1 y el Jugador 2 deben ser diferentes." });
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
    if (!formTorneo || !formJugador1 || !formJugador2) {
      setNotification({ type: "error", text: "Debes seleccionar un torneo y ambos jugadores." });
      return;
    }

    if (formJugador1 === formJugador2) {
      setNotification({ type: "error", text: "El Jugador 1 y el Jugador 2 deben ser diferentes." });
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Parejas</h1>
          <p className="text-dark-400 mt-1">Formar, administrar y eliminar parejas para los torneos</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : couples.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-dark-400 text-base mb-4">No hay parejas formadas todavía.</p>
          <Button onClick={openCreate} disabled={tournaments.length === 0 || players.length < 2}>
            Formar la Primera Pareja
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
                {couples.map((pair) => (
                  <tr key={pair.id} className="bg-dark-800">
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
            onChange={(e) => setFormTorneo(e.target.value)}
          />
          <Select
            label="Jugador 1"
            placeholder="Seleccionar jugador"
            options={playerOptions}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
          />
          <Select
            label="Jugador 2"
            placeholder="Seleccionar jugador"
            options={playerOptions}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Creando..." : "Crear Pareja"}
            </Button>
          </div>
        </div>
      </Modal>

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
            onChange={(e) => setFormTorneo(e.target.value)}
          />
          <Select
            label="Jugador 1"
            placeholder="Seleccionar jugador"
            options={playerOptions}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
          />
          <Select
            label="Jugador 2"
            placeholder="Seleccionar jugador"
            options={playerOptions}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={isPending}
        title="Eliminar Pareja"
        message={`¿Estás seguro de eliminar la pareja ${deleting ? `${getPlayerLabel(deleting.player1)} / ${getPlayerLabel(deleting.player2)}` : ""}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
