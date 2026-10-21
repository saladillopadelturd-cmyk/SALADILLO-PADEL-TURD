import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // Páginas estáticas principales
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/torneos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/rankings`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Páginas dinámicas de torneos
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data: tournaments } = await supabase
        .from("tournaments")
        .select("id, updated_at, created_at, date")
        .order("date", { ascending: false });

      if (tournaments && tournaments.length > 0) {
        const tournamentRoutes: MetadataRoute.Sitemap = tournaments.map((t) => {
          let lastMod = now;
          if (t.updated_at) {
            lastMod = new Date(t.updated_at);
          } else if (t.created_at) {
            lastMod = new Date(t.created_at);
          } else if (t.date) {
            lastMod = new Date(t.date);
          }

          return {
            url: `${siteUrl}/torneos/${t.id}`,
            lastModified: lastMod,
            changeFrequency: "hourly",
            priority: 0.8,
          };
        });

        return [...staticRoutes, ...tournamentRoutes];
      }
    }
  } catch (err) {
    console.warn("Aviso generando sitemap dinámico de torneos:", err);
  }

  return staticRoutes;
}
