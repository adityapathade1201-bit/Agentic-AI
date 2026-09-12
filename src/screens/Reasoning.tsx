import { useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  GitCommitVertical,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  Eye,
  Brain,
  Play,
  Download,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { Card, SectionLabel, Button, FieldStatusBadge, RiskBadge } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";
import { getRoutingColor } from "../engine/routingEngine";
import type { TraceEventType } from "../domain/types";

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

export type AgentCycleStage =
  | "OBSERVE"
  | "DECIDE"
  | "ACT"
  | "RECEIVE"
  | "UPDATE"
  | "REASSESS"
  | "ADAPT"
  | "ROUTE / ESCALATE";

export function getAgentCycleStage(type: TraceEventType): {
  stage: AgentCycleStage;
  badgeClass: string;
  icon: typeof Eye;
} {
  switch (type) {
    case "STATE_INITIALIZED":
    case "MISSING_INFO_IDENTIFIED":
      return { stage: "OBSERVE", badgeClass: "bg-blue-100 text-blue-900 border-blue-200", icon: Eye };
    case "CANDIDATES_EVALUATED":
      return { stage: "DECIDE", badgeClass: "bg-purple-100 text-purple-900 border-purple-200", icon: Brain };
    case "QUESTION_SELECTED":
      return { stage: "ACT", badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-200", icon: Play };
    case "ANSWER_RECEIVED":
      return { stage: "RECEIVE", badgeClass: "bg-teal-100 text-teal-900 border-teal-200", icon: Download };
    case "STATE_UPDATED":
      return { stage: "UPDATE", badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-200", icon: FileSpreadsheet };
    case "CONTRADICTION_DETECTED":
    case "RISK_CALCULATED":
      return { stage: "REASSESS", badgeClass: "bg-amber-100 text-amber-900 border-amber-200", icon: RefreshCw };
    case "REASSESSMENT_TRIGGERED":
      return { stage: "ADAPT", badgeClass: "bg-orange-100 text-orange-900 border-orange-200", icon: TrendingUp };
    case "ROUTING_UPDATED":
    case "ESCALATION_TRIGGERED":
    case "SESSION_COMPLETED":
      return { stage: "ROUTE / ESCALATE", badgeClass: "bg-rose-100 text-rose-900 border-rose-200", icon: ShieldAlert };
    default:
      return { stage: "OBSERVE", badgeClass: "bg-muted text-muted-foreground border-border", icon: Eye };
  }
}

/* ── Screen 6 — Decision Trace ───────────────────────────────── */
export function DecisionTraceScreen() {
  const { decisionTrace, caseId } = useTriageContext();
  const [filterStage, setFilterStage] = useState<string>("ALL");

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

  const stagesList: { id: string; label: string; count: number }[] = [
    { id: "ALL", label: "All Steps", count: decisionTrace.length },
    { id: "OBSERVE", label: "Observe", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "OBSERVE").length },
    { id: "DECIDE", label: "Decide", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "DECIDE").length },
    { id: "ACT", label: "Act", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "ACT").length },
    { id: "RECEIVE", label: "Receive", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "RECEIVE").length },
    { id: "UPDATE", label: "Update", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "UPDATE").length },
    { id: "REASSESS", label: "Reassess", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "REASSESS").length },
    { id: "ROUTE / ESCALATE", label: "Route / Escalate", count: decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === "ROUTE / ESCALATE").length },
  ];

  const filteredTrace = filterStage === "ALL"
    ? decisionTrace
    : decisionTrace.filter((s) => getAgentCycleStage(s.type).stage === filterStage);

  return (
    <PageWrap>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <SectionLabel>Audit Trail · {caseId}</SectionLabel>
          <h2 className="font-display font-700 text-[24px] mt-1">Agent Decision Trace</h2>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {decisionTrace.length} total logged events
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4 max-w-[64ch]">
        A complete, reproducible execution record structured into the canonical agent loop:
        <strong> Observe → Decide → Act → Receive → Update → Reassess → Adapt → Route</strong>.
      </p>

      {/* Stage Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5 pb-3 border-b border-border">
        {stagesList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStage(tab.id)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-500 font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStage === tab.id
                ? "bg-primary text-primary-foreground font-600 shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${filterStage === tab.id ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border/80" />
        <div className="space-y-3">
          {filteredTrace.map((s) => {
            const cycleInfo = getAgentCycleStage(s.type);
            const isConflict = s.type === "CONTRADICTION_DETECTED" || s.type === "ESCALATION_TRIGGERED";
            return (
              <div key={`${s.step}-${s.type}`} className="relative flex gap-4 items-start">
                <div
                  className={`relative z-10 grid place-items-center h-10 w-10 rounded-full border-2 font-mono text-[11px] font-700 shrink-0 ${
                    isConflict
                      ? "bg-[#fdeaea] border-[var(--risk-high)] text-risk-high shadow-sm"
                      : "bg-card border-primary/30 text-primary shadow-sm"
                  }`}
                >
                  {s.step}
                </div>
                <Card className={`flex-1 py-3.5 px-4 transition-all ${isConflict ? "border-[var(--risk-high)]/60 bg-[#fdeaea]/20" : ""}`}>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-mono text-[11px] text-muted-foreground tnum">{s.time}</span>
                    <span className={`font-mono text-[10px] uppercase font-700 tracking-wider px-2 py-0.5 rounded border ${cycleInfo.badgeClass}`}>
                      {cycleInfo.stage}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {s.component}
                    </span>
                    <span className="font-600 text-[13.5px] text-foreground">{s.action}</span>
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-[12px] font-600 text-primary">
                      <GitCommitVertical size={13} className="text-muted-foreground" />
                      {s.result}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground mt-2 leading-relaxed font-sans">{s.note}</p>
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

  const reassessEvents = decisionTrace.filter(
    (t) => t.type === "RISK_CALCULATED" || t.type === "ROUTING_UPDATED" || t.type === "CONTRADICTION_DETECTED" || t.type === "ESCALATION_TRIGGERED"
  );

  return (
    <PageWrap>
      <div className="max-w-[760px] mx-auto">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <SectionLabel>Live Reassessment Engine · {caseId ?? "No session"}</SectionLabel>
            <h2 className="font-display font-700 text-[24px] mt-1">Contradiction & Reassessment Audit</h2>
          </div>
          {contradictions.length > 0 && (
            <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-[#fdeaea] border border-[var(--risk-high)] text-risk-high font-600">
              {contradictions.length} Active Contradiction{contradictions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          The system enforces <strong>deterministic reassessment</strong> whenever state updates arrive.
          Contradictory values invalidate prior estimates and recalculate risk without silent overwrites.
        </p>

        {/* Contradiction Cards */}
        {contradictions.length > 0 ? (
          <div className="space-y-4 mb-6">
            {contradictions.map((c, idx) => (
              <div key={idx} className="rounded-lg border-2 border-[var(--risk-high)] bg-[#fdeaea]/60 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} style={{ color: "var(--risk-high)" }} />
                    <span className="font-display font-700 text-[16px]" style={{ color: "var(--risk-crit)" }}>
                      CONTRADICTION DETECTED: {c.field}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-[var(--risk-high)]/40 font-700 text-risk-high">
                    Severity: {c.severity}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-md bg-card border border-border p-3">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground mb-0.5 font-600">Previous Known Value</div>
                    <div className="font-mono text-[14px] line-through decoration-muted-foreground/60 text-muted-foreground font-500">
                      {c.previousValue}
                    </div>
                  </div>
                  <div className="rounded-md bg-card border-2 border-[var(--risk-high)] p-3">
                    <div className="font-mono text-[10px] uppercase text-risk-high mb-0.5 font-600">Conflicting New Value</div>
                    <div className="font-mono text-[14px] font-700" style={{ color: "var(--risk-high)" }}>
                      {c.newValue}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-md bg-card/80 border border-border p-3 text-[12.5px]">
                  <div className="flex items-start gap-2">
                    <strong className="font-600 min-w-[110px] text-foreground">Clinical Reason:</strong>
                    <span className="text-muted-foreground">{c.reason}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="font-600 min-w-[110px] text-foreground">Risk Impact:</strong>
                    <span className="font-mono text-risk-high font-600">+1.0 Contradiction penalty added to risk score</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="font-600 min-w-[110px] text-foreground">Routing Impact:</strong>
                    <span className="text-muted-foreground font-500">Elevated to Immediate / Escalation due to active clinical conflict</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <strong className="font-600 min-w-[110px] text-foreground">Escalation Impact:</strong>
                    <span className="text-risk-crit font-600">Triggers mandatory human clinical review (Unsafe certainty prevented)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="mb-6 py-6 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle2 size={24} className="text-risk-low" />
            </div>
            <div className="font-600 text-[14px]">No Contradictions Detected in Active Session</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-[50ch] mx-auto">
              Patient state history is currently consistent. Select <strong>TRG-3004</strong> to observe real-time contradiction detection and escalation.
            </p>
          </Card>
        )}

        {/* Live Reassessment Event Stream */}
        <Card pad={false} className="mb-6">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="font-600 text-[14px]">Live Reassessment Event Stream</div>
            <span className="font-mono text-[11px] text-muted-foreground">{reassessEvents.length} events logged</span>
          </div>
          <div className="divide-y divide-hairline">
            {reassessEvents.length > 0 ? (
              reassessEvents.map((ev, i) => (
                <div key={i} className="p-3.5 flex items-start justify-between gap-3 text-[13px] hover:bg-muted/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] text-muted-foreground">{ev.time}</span>
                      <span className="font-600 text-[13.5px]">{ev.action}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{ev.note}</div>
                  </div>
                  <span className="font-mono text-[12px] font-600 px-2 py-0.5 rounded bg-muted text-primary shrink-0">
                    {ev.result}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Answer questions in Active Triage to trigger live reassessment events.
              </div>
            )}
          </div>
        </Card>

        {escalation?.shouldEscalate && (
          <div className="space-y-3 mb-5">
            <div className="rounded-lg border border-[var(--risk-high)] bg-[#fdeaea]/60 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={16} className="text-risk-high" />
                <span className="font-600 text-[13px] text-risk-crit">Escalation Threshold Triggered</span>
              </div>
              <p className="text-[12.5px] text-muted-foreground">{escalation.reason}</p>
            </div>
            {onEscalate && (
              <Button variant="danger" className="w-full h-12 text-[15px]" onClick={onEscalate}>
                <ShieldAlert size={17} /> Confirm Escalation to Human Clinician
              </Button>
            )}
          </div>
        )}
      </div>
    </PageWrap>
  );
}
