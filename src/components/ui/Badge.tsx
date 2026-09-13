interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "live"
    | "gold"
    | "neon"
    | "eliminated";
  size?: "xs" | "sm" | "md";
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  pulse = false,
  className = "",
}: BadgeProps) {
  const variants = {
    default: "bg-dark-800 text-dark-300 border border-dark-700/70",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    info: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    live: "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/20 font-bold",
    gold: "bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-400/20 font-bold",
    neon: "bg-lime-400/15 text-lime-400 border border-lime-400/35 font-bold",
    eliminated: "bg-rose-950/40 text-rose-400/80 border border-rose-800/40",
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-xs sm:text-sm font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full tracking-wide transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {(pulse || variant === "live") && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>
      )}
      {children}
    </span>
  );
}

