import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-dark-800 border border-dark-700 rounded-xl shadow-lg ${
          hover
            ? "hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer"
            : ""
        } ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export default Card;
