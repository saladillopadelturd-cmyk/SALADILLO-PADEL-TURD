import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5 tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-dark-950/80 border border-dark-700/80 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm min-h-[44px] ${
            error
              ? "border-rose-500/80 focus:ring-rose-500/40 focus:border-rose-500 text-rose-200"
              : "hover:border-dark-600"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

