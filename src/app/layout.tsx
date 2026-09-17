import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import Header from "@/components/layout/Header";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallButton from "@/components/pwa/InstallButton";

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
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-dark-700 bg-dark-900 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 bg-dark-950 flex items-center justify-center shadow-sm">
                <Image
                  src="/logo-emblem.png"
                  alt="SPT Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold tracking-tight leading-tight">
                  Saladillo Padel Tour
                </span>
                <span className="text-dark-500 text-[10px] uppercase font-semibold tracking-wider">
                  Circuito Oficial
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <InstallButton />
              <span className="text-dark-500 text-xs">
                &copy; {new Date().getFullYear()} SPT
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
