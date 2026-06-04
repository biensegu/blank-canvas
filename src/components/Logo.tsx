import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <img
        src={logo}
        alt="Pieza a Pieza"
        width={size}
        height={size}
        className="transition-transform duration-300 group-hover:rotate-12"
      />
      {withText && (
        <span className="font-bold text-lg tracking-tight">
          Pieza<span className="text-primary"> a </span>Pieza
        </span>
      )}
    </Link>
  );
}