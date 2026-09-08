"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, Zone, Pair, Match, ZoneStanding } from "@/types/tournament";

export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<ZoneStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const [tournamentsRes, zonesRes, pairsRes, matchesRes] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).single(),
        supabase.from("zones").select("*").eq("tournament_id", tournamentId),
        supabase
          .from("pairs")
          .select("*, player1:players!pairs_player1_id_fkey(*), player2:players!pairs_player2_id_fkey(*)")
          .eq("tournament_id", tournamentId),
        supabase
          .from("matches")
          .select("*, pair1:pairs!matches_pair1_id_fkey(*), pair2:pairs!matches_pair2_id_fkey(*)")
          .eq("tournament_id", tournamentId),
      ]);

      setTournament(tournamentsRes.data);
      setZones(zonesRes.data ?? []);
      setPairs(pairsRes.data ?? []);
      setMatches(matchesRes.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [tournamentId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`tournament_${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          setMatches((prev) => {
            const idx = prev.findIndex((m) => m.id === newRow.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.new as Match;
              return next;
            }
            return [...prev, payload.new as Match];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zone_standings" },
        () => {
          // Refetch standings when they change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, supabase]);

  return {
    tournament,
    zones,
    pairs,
    matches,
    standings,
    loading,
  };
}
