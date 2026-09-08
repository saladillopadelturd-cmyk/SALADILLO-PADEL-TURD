import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  manifest: "/manifest.json",
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
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">SPT</span>
              </div>
              <span className="text-dark-400 text-sm">
                Saladillo Padel Tour
              </span>
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
