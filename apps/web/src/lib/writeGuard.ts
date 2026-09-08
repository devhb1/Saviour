import { NextResponse } from "next/server";

/**
 * Write gate for persist / govern mutations.
 *
 * Kill-switch:
 * - SAVIOURS_ALLOW_WRITES=0|false → always 401
 * - Production + unset → fail-closed 401 (must set =1 explicitly to write)
 * - Development + unset → open (local film / pnpm dev)
 *
 * Optional token:
 * - SAVIOURS_WRITE_TOKEN set → require header `x-saviours-write-token`
 *
 * Film/staging production host: SAVIOURS_ALLOW_WRITES=1 (+ NEXT_PUBLIC_…=1).
 * Public demo: leave unset in production (denied) or set =0.
 */
function writesExplicitlyDenied(raw: string | undefined): boolean {
  return raw === "0" || raw === "false" || raw === "FALSE";
}

function writesExplicitlyAllowed(raw: string | undefined): boolean {
  return raw === "1" || raw === "true" || raw === "TRUE";
}

export function assertWriteAllowed(request: Request): NextResponse | null {
  const allow = process.env.SAVIOURS_ALLOW_WRITES;
  if (writesExplicitlyDenied(allow)) {
    return NextResponse.json(
      {
        error:
          "Writes disabled (SAVIOURS_ALLOW_WRITES=0). Read-only / Shield still work.",
      },
      { status: 401 },
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !writesExplicitlyAllowed(allow)) {
    return NextResponse.json(
      {
        error:
          "Writes disabled in production (set SAVIOURS_ALLOW_WRITES=1 to enable Remember/Govern).",
      },
      { status: 401 },
    );
  }

  const expected = process.env.SAVIOURS_WRITE_TOKEN?.trim();
  if (!expected) return null;

  const got = request.headers.get("x-saviours-write-token")?.trim();
  if (got && got === expected) return null;

  return NextResponse.json(
    {
      error:
        "Write token required. Set header x-saviours-write-token (or unset SAVIOURS_WRITE_TOKEN for open local demo).",
    },
    { status: 401 },
  );
}

/**
 * Browser: whether Investigate should attempt Remember (persist).
 *
 * - NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES=0 → false
 * - Production + unset → false (fail-closed)
 * - Development + unset → true (local film)
 * - Production film host: NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES=1
 */
export function clientWritesAllowed(): boolean {
  const allow = process.env.NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES;
  if (writesExplicitlyDenied(allow)) return false;
  if (writesExplicitlyAllowed(allow)) return true;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}

/** Browser-side optional token (only if operator sets NEXT_PUBLIC_* for a hosted demo). */
export function writeHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...extra,
  };
  const token = process.env.NEXT_PUBLIC_SAVIOURS_WRITE_TOKEN?.trim();
  if (token) headers["x-saviours-write-token"] = token;
  return headers;
}
