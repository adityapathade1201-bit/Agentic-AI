import { useState } from "react";
import { HelpCircle, Send, ChevronRight, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, SectionLabel, Button, RiskBadge, StatePill } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";
import type { Answer } from "../domain/types";
import { getRoutingColor } from "../engine/routingEngine";

function StateGroup({
  title,
  rows,
}: {
  title: string;
  rows: { field: string; value: string; status: "Known" | "Unknown" | "Updated" | "Conflicting" }[];
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground px-3 mb-1">
        {title}
      </div>
      <div className="space-y-0.5">
        {rows.map((r) => (
          <StatePill key={r.field} {...r} />
        ))}
      </div>
    </div>
  );
}

export default function ActiveTriage({ onTrace }: { onTrace: () => void }) {
  const {
    sessionStatus,
    currentQuestion,
    riskAssessment,
    routingDecision,
    stateSnapshot,
    missingCriticalFields,
    questionsAsked,
    turnNumber,
    caseId,
    submitAnswer,
    escalation,
    contradictions,
    allCandidates = [],
    turnSnapshots = [],
  } = useTriageContext();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");

  const handleSubmit = () => {
    if (!currentQuestion || (!selectedOption && !freeText.trim())) return;

    const answer: Answer = {
      questionId: currentQuestion.question.id,
      selectedOption: selectedOption,
      freeText: freeText.trim(),
      answeredAt: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    submitAnswer(answer);
    setSelectedOption(null);
    setFreeText("");
  };

  // Idle state — no active session
  if (sessionStatus === "idle" || !stateSnapshot) {
    return (
      <PageWrap>
        <div className="max-w-[600px] mx-auto text-center py-20">
          <SectionLabel>No Active Session</SectionLabel>
          <h2 className="font-display font-700 text-[22px] mt-2 mb-3">Start a Triage to Begin</h2>
          <p className="text-muted-foreground text-sm">
            Navigate to <strong>Start Triage</strong> and select a synthetic patient case to initialize the adaptive interview.
          </p>
        </div>
      </PageWrap>
    );
  }

  // Completed or escalated state
  if (sessionStatus === "completed" || sessionStatus === "escalated") {
    return (
      <PageWrap>
        <div className="max-w-[700px] mx-auto">
          <SectionLabel>{sessionStatus === "escalated" ? "Session Escalated" : "Session Completed"} · {caseId}</SectionLabel>
          <h2 className="font-display font-700 text-[22px] mt-1 mb-5">
            {sessionStatus === "escalated" ? "Escalated for Human Review" : "Triage Complete"}
          </h2>

          {sessionStatus === "escalated" && escalation && (
            <div className="rounded-lg border-2 border-[var(--risk-high)] bg-[#fdeaea]/60 p-5 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={18} style={{ color: "var(--risk-high)" }} />
                <span className="font-display font-700 text-[16px]" style={{ color: "var(--risk-crit)" }}>
                  Escalation Required
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground">{escalation.reason}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Card className="text-center py-4">
              <div className="font-display font-700 text-2xl tnum">{questionsAsked}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Questions asked</div>
            </Card>
            <Card className="text-center py-4">
              {riskAssessment && <RiskBadge level={riskAssessment.level} />}
              <div className="text-[11px] text-muted-foreground mt-2">Final risk</div>
            </Card>
            <Card className="text-center py-4">
              <div className="font-display font-700 text-2xl tnum">{riskAssessment?.score ?? "?"}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Risk score / 10</div>
            </Card>
            <Card className="text-center py-4">
              <div className="font-600 text-[13px]" style={{ color: routingDecision ? getRoutingColor(routingDecision.outcome) : undefined }}>
                {routingDecision?.outcome ?? "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">Routing</div>
            </Card>
          </div>

          {contradictions.length > 0 && (
            <Card className="mb-5">
              <SectionLabel>Contradictions Detected</SectionLabel>
              <div className="mt-2 space-y-2">
                {contradictions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[13px]">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--risk-high)" }} />
                    <div>
                      <span className="font-mono font-500">{c.field}</span>: {c.previousValue} → {c.newValue}
                      <div className="text-[12px] text-muted-foreground">{c.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button variant="secondary" onClick={onTrace} className="w-full">
            View Decision Trace <ChevronRight size={15} />
          </Button>
        </div>
      </PageWrap>
    );
  }

  // Active triage session
  const totalFields = (stateSnapshot.demographics.length + stateSnapshot.symptoms.length + stateSnapshot.vitals.length);
  const knownFields = [...stateSnapshot.demographics, ...stateSnapshot.symptoms, ...stateSnapshot.vitals].filter(
    (f) => f.status === "Known" || f.status === "Updated"
  ).length;

  return (
    <PageWrap>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <SectionLabel>Active Triage · {caseId}</SectionLabel>
          <h2 className="font-display font-700 text-[22px] mt-1">Adaptive Interview</h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
          Turn {turnNumber} · Q{questionsAsked + 1}
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr_300px] gap-4">
        {/* LEFT — patient state */}
        <Card pad={false} className="h-fit">
          <div className="px-4 py-3 border-b border-border font-600 text-[13.5px]">
            Patient State
          </div>
          <div className="p-3 space-y-4 max-h-[600px] overflow-y-auto">
            <StateGroup title="Demographics" rows={stateSnapshot.demographics} />
            <StateGroup title="Symptoms" rows={stateSnapshot.symptoms} />
            <StateGroup title="Vitals" rows={stateSnapshot.vitals} />
            <StateGroup title="Risk Factors" rows={stateSnapshot.riskFactors} />
            {missingCriticalFields.length > 0 && (
              <div className="rounded-md bg-[#f3f0ea]/60 border border-[#e3dcc9] px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-wide text-[#8a7d5f] mb-1">
                  Missing critical info
                </div>
                <ul className="text-[12px] text-[#6b6244] space-y-0.5 font-mono">
                  {missingCriticalFields.slice(0, 5).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                  {missingCriticalFields.length > 5 && (
                    <li className="text-muted-foreground">+ {missingCriticalFields.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* CENTER — interview */}
        <div className="space-y-4">
          {currentQuestion && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <span className="grid place-items-center h-7 w-7 rounded-md bg-primary/10 text-primary font-mono text-[11px] font-600">
                  Q{questionsAsked + 1}
                </span>
                <SectionLabel>Agent question</SectionLabel>
              </div>
              <p className="font-display font-600 text-[22px] leading-snug tracking-tight">
                {currentQuestion.question.text}
              </p>

              <div className="flex flex-wrap gap-2.5 mt-6">
                {currentQuestion.question.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedOption(opt.value)}
                    className={`h-11 px-6 rounded-md border text-[14px] font-500 transition-all cursor-pointer ${
                      selectedOption === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {currentQuestion.question.allowFreeText && (
                <div className="mt-4 flex items-center gap-2">
                  <input
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Or add detail (e.g. only when climbing stairs)…"
                    className="flex-1 h-11 px-3.5 rounded-md border border-border bg-panel text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                  <Button size="md" disabled={!selectedOption && !freeText.trim()} onClick={handleSubmit} className="h-11 px-4">
                    Submit <Send size={15} />
                  </Button>
                </div>
              )}

              {!currentQuestion.question.allowFreeText && (
                <div className="mt-4">
                  <Button size="md" disabled={!selectedOption} onClick={handleSubmit} className="h-11 px-6">
                    Submit <Send size={15} />
                  </Button>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2.5 rounded-md bg-accent/60 border border-border px-3.5 py-3">
                  <HelpCircle size={15} className="mt-0.5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="font-mono text-[10px] uppercase tracking-wide text-primary font-600">
                        Why this question was selected
                      </div>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-600">
                        Selection score: {currentQuestion.score}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-snug">
                      {currentQuestion.question.rationale}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[10.5px]">
                      <span className="px-2 py-0.5 rounded bg-card border border-border text-foreground">
                        Safety: <strong className="text-primary font-600">{currentQuestion.breakdown.safetyRelevance}</strong>/10
                      </span>
                      <span className="px-2 py-0.5 rounded bg-card border border-border text-foreground">
                        Risk Impact: <strong className="text-primary font-600">+{currentQuestion.breakdown.riskImpact}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-card border border-border text-foreground">
                        Uncertainty Red.: <strong className="text-primary font-600">+{currentQuestion.breakdown.uncertaintyReduction}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-card border border-border text-foreground">
                        Routing Impact: <strong className="text-primary font-600">+{currentQuestion.breakdown.routingImpact}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate alternatives ranking */}
                {allCandidates.length > 1 && (
                  <div className="rounded-md border border-border bg-panel p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground font-600">
                        Evaluated Candidate Probes ({allCandidates.length} evaluated)
                      </div>
                      <span className="text-[11px] text-muted-foreground">Highest info-gain selected</span>
                    </div>
                    <div className="space-y-1.5">
                      {allCandidates.slice(0, 4).map((cand, idx) => {
                        const isSelected = cand.question.id === currentQuestion.question.id;
                        return (
                          <div
                            key={cand.question.id}
                            className={`flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded transition-all ${
                              isSelected
                                ? "bg-primary/10 border border-primary/30 font-500"
                                : "bg-card border border-border/50 text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="font-mono text-[10px] w-4 text-center font-600 shrink-0">
                                #{idx + 1}
                              </span>
                              <span className="truncate">{cand.question.text}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {cand.question.resolvesField}
                              </span>
                              <span
                                className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-600 ${
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                }`}
                              >
                                {cand.score} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Before/After Recent Turn Transition */}
          {turnSnapshots.length > 0 && (
            <Card pad={false} className="overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground font-600">
                  Last Update Transition · Turn {turnSnapshots[turnSnapshots.length - 1].turnNumber}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {turnSnapshots[turnSnapshots.length - 1].timestamp}
                </span>
              </div>
              <div className="p-3.5 grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="rounded-md border border-border/70 p-2.5 bg-panel">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">State Before Answer</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk Score:</span>
                    <span className="font-mono font-600">{turnSnapshots[turnSnapshots.length - 1].riskBefore?.score ?? "—"} ({turnSnapshots[turnSnapshots.length - 1].riskBefore?.level ?? "LOW"})</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">Routing:</span>
                    <span className="font-500">{turnSnapshots[turnSnapshots.length - 1].routingBefore?.outcome ?? "—"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    Missing: {turnSnapshots[turnSnapshots.length - 1].missingBefore.length} critical fields
                  </div>
                </div>

                <div className="rounded-md border border-primary/30 p-2.5 bg-primary/5">
                  <div className="font-mono text-[10px] uppercase text-primary font-600 mb-1">State After Reassessment</div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">New Score:</span>
                    <span className="font-mono font-700 text-primary">
                      {turnSnapshots[turnSnapshots.length - 1].riskAfter.score} ({turnSnapshots[turnSnapshots.length - 1].riskAfter.level})
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">New Routing:</span>
                    <span className="font-600" style={{ color: getRoutingColor(turnSnapshots[turnSnapshots.length - 1].routingAfter.outcome) }}>
                      {turnSnapshots[turnSnapshots.length - 1].routingAfter.outcome}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    Remaining: {turnSnapshots[turnSnapshots.length - 1].missingAfter.length} critical fields
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Questions asked", String(questionsAsked)],
              ["Fields resolved", `${knownFields} / ${totalFields}`],
              ["Missing critical", String(missingCriticalFields.length)],
            ].map(([l, v]) => (
              <Card key={l} className="text-center py-4">
                <div className="font-display font-700 text-2xl tnum">{v}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{l}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT — decision panel */}
        <div className="space-y-4">
          <Card>
            <SectionLabel>Agent Decision</SectionLabel>
            <div className="flex items-baseline justify-between mt-3">
              {riskAssessment && <RiskBadge level={riskAssessment.level} />}
              <div className="text-right">
                <div className="font-display font-800 text-4xl leading-none tnum">
                  {riskAssessment?.score ?? "?"}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground uppercase mt-1">
                  risk score / 10
                </div>
              </div>
            </div>

            {riskAssessment && (
              <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (riskAssessment.score / 10) * 100)}%`,
                    background:
                      riskAssessment.level === "LOW" ? "var(--risk-low)" :
                      riskAssessment.level === "MODERATE" ? "var(--risk-mod)" :
                      riskAssessment.level === "HIGH" ? "var(--risk-high)" :
                      "var(--risk-crit)",
                  }}
                />
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md border border-border py-2.5">
                <div className="font-mono text-[10px] text-muted-foreground uppercase">Routing</div>
                <div
                  className="font-600 text-[13px] mt-0.5"
                  style={{ color: routingDecision ? getRoutingColor(routingDecision.outcome) : undefined }}
                >
                  {routingDecision?.outcome ?? "Pending"}
                </div>
              </div>
              <div className="rounded-md border border-border py-2.5 flex flex-col items-center justify-center">
                <div className="font-mono text-[10px] text-muted-foreground uppercase">Decision status</div>
                {escalation?.shouldEscalate ? (
                  <div className="inline-flex items-center gap-1 font-600 text-[13px] mt-0.5 text-risk-high">
                    <ShieldAlert size={13} /> Escalate
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 font-600 text-[13px] mt-0.5 text-risk-low">
                    <ShieldCheck size={13} /> Supported
                  </div>
                )}
              </div>
            </div>
          </Card>

          {riskAssessment && riskAssessment.contributingFactors.length > 0 && (
            <Card pad={false}>
              <div className="px-4 py-2.5 border-b border-border font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Contributing factors
              </div>
              <div className="p-3 space-y-1.5">
                {riskAssessment.contributingFactors.map((f) => (
                  <div key={f.description} className="flex items-center justify-between text-[12.5px]">
                    <span>{f.description}</span>
                    <span className="font-mono font-600" style={{ color: "var(--risk-high)" }}>
                      +{f.weight}
                    </span>
                  </div>
                ))}
                {riskAssessment.missingCriticalInformation.length > 0 && (
                  <div className="flex items-center justify-between text-[12.5px] pt-1 border-t border-hairline">
                    <span className="text-muted-foreground italic">
                      Missing: {riskAssessment.missingCriticalInformation.slice(0, 3).join(", ")}
                    </span>
                    <span className="font-mono text-muted-foreground">±?</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {contradictions.length > 0 && (
            <div className="rounded-lg border border-[var(--risk-high)] bg-[#fdeaea]/60 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={14} style={{ color: "var(--risk-high)" }} />
                <span className="font-600 text-[12px]" style={{ color: "var(--risk-crit)" }}>
                  {contradictions.length} Contradiction{contradictions.length > 1 ? "s" : ""}
                </span>
              </div>
              {contradictions.slice(0, 2).map((c, i) => (
                <p key={i} className="text-[11px] leading-snug text-muted-foreground font-mono">
                  {c.field}: {c.previousValue} → {c.newValue}
                </p>
              ))}
            </div>
          )}

          {routingDecision && (
            <div
              className="rounded-lg border p-4"
              style={{
                borderColor: getRoutingColor(routingDecision.outcome),
                background: riskAssessment && riskAssessment.level === "LOW" ? "#e6f6ef" : "#fdf3e2",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={15} style={{ color: getRoutingColor(routingDecision.outcome) }} />
                <span className="font-600 text-[13px]" style={{ color: "#8a6d1f" }}>Next action</span>
              </div>
              <p className="text-[12.5px] leading-snug" style={{ color: "#8a6d1f" }}>
                {riskAssessment && riskAssessment.missingCriticalInformation.length > 0
                  ? `Resolve ${riskAssessment.missingCriticalInformation.slice(0, 2).join(" & ")}, then re-run risk.`
                  : "Continue monitoring. Sufficient data for current routing decision."}
                {escalation?.shouldEscalate && " Escalate if concerns persist."}
              </p>
            </div>
          )}

          <Button variant="secondary" onClick={onTrace} className="w-full">
            View Decision Trace <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </PageWrap>
  );
}
