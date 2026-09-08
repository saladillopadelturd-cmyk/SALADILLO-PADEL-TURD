"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import type { Tournament, TournamentStatus } from "@/types/tournament";

const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: "demo",
    name: "Torneo Demo",
    date: "2026-12-15",
    location: "Club de Pádel Saladillo",
    game_mode: "american_9games",
    zone_size: 4,
    num_zones: 4,
    status: "active",
    created_by: null,
    created_at: new Date().toISOString(),
  },
];

const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Borrador",
  registration: "Inscripción",
  active: "Activo",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<TournamentStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
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
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [deleting, setDeleting] = useState<Tournament | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formLugar, setFormLugar] = useState("");
  const [formModalidad, setFormModalidad] = useState("american_9games");
  const [formParejasZona, setFormParejasZona] = useState("4");
  const [formNumZonas, setFormNumZonas] = useState("2");

  const openCreate = () => {
    setFormNombre("");
    setFormFecha("");
    setFormLugar("");
    setFormModalidad("american_9games");
    setFormParejasZona("4");
    setFormNumZonas("2");
    setShowCreate(true);
  };

  const openEdit = (t: Tournament) => {
    setFormNombre(t.name);
    setFormFecha(t.date);
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

  const handleCreate = () => {
    const newTournament: Tournament = {
      id: String(Date.now()),
      name: formNombre,
      date: formFecha,
      location: formLugar || null,
      game_mode: formModalidad as Tournament["game_mode"],
      zone_size: Number(formParejasZona),
      num_zones: Number(formNumZonas),
      status: "draft",
      created_by: null,
      created_at: new Date().toISOString(),
    };
    setTournaments([...tournaments, newTournament]);
    setShowCreate(false);
  };

  const handleEdit = () => {
    if (!editing) return;
    setTournaments(
      tournaments.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              name: formNombre,
              date: formFecha,
              location: formLugar || null,
              game_mode: formModalidad as Tournament["game_mode"],
              zone_size: Number(formParejasZona),
              num_zones: Number(formNumZonas),
            }
          : t
      )
    );
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleting) return;
    setTournaments(tournaments.filter((t) => t.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Torneos</h1>
          <p className="text-dark-400 mt-1">Crear y gestionar torneos</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Torneo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tournaments.map((tournament) => (
          <Card key={tournament.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                <p className="text-dark-400 text-sm">{formatDate(tournament.date)}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[tournament.status]}>
                {STATUS_LABELS[tournament.status]}
              </Badge>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-dark-300">
                <span>Modalidad:</span>
                <span className="text-white">
                  {GAME_MODE_LABELS[tournament.game_mode] ?? tournament.game_mode}
                </span>
              </div>
              <div className="flex justify-between text-dark-300">
                <span>Zonas:</span>
                <span className="text-white">
                  {tournament.num_zones} de {tournament.zone_size} parejas
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
              <Button variant="danger" size="sm" onClick={() => setDeleting(tournament)}>
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>

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
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear Torneo</Button>
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
        title="Eliminar Torneo"
        message={`¿Eliminar el torneo "${deleting?.name}"? Se eliminarán todas las zonas, parejas y partidos asociados. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
