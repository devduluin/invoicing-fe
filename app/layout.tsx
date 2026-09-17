import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import ToastProvider from "@/components/providers/ToastProvider";
import AuthInitializer from "@/components/auth/AuthInitializer";
import { isPublicProduction, SITE_URL } from "@/utils/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Duluin Invoice",
    template: "%s | Duluin Invoice",
  },
  description:
    "Invoicing and financial record-keeping for businesses — sales, purchases, and standard accounting financial reports.",
  applicationName: "Duluin Invoice",
  manifest: "/manifest.webmanifest",
  robots: isPublicProduction()
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#6b8fff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <AuthInitializer />
        </Suspense>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
