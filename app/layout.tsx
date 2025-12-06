import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nomadiqe - Soggiorni Più Equi, Connessioni Più Profonde",
  description: "Piattaforma di viaggio che connette Traveler, Host, Creator e Manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="pb-16 md:pb-0">{children}</main>
          <BottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
