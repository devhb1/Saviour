"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

const TERM_SAFE = "0x46DA347d1Db6EdCA62BF6Cd5892Dc284fC938613";

export { TERM_SAFE };

export type ProductActive =
  | "home"
  | "review"
  | "audit"
  | "vision"
  | "watch"
  | "queues";

/**
 * Instrument-paper chrome for Control-Path surfaces.
 * Daylight reading surface; ThemeToggle for Signal Room.
 */
export function ProductChrome({
  active,
  children,
  prototype,
}: {
  active: ProductActive;
  children: ReactNode;
  /** Show Prototype badge in chrome (Watch / Queues). */
  prototype?: boolean;
}) {
  return (
    <ThemeProvider>
      <div className="cp-root" style={{ minHeight: "100vh" }}>
        <header className="cp-chrome">
          <Link href="/" className="cp-brand">
            saviours
          </Link>
          <nav className="cp-nav" aria-label="Primary">
            <NavLink href="/" label="Home" current={active === "home"} />
            <NavLink
              href="/audit"
              label="Audit"
              current={active === "audit"}
            />
            <NavLink
              href="/review"
              label="Review"
              current={active === "review"}
            />
            <NavLink
              href="/vision"
              label="Vision"
              current={active === "vision"}
            />
          </nav>
          <div className="cp-chrome-end">
            {prototype ? (
              <span className="cp-proto-badge" title="Not durable monitoring">
                Prototype
              </span>
            ) : null}
            <ThemeToggle compact />
            <Link href="/legacy/v1" className="cp-archive">
              Archive
            </Link>
          </div>
        </header>
        {children}
      </div>
    </ThemeProvider>
  );
}

function NavLink({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      className="cp-nav-link"
      data-active={current ? "true" : "false"}
      aria-current={current ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
