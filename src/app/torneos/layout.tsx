import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Torneos Oficiales de Pádel",
  description:
    "Explora los torneos oficiales del circuito Saladillo Padel Tour (SPT). Fixtures en vivo, conformación de zonas, llaves de playoffs y resultados actualizados en Saladillo.",
  openGraph: {
    title: "Torneos Oficiales de Pádel | SPT Saladillo",
    description:
      "Zonas, fixtures, cuadros de eliminación directa y tanteos en vivo del circuito Saladillo Padel Tour.",
    url: "/torneos",
  },
  alternates: {
    canonical: "/torneos",
  },
};

export default function TorneosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
