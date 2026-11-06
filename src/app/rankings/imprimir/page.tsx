import React from "react";
import type { Metadata } from "next";
import { fetchCategoryRankings } from "@/lib/tournament/ranking-fetcher";
import RankingPrintDocument, {
  PrintablePlayerItem,
} from "@/components/ranking/RankingPrintDocument";
import PrintToolbar from "@/components/ranking/PrintToolbar";

export const metadata: Metadata = {
  title: "Imprimir Ranking Oficial 9:16 | Saladillo Padel Tour",
  description:
    "Documento oficial de ranking en formato 9:16 con 15 puestos por página para impresión y difusión en Saladillo Padel Tour.",
};

export default async function ImprimirRankingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string;
    gender?: string;
    theme?: string;
    autoPrint?: string;
  }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const category = (resolvedParams.category || "8va").trim();
  const gender = (resolvedParams.gender || "Caballeros").trim();
  const initialTheme: "dark" | "light" = "light";
  const autoPrint = resolvedParams.autoPrint === "true";

  const { individualRankings, activeCategory, selectedGender } =
    await fetchCategoryRankings({
      gender,
      category,
    });

  const printablePlayers: PrintablePlayerItem[] = individualRankings.map(
    (p, index) => ({
      position: index + 1,
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      localidad: p.localidad || "Saladillo",
      category: p.category || activeCategory,
      tournaments: p.tournaments || 0,
      points: p.points || 0,
      matchesWon: p.matchesWon || 0,
      matchesLost: p.matchesLost || 0,
    })
  );

  return (
    <div className="min-h-screen bg-[#070b14] py-8 print:py-0 print:bg-transparent">
      {/* Barra de control flotante solo en pantalla */}
      <PrintToolbar
        category={activeCategory}
        gender={selectedGender}
        autoPrint={autoPrint}
      />

      {/* Documento Vertical en Formato 9:16 */}
      <div className="max-w-[800px] mx-auto px-4 print:px-0 print:max-w-none pt-12 print:pt-0">
        <RankingPrintDocument
          category={activeCategory}
          gender={selectedGender}
          players={printablePlayers}
          theme={initialTheme}
          printDate={new Date()}
        />
      </div>
    </div>
  );
}
