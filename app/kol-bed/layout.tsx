import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const KOL_BED_TITLE = `KOL&BED - Influencer per Strutture | ${SITE_NAME}`;
const KOL_BED_DESCRIPTION =
  "KOL&BED: trova l'influencer più adatto a promuovere la tua struttura o l'host ideale per le tue collaborazioni. Marketplace di servizi per strutture: pulizie, fotografia, trasferimenti.";

export const metadata: Metadata = {
  title: KOL_BED_TITLE,
  description: KOL_BED_DESCRIPTION,
  openGraph: {
    title: KOL_BED_TITLE,
    description: KOL_BED_DESCRIPTION,
    url: `${SITE_URL}/kol-bed`,
  },
  alternates: { canonical: `${SITE_URL}/kol-bed` },
};

export default function KOLBedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
