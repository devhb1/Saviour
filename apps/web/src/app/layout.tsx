import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
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
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} data-theme="modular">
      <body>{children}</body>
    </html>
  );
}
