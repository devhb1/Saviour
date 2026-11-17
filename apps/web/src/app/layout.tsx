import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "../lib/theme";

/** Instrument, not essay: technical display face over a neutral body workhorse. */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "saviours · Control-Path Auditor",
    template: "%s · saviours",
  },
  description:
    "Before a DAO executes a proposal, know who gains power over its treasury. Audit Safe Delay/modules. Review Privilege Diff. Signer decides.",
  metadataBase: new URL("https://www.saviours.xyz"),
  openGraph: {
    title: "saviours · Control-Path Auditor",
    description:
      "Audit Safe control paths. Review Privilege Diff before you authorize. Signer decides.",
    url: "https://www.saviours.xyz",
    siteName: "saviours",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "saviours · Control-Path Auditor",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "saviours · Control-Path Auditor",
    description:
      "Audit Safe control paths. Review Privilege Diff before you authorize. Signer decides.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=5", type: "image/svg+xml" },
      { url: "/favicon.png?v=5", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico?v=5" },
      { url: "/icon-512.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=4", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <body>
        {/* beforeInteractive: paints stored theme before first paint — no flash. */}
        <Script
          id="saviours-theme-bootstrap"
          strategy="beforeInteractive"
        >
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
