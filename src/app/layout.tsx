import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import Header from "@/components/layout/Header";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallButton from "@/components/pwa/InstallButton";
import { PlayerIdentityProvider } from "@/context/PlayerIdentityContext";
import PlayerFichaModal from "@/components/player/PlayerFichaModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPT - Saladillo Padel Tour",
  description:
    "Gestión de torneos de pádel - Saladillo Padel Tour. Consulta torneos, rankings, zonas y cuadros de eliminación en tiempo real.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192x192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPT",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dark-950 text-dark-200">
        <ServiceWorkerRegister />
        <PlayerIdentityProvider>
          <Header />
          <PlayerFichaModal />
          <main className="flex-1">{children}</main>
        </PlayerIdentityProvider>
        <InstallButton />
        <footer className="border-t border-dark-800 bg-dark-900/90 py-2 sm:py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="relative h-6 sm:h-7 w-auto flex items-center justify-start">
                <Image
                  src="/LOGOSPT.png"
                  alt="Saladillo Padel Tour"
                  width={100}
                  height={28}
                  className="h-6 sm:h-7 w-auto object-contain"
                />
              </div>
            </div>
            <div className="text-right leading-tight">
              <span className="block text-xs sm:text-sm font-semibold text-white">
                Matias Vidal
              </span>
              <span className="block text-[10px] sm:text-xs text-dark-400">
                desarrollo de software
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
