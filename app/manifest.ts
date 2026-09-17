import type { MetadataRoute } from "next";

// PWA manifest set up from day one (PRD §3) so users can Add to Homescreen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Duluin Invoice",
    short_name: "Invoice",
    description:
      "Invoicing and financial record-keeping for businesses — sales, purchases, and financial reports.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbfbfa",
    theme_color: "#0f172a",
    orientation: "any",
    lang: "en",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
