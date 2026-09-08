/**
 * Confidence is stored two ways in the product:
 * - Assessment / validator: unit interval 0–1
 * - ENS `saviours.confidence` text: integer percent 0–100
 *
 * UI must never `* 100` an already-percent value (that produced 9200%).
 */

/** Normalize any inbound number to unit interval 0–1. */
export function confidenceToUnit(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw > 1) return Math.max(0, Math.min(1, raw / 100));
  return Math.max(0, Math.min(1, raw));
}

/** Integer percent 0–100 for ENS text / display. */
export function confidenceToPct(raw: number): number {
  return Math.round(confidenceToUnit(raw) * 100);
}

/** UI label e.g. "92%". */
export function formatConfidencePct(raw: number | null | undefined): string {
  if (raw == null || !Number.isFinite(raw)) return "—";
  return `${confidenceToPct(raw)}%`;
}
