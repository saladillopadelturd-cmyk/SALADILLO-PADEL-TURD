"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Trophy, Shield, Menu, X, Calendar } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Inicio", icon: Activity },
    { href: "/torneos", label: "Torneos", icon: Calendar },
    { href: "/rankings", label: "Rankings", icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-40 bg-dark-950/85 backdrop-blur-xl border-b border-dark-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-emerald-500 to-lime-400 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="text-dark-950 font-black text-sm tracking-tighter">SPT</span>
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-dark-950 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-base tracking-tight leading-none group-hover:text-emerald-400 transition-colors">
                Saladillo Padel Tour
              </span>
              <span className="text-[10px] text-dark-400 font-semibold tracking-wider uppercase mt-0.5">
                Circuito Oficial
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-dark-900/60 p-1.5 rounded-2xl border border-dark-800/80">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-sm shadow-blue-500/30"
                      : "text-dark-300 hover:text-white hover:bg-dark-800/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions & Admin */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-dark-400 hover:text-white bg-dark-900/80 hover:bg-dark-800 border border-dark-800 rounded-xl transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin</span>
            </Link>

            {/* Mobile Menu Button (Touch Target >= 44px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-dark-900 border border-dark-800 text-dark-300 hover:text-white active:scale-95 transition-all cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-emerald-400" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-dark-800 bg-dark-950/95 backdrop-blur-2xl animate-in">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold min-h-[48px] transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md shadow-blue-500/20"
                      : "text-dark-300 hover:text-white hover:bg-dark-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-dark-800">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-dark-400 hover:text-white hover:bg-dark-900 min-h-[48px]"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                Panel Administrador
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

