import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SplashScreen from "./components/SplashScreen";
import KillOldServiceWorker from "./components/KillOldServiceWorker";
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
  title: { default: "ROTA29 | Discipulado no cotidiano", template: "%s | ROTA29" },
  description: "ROTA29 — formação cristã para a vida real. Discipulado no cotidiano.",
  applicationName: "ROTA29",
  icons: { icon: "/brand/rota29-icon.svg", shortcut: "/brand/rota29-icon.svg", apple: "/brand/rota29-icon.svg" },
  openGraph: { title: "ROTA29", siteName: "ROTA29", description: "Discipulado no cotidiano", type: "website" },
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
        <KillOldServiceWorker />
        <PilotActivity />
        <SplashScreen />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
