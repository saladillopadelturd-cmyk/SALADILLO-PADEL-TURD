"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, Zone, Couple, Match, ZoneStanding } from "@/types/tournament";
import { calculateRoundRobinStandings } from "@/lib/tournament/standings";

export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [zoneCouplesMap, setZoneCouplesMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const normalizeMatch = (m: Match): Match => ({
    ...m,
    pair1: m.couple1,
    pair2: m.couple2,
    pair1_id: m.couple1_id ?? undefined,
    pair2_id: m.couple2_id ?? undefined,
  });

  const fetchData = useCallback(async () => {
    try {
      const [tournamentsRes, zonesRes, couplesRes, matchesRes, zoneCouplesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("zones").select("*").eq("tournament_id", tournamentId).order("zone_number", { ascending: true }),
        supabase
          .from("couples")
          .select("*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)")
          .eq("tournament_id", tournamentId),
        supabase
          .from("matches")
          .select("*, couple1:couples!matches_couple1_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*)), couple2:couples!matches_couple2_id_fkey(*, player1:players!couples_player1_id_fkey(*), player2:players!couples_player2_id_fkey(*))")
          .eq("tournament_id", tournamentId)
          .order("scheduled_time", { ascending: true, nullsFirst: false }),
        supabase
          .from("zone_couples")
          .select("zone_id, couple_id"),
      ]);

      if (tournamentsRes.data) setTournament(tournamentsRes.data);
      if (zonesRes.data) setZones(zonesRes.data);
      if (couplesRes.data) setCouples(couplesRes.data);

      const rawMatches = (matchesRes.data as Match[]) ?? [];
      setMatches(rawMatches.map(normalizeMatch));

      if (zoneCouplesRes.data) {
        const map: Record<string, string[]> = {};
        zoneCouplesRes.data.forEach((item) => {
          if (!map[item.zone_id]) map[item.zone_id] = [];
          map[item.zone_id].push(item.couple_id);
        });
        setZoneCouplesMap(map);
      }
    } catch (err) {
      console.error("Error fetching tournament data in useTournament:", err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, supabase]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    void load();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  // Realtime subscription for live match changes
  useEffect(() => {
    const channel = supabase
      .channel(`public:matches:tour_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string }).id;
            setMatches((prev) => prev.filter((m) => m.id !== oldId));
          } else if (payload.eventType === "INSERT") {
            const inserted = normalizeMatch(payload.new as Match);
            setMatches((prev) => [...prev, inserted]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Match;
            setMatches((prev) => {
              const idx = prev.findIndex((m) => m.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                // Preserve joined relations from existing item
                next[idx] = normalizeMatch({
                  ...prev[idx],
                  ...updated,
                });
                return next;
              }
              return [...prev, normalizeMatch(updated)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, supabase]);

  // Compute standings per zone dynamically based on matches and couples
  const standings = useMemo<ZoneStanding[]>(() => {
    const allStandings: ZoneStanding[] = [];
    zones.forEach((zone) => {
      const zoneCoupleIds = zoneCouplesMap[zone.id] ?? [];
      const zoneMatches = matches.filter((m) => m.zone_id === zone.id);
      const zoneRes = calculateRoundRobinStandings(zoneMatches, zoneCoupleIds).map((s) => ({
        ...s,
        zone_id: zone.id,
      }));
      allStandings.push(...zoneRes);
    });
    return allStandings;
  }, [zones, zoneCouplesMap, matches]);

  return {
    tournament,
    zones,
    couples,
    pairs: couples, // backward compatibility
    matches,
    standings,
    loading,
    refetch: fetchData,
  };
}
