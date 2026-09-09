/**
 * JSON fetch that fails closed on HTML/error pages (avoids "Unexpected token '<'").
 */

export class FetchJsonError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly contentType: string | null,
  ) {
    super(message);
    this.name = "FetchJsonError";
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type");
  const raw = await res.text();

  const looksJson =
    (contentType && contentType.includes("application/json")) ||
    raw.trimStart().startsWith("{") ||
    raw.trimStart().startsWith("[");

  if (!looksJson) {
    const snippet = raw.trim().slice(0, 80).replace(/\s+/g, " ");
    throw new FetchJsonError(
      `Expected JSON from ${typeof input === "string" ? input : "request"} (HTTP ${res.status}${contentType ? `, ${contentType}` : ""})${snippet ? `: ${snippet}` : ""}`,
      res.status,
      contentType,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new FetchJsonError(
      `Invalid JSON (HTTP ${res.status})`,
      res.status,
      contentType,
    );
  }

  if (!res.ok) {
    const errMsg =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `HTTP ${res.status}`;
    throw new FetchJsonError(errMsg, res.status, contentType);
  }

  return parsed as T;
}
