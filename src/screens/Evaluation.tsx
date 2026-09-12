import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import { Card, SectionLabel } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";

const toneColor: Record<string, string> = {
  good: "var(--risk-low)",
  warn: "var(--risk-mod)",
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
  const { completedSessions } = useTriageContext();

  const totalCases = completedSessions.length;

  // Compute metrics from completed sessions
  const correctRouting = completedSessions.filter(
    (s) => s.expectedRouting && s.routingDecision?.outcome === s.expectedRouting
  ).length;
  const routingAccuracy = totalCases > 0 ? ((correctRouting / totalCases) * 100).toFixed(1) + "%" : "—";

  const highRiskCases = completedSessions.filter(
    (s) => s.riskAssessment && (s.riskAssessment.level === "HIGH" || s.riskAssessment.level === "CRITICAL")
  ).length;
  const highRiskDetection = totalCases > 0
    ? ((highRiskCases / Math.max(1, completedSessions.filter((s) => s.expectedRouting && (s.expectedRouting.includes("Immediate") || s.expectedRouting.includes("Emergency") || s.expectedRouting.includes("Escalation"))).length)) * 100).toFixed(1) + "%"
    : "—";

  const totalContradictions = completedSessions.reduce((sum, s) => sum + s.contradictions.length, 0);
  const totalEscalations = completedSessions.filter((s) => s.status === "escalated").length;
  const avgQuestions = totalCases > 0
    ? (completedSessions.reduce((sum, s) => sum + s.questionsAsked, 0) / totalCases).toFixed(1)
    : "—";

  const evalMetrics = [
    { label: "Cases Tested", value: String(totalCases), tone: "neutral" },
    { label: "Correct Routing", value: routingAccuracy, tone: totalCases > 0 ? "good" : "neutral" },
    { label: "High-Risk Detection", value: highRiskDetection, tone: totalCases > 0 ? "good" : "neutral" },
    { label: "Contradictions Detected", value: String(totalContradictions), tone: "neutral" },
    { label: "Escalations", value: String(totalEscalations), tone: totalEscalations > 0 ? "warn" : "neutral" },
    { label: "Avg Questions / Case", value: avgQuestions, tone: "neutral" },
  ];

  // Compute routing distribution from sessions
  const routingCounts: Record<string, number> = {};
  for (const session of completedSessions) {
    const outcome = session.routingDecision?.outcome ?? "Unknown";
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

  // Compute risk progression from sessions (average scores)
  const riskProgression = completedSessions.map((s, i) => ({
    t: `S${i + 1}`,
    score: s.riskAssessment?.score ?? 0,
  }));

  // Questions per case distribution
  const questionBands: Record<string, number> = { "1-3": 0, "4-6": 0, "7-9": 0, "10+": 0 };
  for (const session of completedSessions) {
    if (session.questionsAsked <= 3) questionBands["1-3"]++;
    else if (session.questionsAsked <= 6) questionBands["4-6"]++;
    else if (session.questionsAsked <= 9) questionBands["7-9"]++;
    else questionBands["10+"]++;
  }
  const questionsPerCase = Object.entries(questionBands).map(([band, cases]) => ({ band, cases }));

  // Contradiction recovery
  const reassessed = completedSessions.filter((s) => s.contradictions.length > 0).length;

  return (
    <PageWrap>
      <SectionLabel>System Evaluation{totalCases > 0 ? ` · ${totalCases}-case benchmark` : ""}</SectionLabel>
      <h2 className="font-display font-700 text-[24px] mt-1 mb-6">Evaluation Dashboard</h2>

      {totalCases === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground text-center py-8">
            No completed sessions yet. Run through synthetic patient cases to see evaluation metrics.
            Navigate to <strong>Start Triage</strong> to begin.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 mb-4">
            {evalMetrics.map((m) => (
              <Card key={m.label} className="py-4">
                <SectionLabel>{m.label}</SectionLabel>
                <div
                  className="font-display font-700 text-[30px] mt-2 leading-none tnum"
                  style={{ color: toneColor[m.tone] }}
                >
                  {m.value}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {routingDistribution.length > 0 && (
              <ChartCard title="Routing Distribution" sub="Outcomes across completed cases">
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie
                        data={routingDistribution}
                        dataKey="value"
                        innerRadius={54}
                        outerRadius={80}
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
                  <div className="space-y-2.5">
                    {routingDistribution.map((r) => (
                      <div key={r.name} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                        <span className="text-[13px] font-500 w-28 truncate">{r.name}</span>
                        <span className="font-mono text-[13px] text-muted-foreground tnum">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            )}

            {riskProgression.length > 0 && (
              <ChartCard title="Risk Scores" sub="Final score per completed case">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={riskProgression} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="var(--hairline)" vertical={false} />
                    <XAxis dataKey="t" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <ChartCard title="Questions per Case" sub="Distribution across completed cases">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={questionsPerCase} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--hairline)" vertical={false} />
                  <XAxis dataKey="band" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="cases" fill="var(--signal)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Contradiction Recovery" sub="Detected vs. safely resolved">
              <div className="flex flex-col justify-center h-[200px] gap-5">
                {[
                  ["Contradictions detected", totalContradictions, Math.max(1, totalContradictions), "var(--risk-mod)"],
                  ["Sessions with contradictions", reassessed, Math.max(1, totalCases), "var(--risk-low)"],
                  ["Escalated to human", totalEscalations, Math.max(1, totalCases), "var(--risk-high)"],
                ].map(([label, val, total, color]) => (
                  <div key={label as string}>
                    <div className="flex items-center justify-between text-[13px] mb-1.5">
                      <span className="font-500">{label}</span>
                      <span className="font-mono text-muted-foreground tnum">{val as number}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${((val as number) / (total as number)) * 100}%`, background: color as string }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </PageWrap>
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
