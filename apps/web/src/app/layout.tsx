import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "saviour · security memory for agents",
  description:
    "Investigate once on The Graph. Name on ENSv2. Next agent resolves 0 Graph · 0 AI — Shield, cast, MCP, or Bazantic. Named by evidence, never by opinion.",
  icons: {
    icon: [{ url: "/brand/saviour-mark.png", type: "image/png" }],
    apple: [{ url: "/brand/saviour-mark.png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} data-theme="signal">
      <body>{children}</body>
    </html>
  );
}
