import { NextResponse } from "next/server";

/**
 * Optional write gate for persist / govern mutations.
 *
 * - Unset SAVIOURS_WRITE_TOKEN → open (local demo).
 * - Set SAVIOURS_WRITE_TOKEN → require header `x-saviours-write-token`.
 * - SAVIOURS_ALLOW_WRITES=0|false → hard kill-switch (401 always).
 */
export function assertWriteAllowed(request: Request): NextResponse | null {
  const allow = process.env.SAVIOURS_ALLOW_WRITES;
  if (allow === "0" || allow === "false" || allow === "FALSE") {
    return NextResponse.json(
      {
        error:
          "Writes disabled (SAVIOURS_ALLOW_WRITES=0). Read-only / Shield still work.",
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
 * Public hosts set NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES=0 so Check still works.
 */
export function clientWritesAllowed(): boolean {
  const allow = process.env.NEXT_PUBLIC_SAVIOURS_ALLOW_WRITES;
  if (allow === "0" || allow === "false" || allow === "FALSE") return false;
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
