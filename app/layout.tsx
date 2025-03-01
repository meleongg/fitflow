import { Geist } from "next/font/google";
import Head from "next/head";
import "./globals.css";
import { Providers } from "./providers";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Fitflow",
  description: "The fastest way to add order to your workouts",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["nextjs", "next14", "pwa", "next-pwa"],
  icons: [
    {
      rel: "apple-touch-icon",
      url: "web-app-manifest-192x192.png",
    },
    {
      rel: "icon",
      url: "web-app-manifest-192x192.png",
    },
  ],
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <Head>
        <meta name="apple-mobile-web-app-title" content="Fitflow" />
      </Head>
      <body className="bg-background text-foreground">
        <Providers>
          <main className="min-h-screen flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
