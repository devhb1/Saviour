import type { ReactNode } from "react";
import Link from "next/link";

/** Light server chrome — no nested ThemeProvider. */
export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header
        style={{
          borderBottom: "1px solid var(--stroke, #2a3038)",
          padding: "12px 20px",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <Link href="/" style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
          saviours
        </Link>
        <Link href="/audit" style={{ color: "inherit", textDecoration: "none" }}>
          /audit
        </Link>
        <Link href="/review" style={{ color: "var(--signal, #4c8dff)", textDecoration: "none" }}>
          /review
        </Link>
        <Link href="/legacy/v1" style={{ color: "var(--ink-muted, #8b919a)", textDecoration: "none", marginLeft: "auto", fontSize: 11 }}>
          /legacy/v1
        </Link>
      </header>
      {children}
    </div>
  );
}
