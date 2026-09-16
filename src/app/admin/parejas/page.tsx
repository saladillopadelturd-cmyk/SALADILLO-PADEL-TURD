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
  getCoupleNumberMap,
  generateRandomCouples,
  isPlayerEligibleForTournament,
  isSumaCategory,
  parseSumaTarget,
  validateCoupleCategorySuma,
  getEffectivePlayerLevelForTournament,
} from "@/lib/tournament/couples";
import { calculateOptimalZones } from "@/lib/tournament/zones";
import { AlertCircle, AlertTriangle, CheckCircle2, Users, Filter, Plus, Shuffle, Sparkles, Trophy } from "lucide-react";

export default function AdminParejasPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [editing, setEditing] = useState<Couple | null>(null);
  const [deleting, setDeleting] = useState<Couple | null>(null);
  const [filterTorneo, setFilterTorneo] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formTorneo, setFormTorneo] = useState("");
  const [formJugador1, setFormJugador1] = useState("");
  const [formJugador2, setFormJugador2] = useState("");
  const [autoTorneo, setAutoTorneo] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [couplesRes, tournamentsRes, playersRes] = await Promise.all([
        supabase
          .from("couples")
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name, gender, category)")
          .order("created_at", { ascending: false }),
        supabase
          .from("tournaments")
          .select("id, name, date, gender, category, zone_size, num_zones")
          .order("created_at", { ascending: false }),
        supabase
          .from("players")
          .select("id, first_name, last_name, gender, category, is_observed")
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

  // Mapa de numeración correlativa por torneo (Pareja 1, Pareja 2, etc.)
  const coupleNumberMap = useMemo(() => {
    return getCoupleNumberMap(couples);
  }, [couples]);

  const openCreate = () => {
    const defaultTorneo = filterTorneo !== "all" ? filterTorneo : (tournaments[0]?.id ?? "");
    setFormTorneo(defaultTorneo);
    setFormJugador1("");
    setFormJugador2("");
    setShowCreate(true);
  };

  const openAutoGenerate = () => {
    const defaultTorneo = filterTorneo !== "all" ? filterTorneo : (tournaments[0]?.id ?? "");
    setAutoTorneo(defaultTorneo);
    setShowAutoGenerate(true);
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
    label: `${t.name} (${t.gender || "Masculino"} - Cat. ${t.category || "6ta"})`,
  }));

  const selectedTournament = useMemo(() => {
    return tournaments.find((t) => t.id === formTorneo) || null;
  }, [tournaments, formTorneo]);

  const autoSelectedTournament = useMemo(() => {
    return tournaments.find((t) => t.id === autoTorneo) || null;
  }, [tournaments, autoTorneo]);

  // Siguiente número de pareja que se asignará en el torneo seleccionado
  const nextCoupleNumber = useMemo(() => {
    if (!formTorneo) return 1;
    const count = couples.filter((c) => c.tournament_id === formTorneo).length;
    return count + 1;
  }, [couples, formTorneo]);

  // Jugadores disponibles para el torneo seleccionado (los que no integran ya una pareja)
  const availablePlayersInSelectedTorneo = useMemo(() => {
    return getAvailablePlayersForTournament(players, couples, formTorneo, editing?.id);
  }, [players, couples, formTorneo, editing]);

  // Jugadores disponibles para generación automática en autoTorneo (filtrados estrictamente por elegibilidad)
  const availablePlayersForAuto = useMemo(() => {
    return getAvailablePlayersForTournament(
      players,
      couples,
      autoTorneo,
      null,
      null,
      autoSelectedTournament,
      true
    );
  }, [players, couples, autoTorneo, autoSelectedTournament]);

  const existingCountInAutoTorneo = useMemo(() => {
    return couples.filter((c) => c.tournament_id === autoTorneo).length;
  }, [couples, autoTorneo]);

  const partner1 = useMemo(() => {
    return players.find((p) => p.id === formJugador1) || null;
  }, [players, formJugador1]);

  const partner2 = useMemo(() => {
    return players.find((p) => p.id === formJugador2) || null;
  }, [players, formJugador2]);

  // Opciones para Jugador 1: excluye los ya asignados y al Jugador 2 (si fue seleccionado)
  const player1Options = useMemo(() => {
    const available = getAvailablePlayersForTournament(
      players,
      couples,
      formTorneo,
      editing?.id,
      formJugador2 || null
    );
    const isSuma = selectedTournament ? isSumaCategory(selectedTournament.category) : false;

    return available.map((p) => {
      const cat = p.category ? ` (${p.category})` : "";
      const sex = p.gender ? ` [${p.gender}]` : "";
      const obs = p.is_observed ? " 👁️ [Observado]" : "";
      let eligibilityNote = "";
      let isDisabled = false;

      if (selectedTournament) {
        const check = isPlayerEligibleForTournament(p, selectedTournament);
        if (!check.eligible) {
          eligibilityNote = " 🚫 (No elegible)";
          isDisabled = true;
        } else if (isSuma && partner2) {
          const sumaCheck = validateCoupleCategorySuma(p, partner2, selectedTournament);
          if (!sumaCheck.isValid) {
            eligibilityNote = ` [Suma: ${sumaCheck.sum} 🚫 Mínimo ${sumaCheck.target}]`;
            isDisabled = true;
          } else {
            eligibilityNote = ` [Suma: ${sumaCheck.sum} ✔]`;
          }
        }
      }

      return {
        value: p.id,
        label: `${p.first_name} ${p.last_name}${sex}${cat}${obs}${eligibilityNote}`,
        disabled: isDisabled,
      };
    });
  }, [players, couples, formTorneo, editing, formJugador2, selectedTournament, partner2]);

  // Opciones para Jugador 2: excluye los ya asignados y al Jugador 1 (si fue seleccionado)
  const player2Options = useMemo(() => {
    const available = getAvailablePlayersForTournament(
      players,
      couples,
      formTorneo,
      editing?.id,
      formJugador1 || null
    );
    const isSuma = selectedTournament ? isSumaCategory(selectedTournament.category) : false;

    return available.map((p) => {
      const cat = p.category ? ` (${p.category})` : "";
      const sex = p.gender ? ` [${p.gender}]` : "";
      const obs = p.is_observed ? " 👁️ [Observado]" : "";
      let eligibilityNote = "";
      let isDisabled = false;

      if (selectedTournament) {
        const check = isPlayerEligibleForTournament(p, selectedTournament);
        if (!check.eligible) {
          eligibilityNote = " 🚫 (No elegible)";
          isDisabled = true;
        } else if (isSuma && partner1) {
          const sumaCheck = validateCoupleCategorySuma(partner1, p, selectedTournament);
          if (!sumaCheck.isValid) {
            eligibilityNote = ` [Suma: ${sumaCheck.sum} 🚫 Mínimo ${sumaCheck.target}]`;
            isDisabled = true;
          } else {
            eligibilityNote = ` [Suma: ${sumaCheck.sum} ✔]`;
          }
        }
      }

      return {
        value: p.id,
        label: `${p.first_name} ${p.last_name}${sex}${cat}${obs}${eligibilityNote}`,
        disabled: isDisabled,
      };
    });
  }, [players, couples, formTorneo, editing, formJugador1, selectedTournament, partner1]);

  // Filtrar parejas en la lista según el torneo seleccionado en el filtro
  const filteredCouples = useMemo(() => {
    if (filterTorneo === "all") return couples;
    return couples.filter((c) => c.tournament_id === filterTorneo);
  }, [couples, filterTorneo]);

  // Estado de conformación de zonas para el torneo seleccionado en el filtro
  const selectedTournamentZoneStatus = useMemo(() => {
    if (filterTorneo === "all") return null;
    const tourCouples = couples.filter((c) => c.tournament_id === filterTorneo);
    const tour = tournaments.find((t) => t.id === filterTorneo);
    const zoneSize = tour?.zone_size || 4;
    return calculateOptimalZones(tourCouples.length, zoneSize);
  }, [filterTorneo, couples, tournaments]);

  const handleCreate = async () => {
    const validation = validateCoupleFormation(
      formTorneo,
      formJugador1,
      formJugador2,
      couples,
      null,
      selectedTournament,
      players
    );
    if (!validation.isValid) {
      setNotification({ type: "error", text: validation.error || "Datos inválidos para formar la pareja." });
      return;
    }

    const assignedNumber = nextCoupleNumber;

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
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name, gender, category)")
          .single();

        if (error) throw error;
        if (data) {
          setCouples((prev) => [data as unknown as Couple, ...prev]);
          setShowCreate(false);
          setNotification({
            type: "success",
            text: `Pareja ${assignedNumber} creada y numerada exitosamente.`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al crear la pareja";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleAutoGenerate = async () => {
    if (!autoTorneo || availablePlayersForAuto.length < 2) return;

    startTransition(async () => {
      try {
        const startNumber = existingCountInAutoTorneo + 1;
        const generated = generateRandomCouples(
          availablePlayersForAuto,
          autoTorneo,
          startNumber,
          autoSelectedTournament
        );

        if (generated.length === 0) {
          throw new Error("No fue posible armar parejas que cumplan con la suma o requisitos de este torneo.");
        }

        const payloads = generated.map((g) => ({
          tournament_id: g.tournament_id,
          player1_id: g.player1_id,
          player2_id: g.player2_id,
        }));

        const { data, error } = await supabase
          .from("couples")
          .insert(payloads)
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name, gender, category)");

        if (error) throw error;
        if (data) {
          setCouples((prev) => [...(data as unknown as Couple[]), ...prev]);
          setShowAutoGenerate(false);
          setNotification({
            type: "success",
            text: `Se generaron exitosamente ${generated.length} parejas (desde Pareja ${startNumber} hasta Pareja ${startNumber + generated.length - 1}).`,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al generar parejas automáticas";
        setNotification({ type: "error", text: msg });
      }
    });
  };

  const handleEdit = async () => {
    if (!editing) return;
    const validation = validateCoupleFormation(
      formTorneo,
      formJugador1,
      formJugador2,
      couples,
      editing.id,
      selectedTournament,
      players
    );
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
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*), tournament:tournaments(name, gender, category)")
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
            Formación y numeración correlativa de parejas por torneo (Pareja 1, Pareja 2, etc.).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={openAutoGenerate}
            disabled={tournaments.length === 0 || players.length < 2}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Sortear / Generar Parejas
          </Button>
          <Button
            onClick={openCreate}
            disabled={tournaments.length === 0 || players.length < 2}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Pareja
          </Button>
        </div>
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
                {t.name} ({t.gender || "Masculino"} - Cat. {t.category || "6ta"}) ({count} parejas)
              </option>
            );
          })}
        </select>
      </div>

      {/* Indicador de Estado de Zonas y Paridad para el Torneo Filtrado */}
      {selectedTournamentZoneStatus && filterTorneo !== "all" && (
        <div className="mb-6">
          {!selectedTournamentZoneStatus.isEqual ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300 text-sm">
                    Atención: Zonas con Cantidad Desigual de Parejas
                  </p>
                  <p className="text-amber-200/90 mt-0.5">
                    Este torneo tiene <strong>{filteredCouples.length} parejas</strong> registradas.
                    {" "}Para conformar zonas con la misma cantidad de parejas ({selectedTournamentZoneStatus.zoneSize} parejas por zona),{" "}
                    <strong className="text-white underline decoration-amber-400 decoration-2">
                      faltan {selectedTournamentZoneStatus.missingPlayers} jugadores ({selectedTournamentZoneStatus.missingCouples} {selectedTournamentZoneStatus.missingCouples === 1 ? "pareja" : "parejas"})
                    </strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={openCreate} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Inscribir Pareja
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Condición reglamentaria cumplida:</strong> {filteredCouples.length} parejas conformarán exactamente {selectedTournamentZoneStatus.numZones} zonas de {selectedTournamentZoneStatus.zoneSize} parejas.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              onClick={openAutoGenerate}
              disabled={tournaments.length === 0 || players.length < 2}
              className="flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              Generar Automáticas
            </Button>
            <Button onClick={openCreate} disabled={tournaments.length === 0 || players.length < 2}>
              Formar Nueva Pareja
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-900 text-dark-400 uppercase text-xs">
                  <th className="px-6 py-3 text-left"># Pareja</th>
                  <th className="px-6 py-3 text-left">Jugador 1</th>
                  <th className="px-6 py-3 text-left">Jugador 2</th>
                  <th className="px-6 py-3 text-left">Torneo</th>
                  <th className="px-6 py-3 text-left">Siembra (Seed)</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filteredCouples.map((pair) => {
                  const num = coupleNumberMap.get(pair.id) ?? 1;
                  const tourData = (pair as any).tournament;
                  return (
                    <tr key={pair.id} className="bg-dark-800 hover:bg-dark-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-black bg-primary-500/15 text-primary-400 border border-primary-500/30 whitespace-nowrap shadow-sm">
                          Pareja {num}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {getPlayerLabel(pair.player1)}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {getPlayerLabel(pair.player2)}
                      </td>
                      <td className="px-6 py-4 text-dark-300">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">
                            {tourData?.name ?? "Torneo"}
                          </span>
                          {(tourData?.gender || tourData?.category) && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                              <span className={
                                tourData?.gender === "Femenino" ? "text-pink-400 font-semibold" : "text-blue-400 font-semibold"
                              }>
                                {tourData?.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
                              </span>
                              <span className="text-dark-600">•</span>
                              {isSumaCategory(tourData?.category) ? (
                                <span className="text-amber-300 font-bold">
                                  ∑ {tourData?.category}
                                  {pair.player1?.category && pair.player2?.category
                                    ? ` (${pair.player1.category}+${pair.player2.category})`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-primary-400 font-medium">
                                  Cat. {tourData?.category || "6ta"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Formar Pareja Manual */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={`Formar Pareja ${formTorneo ? nextCoupleNumber : ""}`}
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={tournamentOptions}
            value={formTorneo}
            onChange={(e) => handleTorneoChange(e.target.value)}
          />

          {selectedTournament && (
            <div className="p-3 bg-dark-800/90 border border-dark-700 rounded-xl text-xs space-y-1.5 text-dark-300">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  selectedTournament.gender === "Femenino"
                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/30"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}>
                  {selectedTournament.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
                </span>
                {isSumaCategory(selectedTournament.category) ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                    ∑ {selectedTournament.category}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/30">
                    Categoría {selectedTournament.category || "6ta"}
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-[11px]">
                {isSumaCategory(selectedTournament.category)
                  ? `Torneo ${selectedTournament.category}: La suma de las categorías de ambos integrantes debe ser ${selectedTournament.category} o superior (ej: 5ta+5ta=10, 4ta+6ta=10). ${
                      selectedTournament.gender === "Masculino"
                        ? "En torneos masculinos, las mujeres cuentan con bonificación de +1 en la suma (5ta computa como 6ta)."
                        : "Solo pueden inscribirse jugadoras mujeres."
                    }`
                  : selectedTournament.gender === "Femenino"
                  ? "Torneo Femenino: Solo jugadoras mujeres de igual o menor categoría. Jugadores masculinos o de categoría superior están inhabilitados."
                  : `Torneo Masculino: Hombres de ${selectedTournament.category || "6ta"} o inferior, y mujeres de hasta 1 categoría superior permitidas. Jugadores de nivel superior están inhabilitados.`}
              </p>
            </div>
          )}

          {/* Indicador de número correlativo asignado */}
          {formTorneo && (
            <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-xs text-primary-300 font-medium">Numeración asignada:</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-primary-500/20 text-primary-300 font-black text-sm border border-primary-500/40">
                Pareja {nextCoupleNumber}
              </span>
            </div>
          )}

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

          {formJugador1 && formJugador2 && (
            <div className="p-2.5 bg-dark-800/90 border border-dark-700 rounded-lg text-xs text-dark-200">
              <span className="text-dark-400">Se creará:</span>{" "}
              <strong className="text-primary-400">Pareja {nextCoupleNumber}:</strong>{" "}
              {player1Options.find((p) => p.value === formJugador1)?.label} /{" "}
              {player2Options.find((p) => p.value === formJugador2)?.label}
            </div>
          )}

          {formJugador1 && formJugador2 && selectedTournament && isSumaCategory(selectedTournament.category) && (
            <div className="p-3 bg-dark-800/95 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-dark-300 font-medium">Validación de Suma:</span>
              {(() => {
                const p1 = players.find((p) => p.id === formJugador1);
                const p2 = players.find((p) => p.id === formJugador2);
                if (!p1 || !p2) return null;
                const res = validateCoupleCategorySuma(p1, p2, selectedTournament);
                const l1 = getEffectivePlayerLevelForTournament(p1, selectedTournament);
                const l2 = getEffectivePlayerLevelForTournament(p2, selectedTournament);
                return (
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                      res.isValid
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/20 text-red-300 border-red-500/40"
                    }`}
                  >
                    {p1.category || "5ta"} ({l1}) + {p2.category || "5ta"} ({l2}) = {res.sum}{" "}
                    {res.isValid ? `✔ (Mín. ${res.target})` : `🚫 (Requiere Mín. ${res.target})`}
                  </span>
                );
              })()}
            </div>
          )}

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
              {isPending ? "Creando..." : `Crear Pareja ${nextCoupleNumber}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Generación Automática / Sorteo de Parejas */}
      <Modal
        isOpen={showAutoGenerate}
        onClose={() => setShowAutoGenerate(false)}
        title="Sortear / Generar Parejas Automáticamente"
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={tournamentOptions}
            value={autoTorneo}
            onChange={(e) => setAutoTorneo(e.target.value)}
          />

          <div className="p-3 bg-dark-800/80 border border-dark-700 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Jugadores libres para emparejar:</span>
              <span className="font-bold text-primary-400">
                {availablePlayersForAuto.length} jugadores
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-300">Parejas ya existentes en este torneo:</span>
              <span className="font-bold text-white">
                {existingCountInAutoTorneo}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-dark-700/60 pt-2">
              <span className="text-dark-300">Parejas a generarse:</span>
              <span className="font-bold text-emerald-400">
                {Math.floor(availablePlayersForAuto.length / 2)} parejas
              </span>
            </div>
          </div>

          {availablePlayersForAuto.length >= 2 ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Numeración correlativa asegurada:</span>
              </div>
              <p className="text-emerald-300/90 text-[11px]">
                Las parejas serán sorteadas y numeradas correlativamente desde{" "}
                <strong>Pareja {existingCountInAutoTorneo + 1}</strong> hasta{" "}
                <strong>Pareja {existingCountInAutoTorneo + Math.floor(availablePlayersForAuto.length / 2)}</strong>.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Se necesitan al menos 2 jugadores libres en este torneo para realizar el sorteo automático de parejas.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAutoGenerate(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleAutoGenerate}
              disabled={isPending || !autoTorneo || availablePlayersForAuto.length < 2}
              className="flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" />
              {isPending ? "Generando..." : `Sortear y Crear ${Math.floor(availablePlayersForAuto.length / 2)} Parejas`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Pareja */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={`Editar Pareja ${editing ? (coupleNumberMap.get(editing.id) ?? "") : ""}`}
      >
        <div className="space-y-4">
          <Select
            label="Torneo"
            placeholder="Seleccionar torneo"
            options={tournamentOptions}
            value={formTorneo}
            onChange={(e) => handleTorneoChange(e.target.value)}
          />

          {selectedTournament && (
            <div className="p-3 bg-dark-800/90 border border-dark-700 rounded-xl text-xs space-y-1.5 text-dark-300">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  selectedTournament.gender === "Femenino"
                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/30"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}>
                  {selectedTournament.gender === "Femenino" ? "♀ Femenino" : "♂ Masculino"}
                </span>
                {isSumaCategory(selectedTournament.category) ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                    ∑ {selectedTournament.category}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/30">
                    Categoría {selectedTournament.category || "6ta"}
                  </span>
                )}
              </div>
              <p className="text-dark-400 text-[11px]">
                {isSumaCategory(selectedTournament.category)
                  ? `Torneo ${selectedTournament.category}: La suma de las categorías de ambos integrantes debe ser ${selectedTournament.category} o superior (ej: 5ta+5ta=10, 4ta+6ta=10). ${
                      selectedTournament.gender === "Masculino"
                        ? "En torneos masculinos, las mujeres cuentan con bonificación de +1 en la suma (5ta computa como 6ta)."
                        : "Solo pueden inscribirse jugadoras mujeres."
                    }`
                  : selectedTournament.gender === "Femenino"
                  ? "Torneo Femenino: Solo jugadoras mujeres de igual o menor categoría. Jugadores masculinos o de categoría superior están inhabilitados."
                  : `Torneo Masculino: Hombres de ${selectedTournament.category || "6ta"} o inferior, y mujeres de hasta 1 categoría superior permitidas. Jugadores de nivel superior están inhabilitados.`}
              </p>
            </div>
          )}

          {editing && (
            <div className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl flex items-center justify-between">
              <span className="text-xs text-primary-300 font-medium">Identificador:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-primary-500/20 text-primary-300 font-black text-sm border border-primary-500/40">
                Pareja {coupleNumberMap.get(editing.id) ?? "-"}
              </span>
            </div>
          )}

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

          {formJugador1 && formJugador2 && selectedTournament && isSumaCategory(selectedTournament.category) && (
            <div className="p-3 bg-dark-800/95 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
              <span className="text-dark-300 font-medium">Validación de Suma:</span>
              {(() => {
                const p1 = players.find((p) => p.id === formJugador1);
                const p2 = players.find((p) => p.id === formJugador2);
                if (!p1 || !p2) return null;
                const res = validateCoupleCategorySuma(p1, p2, selectedTournament);
                const l1 = getEffectivePlayerLevelForTournament(p1, selectedTournament);
                const l2 = getEffectivePlayerLevelForTournament(p2, selectedTournament);
                return (
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                      res.isValid
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/20 text-red-300 border-red-500/40"
                    }`}
                  >
                    {p1.category || "5ta"} ({l1}) + {p2.category || "5ta"} ({l2}) = {res.sum}{" "}
                    {res.isValid ? `✔ (Mín. ${res.target})` : `🚫 (Requiere Mín. ${res.target})`}
                  </span>
                );
              })()}
            </div>
          )}

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
          deleting
            ? `Pareja ${coupleNumberMap.get(deleting.id) ?? ""}: ${getPlayerLabel(deleting.player1)} / ${getPlayerLabel(deleting.player2)}`
            : ""
        }? Al eliminarla, los jugadores volverán a estar disponibles para integrar nuevas parejas.`}
      />
    </div>
  );
}

