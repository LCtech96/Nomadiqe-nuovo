import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/dashbord/",
          "/admin-panel",
          "/auth/verify-email",
          "/auth/verify-email-second",
          "/auth/reset-password",
          "/auth/reset-password-verify",
          "/onboarding",
          "/profile", // profilo utente loggato (lista)
          "/messages",
          "/cleanup-sw",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/dashbord/",
          "/admin-panel",
          "/auth/",
          "/onboarding",
          "/profile",
          "/messages",
          "/cleanup-sw",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
