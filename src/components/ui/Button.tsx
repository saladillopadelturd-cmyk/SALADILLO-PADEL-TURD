"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent" | "neon";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variants = {
      primary:
        "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 focus:ring-blue-500 shadow-md shadow-blue-600/25 border border-blue-400/20",
      secondary:
        "bg-dark-800 text-slate-100 hover:bg-dark-700 hover:text-white border border-dark-700/80 focus:ring-slate-500",
      danger:
        "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 shadow-md shadow-rose-600/20 border border-rose-500/20",
      ghost:
        "bg-transparent text-dark-300 hover:bg-dark-800/80 hover:text-white focus:ring-dark-500",
      accent:
        "bg-gradient-to-r from-amber-500 to-amber-400 text-dark-950 hover:from-amber-400 hover:to-amber-300 font-bold focus:ring-amber-500 shadow-md shadow-amber-500/25 border border-amber-300/30",
      neon:
        "bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 hover:from-emerald-400 hover:to-lime-400 font-bold focus:ring-emerald-500 shadow-md shadow-emerald-500/25 border border-lime-300/30",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs min-h-[36px]",
      md: "px-4 py-2.5 text-sm min-h-[44px]",
      lg: "px-6 py-3.5 text-base min-h-[48px]",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;

