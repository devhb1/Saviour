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
  icons: {
    icon: [{ url: "/brand/saviour-mark.png", type: "image/png" }],
    apple: [{ url: "/brand/saviour-mark.png" }],
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
