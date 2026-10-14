"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Match } from "@/types/tournament";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentDate?: string;
  matches: Match[];
  onScheduleComplete: () => Promise<void> | void;
}

export default function AutoScheduleModal({
  isOpen,
  onClose,
  tournamentId,
  tournamentDate,
  matches,
  onScheduleComplete,
}: AutoScheduleModalProps) {
  // Configuración de formulario
  const [courtCount, setCourtCount] = useState<number>(2);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState<number>(40);
  const [startDate, setStartDate] = useState<string>(
    tournamentDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<string>("09:00");
  const [breakBetweenMinutes, setBreakBetweenMinutes] = useState<number>(0);
  const [scopeFilter, setScopeFilter] = useState<"all" | "zone" | "playoff">("all");
  const [onlyUnscheduled, setOnlyUnscheduled] = useState<boolean>(false);
  
  // Nombres de canchas personalizados
  const [customCourtNames, setCustomCourtNames] = useState<string[]>([
    "Cancha 1",
    "Cancha 2",
    "Cancha 3",
    "Cancha 4",
    "Cancha 5",
    "Cancha 6",
  ]);
  const [showCustomCourts, setShowCustomCourts] = useState<boolean>(false);

  // Estados de ejecución
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtrar cuántos partidos entrarían en la programación
  const eligibleMatches = useMemo(() => {
    return matches.filter((m) => {
      if (scopeFilter === "zone" && m.stage !== "zone") return false;
      if (scopeFilter === "playoff" && m.stage === "zone") return false;
      if (onlyUnscheduled && m.scheduled_time && m.court_name) return false;
      return true;
    });
  }, [matches, scopeFilter, onlyUnscheduled]);

  // Proyección rápida de turnos y hora final
  const projection = useMemo(() => {
    const total = eligibleMatches.length;
    if (total === 0 || courtCount < 1) {
      return { totalSlots: 0, estimatedEndTime: "--:--" };
    }
    const approxSlots = Math.ceil(total / courtCount);
    const totalDurationMinutes = approxSlots * matchDurationMinutes + Math.max(0, approxSlots - 1) * breakBetweenMinutes;

    const [hours, minutes] = startTime.split(":").map(Number);
    const startMs = (hours || 0) * 60 + (minutes || 0);
    const endMs = startMs + totalDurationMinutes;
    const endHours = Math.floor(endMs / 60) % 24;
    const endMins = endMs % 60;
    const formattedEnd = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

    return {
      totalSlots: approxSlots,
      estimatedEndTime: `${formattedEnd} hs`,
    };
  }, [eligibleMatches.length, courtCount, matchDurationMinutes, breakBetweenMinutes, startTime]);

  const handleCourtNameChange = (index: number, val: string) => {
    const updated = [...customCourtNames];
    updated[index] = val;
    setCustomCourtNames(updated);
  };

  const handleRunAutoSchedule = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (eligibleMatches.length === 0) {
        throw new Error("No hay partidos para programar con los filtros seleccionados.");
      }

      // Preparar los nombres de canchas activas
      const activeCourtNames = [];
      for (let i = 0; i < courtCount; i++) {
        activeCourtNames.push(customCourtNames[i]?.trim() || `Cancha ${i + 1}`);
      }

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          courtCount,
          courtNames: activeCourtNames,
          matchDurationMinutes,
          startDate,
          startTime,
          breakBetweenMinutes,
          onlyUnscheduled,
          stageFilter: scopeFilter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al procesar la programación");
      }

      setSuccessMessage(
        data.message || `¡Éxito! Se asignaron cancha y horario a ${data.result?.totalMatches ?? eligibleMatches.length} partidos.`
      );

      // Esperar brevemente para mostrar el éxito y refrescar
      setTimeout(async () => {
        await onScheduleComplete();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al programar partidos";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Programador Automático de Partidos"
      size="lg"
    >
      <div className="space-y-5 text-sm">
        {/* Banner informativo */}
        <div className="bg-sky-500/10 border border-sky-500/25 p-3 rounded-xl flex items-start gap-2.5 text-xs text-sky-200">
          <Sparkles className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <p>
            El programador distribuirá los partidos en las canchas configuradas y creará turnos sucesivos con el tiempo indicado.
            <span className="font-bold text-sky-300"> Garantiza que ninguna pareja juegue al mismo tiempo en dos canchas</span> y podrás editar manualmente cada horario o cancha luego.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. Cantidad de Canchas a disposición */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Canchas a disposición del torneo
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCourtCount(num)}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition-all text-center ${
                  courtCount === num
                    ? "bg-emerald-500 text-dark-950 border-emerald-400 shadow-md font-black"
                    : "bg-dark-900 border-dark-700 text-dark-300 hover:text-white hover:border-dark-600"
                }`}
              >
                {num} {num === 1 ? "Cancha" : "Canchas"}
              </button>
            ))}
          </div>

          {/* Personalización de nombres de canchas */}
          <button
            type="button"
            onClick={() => setShowCustomCourts(!showCustomCourts)}
            className="text-[11px] text-dark-400 hover:text-dark-200 flex items-center gap-1 mt-1 transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            <span>{showCustomCourts ? "Ocultar nombres de canchas" : "Personalizar nombres de las canchas"}</span>
            {showCustomCourts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showCustomCourts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 p-2.5 bg-dark-950/70 rounded-lg border border-dark-800">
              {Array.from({ length: courtCount }).map((_, i) => (
                <div key={i}>
                  <label className="block text-[10px] text-dark-400 mb-0.5">Cancha #{i + 1}</label>
                  <input
                    type="text"
                    value={customCourtNames[i] ?? `Cancha ${i + 1}`}
                    onChange={(e) => handleCourtNameChange(i, e.target.value)}
                    placeholder={`Cancha ${i + 1}`}
                    className="w-full px-2.5 py-1.5 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Tiempo estimado por partido */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Tiempo estimado por partido (minutos)
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[30, 40, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setMatchDurationMinutes(mins)}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition-all text-center ${
                  matchDurationMinutes === mins
                    ? "bg-sky-500 text-dark-950 border-sky-400 shadow-md font-black"
                    : "bg-dark-900 border-dark-700 text-dark-300 hover:text-white hover:border-dark-600"
                }`}
              >
                {mins} min
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-400">O duración personalizada:</span>
            <input
              type="number"
              min="10"
              max="180"
              value={matchDurationMinutes}
              onChange={(e) => setMatchDurationMinutes(Math.max(10, Number(e.target.value) || 10))}
              className="w-24 px-2.5 py-1 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
            />
            <span className="text-xs text-dark-400">minutos</span>
          </div>
        </div>

        {/* 3. Fecha y Hora de inicio de la jornada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Fecha de la jornada
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Hora de inicio del 1º turno
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* 4. Opciones de alcance y descanso */}
        <div className="p-3 bg-dark-950/60 rounded-xl border border-dark-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs text-dark-300 font-medium">Partidos a programar:</label>
            <div className="flex items-center gap-1 bg-dark-900 p-0.5 rounded-lg border border-dark-700 text-xs">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                  scopeFilter === "all" ? "bg-emerald-500 text-dark-950 font-bold" : "text-dark-400 hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("zone")}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                  scopeFilter === "zone" ? "bg-emerald-500 text-dark-950 font-bold" : "text-dark-400 hover:text-white"
                }`}
              >
                Solo Zonas
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("playoff")}
                className={`px-2.5 py-1 rounded-md transition-all font-semibold ${
                  scopeFilter === "playoff" ? "bg-emerald-500 text-dark-950 font-bold" : "text-dark-400 hover:text-white"
                }`}
              >
                Solo Playoffs
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-dark-800">
            <input
              type="checkbox"
              id="onlyUnscheduled"
              checked={onlyUnscheduled}
              onChange={(e) => setOnlyUnscheduled(e.target.checked)}
              className="rounded bg-dark-900 border-dark-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="onlyUnscheduled" className="text-xs text-dark-300 cursor-pointer">
              Programar solo partidos que todavía no tienen cancha ni horario asignado
            </label>
          </div>
        </div>

        {/* 5. Proyección de la jornada */}
        <div className="p-3 bg-dark-900/90 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-dark-400">Partidos a programar: <span className="font-bold text-white">{eligibleMatches.length}</span></p>
            <p className="text-xs text-dark-400">Turnos estimados: <span className="font-bold text-sky-400">{projection.totalSlots} turnos</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-dark-400 uppercase tracking-wider">Finalización estimada</p>
            <p className="text-base font-black text-emerald-400 font-mono">{projection.estimatedEndTime}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleRunAutoSchedule}
            disabled={loading || eligibleMatches.length === 0}
            className="flex items-center gap-2 font-bold"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            {loading ? "Programando partidos..." : "Asignar Canchas y Horarios"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
