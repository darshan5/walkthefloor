import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const Toaster = dynamic(() => import("sonner").then((m) => ({ default: m.Toaster })), { ssr: false });
const ServiceWorkerRegister = dynamic(() => import("@/components/layout/sw-register").then((m) => ({ default: m.ServiceWorkerRegister })), { ssr: false });
const OfflineIndicator = dynamic(() => import("@/components/layout/offline-indicator").then((m) => ({ default: m.OfflineIndicator })), { ssr: false });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WalkTheFloor",
    template: "%s | WalkTheFloor",
  },
  description: "Restaurant operations platform — checklists, audits, maintenance, guest service",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors />
        <ServiceWorkerRegister />
        <OfflineIndicator />
      </body>
    </html>
  );
}
