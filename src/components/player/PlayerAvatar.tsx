"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface PlayerAvatarProps {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
  category?: string | null;
  size?: AvatarSize;
  className?: string;
  showCategoryBorder?: boolean;
}

const SIZE_MAP: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { container: "w-6 h-6 rounded-md", text: "text-[10px]", icon: "w-3 h-3" },
  sm: { container: "w-8 h-8 rounded-lg", text: "text-xs", icon: "w-4 h-4" },
  md: { container: "w-10 h-10 rounded-xl", text: "text-sm", icon: "w-5 h-5" },
  lg: { container: "w-14 h-14 rounded-xl", text: "text-base", icon: "w-6 h-6" },
  xl: { container: "w-20 h-20 rounded-2xl", text: "text-xl", icon: "w-8 h-8" },
  "2xl": { container: "w-32 h-32 sm:w-36 sm:h-36 rounded-2xl", text: "text-3xl", icon: "w-12 h-12" },
};

export default function PlayerAvatar({
  photoUrl,
  firstName,
  lastName,
  category,
  size = "md",
  className = "",
  showCategoryBorder = false,
}: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Sanitizar URL de la foto
  const validPhotoUrl =
    photoUrl &&
    typeof photoUrl === "string" &&
    photoUrl.trim() !== "" &&
    photoUrl !== "null" &&
    photoUrl !== "undefined"
      ? photoUrl.trim()
      : null;

  // Si la URL de la foto cambia o se actualiza, resetear el estado de error
  useEffect(() => {
    setImgError(false);
  }, [validPhotoUrl]);

  const initials = `${(firstName?.[0] || "").toUpperCase()}${(lastName?.[0] || "").toUpperCase()}` || "P";
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  // Borde temático según la categoría deportiva
  let borderColor = "border-dark-700/80";
  if (showCategoryBorder && category) {
    const cat = category.toLowerCase();
    if (cat.includes("1ra") || cat.includes("2da")) {
      borderColor = "border-amber-400 shadow-sm shadow-amber-400/20";
    } else if (cat.includes("3ra") || cat.includes("4ta")) {
      borderColor = "border-cyan-400 shadow-sm shadow-cyan-400/20";
    } else if (cat.includes("5ta") || cat.includes("6ta")) {
      borderColor = "border-emerald-400 shadow-sm shadow-emerald-400/20";
    } else {
      borderColor = "border-dark-600";
    }
  }

  // Siempre se respeta formato cuadrado (aspect-square) para exhibir exclusivamente la zona útil de la foto
  return (
    <div
      className={`relative aspect-square flex-shrink-0 overflow-hidden bg-dark-900 border ${borderColor} ${sizeConfig.container} ${className}`}
      title={`${firstName} ${lastName}`}
    >
      {validPhotoUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={validPhotoUrl}
          src={validPhotoUrl}
          alt={`Foto de ${firstName} ${lastName}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover object-center select-none"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 via-dark-850 to-dark-900 text-white font-black select-none">
          {initials.length > 0 ? (
            <span className={`${sizeConfig.text} tracking-wider text-emerald-400/90 drop-shadow-sm`}>
              {initials}
            </span>
          ) : (
            <User className={`${sizeConfig.icon} text-dark-400`} />
          )}
        </div>
      )}
    </div>
  );
}
