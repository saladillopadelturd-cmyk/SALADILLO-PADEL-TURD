"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { Pair } from "@/types/tournament";

const INITIAL_PAIRS: Pair[] = [
  {
    id: "1",
    tournament_id: "demo",
    player1_id: "1",
    player2_id: "2",
    zone_id: "z1",
    seed: null,
    created_at: new Date().toISOString(),
    player1: { id: "1", user_id: null, first_name: "Juan", last_name: "Pérez", email: null, phone: null, created_at: "" },
    player2: { id: "2", user_id: null, first_name: "Carlos", last_name: "López", email: null, phone: null, created_at: "" },
  },
  {
    id: "2",
    tournament_id: "demo",
    player1_id: "3",
    player2_id: "4",
    zone_id: "z2",
    seed: null,
    created_at: new Date().toISOString(),
    player1: { id: "3", user_id: null, first_name: "Martín", last_name: "García", email: null, phone: null, created_at: "" },
    player2: { id: "4", user_id: null, first_name: "Ana", last_name: "Silva", email: null, phone: null, created_at: "" },
  },
];

const TOURNAMENT_OPTIONS = [{ value: "demo", label: "Torneo Demo" }];
const PLAYER_OPTIONS = [
  { value: "1", label: "Juan Pérez" },
  { value: "2", label: "Carlos López" },
  { value: "3", label: "Martín García" },
  { value: "4", label: "Ana Silva" },
];

export default function AdminParejasPage() {
  const [pairs, setPairs] = useState<Pair[]>(INITIAL_PAIRS);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Pair | null>(null);
  const [deleting, setDeleting] = useState<Pair | null>(null);

  const [formTorneo, setFormTorneo] = useState("");
  const [formJugador1, setFormJugador1] = useState("");
  const [formJugador2, setFormJugador2] = useState("");

  const openCreate = () => {
    setFormTorneo("");
    setFormJugador1("");
    setFormJugador2("");
    setShowCreate(true);
  };

  const openEdit = (pair: Pair) => {
    setFormTorneo(pair.tournament_id);
    setFormJugador1(pair.player1_id);
    setFormJugador2(pair.player2_id);
    setEditing(pair);
  };

  const getPlayerName = (id: string) => {
    const opt = PLAYER_OPTIONS.find((p) => p.value === id);
    return opt ? opt.label : id;
  };

  const getTournamentName = (id: string) => {
    const opt = TOURNAMENT_OPTIONS.find((t) => t.value === id);
    return opt ? opt.label : id;
  };

  const getZoneName = (pair: Pair) => {
    if (!pair.zone_id) return "-";
    const zones: Record<string, string> = { z1: "Zona A", z2: "Zona B" };
    return zones[pair.zone_id] ?? pair.zone_id;
  };

  const handleCreate = () => {
    const newPair: Pair = {
      id: String(Date.now()),
      tournament_id: formTorneo,
      player1_id: formJugador1,
      player2_id: formJugador2,
      zone_id: null,
      seed: null,
      created_at: new Date().toISOString(),
    };
    setPairs([...pairs, newPair]);
    setShowCreate(false);
  };

  const handleEdit = () => {
    if (!editing) return;
    setPairs(
      pairs.map((p) =>
        p.id === editing.id
          ? {
              ...p,
              tournament_id: formTorneo,
              player1_id: formJugador1,
              player2_id: formJugador2,
            }
          : p
      )
    );
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setPairs(pairs.filter((p) => p.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Parejas</h1>
          <p className="text-dark-400 mt-1">Formar parejas para los torneos</p>
        </div>
        <Button onClick={openCreate}>+ Nueva Pareja</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                <th className="px-6 py-3 text-left">Jugador 1</th>
                <th className="px-6 py-3 text-left">Jugador 2</th>
                <th className="px-6 py-3 text-left">Torneo</th>
                <th className="px-6 py-3 text-left">Zona</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {pairs.map((pair) => (
                <tr key={pair.id} className="bg-dark-800">
                  <td className="px-6 py-4 text-white font-medium">
                    {getPlayerName(pair.player1_id)}
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {getPlayerName(pair.player2_id)}
                  </td>
                  <td className="px-6 py-4 text-dark-300">
                    {getTournamentName(pair.tournament_id)}
                  </td>
                  <td className="px-6 py-4 text-dark-300">{getZoneName(pair)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pair)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(pair)}>
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

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Formar Pareja"
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={TOURNAMENT_OPTIONS}
            value={formTorneo}
            onChange={(e) => setFormTorneo(e.target.value)}
          />
          <Select
            label="Jugador 1"
            placeholder="Seleccionar jugador"
            options={PLAYER_OPTIONS}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
          />
          <Select
            label="Jugador 2"
            placeholder="Seleccionar jugador"
            options={PLAYER_OPTIONS}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear Pareja</Button>
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
            options={TOURNAMENT_OPTIONS}
            value={formTorneo}
            onChange={(e) => setFormTorneo(e.target.value)}
          />
          <Select
            label="Jugador 1"
            placeholder="Seleccionar jugador"
            options={PLAYER_OPTIONS}
            value={formJugador1}
            onChange={(e) => setFormJugador1(e.target.value)}
          />
          <Select
            label="Jugador 2"
            placeholder="Seleccionar jugador"
            options={PLAYER_OPTIONS}
            value={formJugador2}
            onChange={(e) => setFormJugador2(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Guardar Cambios</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar Pareja"
        message={`¿Eliminar la pareja ${deleting ? `${getPlayerName(deleting.player1_id)} / ${getPlayerName(deleting.player2_id)}` : ""}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
