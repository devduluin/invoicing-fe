import type { MetadataRoute } from "next";
import { isPublicProduction, SITE_URL } from "@/utils/env";

export default function robots(): MetadataRoute.Robots {
  if (!isPublicProduction()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
