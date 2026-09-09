"use client";

export type Stage = "fanout" | "verdict" | "explain" | "named";

const STAGES: { id: Stage; n: string; label: string }[] = [
  { id: "fanout", n: "01", label: "Fan-out" },
  { id: "verdict", n: "02", label: "Verdict" },
  { id: "explain", n: "03", label: "Explain" },
  { id: "named", n: "04", label: "Named" },
];

export type StageRailProps = {
  active: Stage;
  completed: Stage[];
};

/**
 * Cosmetic investigation stages over the single /api/investigate response.
 */
export function StageRail({ active, completed }: StageRailProps) {
  const done = new Set(completed);
  return (
    <div
      className="stage-rail"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <style>{`
        .stage-rail__label { display: inline; }
        @media (max-width: 390px) {
          .stage-rail__label { display: none; }
        }
      `}</style>
      {STAGES.map((s) => {
        const isDone = done.has(s.id);
        const isActive = s.id === active;
        const color = isActive || isDone ? "var(--ink)" : "var(--ink-muted)";
        const dot =
          isActive || isDone ? "var(--signal)" : "transparent";
        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color,
              opacity: isActive || isDone ? 1 : 0.55,
            }}
          >
            <span
              className={isActive ? "pulse-decision" : undefined}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "1px solid var(--signal)",
                background: dot,
                flexShrink: 0,
              }}
            />
            <span>
              {s.n}
              <span className="stage-rail__label"> · {s.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Derive stage chrome from Case UI state (no ensWrite API field required). */
export function deriveCaseStage(input: {
  busy: boolean;
  forceFresh: boolean;
  hasResult: boolean;
  hasExplanation: boolean;
  named: boolean;
  memoryHit: boolean;
}): { active: Stage; completed: Stage[] } {
  const completed: Stage[] = [];
  if (input.memoryHit && input.hasResult) {
    completed.push("fanout", "verdict", "explain");
    if (input.named) completed.push("named");
    return {
      active: input.named ? "named" : "explain",
      completed,
    };
  }
  if (input.busy) {
    if (input.forceFresh) {
      return { active: "fanout", completed: [] };
    }
    return { active: "fanout", completed: [] };
  }
  if (!input.hasResult) {
    return { active: "fanout", completed: [] };
  }
  completed.push("fanout", "verdict");
  let active: Stage = "verdict";
  if (input.hasExplanation) {
    completed.push("explain");
    active = "explain";
  }
  if (input.named) {
    completed.push("named");
    active = "named";
  }
  return { active, completed };
}
