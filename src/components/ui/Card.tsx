import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  variant?: "default" | "court" | "glass" | "gold";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className = "", hover = false, variant = "default", ...props },
    ref
  ) => {
    const variants = {
      default: "bg-dark-900/85 backdrop-blur-md border border-dark-700/70 shadow-lg shadow-black/30",
      court: "bg-dark-950/90 backdrop-blur-sm border border-dark-800 shadow-xl shadow-black/40",
      glass: "bg-dark-900/60 backdrop-blur-xl border border-dark-600/50 shadow-2xl shadow-black/30",
      gold: "bg-dark-900/90 backdrop-blur-md border border-amber-500/40 shadow-lg shadow-amber-500/5",
    };

    return (
      <div
        ref={ref}
        className={`rounded-2xl transition-all duration-200 ${variants[variant]} ${
          hover
            ? "hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:-translate-y-0.5 cursor-pointer"
            : ""
        } ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export default Card;

