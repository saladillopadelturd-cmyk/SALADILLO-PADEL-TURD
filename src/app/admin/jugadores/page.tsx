"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/types/tournament";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AdminJugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");

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
    setShowCreate(true);
  };

  const openEdit = (player: Player) => {
    setFormNombre(player.first_name);
    setFormApellido(player.last_name);
    setFormEmail(player.email ?? "");
    setFormTelefono(player.phone ?? "");
    setEditing(player);
  };

  const handleCreate = async () => {
    if (!formNombre.trim() || !formApellido.trim()) {
      setNotification({ type: "error", text: "Nombre y apellido son obligatorios." });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
        };

        const { data, error } = await supabase
          .from("players")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPlayers((prev) => [data, ...prev]);
          setShowCreate(false);
          setNotification({
            type: "success",
            text: `Jugador ${data.first_name} ${data.last_name} registrado exitosamente.`,
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
        const payload = {
          first_name: formNombre.trim(),
          last_name: formApellido.trim(),
          email: formEmail.trim() || null,
          phone: formTelefono.trim() || null,
        };

        const { data, error } = await supabase
          .from("players")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPlayers((prev) =>
            prev.map((p) => (p.id === editing.id ? data : p))
          );
          setEditing(null);
          setNotification({
            type: "success",
            text: `Jugador ${data.first_name} ${data.last_name} actualizado exitosamente.`,
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Jugadores</h1>
          <p className="text-dark-400 mt-1">
            Padrón de jugadores del circuito. Se registran aquí para conformar las parejas que disputan los torneos por zonas.
          </p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Jugador</Button>
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
      ) : players.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-dark-400 text-base mb-4">No hay jugadores registrados todavía.</p>
          <Button onClick={openCreate}>Registrar el Primer Jugador</Button>
        </Card>
      ) : (
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
                    <td className="px-6 py-4 text-dark-300">{player.email ?? "-"}</td>
                    <td className="px-6 py-4 text-dark-300">{player.phone ?? "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(player)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleting(player)}
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
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Registrando..." : "Registrar"}
            </Button>
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
        title="Eliminar Jugador"
        message={`¿Estás seguro de eliminar a ${deleting?.first_name} ${deleting?.last_name}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
