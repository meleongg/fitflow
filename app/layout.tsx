import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/contexts/SessionContext";
import { NextUIProvider } from "@nextui-org/react";
import { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#D2B48C",
};

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "FitFlow - Fitness Tracking App",
  description: "Track your workouts and fitness progress",
  manifest: "/manifest.json",
  keywords: ["nextjs", "next14", "pwa", "next-pwa"],
  applicationName: "FitFlow",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FitFlow",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192x192.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <NextUIProvider>
            <Providers>
              <SessionProvider>
                <main className="min-h-screen flex flex-col justify-center align-centre">
                  {children}
                </main>
              </SessionProvider>
            </Providers>
            <Toaster position="top-center" richColors />
          </NextUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
