"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "-0.005em",
  transition: "transform var(--fast) var(--ease), background var(--fast) var(--ease), border-color var(--fast) var(--ease)",
};

const sizes: Record<Size, CSSProperties> = {
  sm: { padding: "6px 10px", fontSize: 12, borderRadius: "var(--r-sm)" },
  md: { padding: "11px 18px", fontSize: 14, borderRadius: "var(--radius-chip)" },
  lg: { padding: "14px 22px", fontSize: 15, borderRadius: "var(--r-md)" },
};

const variants: Record<Variant, CSSProperties> = {
  primary: {
    border: "1px solid transparent",
    background: "var(--tx-hi)",
    color: "var(--bg-void)",
    boxShadow: "var(--lift)",
  },
  ghost: {
    border: "1px solid var(--line-mid)",
    background: "var(--bg-high)",
    color: "var(--tx)",
  },
  quiet: {
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--tx-lo)",
  },
  danger: {
    border: "1px solid var(--red-line)",
    background: "var(--red-wash)",
    color: "var(--red)",
  },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  style,
  disabled,
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={variant === "primary" ? `btn-primary-motion ${className ?? ""}` : className}
      style={{
        ...base,
        ...sizes[size],
        ...variants[variant],
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
