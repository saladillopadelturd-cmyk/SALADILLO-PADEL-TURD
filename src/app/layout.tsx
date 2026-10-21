import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import Header from "@/components/layout/Header";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import InstallButton from "@/components/pwa/InstallButton";
import { PlayerIdentityProvider } from "@/context/PlayerIdentityContext";
import PlayerFichaModal from "@/components/player/PlayerFichaModal";
import { getSiteUrl } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Saladillo Padel Tour (SPT) | Circuito Oficial de Pádel",
    template: "%s | Saladillo Padel Tour (SPT)",
  },
  description:
    "Circuito oficial Saladillo Padel Tour (SPT). Fixtures en vivo, zonas, llaves de playoffs, resultados en tiempo real y rankings oficiales de pádel en Saladillo.",
  keywords: [
    "Saladillo Padel Tour",
    "SPT",
    "Padel Saladillo",
    "torneos de padel",
    "ranking padel saladillo",
    "fixture padel",
    "resultados padel en vivo",
    "circuito oficial de padel",
    "padel buenos aires",
    "torneo americano padel",
    "super tie break",
  ],
  authors: [{ name: "Saladillo Padel Tour", url: siteUrl }],
  creator: "Saladillo Padel Tour",
  publisher: "Saladillo Padel Tour",
  applicationName: "Saladillo Padel Tour",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "Saladillo Padel Tour",
    title: "Saladillo Padel Tour (SPT) | Circuito Oficial de Pádel",
    description:
      "Consulta los torneos oficiales, tablas de zonas, cruces de playoffs y rankings individuales y por parejas en tiempo real.",
    images: [
      {
        url: "/assets/fondos/flyer_oficial_spt.png",
        width: 1200,
        height: 630,
        alt: "Saladillo Padel Tour - Circuito Oficial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saladillo Padel Tour (SPT) | Circuito Oficial de Pádel",
    description:
      "Torneos, zonas, cruces de playoffs y rankings actualizados del circuito oficial de pádel en Saladillo.",
    images: ["/assets/fondos/flyer_oficial_spt.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Saladillo Padel Tour",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SportsOrganization",
      "@id": `${siteUrl}/#organization`,
      name: "Saladillo Padel Tour",
      alternateName: "SPT",
      url: siteUrl,
      logo: `${siteUrl}/LOGOSPT.png`,
      image: `${siteUrl}/assets/fondos/flyer_oficial_spt.png`,
      sport: "Pádel",
      description: "Circuito y torneos oficiales de pádel en Saladillo, Provincia de Buenos Aires.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Saladillo",
        addressRegion: "Buenos Aires",
        addressCountry: "AR",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Saladillo Padel Tour",
      description: "Gestión oficial de torneos, rankings y resultados de pádel en vivo",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      inLanguage: "es-AR",
    },
  ],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
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
