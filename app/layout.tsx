import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SplashScreen from "./components/SplashScreen";
import AdminTestBar from "./components/AdminTestBar";
import RegisterPWA from "./components/RegisterPWA";
import PilotActivity from "./components/PilotActivity";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rota29-piloto.vercel.app"),
  title: { default: "ROTA29 | Discipulado no cotidiano", template: "%s | ROTA29" },
  description: "ROTA29 — formação cristã para a vida real. Discipulado no cotidiano.",
  applicationName: "ROTA29",
  icons: { icon: "/brand/rota29-icon.svg", shortcut: "/brand/rota29-icon.svg", apple: "/pwa-icon-180.png" },
  openGraph: {
    type: "website", locale: "pt_BR",
    title: "ROTA29 — Discipulado no cotidiano",
    description: "A jornada de discipulado continua. Conheça o ROTA29.",
    url: "https://rota29-piloto.vercel.app", siteName: "ROTA29",
    images: [{ url: "/opengraph-image", width: 1200, height: 630,
      alt: "Logo ROTA29 — Discipulado no cotidiano" }],
  },
  twitter: { card: "summary_large_image",
    title: "ROTA29 — Discipulado no cotidiano",
    images: ["/opengraph-image"] },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ROTA29",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F3D33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-black text-white">
        <RegisterPWA />
        <PilotActivity />
        <SplashScreen />
        <ThemeProvider><AdminTestBar />{children}</ThemeProvider>
      </body>
    </html>
  );
}
