"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Trophy, Shield, Menu, X, Calendar, Users } from "lucide-react";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { player, isIdentified, openFicha } = usePlayerIdentity();
  const { isAdmin } = useAuth();

  const isAdminMode = Boolean(isAdmin || pathname.startsWith("/admin"));

  const headerPlayerPhoto =
    player?.photo_url ||
    player?.avatar_url ||
    (typeof window !== "undefined" && player?.email
      ? localStorage.getItem(`spt_player_photo_${player.email.toLowerCase()}`)
      : null);

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
            <div className="relative h-10 sm:h-11 w-32 sm:w-36 flex items-center justify-start">
              <Image
                src="/LOGOSPT.png"
                alt="Saladillo Padel Tour"
                width={160}
                height={48}
                className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
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

            {/* Opción Jugadores / Mi Ficha en Header */}
            {isIdentified && player ? (
              <button
                type="button"
                onClick={openFicha}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                  pathname.startsWith("/jugadores")
                    ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-emerald-300 hover:text-white hover:bg-dark-800/80 bg-emerald-500/10 border border-emerald-500/30"
                }`}
                title="Ver o editar tu Ficha de Jugador"
              >
                <PlayerAvatar
                  photoUrl={headerPlayerPhoto}
                  firstName={player.first_name}
                  lastName={player.last_name}
                  category={player.category}
                  size="xs"
                  showCategoryBorder
                />
                <span className="truncate max-w-[100px]">
                  {player.first_name}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                  title="Identidad reconocida"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={openFicha}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                  pathname.startsWith("/jugadores")
                    ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-dark-300 hover:text-white hover:bg-dark-800/80"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jugadores</span>
              </button>
            )}
          </nav>

          {/* Desktop Actions & Admin */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                isAdminMode
                  ? "bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black border border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/50"
                  : "hidden md:inline-flex font-semibold text-dark-400 hover:text-white bg-dark-900/80 hover:bg-dark-800 border border-dark-800"
              }`}
              title={isAdminMode ? "Modo Administrador Encendido" : "Acceso a Administración"}
            >
              <Shield
                className={`w-3.5 h-3.5 transition-colors ${
                  isAdminMode ? "text-dark-950 fill-dark-950/20" : "text-blue-400"
                }`}
              />
              <span>Admin</span>
              {isAdminMode && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-dark-950 animate-pulse ml-0.5"
                  title="Modo Administrador Activo"
                />
              )}
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
            {/* Si está identificado, mostrar tarjeta superior de identidad en el menú móvil */}
            {isIdentified && player && (
              <div
                onClick={() => {
                  setMobileMenuOpen(false);
                  openFicha();
                }}
                className="p-3 mb-2 rounded-xl bg-gradient-to-r from-emerald-950/70 to-dark-900 border border-emerald-500/30 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    photoUrl={headerPlayerPhoto}
                    firstName={player.first_name}
                    lastName={player.last_name}
                    category={player.category}
                    size="md"
                    showCategoryBorder
                  />
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {player.category || "5ta"} • Identidad activa
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Ficha
                </span>
              </div>
            )}

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

            {/* Opción Jugadores en menú móvil */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openFicha();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold min-h-[48px] text-dark-300 hover:text-white hover:bg-dark-900 transition-all text-left cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{isIdentified ? "Mi Ficha de Jugador" : "Jugadores (Cargar Ficha)"}</span>
            </button>

            <div className="pt-2 border-t border-dark-800">
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold min-h-[48px] transition-all ${
                  isAdminMode
                    ? "bg-emerald-500 text-dark-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] border border-emerald-300"
                    : "text-dark-400 hover:text-white hover:bg-dark-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className={`w-4 h-4 ${isAdminMode ? "text-dark-950" : "text-blue-400"}`} />
                  <span>Panel Administrador</span>
                </div>
                {isAdminMode && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-dark-950 text-emerald-300 border border-dark-900">
                    Encendido
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
