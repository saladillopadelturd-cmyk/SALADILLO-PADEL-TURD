"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Si ya está instalado en modo standalone, no mostrar botones ni banners
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone)
    ) {
      return;
    }

    const handler = (e: Event) => {
      // Prevenir el mini-infobar predeterminado para controlarlo desde la UI
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("Error triggering install prompt:", err);
    }
  };

  if (!isInstallable) return null;

  return (
    <>
      {/* Botón estándar para footer */}
      <button
        onClick={handleInstall}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-lime-500 text-dark-950 text-xs font-black rounded-xl hover:from-emerald-400 hover:to-lime-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar App
      </button>

      {/* Banner flotante en móviles para promover la instalación en 1 tap */}
      {!bannerDismissed && (
        <div className="fixed bottom-4 left-3 right-3 z-50 sm:hidden bg-dark-900/95 backdrop-blur-xl border border-emerald-500/40 p-3 rounded-2xl shadow-2xl shadow-emerald-500/15 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-emerald-500 to-lime-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
              <span className="text-dark-950 font-black text-xs">SPT</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Instalar Saladillo Padel Tour</p>
              <p className="text-[10px] text-dark-400 truncate">Accedé al instante desde tu celular</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-emerald-500 text-dark-950 text-xs font-black rounded-xl hover:bg-emerald-400 active:scale-95 transition-transform cursor-pointer"
            >
              Instalar
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1.5 text-dark-400 hover:text-white rounded-lg cursor-pointer"
              title="Cerrar banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
