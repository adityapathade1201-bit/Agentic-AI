import {
  ArrowRight,
  AlertTriangle,
  GitCommitVertical,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Card, SectionLabel, Button, FieldStatusBadge, RiskBadge } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";
import { getRoutingColor } from "../engine/routingEngine";

/* ── Screen 4 — Patient State timeline ───────────────────────── */
export function PatientStateScreen() {
  const { currentPatient, caseId, contradictions } = useTriageContext();

  const events = currentPatient?.events ?? [];

  if (!currentPatient) {
    return (
      <PageWrap>
        <SectionLabel>State Inspection</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1 mb-1">Patient State Timeline</h2>
        <p className="text-sm text-muted-foreground mb-6">
          No active session. Start a triage to view patient state changes.
        </p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <SectionLabel>State Inspection · {caseId}</SectionLabel>
      <h2 className="font-display font-700 text-[24px] mt-1 mb-1">Patient State Timeline</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-[62ch]">
        Every mutation to patient state is versioned and attributed to a source.
        Contradictions are surfaced, never silently overwritten.
      </p>

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground text-center py-8">
            No state changes recorded yet. Answer questions in the active triage to see updates.
          </p>
        </Card>
      ) : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  {["Time", "Source", "Field", "Previous", "New", "Status"].map((h) => (
                    <th key={h} className="font-450 px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...events].reverse().map((r, i) => {
                  const conflict = r.status === "Conflicting";
                  return (
                    <tr
                      key={i}
                      className={`border-b border-hairline last:border-0 ${
                        conflict ? "bg-[#fdeaea]/50" : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono tnum">{r.time}</td>
                      <td className="px-5 py-3.5">{r.source}</td>
                      <td className="px-5 py-3.5 font-500">{r.field}</td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground line-through decoration-muted-foreground/40">
                        {r.previousValue}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-600" style={conflict ? { color: "var(--risk-high)" } : undefined}>
                        {r.newValue}
                      </td>
                      <td className="px-5 py-3.5"><FieldStatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {contradictions.length > 0 && (
        <div className="mt-4 space-y-2">
          {contradictions.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-md border border-[var(--risk-high)] bg-[#fdeaea]/50 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--risk-high)" }} />
              <p className="text-[13px]" style={{ color: "#a01818" }}>
                <strong>Contradiction on <span className="font-mono">{c.field}</span>.</strong>{" "}
                Value moved <span className="font-mono">{c.previousValue} → {c.newValue}</span>.{" "}
                {c.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </PageWrap>
  );
}

/* ── Screen 5 — Risk Assessment ──────────────────────────────── */
export function RiskAssessmentScreen() {
  const { riskAssessment, decisionTrace, caseId } = useTriageContext();

  // Build progression from decision trace risk events
  const riskEvents = decisionTrace.filter((t) => t.type === "RISK_CALCULATED");
  const progression = riskEvents.map((e, i) => {
    const scoreMatch = e.result.match(/score\s+(\d+(?:\.\d+)?)/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
    // Try to extract "X → Y" pattern for the latest score
    const arrowMatch = e.result.match(/(\d+(?:\.\d+)?)\s*→\s*(\d+(?:\.\d+)?)/);
    const displayScore = arrowMatch ? parseFloat(arrowMatch[2]) : score;
    return {
      label: i === 0 ? "Initial" : `After update ${i}`,
      score: displayScore,
      note: e.note.substring(0, 40),
    };
  });

  if (!riskAssessment) {
    return (
      <PageWrap>
        <SectionLabel>Risk Engine · Deterministic</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1 mb-3">Risk Assessment</h2>
        <p className="text-sm text-muted-foreground">
          No risk assessment available. Start a triage session to see risk scoring.
        </p>
      </PageWrap>
    );
  }

  const riskColor =
    riskAssessment.level === "LOW" ? "var(--risk-low)" :
    riskAssessment.level === "MODERATE" ? "var(--risk-mod)" :
    riskAssessment.level === "HIGH" ? "var(--risk-high)" :
    "var(--risk-crit)";

  const prevScore = progression.length >= 2 ? progression[progression.length - 2].score : null;

  return (
    <PageWrap>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <SectionLabel>Risk Engine · Deterministic · {caseId}</SectionLabel>
          <h2 className="font-display font-700 text-[24px] mt-1">Risk Assessment</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide rounded-md px-2.5 py-1.5 border border-[var(--risk-mod)]"
          style={{ color: "var(--risk-mod)", background: "#fdf3e2" }}>
          <ShieldAlert size={13} /> Simulation risk engine — not clinically validated
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-4 mt-4">
        <Card>
          <SectionLabel>Current synthetic score</SectionLabel>
          <div className="flex items-end gap-4 mt-3">
            <div className="font-display font-800 text-[68px] leading-none tnum" style={{ color: riskColor }}>
              {riskAssessment.score}
            </div>
            <div className="pb-2">
              <div className="font-600 text-lg" style={{ color: riskColor }}>{riskAssessment.level}</div>
              {prevScore !== null && (
                <div className="inline-flex items-center gap-1 font-mono text-[12px] mt-1" style={{ color: riskColor }}>
                  <TrendingUp size={13} /> {riskAssessment.score > prevScore ? "+" : ""}{(riskAssessment.score - prevScore).toFixed(1)} from previous ({prevScore})
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Factors affecting score
            </div>
            {riskAssessment.contributingFactors.map((f) => (
              <div key={f.description} className="flex items-center justify-between text-[13px] border-b border-hairline pb-1.5">
                <span>{f.description}</span>
                <span className="font-mono font-600 text-risk-high">+{f.weight}</span>
              </div>
            ))}
            {riskAssessment.missingCriticalInformation.length > 0 && (
              <div className="flex items-center justify-between text-[13px] pt-1">
                <span className="text-muted-foreground italic">
                  Missing: {riskAssessment.missingCriticalInformation.slice(0, 3).join(", ")}
                </span>
                <span className="font-mono text-muted-foreground">±?</span>
              </div>
            )}
          </div>
          <div className="mt-4 font-mono text-[11px] text-muted-foreground">
            Recomputed {riskAssessment.evaluatedAt} · engine v0.4 · deterministic rules
          </div>
        </Card>

        <Card>
          <SectionLabel>Score progression</SectionLabel>
          <p className="text-[13px] text-muted-foreground mt-1 mb-6">
            Risk recalculated after new information.
          </p>
          {progression.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {progression.slice(-4).map((p, i, arr) => {
                  const color = p.score >= 8 ? "var(--risk-high)" : p.score >= 6 ? "var(--risk-high)" : "var(--risk-mod)";
                  return (
                    <div key={i} className="flex items-center gap-2 flex-1">
                      <div className="flex-1 text-center">
                        <div
                          className="mx-auto grid place-items-center h-16 w-16 rounded-full font-display font-800 text-2xl text-white tnum"
                          style={{ background: color }}
                        >
                          {p.score}
                        </div>
                        <div className="text-[12px] font-500 mt-2">{p.label}</div>
                        <div className="text-[11px] text-muted-foreground">{p.note}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight size={20} className="text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              {progression.length >= 2 && (
                <div className="mt-7 grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Previous", String(progression[progression.length - 2]?.score ?? "—")],
                    ["Current", String(riskAssessment.score)],
                    ["Δ Change", `${riskAssessment.score > (progression[progression.length - 2]?.score ?? 0) ? "+" : ""}${(riskAssessment.score - (progression[progression.length - 2]?.score ?? 0)).toFixed(1)}`],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-md border border-border py-3 bg-panel">
                      <div className="font-display font-700 text-xl tnum">{v}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Answer questions to see risk progression.
            </div>
          )}
        </Card>
      </div>
    </PageWrap>
  );
}

/* ── Screen 6 — Decision Trace ───────────────────────────────── */
export function DecisionTraceScreen() {
  const { decisionTrace, caseId } = useTriageContext();

  if (decisionTrace.length === 0) {
    return (
      <PageWrap>
        <SectionLabel>Audit Trail</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1 mb-3">Decision Trace</h2>
        <p className="text-sm text-muted-foreground">
          No decision trace available. Start a triage session to see the agent&apos;s reasoning.
        </p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <SectionLabel>Audit Trail · {caseId}</SectionLabel>
      <h2 className="font-display font-700 text-[24px] mt-1 mb-1">Decision Trace</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-[62ch]">
        A complete, reproducible record of how the agent reached its current
        decision — every component, action, and result in sequence.
      </p>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-3">
          {decisionTrace.map((s) => {
            const isConflict = s.type === "CONTRADICTION_DETECTED" || s.type === "ESCALATION_TRIGGERED";
            return (
              <div key={`${s.step}-${s.type}`} className="relative flex gap-4">
                <div
                  className={`relative z-10 grid place-items-center h-8 w-8 rounded-full border font-mono text-[11px] font-600 shrink-0 ${
                    isConflict
                      ? "bg-[#fdeaea] border-[var(--risk-high)] text-risk-high"
                      : "bg-card border-border text-primary"
                  }`}
                >
                  {s.step}
                </div>
                <Card className={`flex-1 py-3.5 ${isConflict ? "border-[var(--risk-high)]/40 bg-[#fdeaea]/20" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] text-muted-foreground tnum">{s.time}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent text-primary">
                      {s.component}
                    </span>
                    <span className="font-600 text-[14px]">{s.action}</span>
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-[12px]">
                      <GitCommitVertical size={13} className="text-muted-foreground" />
                      {s.result}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug">{s.note}</p>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrap>
  );
}

/* ── Screen 7 — Reassessment / Contradiction ─────────────────── */
export function ReassessmentScreen({ onEscalate }: { onEscalate?: () => void }) {
  const { contradictions, riskAssessment, routingDecision, decisionTrace, escalation, caseId } = useTriageContext();

  // Build flow from most recent contradiction events
  const latestContradiction = contradictions.length > 0 ? contradictions[contradictions.length - 1] : null;

  // Find risk change events
  const riskEvents = decisionTrace.filter((t) => t.type === "RISK_CALCULATED");
  const prevRiskEvent = riskEvents.length >= 2 ? riskEvents[riskEvents.length - 2] : null;
  const routingEvents = decisionTrace.filter((t) => t.type === "ROUTING_UPDATED");
  const prevRoutingEvent = routingEvents.length >= 2 ? routingEvents[routingEvents.length - 2] : null;

  const flow = latestContradiction
    ? [
        {
          label: "Old state",
          detail: `${latestContradiction.field} = ${latestContradiction.previousValue}`,
          tone: "muted",
        },
        {
          label: "Conflict detected",
          detail: `New answer: ${latestContradiction.field} = ${latestContradiction.newValue}`,
          tone: "high",
        },
        { label: "State invalidated", detail: "Prior estimate discarded", tone: "high" },
        {
          label: "Risk recalculated",
          detail: prevRiskEvent ? prevRiskEvent.result : `Score ${riskAssessment?.score ?? "?"}`,
          tone: "high",
        },
        {
          label: "Routing reassessed",
          detail: routingDecision?.outcome ?? "Pending",
          tone: "high",
        },
      ]
    : [
        { label: "No contradictions", detail: "State is consistent", tone: "muted" },
      ];

  return (
    <PageWrap>
      <div className="max-w-[720px] mx-auto">
        <SectionLabel>Reassessment · {caseId ?? "No session"}</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1 mb-5">Contradiction Handling</h2>

        {latestContradiction ? (
          <div className="rounded-lg border-2 border-[var(--risk-high)] bg-[#fdeaea]/60 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} style={{ color: "var(--risk-high)" }} />
              <span className="font-display font-700 text-[17px]" style={{ color: "var(--risk-crit)" }}>
                Contradiction detected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-card border border-border p-3">
                <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Previous</div>
                <div className="font-mono text-[15px] line-through decoration-muted-foreground/50 text-muted-foreground">
                  {latestContradiction.field} = {latestContradiction.previousValue}
                </div>
              </div>
              <div className="rounded-md bg-card border border-[var(--risk-high)] p-3">
                <div className="font-mono text-[10px] uppercase text-risk-high mb-1">New</div>
                <div className="font-mono text-[15px] font-600" style={{ color: "var(--risk-high)" }}>
                  {latestContradiction.field} = {latestContradiction.newValue}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card className="mb-6">
            <p className="text-sm text-muted-foreground text-center py-4">
              No contradictions detected in the current session. Continue the triage or select a contradiction case (TRG-3004) to see this in action.
            </p>
          </Card>
        )}

        <div className="space-y-2 mb-6">
          {flow.map((f, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`w-full flex items-center justify-between rounded-md border px-4 py-3 ${
                  f.tone === "high"
                    ? "border-[var(--risk-high)]/40 bg-[#fdeaea]/30"
                    : "border-border bg-panel"
                }`}
              >
                <span className="font-600 text-[13.5px]">{f.label}</span>
                <span className="font-mono text-[12.5px] text-muted-foreground">{f.detail}</span>
              </div>
              {i < flow.length - 1 && <div className="h-4 w-px bg-[var(--risk-high)]/40" />}
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-accent/50 px-4 py-3 mb-5 text-[13px] text-muted-foreground">
          The system <strong className="text-foreground">does not silently overwrite</strong> conflicting
          information. Contradictory input invalidates the affected state and
          forces a fresh assessment.
        </div>

        {escalation?.shouldEscalate && (
          <Button variant="danger" className="w-full h-12 text-[15px]" onClick={onEscalate}>
            <ShieldAlert size={17} /> Escalate for human review
          </Button>
        )}
      </div>
    </PageWrap>
  );
}
