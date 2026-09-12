import { useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import { Card, SectionLabel, Badge, RiskBadge, Button } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";
import type { TestCaseResult, AdaptiveStepTrace } from "../evaluation/evaluationTypes";

const toneColor: Record<string, string> = {
  good: "var(--risk-low)",
  warn: "var(--risk-mod)",
  crit: "var(--risk-high)",
  neutral: "var(--foreground)",
};

const tooltipStyle = {
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "JetBrains Mono, monospace",
  padding: "6px 10px",
};

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card pad={false}>
      <div className="px-5 py-3.5 border-b border-border">
        <div className="font-600 text-[14px]">{title}</div>
        {sub && <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}

export function EvaluationScreen() {
  const { evaluationReport, refreshEvaluation } = useTriageContext();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [drillDownTab, setDrillDownTab] = useState<"adaptive" | "questions" | "contradictions" | "invariants" | "trace">("adaptive");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      refreshEvaluation();
      setIsRefreshing(false);
    }, 200);
  };

  if (!evaluationReport) {
    return (
      <PageWrap>
        <SectionLabel>System Evaluation</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1 mb-6">Evaluation Suite</h2>
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              Evaluation report is currently unavailable.
            </p>
            <Button onClick={handleRefresh}>
              Run Automated Evaluation Suite
            </Button>
          </div>
        </Card>
      </PageWrap>
    );
  }

  const report = evaluationReport;
  const selectedCard = report.caseResults.find((c) => c.caseId === selectedCaseId) ?? null;

  // Key metrics
  const evalMetrics = [
    { label: "Total Cases", value: String(report.totalCases), tone: "neutral" },
    { label: "Passed / Failed", value: `${report.passedCases} / ${report.failedCases}`, tone: report.failedCases === 0 ? "good" : "crit" },
    { label: "Routing Accuracy", value: `${(report.routingAccuracy * 100).toFixed(0)}%`, tone: report.routingAccuracy >= 0.9 ? "good" : "warn" },
    { label: "Invariant Checks", value: `${report.invariantsPassed}/${report.totalInvariantsChecked}`, tone: report.invariantsFailed === 0 ? "good" : "crit" },
    { label: "Avg Questions / Case", value: report.averageQuestions.toFixed(1), tone: "neutral" },
    { label: "Contradiction Detection", value: `${(report.contradictionDetectionRate * 100).toFixed(0)}%`, tone: "good" },
    { label: "Reassessment Rate", value: `${report.reassessmentRate.toFixed(1)} / case`, tone: "neutral" },
    { label: "Escalation Rate", value: `${(report.escalationRate * 100).toFixed(0)}%`, tone: report.escalationRate > 0 ? "warn" : "neutral" },
    { label: "Under-Triage", value: String(report.underTriageCount), tone: report.underTriageCount === 0 ? "good" : "crit" },
    { label: "Over-Triage", value: String(report.overTriageCount), tone: report.overTriageCount === 0 ? "good" : "warn" },
    { label: "Exact Matches", value: `${report.exactRoutingMatchCount}/${report.totalCases}`, tone: "good" },
  ];

  // Routing counts
  const routingCounts: Record<string, number> = {};
  for (const c of report.caseResults) {
    const outcome = String(c.actualRouting);
    routingCounts[outcome] = (routingCounts[outcome] ?? 0) + 1;
  }
  const routingColors: Record<string, string> = {
    "Standard": "#0e9f6e",
    "Urgent Assessment": "#c27803",
    "Immediate / Emergency": "#e02424",
    "Immediate / Escalation": "#9b1c1c",
    "Human Review / Escalation": "#9b1c1c",
  };
  const routingDistribution = Object.entries(routingCounts).map(([name, value]) => ({
    name,
    value,
    color: routingColors[name] ?? "#5b6472",
  }));

  // Risk progression data across cases
  const riskProgression = report.caseResults.map((c) => ({
    name: c.caseId.toUpperCase(),
    score: c.finalRiskScore,
  }));

  // Questions per case chart data
  const questionsPerCaseData = report.caseResults.map((c) => ({
    caseId: c.caseId.toUpperCase(),
    questions: c.questionsAskedCount,
    contradictions: c.contradictionCount,
  }));

  // Calculate question efficiency metrics
  const totalQuestionsAsked = report.caseResults.reduce((sum, c) => sum + c.questionsAskedCount, 0);
  // Total question candidates evaluated across all turns
  const totalCandidatesEvaluated = report.caseResults.reduce(
    (sum, c) => sum + c.adaptiveTrace.reduce((s2, t) => s2 + (t.candidatesCount || 0), 0),
    0
  );
  const totalCandidatesAvoided = Math.max(0, totalCandidatesEvaluated - totalQuestionsAsked);

  return (
    <PageWrap>
      {/* Header with Re-Run Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <SectionLabel>System Evaluation · Production Harness</SectionLabel>
          <h2 className="font-display font-700 text-[24px] mt-1">Evaluation & Validation Benchmark</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Automated verification across {report.totalCases} synthetic clinical cases and {report.totalInvariantsChecked} deterministic invariants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={report.overallStatus === "PASS" ? "ok" : "high"}>
            {report.overallStatus === "PASS" ? "ALL INVARIANTS PASS" : "TEST WARNING"}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline" size="sm">
            {isRefreshing ? "Running..." : "Re-run Suite"}
          </Button>
        </div>
      </div>

      {/* 11 Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {evalMetrics.map((m) => (
          <Card key={m.label} className="py-3 px-4">
            <SectionLabel>{m.label}</SectionLabel>
            <div
              className="font-display font-700 text-[24px] mt-1.5 leading-none tnum"
              style={{ color: toneColor[m.tone] }}
            >
              {m.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Adaptive Efficiency & Minimization Summary (Task 9) */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-600 text-[14px] text-primary">Adaptive Information Gain & Question Minimization</span>
              <Badge variant="neutral">Entropy Reduction</Badge>
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-1 max-w-2xl">
              At each turn, the agent dynamically scores all missing-field candidate questions across safety relevance, risk impact, and uncertainty reduction. It selects only the highest-ranked question, avoiding non-critical inquiry.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <div className="text-[11px] text-muted-foreground font-mono uppercase">Questions Asked</div>
              <div className="font-mono font-700 text-[20px] text-foreground tnum">{totalQuestionsAsked}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground font-mono uppercase">Candidates Evaluated</div>
              <div className="font-mono font-700 text-[20px] text-foreground tnum">{totalCandidatesEvaluated}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground font-mono uppercase">Inquiries Avoided</div>
              <div className="font-mono font-700 text-[20px] text-primary tnum">{totalCandidatesAvoided}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Routing Distribution" sub="Deterministic outcomes across all synthetic cases">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie
                  data={routingDistribution}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {routingDistribution.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {routingDistribution.map((r) => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
                  <span className="text-[12px] font-500 truncate max-w-[130px]">{r.name}</span>
                  <span className="font-mono text-[12px] text-muted-foreground tnum ml-auto">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Questions & Contradictions Per Case" sub="Inquiries needed vs contradiction occurrences">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={questionsPerCaseData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="caseId" tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="questions" name="Questions Asked" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="contradictions" name="Contradictions" fill="var(--risk-mod)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Case Table (Task 7) */}
      <Card pad={false} className="mb-6">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-600 text-[14px]">Synthetic Evaluation Cases (6 Cases)</div>
            <div className="text-[12px] text-muted-foreground">
              Click any case row to inspect full decision trace, adaptive step transitions, and invariant checks.
            </div>
          </div>
          <Badge variant="neutral">Deterministic Ground Truth</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 font-mono text-[11px] text-muted-foreground uppercase">
                <th className="py-2.5 px-4">Case ID</th>
                <th className="py-2.5 px-4">Scenario</th>
                <th className="py-2.5 px-4 text-center">Questions</th>
                <th className="py-2.5 px-4 text-center">Final Risk</th>
                <th className="py-2.5 px-4">Expected Routing</th>
                <th className="py-2.5 px-4">Actual Routing</th>
                <th className="py-2.5 px-4 text-center">Invariants</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {report.caseResults.map((c) => {
                const isSelected = selectedCaseId === c.caseId;
                return (
                  <tr
                    key={c.caseId}
                    onClick={() => setSelectedCaseId(isSelected ? null : c.caseId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/40"
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-600 text-[12px]">
                      {c.caseId.toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-500 text-foreground">{c.caseLabel}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Difficulty: {c.difficulty}
                        {c.contradictionExpected && " · Contradiction Test"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono tnum">
                      {c.questionsAskedCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskBadge level={c.finalRiskLevel} score={c.finalRiskScore} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">
                      {c.expectedRouting}
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] font-500">
                      <span className={c.routingMatched ? "text-risk-low" : "text-risk-high"}>
                        {c.actualRouting}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[12px]">
                      <span className="text-risk-low font-600">
                        {c.invariantChecks.filter((i) => i.passed).length}/{c.invariantChecks.length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={c.status === "PASS" ? "ok" : "high"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="text-[12px] font-mono text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCaseId(isSelected ? null : c.caseId);
                        }}
                      >
                        {isSelected ? "Close Drill-Down" : "Inspect Trace →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Case Drill-Down Section (Task 8) */}
      {selectedCard && (
        <div className="space-y-4 mb-8">
          <Card pad={false} className="border-primary/40 shadow-sm">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <SectionLabel>Case Drill-Down</SectionLabel>
                  <span className="font-mono text-[12px] font-700 bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {selectedCard.caseId.toUpperCase()}
                  </span>
                  <Badge variant={selectedCard.status === "PASS" ? "ok" : "high"}>
                    {selectedCard.status}
                  </Badge>
                </div>
                <h3 className="font-display font-700 text-[18px] mt-1">{selectedCard.caseLabel}</h3>
                <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  Expected: {selectedCard.expectedRouting} → Actual: {String(selectedCard.actualRouting)} ({selectedCard.routingMatched ? "MATCH" : "MISMATCH"})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <RiskBadge level={selectedCard.finalRiskLevel} score={selectedCard.finalRiskScore} />
                <button
                  type="button"
                  onClick={() => setSelectedCaseId(null)}
                  className="text-[12px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Drill-down Navigation Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-muted/10 overflow-x-auto">
              {[
                { key: "adaptive", label: `Adaptive Step Trace (${selectedCard.adaptiveTrace.length})` },
                { key: "questions", label: `Questions Asked (${selectedCard.askedQuestions.length})` },
                { key: "contradictions", label: `Contradictions (${selectedCard.contradictions.length})` },
                { key: "invariants", label: `Invariant Checks (${selectedCard.invariantChecks.length})` },
                { key: "trace", label: `Full Decision Trace (${selectedCard.fullDecisionTrace.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDrillDownTab(tab.key as typeof drillDownTab)}
                  className={`text-[12px] font-500 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                    drillDownTab === tab.key
                      ? "bg-primary text-primary-foreground font-600"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drill-Down Content Area */}
            <div className="p-5">
              {/* Tab 1: Step-by-Step Adaptive Trace */}
              {drillDownTab === "adaptive" && (
                <div className="space-y-4">
                  <p className="text-[12.5px] text-muted-foreground mb-3">
                    Turn-by-turn progression showing why each question was selected, the score breakdown, candidates evaluated, and before/after state transitions.
                  </p>

                  {selectedCard.adaptiveTrace.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm font-mono">
                      No adaptive steps recorded for this case.
                    </div>
                  ) : (
                    selectedCard.adaptiveTrace.map((step) => (
                      <AdaptiveStepCard key={step.turnNumber} step={step} />
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Questions Asked in Order */}
              {drillDownTab === "questions" && (
                <div className="space-y-3">
                  <div className="font-mono text-[12px] text-muted-foreground mb-2">
                    Sequential Q&A transcript for {selectedCard.caseId.toUpperCase()}:
                  </div>
                  {selectedCard.askedQuestions.map((q, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-1">
                        <span>QUESTION {idx + 1} · ID: {q.id}</span>
                      </div>
                      <div className="font-500 text-[13.5px] text-foreground mb-2">
                        {q.text}
                      </div>
                      <div className="text-[12px] bg-card border border-border p-2 rounded flex items-center gap-2">
                        <span className="font-mono text-muted-foreground uppercase text-[11px]">Answer Received:</span>
                        <span className="font-600 text-primary">{q.answer}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Contradictions */}
              {drillDownTab === "contradictions" && (
                <div className="space-y-3">
                  {selectedCard.contradictions.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                      No contradictions were triggered in this case scenario.
                    </div>
                  ) : (
                    selectedCard.contradictions.map((c, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-risk-mod/40 bg-risk-mod/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[12px] font-700 text-risk-mod">
                            CONTRADICTION DETECTED · {c.field.toUpperCase()}
                          </span>
                          <Badge variant="warn">{c.severity}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[12.5px] mb-2 font-mono">
                          <div className="p-2 rounded bg-card border border-border">
                            <div className="text-[10px] text-muted-foreground">PREVIOUS VALUE</div>
                            <div className="font-600">{String(c.previousValue)}</div>
                          </div>
                          <div className="p-2 rounded bg-card border border-border">
                            <div className="text-[10px] text-muted-foreground">NEW VALUE</div>
                            <div className="font-600 text-risk-high">{String(c.newValue)}</div>
                          </div>
                        </div>
                        <div className="text-[12px] text-muted-foreground">{c.reason}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Invariant Checks */}
              {drillDownTab === "invariants" && (
                <div className="space-y-2">
                  <div className="font-mono text-[12px] text-muted-foreground mb-2">
                    Deterministic invariant validation assertions:
                  </div>
                  {selectedCard.invariantChecks.map((inv, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-4 ${
                        inv.passed ? "border-border bg-card" : "border-risk-high/40 bg-risk-high/5"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-600 text-[12.5px]">{inv.name}</div>
                        <div className="text-[12px] text-muted-foreground">{inv.message}</div>
                      </div>
                      <Badge variant={inv.passed ? "ok" : "high"}>
                        {inv.passed ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 5: Full Decision Trace */}
              {drillDownTab === "trace" && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {selectedCard.fullDecisionTrace.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm font-mono">
                      No decision trace available.
                    </div>
                  ) : (
                    selectedCard.fullDecisionTrace.map((entry) => (
                      <div
                        key={entry.stepNumber}
                        className="p-3 rounded-lg border border-border bg-card text-[12.5px]"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground mb-1">
                          <span>
                            STEP {entry.stepNumber} · {entry.component.toUpperCase()} · {entry.type}
                          </span>
                          <span>{entry.timestamp.split("T")[1]?.slice(0, 8) || entry.timestamp}</span>
                        </div>
                        <div className="font-500 text-foreground mb-1">{entry.action}</div>
                        <div className="font-mono text-[11.5px] text-primary">{entry.result}</div>
                        {entry.note && (
                          <div className="text-[11.5px] text-muted-foreground mt-1">{entry.note}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageWrap>
  );
}

function AdaptiveStepCard({ step }: { step: AdaptiveStepTrace }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-700 bg-muted px-2 py-0.5 rounded">
            TURN {step.turnNumber}
          </span>
          <Badge variant="neutral">{step.category}</Badge>
          <span className="font-mono text-[11px] text-muted-foreground">ID: {step.questionId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-primary font-600">
            Score: {step.selectionScore.toFixed(1)}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            {expanded ? "Hide Details ▲" : "Show Candidates ▼"}
          </button>
        </div>
      </div>

      <div className="font-500 text-[13.5px] text-foreground mb-2">
        {step.questionText}
      </div>

      <div className="text-[12px] text-muted-foreground mb-3 italic">
        Rationale: {step.selectionRationale}
      </div>

      {/* Before / After State Transition Grid (Task 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
        {/* BEFORE */}
        <div className="p-2.5 rounded bg-muted/20 border border-border text-[12px]">
          <div className="font-mono text-[10px] text-muted-foreground uppercase font-700 mb-1">
            State Before Question
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">Risk Level & Score:</span>
            <span className="font-mono font-600">{step.stateBefore.riskLevel} ({step.stateBefore.riskScore.toFixed(1)})</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">Routing:</span>
            <span className="font-mono text-muted-foreground">{step.stateBefore.routingOutcome}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Missing: {step.stateBefore.missingCriticalFields.length > 0 ? step.stateBefore.missingCriticalFields.join(", ") : "None"}
          </div>
        </div>

        {/* AFTER */}
        <div className="p-2.5 rounded bg-muted/20 border border-border text-[12px]">
          <div className="font-mono text-[10px] text-primary uppercase font-700 mb-1 flex items-center justify-between">
            <span>State After Answer: "{step.answerReceived.rawAnswer}"</span>
            {step.stateAfter.riskDelta !== 0 && (
              <span className={step.stateAfter.riskDelta > 0 ? "text-risk-high" : "text-risk-low"}>
                Δ {step.stateAfter.riskDelta > 0 ? `+${step.stateAfter.riskDelta.toFixed(1)}` : step.stateAfter.riskDelta.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">New Risk Level:</span>
            <span className="font-mono font-600 text-foreground">{step.stateAfter.riskLevel} ({step.stateAfter.riskScore.toFixed(1)})</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground">New Routing:</span>
            <span className="font-mono font-600 text-primary">{step.stateAfter.routingOutcome}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Resolved: <span className="font-mono text-primary font-600">{step.answerReceived.resolvesField}</span>
          </div>
        </div>
      </div>

      {/* Top Alternative Candidates Breakdown */}
      {expanded && step.topCandidates && step.topCandidates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-hairline">
          <div className="font-mono text-[11px] text-muted-foreground mb-2">
            Top Alternative Candidate Questions Evaluated ({step.candidatesCount} available):
          </div>
          <div className="space-y-1.5">
            {step.topCandidates.map((cand, i) => (
              <div
                key={cand.id}
                className="flex items-center justify-between text-[11.5px] p-2 rounded bg-muted/30 font-mono"
              >
                <div className="truncate mr-3">
                  <span className="text-muted-foreground">#{i + 1} [{cand.id}]:</span> {cand.text}
                </div>
                <span className="text-primary font-600 shrink-0">
                  Score: {cand.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsScreen() {
  const groups = [
    {
      title: "Risk Engine",
      items: [
        ["Escalation threshold", "Score ≥ 8"],
        ["Contradiction policy", "Invalidate + reassess"],
        ["Impute missing values", "Never"],
      ],
    },
    {
      title: "Adaptive Interview",
      items: [
        ["Max questions / case", "10"],
        ["Question selection", "Expected information gain"],
        ["Uncertainty display", "Decision status (not %)"],
      ],
    },
    {
      title: "Environment",
      items: [
        ["Mode", "Simulation"],
        ["Model", "Agent Controller v0.4"],
        ["Human-in-the-loop", "Required for escalations"],
      ],
    },
  ];
  return (
    <PageWrap>
      <SectionLabel>Configuration</SectionLabel>
      <h2 className="font-display font-700 text-[24px] mt-1 mb-6">Settings</h2>
      <div className="space-y-4 max-w-[720px]">
        {groups.map((g) => (
          <Card key={g.title} pad={false}>
            <div className="px-5 py-3 border-b border-border font-600 text-[14px]">{g.title}</div>
            <div className="divide-y divide-hairline">
              {g.items.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13.5px]">{k}</span>
                  <span className="font-mono text-[12.5px] text-muted-foreground bg-muted rounded px-2 py-1">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageWrap>
  );
}
