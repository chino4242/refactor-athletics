import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import TopHeader from "@/components/layout/TopHeader";
import MobileNav from "@/components/layout/MobileNav";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import ToastContainer from "@/components/ui/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Refactor Athletics",
  description: "Modern fitness tracking and arena duels.",
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
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-orange-500/30`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ServiceWorkerRegistration />
            <InstallPrompt />
            <div className="min-h-screen bg-zinc-950 text-zinc-200 pb-24 md:pb-0 font-sans">
              <div className="max-w-4xl mx-auto p-4 md:p-6">
                <TopHeader />
                <main>
                  {children}
                </main>
              </div>
              <MobileNav />
            </div>
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
