"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AuthorityAuditReport } from "@saviours/check";

export function ExplainPanel({ report }: { report: AuthorityAuditReport }) {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<"report" | "model" | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAnswer(null);
    setSource(null);
    setError(null);
    void fetch("/api/audit/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ report }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        if (!cancelled) setParagraphs(j.paragraphs ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [report]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setError(null);
    try {
      const r = await fetch("/api/audit/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report, question: q }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setParagraphs(j.paragraphs ?? []);
      setAnswer(j.answer ?? null);
      setSource(j.source === "model" ? "model" : "report");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAsking(false);
    }
  }

  return (
    <section style={{ margin: "16px 0 20px" }}>
      <h2 className="cp-section-label">In plain words</h2>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--tx-lo)" }}>
        This restates the report. It does not change Findings, Coverage, or
        Reach, and it does not stamp SAFE.
      </p>
      {paragraphs.map((p) => (
        <p key={p} style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.45 }}>
          {p}
        </p>
      ))}
      <form onSubmit={ask} style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <label style={{ flex: 1 }}>
          <span className="cp-section-label">Ask about this report</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What does the owner row mean?"
            maxLength={500}
            style={{ width: "100%", marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          className="cp-btn-quiet"
          disabled={asking || !question.trim()}
          style={{ alignSelf: "end" }}
        >
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>
      {answer ? (
        <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
          {answer}{" "}
          <span style={{ color: "var(--tx-lo)", fontSize: 12 }}>
            {source === "model" ? "· paraphrased from the report" : "· from the report"}
          </span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: "var(--red)", marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
