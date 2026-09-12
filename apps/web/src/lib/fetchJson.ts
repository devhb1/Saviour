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
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 45_000;
  const { timeoutMs: _drop, signal: userSignal, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (userSignal) {
    if (userSignal.aborted) controller.abort();
    else
      userSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
  }
  let res: Response;
  try {
    res = await fetch(input, { ...rest, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new FetchJsonError(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s — Sepolia RPC may be rate-limited, or the local server is down. Retry once; on www.saviours.xyz writes stay fail-closed (401).`,
        408,
        null,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
