import type { Metadata } from "next";
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
  title: "saviour · public security memory for AI agents and wallets",
  description:
    "Investigate an address once with The Graph. Name the verdict on ENS forever. Every agent after you resolves it for $0. Named by evidence, never by opinion.",
  metadataBase: new URL("https://www.saviours.xyz"),
  openGraph: {
    title: "saviour · public security memory",
    description:
      "Investigate once. Name the verdict on ENS. Every agent after you resolves it for $0.",
    url: "https://www.saviours.xyz",
    siteName: "saviours",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "saviour · BLOCK / TAINTED · $0 memory" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "saviour · public security memory",
    description:
      "Investigate once. Name the verdict on ENS. Every agent after you resolves it for $0.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
      <head>
        {/* Paints the stored theme before first frame — no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
