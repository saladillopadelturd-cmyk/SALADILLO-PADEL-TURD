"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import type { Zone } from "@/types/tournament";
import { buildCustomZonesConfig } from "@/lib/tournament/zones";
import { Layers, Users, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface ZoneSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  totalCouplesCount: number;
  onStructureCreated: (newZones: Zone[], zoneSizes: Record<string, number>) => Promise<void>;
}

export default function ZoneSetupModal({
  isOpen,
  onClose,
  tournamentId,
  totalCouplesCount,
  onStructureCreated,
}: ZoneSetupModalProps) {
  // Configuración de los dos grupos de zonas
  // Inicialización inteligente según parejas inscriptas:
  // Si totalCouplesCount es divisible por 4: todas de 4.
  // Si no, por defecto intentar 2 de 4 o lo que sume aproximadamente, o permitir configurar libremente.
  const [numZones1, setNumZones1] = useState<number>(() => {
    if (totalCouplesCount >= 8 && totalCouplesCount % 3 !== 0 && totalCouplesCount % 4 === 0) {
      return totalCouplesCount / 4;
    }
    if (totalCouplesCount === 26 || totalCouplesCount === 24) return 2;
    return Math.max(1, Math.floor(totalCouplesCount / 4) || 2);
  });
  const [size1, setSize1] = useState<number>(4);

  const [numZones2, setNumZones2] = useState<number>(() => {
    if (totalCouplesCount >= 8 && totalCouplesCount % 4 === 0 && totalCouplesCount % 3 !== 0) {
      return 0;
    }
    if (totalCouplesCount === 26) return 6;
    const remaining = totalCouplesCount - 2 * 4;
    if (remaining > 0 && remaining % 3 === 0) return remaining / 3;
    return 0;
  });
  const [size2, setSize2] = useState<number>(3);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cálculo en tiempo real de la combinación
  const config = useMemo(() => {
    return buildCustomZonesConfig(
      { numZones: Number(numZones1) || 0, zoneSize: Number(size1) || 4 },
      { numZones: Number(numZones2) || 0, zoneSize: Number(size2) || 3 }
    );
  }, [numZones1, size1, numZones2, size2]);

  const diffCouples = config.totalCapacity - totalCouplesCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (config.totalZones === 0) {
      setErrorMessage("Debes configurar al menos 1 zona para el torneo.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/zonas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          action: "setup_zones",
          group1: { numZones: Number(numZones1) || 0, zoneSize: Number(size1) || 4 },
          group2: { numZones: Number(numZones2) || 0, zoneSize: Number(size2) || 3 },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al configurar la estructura de zonas");
      }

      const createdZones: Zone[] = data.zones || [];
      const zoneSizesMap: Record<string, number> = data.zoneSizes || {};

      // Guardar en localStorage para persistencia inmediata en el cliente
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`spt_zone_sizes_${tournamentId}`, JSON.stringify(zoneSizesMap));
        } catch {}
      }

      await onStructureCreated(createdZones, zoneSizesMap);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confección y Estructura de Zonas"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Banner explicativo */}
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Combinación Libre de Zonas
            </h4>
            <p className="text-xs text-dark-300 mt-1 leading-relaxed">
              Define cuántas zonas de cada tamaño tendrá el torneo. Puedes combinar zonas de 4 parejas y zonas de 3 parejas (por ejemplo: <strong>2 zonas de 4 parejas y 6 zonas de 3 parejas</strong>). Las zonas se crearán vacías para que asignes manualmente las parejas una a una.
            </p>
          </div>
        </div>

        {/* Parejas inscriptas */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-dark-800">
          <span className="text-xs font-bold text-dark-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Parejas inscriptas en el torneo:
          </span>
          <span className="text-sm font-black text-white px-3 py-1 rounded-lg bg-dark-850 border border-dark-700">
            {totalCouplesCount} parejas ({totalCouplesCount * 2} jugadores)
          </span>
        </div>

        {/* Combinación de Zonas: Grupo 1 y Grupo 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Grupo 1 */}
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Grupo A de Zonas
              </span>
              <span className="text-[11px] font-mono text-dark-400">
                {(Number(numZones1) || 0) * (Number(size1) || 4)} parejas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cant. de Zonas"
                type="number"
                min={0}
                max={16}
                value={numZones1}
                onChange={(e) => setNumZones1(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <Select
                label="Parejas por zona"
                value={String(size1)}
                onChange={(e) => setSize1(Number(e.target.value))}
                options={[
                  { value: "4", label: "4 parejas" },
                  { value: "3", label: "3 parejas" },
                  { value: "5", label: "5 parejas" },
                ]}
              />
            </div>
            <p className="text-[11px] text-dark-400">
              {Number(numZones1) || 0} {Number(numZones1) === 1 ? "zona" : "zonas"} de {size1} parejas
            </p>
          </div>

          {/* Grupo 2 */}
          <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                Grupo B de Zonas (Opcional)
              </span>
              <span className="text-[11px] font-mono text-dark-400">
                {(Number(numZones2) || 0) * (Number(size2) || 3)} parejas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cant. de Zonas"
                type="number"
                min={0}
                max={16}
                value={numZones2}
                onChange={(e) => setNumZones2(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <Select
                label="Parejas por zona"
                value={String(size2)}
                onChange={(e) => setSize2(Number(e.target.value))}
                options={[
                  { value: "3", label: "3 parejas" },
                  { value: "4", label: "4 parejas" },
                  { value: "5", label: "5 parejas" },
                ]}
              />
            </div>
            <p className="text-[11px] text-dark-400">
              {Number(numZones2) || 0} {Number(numZones2) === 1 ? "zona" : "zonas"} de {size2} parejas
            </p>
          </div>
        </div>

        {/* Resumen de cálculo en vivo */}
        <div className="p-4 rounded-xl bg-dark-950/80 border border-dark-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider">
                Resumen de la Combinación
              </span>
              <h5 className="text-sm font-black text-white mt-0.5">
                {config.totalZones} zonas configuradas ({config.summary})
              </h5>
            </div>
            <div className="text-right">
              <span className="text-xs text-dark-400 font-semibold block">Capacidad Total</span>
              <span className="text-base font-black text-emerald-400">
                {config.totalCapacity} parejas
              </span>
            </div>
          </div>

          {/* Indicador de coincidencia */}
          <div className="pt-2 border-t border-dark-800">
            {diffCouples === 0 ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Capacidad exacta para las {totalCouplesCount} parejas inscriptas.</span>
              </div>
            ) : diffCouples > 0 ? (
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Hay cupo para {config.totalCapacity} parejas (+{diffCouples} cupos libres respecto a las {totalCouplesCount} parejas inscriptas).
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-rose-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  La capacidad ({config.totalCapacity} parejas) es menor a los inscriptos ({totalCouplesCount} parejas). Quedarían {Math.abs(diffCouples)} parejas sin zona.
                </span>
              </div>
            )}
          </div>

          {/* Vista previa de las zonas a crear */}
          {config.zones.length > 0 && (
            <div className="pt-2 border-t border-dark-800">
              <span className="text-[11px] text-dark-400 block mb-2 font-semibold">
                Zonas que se crearán:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.zones.map((z) => (
                  <span
                    key={z.zoneIndex}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      z.size === 4
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {z.name} ({z.size} parejas)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || config.totalZones === 0}
            className="bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
          >
            <span>{isLoading ? "Creando zonas..." : "Confirmar y Confeccionar Zonas"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
