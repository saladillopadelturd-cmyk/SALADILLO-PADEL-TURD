"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Flyer } from "@/types/flyer";

interface NewsCarouselProps {
  flyers: Flyer[];
}

export default function NewsCarousel({ flyers }: NewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (flyers.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flyers.length);
    }, 5000); // Auto-advance every 5 seconds
    
    return () => clearInterval(interval);
  }, [flyers.length]);

  if (!flyers || flyers.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + flyers.length) % flyers.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % flyers.length);
  };

  const currentFlyer = flyers[currentIndex];

  const content = (
    <div className="relative w-full aspect-video sm:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl bg-dark-900 border border-dark-700/50 group">
      <Image
        src={currentFlyer.image_url}
        alt={currentFlyer.title || "Novedad SPT"}
        fill
        className="object-cover transition-transform duration-700 hover:scale-105"
        priority
      />
      
      {/* Optional gradient overlay to make text more readable if needed */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent opacity-60" />
      
      {/* Navigation Controls */}
      {flyers.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); handlePrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {flyers.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? "bg-white w-4" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full mt-4 sm:mt-8 mb-4 sm:mb-6">
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
