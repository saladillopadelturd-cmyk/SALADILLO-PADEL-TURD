"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtime<T extends { id?: string }>(
  table: string,
  filter?: string
): { data: T[]; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    let query = supabase.from(table).select("*");
    if (filter) {
      const [column, value] = filter.split("=eq.");
      if (column && value) {
        query = query.eq(column, value);
      }
    }
    const { data: result } = await query;
    setData((result as T[]) ?? []);
    setLoading(false);
  }, [table, filter, supabase]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      let query = supabase.from(table).select("*");
      if (filter) {
        const [column, value] = filter.split("=eq.");
        if (column && value) {
          query = query.eq(column, value);
        }
      }
      const { data: result } = await query;
      if (isMounted) {
        setData((result as T[]) ?? []);
        setLoading(false);
      }
    };

    void init();

    const channel = supabase
      .channel(`realtime_${table}_${filter || "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setData((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as T;
            setData((prev) =>
              prev.map((item) =>
                item.id === updated.id ? { ...item, ...updated } : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string })?.id;
            setData((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [table, filter, supabase]);

  return { data, loading, refetch: fetchData };
}
