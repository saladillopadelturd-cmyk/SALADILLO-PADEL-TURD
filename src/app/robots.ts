import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/torneos", "/rankings"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/jugadores",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/torneos", "/rankings"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/jugadores",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
