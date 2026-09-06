import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAVIOURS",
  description: "Security memory for autonomous agents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
