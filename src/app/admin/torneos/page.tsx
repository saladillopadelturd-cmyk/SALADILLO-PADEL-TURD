"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, TournamentStatus } from "@/types/tournament";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: "demo",
    name: "Torneo Demo",
    date: "2026-12-15",
    category: "5ta",
    location: "Club de Pádel Saladillo",
    game_mode: "american_9games",
    zone_size: 4,
    num_zones: 4,
    golden_point: true,
    status: "active",
    created_by: null,
    created_at: new Date().toISOString(),
  },
];

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Borrador",
  zones: "Fase de Zonas",
  playoffs: "Playoffs",
  finished: "Finalizado",
  registration: "Inscripción",
  active: "Activo",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<TournamentStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  zones: "warning",
  playoffs: "info",
  finished: "success",
  registration: "info",
  active: "success",
  completed: "default",
  cancelled: "danger",
};

const GAME_MODE_LABELS: Record<string, string> = {
  round_robin_diff: "Todos contra todos (diferencia)",
  american_9games: "Americano 9 games",
  american_2sets: "2 sets a 3 games + super tie-break",
};

export default function AdminTorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [deleting, setDeleting] = useState<Tournament | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formLugar, setFormLugar] = useState("");
  const [formModalidad, setFormModalidad] = useState("american_9games");
  const [formParejasZona, setFormParejasZona] = useState("4");
  const [formNumZonas, setFormNumZonas] = useState("2");

  const supabase = createClient();

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setTournaments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar torneos";
      console.error("Error al cargar torneos:", err);
      setNotification({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const openCreate = () => {
    setFormNombre("");
    setFormFecha(new Date().toISOString().split("T")[0]);
    setFormLugar("");
    setFormModalidad("american_9games");
    setFormParejasZona("4");
    setFormNumZonas("2");
    setShowCreate(true);
  };

  const openEdit = (t: Tournament) => {
    setFormNombre(t.name);
    setFormFecha(t.date ? t.date.split("T")[0] : "");
    setFormLugar(t.location ?? "");
    setFormModalidad(t.game_mode);
    setFormParejasZona(String(t.zone_size));
    setFormNumZonas(String(t.num_zones));
    setEditing(t);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleCreate = async () => {
    if (!formNombre.trim()) {
      setNotification({ type: "error", text: "El nombre del torneo es obligatorio." });
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: formNombre.trim(),
          date: formFecha || new Date().toISOString().split("T")[0],
          category: "5ta",
          golden_point: true,
          location: formLugar.trim() || null,
          game_mode: formModalidad,
          zone_size: Number(formParejasZona),
          num_zones: Number(formNumZonas),
          status: "draft",
        };

        const { data, error } = await supabase
          .from("tournaments")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTournaments((prev) => [data, ...prev]);
          setShowCreate(false);
          setNotification({ type: "success", text: `Torneo "${data.name}" creado con éxito.` });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al crear el torneo";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleEdit = async () => {
    if (!editing) return;

    startTransition(async () => {
      try {
        const payload = {
          name: formNombre.trim(),
          date: formFecha || editing.date,
          location: formLugar.trim() || null,
          game_mode: formModalidad as Tournament["game_mode"],
          zone_size: Number(formParejasZona),
          num_zones: Number(formNumZonas),
        };

        const { data, error } = await supabase
          .from("tournaments")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTournaments((prev) =>
            prev.map((t) => (t.id === editing.id ? data : t))
          );
          setEditing(null);
          setNotification({ type: "success", text: `Torneo "${data.name}" actualizado con éxito.` });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al actualizar el torneo";
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
          .from("tournaments")
          .delete()
          .eq("id", target.id);

        if (error) throw error;

        setTournaments((prev) => prev.filter((t) => t.id !== target.id));
        setDeleting(null);
        setNotification({
          type: "success",
          text: `Torneo "${target.name}" eliminado correctamente.`,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al eliminar el torneo";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Torneos</h1>
          <p className="text-dark-400 mt-1">Crear, gestionar y eliminar torneos</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Torneo</Button>
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
      ) : tournaments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-dark-400 text-base mb-4">No hay torneos registrados todavía.</p>
          <Button onClick={openCreate}>Crear el Primer Torneo</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                  <p className="text-dark-400 text-sm">{formatDate(tournament.date)}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[tournament.status] ?? "default"}>
                  {STATUS_LABELS[tournament.status] ?? tournament.status}
                </Badge>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-dark-300">
                  <span>Modalidad:</span>
                  <span className="text-white font-medium">
                    {GAME_MODE_LABELS[tournament.game_mode] ?? tournament.game_mode}
                  </span>
                </div>
                <div className="flex justify-between text-dark-300">
                  <span>Zonas:</span>
                  <span className="text-white font-medium">
                    {tournament.num_zones} de {tournament.zone_size} parejas
                  </span>
                </div>
                {tournament.location && (
                  <div className="flex justify-between text-dark-300">
                    <span>Lugar:</span>
                    <span className="text-dark-200">{tournament.location}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-dark-800">
                <Link href={`/admin/torneos/${tournament.id}/zonas`}>
                  <Button variant="secondary" size="sm">Zonas</Button>
                </Link>
                <Link href={`/admin/torneos/${tournament.id}/fixture`}>
                  <Button variant="secondary" size="sm">Fixture</Button>
                </Link>
                <Link href={`/admin/torneos/${tournament.id}/results`}>
                  <Button variant="secondary" size="sm">Resultados</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => openEdit(tournament)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleting(tournament)}
                  disabled={isPending}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Crear Nuevo Torneo"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Torneo"
            placeholder="Ej: Torneo Apertura 2026"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Input
            label="Fecha"
            type="date"
            value={formFecha}
            onChange={(e) => setFormFecha(e.target.value)}
          />
          <Input
            label="Lugar"
            placeholder="Ej: Club de Pádel Saladillo"
            value={formLugar}
            onChange={(e) => setFormLugar(e.target.value)}
          />
          <Select
            label="Modalidad de Juego"
            value={formModalidad}
            onChange={(e) => setFormModalidad(e.target.value)}
            options={[
              { value: "round_robin_diff", label: "Todos contra todos (diferencia)" },
              { value: "american_9games", label: "Americano 9 games" },
              { value: "american_2sets", label: "2 sets a 3 games + super tie-break" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Parejas por zona"
              value={formParejasZona}
              onChange={(e) => setFormParejasZona(e.target.value)}
              options={[
                { value: "3", label: "3 parejas" },
                { value: "4", label: "4 parejas" },
              ]}
            />
            <Input
              label="Número de zonas"
              type="number"
              min={1}
              max={16}
              value={formNumZonas}
              onChange={(e) => setFormNumZonas(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Creando..." : "Crear Torneo"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Editar Torneo"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Torneo"
            placeholder="Ej: Torneo Apertura 2026"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
          />
          <Input
            label="Fecha"
            type="date"
            value={formFecha}
            onChange={(e) => setFormFecha(e.target.value)}
          />
          <Input
            label="Lugar"
            placeholder="Ej: Club de Pádel Saladillo"
            value={formLugar}
            onChange={(e) => setFormLugar(e.target.value)}
          />
          <Select
            label="Modalidad de Juego"
            value={formModalidad}
            onChange={(e) => setFormModalidad(e.target.value)}
            options={[
              { value: "round_robin_diff", label: "Todos contra todos (diferencia)" },
              { value: "american_9games", label: "Americano 9 games" },
              { value: "american_2sets", label: "2 sets a 3 games + super tie-break" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Parejas por zona"
              value={formParejasZona}
              onChange={(e) => setFormParejasZona(e.target.value)}
              options={[
                { value: "3", label: "3 parejas" },
                { value: "4", label: "4 parejas" },
              ]}
            />
            <Input
              label="Número de zonas"
              type="number"
              min={1}
              max={16}
              value={formNumZonas}
              onChange={(e) => setFormNumZonas(e.target.value)}
            />
          </div>
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
        title="Eliminar Torneo"
        message={`¿Estás seguro de eliminar el torneo "${deleting?.name}"? Se eliminarán todas las zonas, parejas y partidos asociados en la base de datos. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
