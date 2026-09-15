"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Users, UserCheck, Shield, Image as ImageIcon } from "lucide-react";

const mobileLinks = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/torneos", label: "Torneos", icon: Trophy },
  { href: "/admin/novedades", label: "Novedades", icon: ImageIcon },
  { href: "/admin/jugadores", label: "Jugadores", icon: Users },
  { href: "/admin/parejas", label: "Parejas", icon: UserCheck },
  { href: "/admin/admins", label: "Admins", icon: Shield },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-950/95 backdrop-blur-xl border-t border-dark-800/90 shadow-2xl safe-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {mobileLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-150 active:scale-90 cursor-pointer ${
                isActive
                  ? "text-emerald-400 font-bold"
                  : "text-dark-400 hover:text-slate-200"
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-7 h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 shadow-sm shadow-emerald-400/50" />
              )}
              <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] tracking-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

