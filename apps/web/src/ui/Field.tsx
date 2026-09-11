"use client";

import { forwardRef, type CSSProperties, type InputHTMLAttributes } from "react";

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { style?: CSSProperties }
>(function Field({ style, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className="field-focus"
      spellCheck={false}
      style={{
        width: "100%",
        padding: "12px 14px",
        border: "1px solid var(--line-mid)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-inset)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--tx-hi)",
        outline: "none",
        ...style,
      }}
      {...rest}
    />
  );
});
