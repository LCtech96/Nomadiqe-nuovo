import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { FCMProvider } from "@/components/fcm-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nomadiqe BETA - Soggiorni Più Equi, Connessioni Più Profonde",
  description: "Piattaforma di viaggio che connette Traveler, Host, Creator e Jolly",
  icons: {
    icon: [
      { url: "/publicicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/publicicon.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.className} scroll-smooth`}>
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <FCMProvider>
              <Navbar />
              <main className="pb-16 md:pb-0">{children}</main>
              <BottomNav />
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </FCMProvider>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
