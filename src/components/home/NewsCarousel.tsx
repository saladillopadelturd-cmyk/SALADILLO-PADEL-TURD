"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Flyer } from "@/types/flyer";

interface NewsCarouselProps {
  flyers: Flyer[];
}

const DEFAULT_FLYER: Flyer = {
  id: "oficial-spt-2026",
  title: "GRAN TORNEO APERTURA 2026 - SALADILLO PADEL TOUR",
  image_url: "/assets/fondos/flyer_oficial_spt.png",
  link_url: "#torneos-activos",
  active: true,
  sort_order: -1,
  created_at: "2026-09-17T00:00:00.000Z",
};

export default function NewsCarousel({ flyers: initialFlyers }: NewsCarouselProps) {
  const [flyers, setFlyers] = useState<Flyer[]>(
    initialFlyers && initialFlyers.length > 0 ? initialFlyers : [DEFAULT_FLYER]
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sincronizar si cambian los props del servidor
  useEffect(() => {
    if (initialFlyers && initialFlyers.length > 0) {
      setFlyers(initialFlyers);
    }
  }, [initialFlyers]);

  // Consultar API endpoint, Supabase Storage público y localStorage
  useEffect(() => {
    // 1. Consultar localStorage primero (hidratación inmediata en el dispositivo del admin)
    try {
      const stored = localStorage.getItem("spt_confirmed_flyer");
      if (stored) {
        const localFlyer: Flyer = JSON.parse(stored);
        if (localFlyer && localFlyer.image_url) {
          setFlyers((prev) => {
            const filtered = prev.filter((f) => f.id !== localFlyer.id && f.id !== DEFAULT_FLYER.id);
            return [localFlyer, ...filtered];
          });
        }
      }
    } catch (e) {
      console.warn("Error reading localStorage flyer:", e);
    }

    // 2. Consultar API endpoint /api/flyers
    fetch("/api/flyers")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.flyers) && data.flyers.length > 0) {
          setFlyers(data.flyers);
        }
      })
      .catch((err) => console.warn("API flyers fetch error:", err));

    // 3. Consultar directamente Supabase Storage público como red de seguridad
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hrediohisjcjykaranzx.supabase.co";
    fetch(`${supabaseUrl}/storage/v1/object/public/flyers/confirmed_flyer.json`, { cache: "no-store" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((cloudFlyer) => {
        if (cloudFlyer && cloudFlyer.image_url) {
          setFlyers((prev) => {
            const filtered = prev.filter((f) => f.id !== cloudFlyer.id && f.id !== DEFAULT_FLYER.id);
            return [cloudFlyer, ...filtered];
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (flyers.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flyers.length);
    }, 5000); // Auto-advance every 5 seconds
    
    return () => clearInterval(interval);
  }, [flyers.length]);

  const activeFlyers = flyers.length > 0 ? flyers : [DEFAULT_FLYER];
  const currentFlyer = activeFlyers[currentIndex] || activeFlyers[0] || DEFAULT_FLYER;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeFlyers.length) % activeFlyers.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeFlyers.length);
  };

  const content = (
    <div className="relative w-full aspect-video sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl bg-dark-900 border border-emerald-500/30 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentFlyer.image_url}
        alt={currentFlyer.title || "Flyer Oficial SPT"}
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        loading="eager"
      />
      
      {/* Degradado sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      {/* Navigation Controls */}
      {flyers.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); handlePrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {flyers.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentIndex ? "bg-emerald-400 w-5" : "bg-white/40 w-2"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full mt-3 sm:mt-6 mb-4 sm:mb-6">
      {currentFlyer.link_url ? (
        <Link href={currentFlyer.link_url} className="block w-full">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
