"use client";

import type { ReactNode } from "react";

/**
 * Two-zone Case dashboard: left = verdict story, right = sticky trust rail.
 * Right rail uses an opaque surface so scroll content never bleeds through Ask/passport.
 */
export function CaseLayout({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="case-layout">
      <style>{`
        .case-layout {
          display: grid;
          gap: 24px;
          align-items: start;
          width: 100%;
        }
        .case-layout__left,
        .case-layout__right {
          min-width: 0;
          max-width: 100%;
          overflow-x: clip;
        }
        .case-layout__right {
          display: flex;
          flex-direction: column;
          gap: 16px;
          isolation: isolate;
          z-index: 2;
          padding: 12px;
          border-radius: var(--r-md);
          background: var(--bg-raise);
          border: 1px solid var(--line);
          box-shadow: var(--edge);
        }
        @media (min-width: 768px) {
          .case-layout {
            grid-template-columns: repeat(12, minmax(0, 1fr));
          }
          .case-layout__left { grid-column: span 8; }
          .case-layout__right { grid-column: span 4; }
        }
        @media (min-width: 1024px) {
          .case-layout__left { grid-column: span 7; }
          .case-layout__right {
            grid-column: span 5;
            position: sticky;
            top: 24px;
            align-self: start;
            max-height: calc(100vh - 48px);
            overflow-y: auto;
            overflow-x: hidden;
          }
        }
      `}</style>
      <div className="case-layout__left">{left}</div>
      <aside className="case-layout__right">{right}</aside>
    </div>
  );
}
