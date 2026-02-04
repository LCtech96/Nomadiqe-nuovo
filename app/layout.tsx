import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { FCMProvider } from "@/components/fcm-provider";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";
import SupportButton from "@/components/support-button";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_LONG,
  SITE_SOCIAL_LINKS,
  SITE_KEYWORDS,
} from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/explore?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/publicicon.png`,
  description: SITE_DESCRIPTION_LONG,
  sameAs: SITE_SOCIAL_LINKS,
  contactPoint: {
    "@type": "ContactPoint",
    url: SITE_URL,
    contactType: "customer service",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} BETA - Influencer per Strutture, KOL&BED e Servizi`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Influencer per Strutture, KOL&BED e Servizi`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/publicicon.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Influencer per Strutture, KOL&BED e Servizi`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/publicicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/publicicon.png", type: "image/png" }],
  },
  manifest: "/manifest.json",
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.className} scroll-smooth`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
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
              <SupportButton />
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
