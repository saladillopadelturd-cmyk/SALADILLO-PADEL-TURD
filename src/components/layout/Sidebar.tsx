"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Users, UserCheck, Shield, ArrowLeft, Image as ImageIcon, Sparkles } from "lucide-react";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/torneos", label: "Torneos", icon: Trophy },
  { href: "/admin/novedades", label: "Novedades (Flyers)", icon: ImageIcon },
  { href: "/admin/flyers-ai", label: "Generador de Flyers", icon: Sparkles },
  { href: "/admin/jugadores", label: "Jugadores", icon: Users },
  { href: "/admin/parejas", label: "Parejas", icon: UserCheck },
  { href: "/admin/admins", label: "Administradores", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-dark-950/90 backdrop-blur-md border-r border-dark-800 min-h-[calc(100vh-4rem)]">
      <div className="px-4 py-4 border-b border-dark-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 bg-dark-900 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Image
            src="/logo-emblem.png"
            alt="SPT Logo"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 truncate">
            Panel de Control
          </span>
          <span className="text-[10px] text-dark-400 font-semibold truncate">
            Saladillo Padel Tour
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 via-emerald-600/15 to-transparent text-emerald-400 border-l-2 border-emerald-400 shadow-sm"
                  : "text-dark-400 hover:text-white hover:bg-dark-900"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-dark-500"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-800/80">
        <Link
          href="/"
          className="flex items-center gap-2 text-dark-400 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-dark-900 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al sitio público</span>
        </Link>
      </div>
    </aside>
  );
}

