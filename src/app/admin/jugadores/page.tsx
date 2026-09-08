"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { Player } from "@/types/tournament";

const INITIAL_PLAYERS: Player[] = [
  {
    id: "1",
    user_id: null,
    first_name: "Juan",
    last_name: "Pérez",
    email: "juan@email.com",
    phone: "123456789",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    user_id: null,
    first_name: "Carlos",
    last_name: "López",
    email: "carlos@email.com",
    phone: "987654321",
    created_at: new Date().toISOString(),
  },
];

export default function AdminJugadoresPage() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");

  const openCreate = () => {
    setFormNombre("");
    setFormApellido("");
    setFormEmail("");
    setFormTelefono("");
    setShowCreate(true);
  };

  const openEdit = (player: Player) => {
    setFormNombre(player.first_name);
    setFormApellido(player.last_name);
    setFormEmail(player.email ?? "");
    setFormTelefono(player.phone ?? "");
    setEditing(player);
  };

  const handleCreate = () => {
    const newPlayer: Player = {
      id: String(Date.now()),
      user_id: null,
      first_name: formNombre,
      last_name: formApellido,
      email: formEmail || null,
      phone: formTelefono || null,
      created_at: new Date().toISOString(),
    };
    setPlayers([...players, newPlayer]);
    setShowCreate(false);
  };

  const handleEdit = () => {
    if (!editing) return;
    setPlayers(
      players.map((p) =>
        p.id === editing.id
          ? {
              ...p,
              first_name: formNombre,
              last_name: formApellido,
              email: formEmail || null,
              phone: formTelefono || null,
            }
          : p
      )
    );
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setPlayers(players.filter((p) => p.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Jugadores</h1>
          <p className="text-dark-400 mt-1">Registrar y administrar jugadores</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Jugador</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {players.map((player) => (
                <tr key={player.id} className="bg-dark-800">
                  <td className="px-6 py-4 text-white font-medium">
                    {player.first_name} {player.last_name}
                  </td>
                  <td className="px-6 py-4 text-dark-300">{player.email}</td>
                  <td className="px-6 py-4 text-dark-300">{player.phone}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(player)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(player)}>
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
        title="Registrar Jugador"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Nombre del jugador"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Input
            label="Apellido"
            placeholder="Apellido del jugador"
            value={formApellido}
            onChange={(e) => setFormApellido(e.target.value)}
          />
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
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Registrar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar Jugador"
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Nombre del jugador"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Input
            label="Apellido"
            placeholder="Apellido del jugador"
            value={formApellido}
            onChange={(e) => setFormApellido(e.target.value)}
          />
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
        title="Eliminar Jugador"
        message={`¿Eliminar a ${deleting?.first_name} ${deleting?.last_name}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
