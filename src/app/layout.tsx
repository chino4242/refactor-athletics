import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

import TopHeader from "@/components/layout/TopHeader";
import MobileNav from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/context/ThemeContext";
import { ExperienceModeProvider } from "@/context/ExperienceModeContext";
import { VisualModeProvider } from "@/context/VisualModeContext";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ui/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import TimezoneSync from "@/components/TimezoneSync";
import OfflineBanner from "@/components/OfflineBanner";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Refactor Athletics",
  description: "Track workouts, macros, and habits — earn XP, climb ranks, and compete with friends.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Refactor",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981",
};

import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTheme = 'athlete';
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('selected_theme').eq('id', user.id).single();
      if (data?.selected_theme) initialTheme = data.selected_theme;
    }
  } catch {}

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased selection:bg-orange-500/30`}
        suppressHydrationWarning
      >
        <ThemeProvider initialTheme={initialTheme}>
          <ExperienceModeProvider>
          <VisualModeProvider>
          <ToastProvider>
            <ServiceWorkerRegistration />
            <TimezoneSync />
            <OfflineBanner />
            <AuthGuard />
            <div className="min-h-screen bg-[#0a0a12] text-zinc-200 pb-28 md:pb-0 font-sans pt-safe">
              <div className="max-w-4xl mx-auto p-4 md:p-6">
                <TopHeader />
                <main className="animate-fade-in">
                  {children}
                </main>
              </div>
              <MobileNav />
            </div>
            <ToastContainer />
          </ToastProvider>
          </VisualModeProvider>
          </ExperienceModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
