"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useRealtime<T>(
  table: string,
  filter?: string
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase.from(table).select("*");
      if (filter) {
        const [column, value] = filter.split("=eq.");
        query = query.eq(column, value);
      }
      const { data: result } = await query;
      setData((result as T[]) ?? []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`realtime_${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setData((prev) => [...prev, payload.new as T]);
          } else if (payload.eventType === "UPDATE") {
            setData((prev) =>
              prev.map((item) =>
                (item as any).id === (payload.new as any).id
                  ? (payload.new as T)
                  : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setData((prev) =>
              prev.filter((item) => (item as any).id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, supabase]);

  return { data, loading };
}
