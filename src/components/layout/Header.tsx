"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Trophy, Shield, Menu, X, Calendar, Users, LogOut, UserPlus, LogIn } from "lucide-react";
import { usePlayerIdentity } from "@/context/PlayerIdentityContext";
import PlayerAvatar from "@/components/player/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { player, isIdentified, openFicha, openLogin, openCreateProfile, clearIdentity, loggedEmail } = usePlayerIdentity();
  const { user, isAdmin, isActualAdmin, adminModeEnabled, toggleAdminMode, signOut } = useAuth();

  const isAdministrator = Boolean(
    isActualAdmin ||
    (isIdentified && player?.email?.toLowerCase() === "matiasvidal11972@gmail.com") ||
    (loggedEmail?.toLowerCase() === "matiasvidal11972@gmail.com")
  );

  const isNormalUser = Boolean(!isAdministrator && (isIdentified || loggedEmail || user));
  const isUnknown = Boolean(!isAdministrator && !isNormalUser);
  const isUserLoggedIn = Boolean(isAdministrator || isNormalUser);

  const handleLogout = async () => {
    try {
      await clearIdentity();
      await signOut();
    } catch (err) {
      console.warn("Error al cerrar sesión:", err);
    }
    if (pathname.startsWith("/admin")) {
      router.push("/");
    }
  };

  const isAdminMode = Boolean(isAdmin);

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

            {/* Enlace Jugadores en Desktop Navigation: Solo visible en modo administrador */}
            {isAdmin && (
              <Link
                href="/admin/jugadores"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                  pathname.startsWith("/admin/jugadores") || pathname.startsWith("/jugadores")
                    ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-sm shadow-blue-500/30"
                    : "text-dark-300 hover:text-white hover:bg-dark-800/80"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jugadores</span>
              </Link>
            )}
          </nav>

          {/* Header Actions (Visible en versión móvil y desktop) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* CASO 1: Administrador -> Botón ADMIN (apagado = ve como usuario normal, encendido = ve opciones de admin) */}
            {isAdministrator ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`inline-flex items-center rounded-2xl p-1 transition-all border ${
                    adminModeEnabled
                      ? "bg-emerald-950/70 border-emerald-500/50 shadow-md shadow-emerald-500/20"
                      : "bg-dark-900/90 border-dark-700/80"
                  }`}
                >
                  <Link
                    href="/admin"
                    className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                      adminModeEnabled
                        ? "bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                        : "text-dark-400 hover:text-white font-bold hover:bg-dark-800"
                    }`}
                    title={
                      adminModeEnabled
                        ? "Modo Administrador Encendido - Clic para ir al Panel de Control"
                        : "Modo Administrador Apagado (Viendo la app como usuario normal)"
                    }
                  >
                    <Shield
                      className={`w-3.5 h-3.5 transition-colors ${
                        adminModeEnabled ? "text-dark-950 fill-dark-950/20" : "text-dark-400"
                      }`}
                    />
                    <span>ADMIN</span>
                  </Link>

                  {/* Switch Encendido / Apagado interactivo */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = toggleAdminMode();
                      if (!next && pathname.startsWith("/admin")) {
                        router.push("/");
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ml-0.5 sm:ml-1 ${
                      adminModeEnabled
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                        : "bg-dark-800 text-dark-400 hover:text-dark-200 border border-dark-700"
                    }`}
                    title={
                      adminModeEnabled
                        ? "Clic para APAGAR modo admin (ver app como usuario normal)"
                        : "Clic para ENCENDER modo admin (ver opciones de administrador)"
                    }
                  >
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        adminModeEnabled
                          ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                          : "bg-dark-500"
                      }`}
                    />
                    <span>{adminModeEnabled ? "ENCENDIDO" : "APAGADO"}</span>
                  </button>
                </div>

                {player && (
                  <button
                    type="button"
                    onClick={() => openFicha("view")}
                    className="hidden sm:inline-flex p-1 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer"
                    title="Ver tu perfil de jugador"
                  >
                    <PlayerAvatar
                      id={player.id}
                      playerId={player.id}
                      email={player.email}
                      photoUrl={headerPlayerPhoto}
                      firstName={player.first_name}
                      lastName={player.last_name}
                      category={player.category}
                      size="xs"
                      showCategoryBorder
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex p-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isNormalUser ? (
              /* CASO 2: Usuario Normal Logueado -> La FOTOGRAFÍA del usuario (haciendo click ingresa a ver y editar su perfil) */
              <div className="flex items-center bg-dark-900/90 border border-emerald-500/30 rounded-2xl p-1 shadow-md">
                <button
                  type="button"
                  onClick={() => openFicha("view")}
                  className="flex items-center gap-2 pl-1 pr-1.5 sm:pr-2.5 py-1 text-xs font-bold text-emerald-300 hover:text-white transition-all cursor-pointer group"
                  title="Hacer clic para ver y editar tu perfil"
                >
                  <div className="relative group-hover:scale-105 transition-transform flex-shrink-0">
                    <PlayerAvatar
                      id={player?.id}
                      playerId={player?.id}
                      email={player?.email}
                      photoUrl={headerPlayerPhoto}
                      firstName={player?.first_name || "Usuario"}
                      lastName={player?.last_name || ""}
                      category={player?.category}
                      size="sm"
                      showCategoryBorder
                    />
                  </div>
                  <div className="text-left hidden md:block">
                    <span className="text-white block font-bold leading-tight truncate max-w-[120px] group-hover:text-emerald-300 transition-colors">
                      {player ? `${player.first_name} ${player.last_name}` : "Mi Perfil"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold leading-none block mt-0.5">
                      {player?.category ? `${player.category} • ` : ""}Ver y Editar
                    </span>
                  </div>
                </button>

                <div className="hidden md:block h-5 w-px bg-dark-800 mx-1" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* CASO 3: Usuario DESCONOCIDO -> Botón INGRESAR en el header (visible en desktop y móvil) */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateProfile}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-dark-300 hover:text-white bg-dark-900/80 hover:bg-dark-800 border border-dark-800 transition-all cursor-pointer min-h-[36px]"
                  title="Crea tu perfil oficial de jugador"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Crear mi Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={openLogin}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-black rounded-xl text-dark-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer min-h-[36px]"
                  title="Ingresar con tu correo electrónico"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-dark-950" />
                  <span>INGRESAR</span>
                </button>
              </div>
            )}

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
            {/* Si es usuario conocido NO ADMIN -> Tarjeta con su foto y perfil (en lugar de admin) */}
            {/* 1. Si es ADMINISTRADOR -> Tarjeta de control ADMIN (Encendido / Apagado) */}
            {isAdministrator && (
              <div className="p-3.5 mb-2 rounded-xl bg-dark-900 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield className={`w-5 h-5 ${adminModeEnabled ? "text-emerald-400" : "text-dark-400"}`} />
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>BOTÓN ADMIN</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            adminModeEnabled
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-dark-800 text-dark-400 border border-dark-700"
                          }`}
                        >
                          {adminModeEnabled ? "ENCENDIDO" : "APAGADO"}
                        </span>
                      </div>
                      <div className="text-[11px] text-dark-400">
                        {adminModeEnabled
                          ? "Viendo la app con opciones de administrador"
                          : "Viendo la app como usuario normal"}
                      </div>
                    </div>
                  </div>

                  {/* Switch para alternar */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = toggleAdminMode();
                      if (!next && pathname.startsWith("/admin")) {
                        router.push("/");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                      adminModeEnabled
                        ? "bg-emerald-500 text-dark-950 shadow-md shadow-emerald-500/30"
                        : "bg-dark-800 text-dark-300 border border-dark-700"
                    }`}
                  >
                    {adminModeEnabled ? "Apagar" : "Encender"}
                  </button>
                </div>

                {adminModeEnabled && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Ir al Panel Administrador</span>
                  </Link>
                )}
              </div>
            )}

            {/* 2. Si es USUARIO NORMAL -> Tarjeta con su FOTOGRAFÍA (haciendo click ingresa a ver y editar su perfil) */}
            {isNormalUser && (
              <div className="p-3 mb-2 rounded-xl bg-gradient-to-r from-emerald-950/70 to-dark-900 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openFicha("view");
                  }}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <PlayerAvatar
                    id={player?.id}
                    playerId={player?.id}
                    email={player?.email}
                    photoUrl={headerPlayerPhoto}
                    firstName={player?.first_name || "Usuario"}
                    lastName={player?.last_name || ""}
                    category={player?.category}
                    size="md"
                    showCategoryBorder
                  />
                  <div className="truncate">
                    <div className="text-sm font-bold text-white leading-tight truncate">
                      {player ? `${player.first_name} ${player.last_name}` : "Mi Perfil"}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {player?.category ? `${player.category} • ` : ""}Ver y Editar Perfil
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openFicha("view");
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                  >
                    Ver / Editar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await handleLogout();
                    }}
                    className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 active:scale-95 transition-all cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 3. Si es usuario DESCONOCIDO -> Botón INGRESAR e invitación a crear perfil */}
            {isUnknown && (
              <div className="space-y-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openLogin();
                  }}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 font-black flex items-center justify-between text-left active:scale-98 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-dark-950/20 flex items-center justify-center text-dark-950">
                      <LogIn className="w-5 h-5 text-dark-950" />
                    </div>
                    <div>
                      <div className="text-sm font-black">INGRESAR</div>
                      <div className="text-[11px] font-semibold text-dark-900">Ingresa tu email para acceder</div>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-lg bg-dark-950 text-emerald-400 font-bold">
                    Entrar
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openCreateProfile();
                  }}
                  className="w-full p-3 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between text-left active:scale-98 transition-all cursor-pointer text-dark-300 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold">¿Nuevo jugador? Crear mi Perfil</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold">Crear →</span>
                </button>
              </div>
            )}

            {/* Enlaces de navegación */}
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

            {/* Opción Jugadores en menú móvil: Solo visible en modo administrador */}
            {isAdmin && (
              <Link
                href="/admin/jugadores"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold min-h-[48px] text-dark-300 hover:text-white hover:bg-dark-900 transition-all text-left"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Jugadores</span>
              </Link>
            )}

            {/* SOLO SI ES ADMIN: Panel Administrador */}
            {isAdmin && (
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
            )}

            {/* Opción Cerrar Sesión en Menú Móvil */}
            {isUserLoggedIn && (
              <div className="pt-2 border-t border-dark-800">
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold min-h-[48px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-98 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Cerrar Sesión</span>
                  </div>
                  <span className="text-[11px] text-rose-400/80 font-mono truncate max-w-[150px]">
                    {player?.email || user?.email || loggedEmail}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
