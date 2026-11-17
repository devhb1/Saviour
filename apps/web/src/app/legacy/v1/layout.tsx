import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Server-only archive chrome — no client banner (avoids hydration mismatch).
 * Snapshot marker: commit 4e78cad.
 */
export default function LegacyV1Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        role="status"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#141414",
          borderBottom: "1px solid #2a2a2a",
          color: "#a8a8a8",
          fontSize: 12,
          padding: "8px 16px",
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: "#d0d0d0" }}>/legacy/v1</strong>
        {" — "}
        frozen at{" "}
        <code style={{ fontSize: 11 }}>4e78cadd3b87988439f68acdf8d7887bcdfbf7ab</code>
        {" · investigate once / resolve free · "}
        <Link href="/" style={{ color: "#7dd3a7" }}>
          back to saviours.xyz
        </Link>
      </div>
      {children}
    </>
  );
}
