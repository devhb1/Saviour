import type {
  CoverageComponent,
  CoverageComponentId,
  CoverageComponentStatus,
  CoverageGap,
  CoverageReport,
} from "./types.js";

export function component(
  id: CoverageComponentId,
  status: CoverageComponentStatus,
  detail?: string,
): CoverageComponent {
  return detail ? { id, status, detail } : { id, status };
}

/**
 * Build Coverage report. `complete` is true only when every component that
 * applies is `assessed` — Roles-only assessed never makes the Safe "complete".
 */
export function buildCoverageReport(opts: {
  components: CoverageComponent[];
  gaps: CoverageGap[];
  reconstructed: string[];
  errors: string[];
}): CoverageReport {
  const inScope = opts.components.filter((c) => c.status !== "unsupported");
  const allAssessed =
    inScope.length > 0 &&
    inScope.every((c) => c.status === "assessed") &&
    opts.errors.length === 0 &&
    opts.gaps.length === 0;
  return {
    complete: allAssessed,
    components: opts.components,
    gaps: opts.gaps,
    reconstructed: opts.reconstructed,
  };
}
