import type { Metadata } from "next";
import { LegacyV1App } from "../../../legacy/v1/LegacyApp";

export const metadata: Metadata = {
  title: "Legacy v1 · snapshot 4e78cad",
  description:
    "Frozen Saviours product at commit 4e78cadd3b87988439f68acdf8d7887bcdfbf7ab — investigate once, resolve free.",
  robots: { index: false, follow: false },
};

/**
 * Ghost archive of commit 4e78cad (2026-09-13):
 * Hook / Loop / Registry · security memory for AI agents.
 * Primary Control-Path product remains at /.
 */
export default function LegacyV1Home() {
  return <LegacyV1App />;
}
