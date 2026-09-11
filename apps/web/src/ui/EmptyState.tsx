"use client";

import type { CSSProperties, ReactNode } from "react";

export function EmptyState({
  title,
  children,
  style,
}: {
  title: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="empty-state" role="status" style={style}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Skeleton({
  height = 14,
  width = "100%",
  style,
}: {
  height?: number | string;
  width?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      aria-hidden
      style={{
        height,
        width,
        ...style,
      }}
    />
  );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div
      style={{ display: "grid", gap: 8, marginTop: 12 }}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={12} width={i === rows - 1 ? "72%" : "100%"} />
      ))}
    </div>
  );
}
