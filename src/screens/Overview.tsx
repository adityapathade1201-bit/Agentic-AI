import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, SectionLabel, Button, RiskBadge, StatusDot } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";
import type { RiskLevel } from "../lib/data";

const activityColor: Record<string, string> = {
  conflict: "var(--risk-high)",
  route: "var(--risk-mod)",
  risk: "var(--primary)",
  vital: "var(--signal)",
  question: "#8b5cf6",
  state: "var(--muted-foreground)",
  escalation: "var(--risk-crit)",
};

const statusColor: Record<string, string> = {
  Escalated: "var(--risk-high)",
  Active: "var(--primary)",
  Completed: "var(--risk-low)",
  escalated: "var(--risk-high)",
  active: "var(--primary)",
  completed: "var(--risk-low)",
  idle: "var(--muted-foreground)",
};

export default function Overview({ onStart }: { onStart: () => void }) {
  const {
    sessionStatus,
    completedSessions,
    agentActivity,
    systemModules,
    riskAssessment,
    caseId,
    questionsAsked,
    routingDecision,
  } = useTriageContext();

  // Compute KPIs from real data
  const activeCases = sessionStatus === "active" ? 1 : 0;
  const completedCount = completedSessions.length;
  const highRiskCount = completedSessions.filter(
    (s) => s.riskAssessment && (s.riskAssessment.level === "HIGH" || s.riskAssessment.level === "CRITICAL")
  ).length + (riskAssessment && (riskAssessment.level === "HIGH" || riskAssessment.level === "CRITICAL") ? 1 : 0);
  const avgQuestions = completedSessions.length > 0
    ? (completedSessions.reduce((sum, s) => sum + s.questionsAsked, 0) / completedSessions.length).toFixed(1)
    : questionsAsked > 0 ? String(questionsAsked) : "—";

  const kpis = [
    { label: "Active Cases", value: String(activeCases), delta: activeCases > 0 ? "+1" : "0", trend: activeCases > 0 ? "up" : "flat", sub: "in triage now" },
    { label: "Completed Assessments", value: String(completedCount), delta: completedCount > 0 ? `+${completedCount}` : "0", trend: completedCount > 0 ? "up" : "flat", sub: "this session" },
    { label: "High-Risk Cases", value: String(highRiskCount), delta: highRiskCount > 0 ? `+${highRiskCount}` : "0", trend: highRiskCount > 0 ? "up" : "flat", sub: "requires review" },
    { label: "Avg Questions / Case", value: avgQuestions, delta: "", trend: "flat", sub: "adaptive interview" },
  ];

  // Build recent cases from completed sessions + active
  const recentCases: { id: string; risk: RiskLevel; questions: number; routing: string; status: string; updated: string }[] = [];

  if (sessionStatus === "active" && caseId) {
    recentCases.push({
      id: caseId,
      risk: (riskAssessment?.level ?? "LOW") as RiskLevel,
      questions: questionsAsked,
      routing: routingDecision?.outcome ?? "Pending",
      status: "Active",
      updated: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  for (const session of completedSessions.slice(0, 5)) {
    recentCases.push({
      id: session.caseId,
      risk: (session.riskAssessment?.level ?? "LOW") as RiskLevel,
      questions: session.questionsAsked,
      routing: session.routingDecision?.outcome ?? "Unknown",
      status: session.status === "escalated" ? "Escalated" : "Completed",
      updated: session.completedAt ?? "—",
    });
  }

  const onlineCount = systemModules.filter((m) => m.status === "Online").length;

  return (
    <PageWrap>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <SectionLabel>Command Center</SectionLabel>
          <h2 className="font-display font-700 text-[26px] mt-1 leading-tight">
            Adaptive Emergency Triage
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Ask less. Reassess continuously. Escalate safely.
          </p>
        </div>
        <Button onClick={onStart} className="px-5">
          Start New Triage <ArrowRight size={16} />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map((k) => {
          const up = k.trend === "up";
          return (
            <Card key={k.label}>
              <SectionLabel>{k.label}</SectionLabel>
              <div className="flex items-end justify-between mt-3">
                <div className="font-display font-700 text-[34px] leading-none tnum">
                  {k.value}
                </div>
                {k.delta && (
                  <span
                    className="inline-flex items-center gap-0.5 font-mono text-[11px] font-500"
                    style={{ color: up ? "var(--risk-high)" : "var(--risk-low)" }}
                  >
                    {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {k.delta}
                  </span>
                )}
              </div>
              <div className="text-[12px] text-muted-foreground mt-2">{k.sub}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          {/* Recent cases */}
          <Card pad={false}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="font-600 text-[14px]">Recent Cases</div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {recentCases.length} case{recentCases.length !== 1 ? "s" : ""}
              </span>
            </div>
            {recentCases.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No cases yet. Start a triage to see results here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="font-450 px-5 py-2.5">Patient ID</th>
                      <th className="font-450 px-3 py-2.5">Risk</th>
                      <th className="font-450 px-3 py-2.5 text-right">Questions</th>
                      <th className="font-450 px-3 py-2.5">Routing</th>
                      <th className="font-450 px-3 py-2.5">Status</th>
                      <th className="font-450 px-5 py-2.5 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.map((c) => (
                      <tr
                        key={c.id + c.status}
                        className="border-b border-hairline last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono font-500">{c.id}</td>
                        <td className="px-3 py-3"><RiskBadge level={c.risk} size="sm" /></td>
                        <td className="px-3 py-3 text-right font-mono tnum">{c.questions}</td>
                        <td className="px-3 py-3 text-muted-foreground">{c.routing}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <StatusDot color={statusColor[c.status] ?? "var(--muted-foreground)"} />
                            <span className="text-[12.5px]">{c.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-muted-foreground tnum">
                          {c.updated}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* System status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="font-600 text-[14px]">Current System Status</div>
              <span className="font-mono text-[11px] text-risk-low">
                {onlineCount} / {systemModules.length} Online
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {systemModules.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-md border border-border px-3.5 py-3 bg-panel"
                >
                  <div className="flex items-center gap-2.5">
                    <StatusDot color={s.status === "Online" ? "var(--risk-low)" : "var(--risk-high)"} pulse />
                    <span className="text-[13px] font-500">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">{s.latency}</span>
                    <span className={`font-mono text-[11px] uppercase ${s.status === "Online" ? "text-risk-low" : "text-risk-high"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Agent activity */}
        <Card pad={false} className="h-fit">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <StatusDot color="var(--signal)" pulse />
            <div className="font-600 text-[14px]">Agent Activity</div>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {sessionStatus === "active" ? "Live" : agentActivity.length > 0 ? "Recent" : "Idle"}
            </span>
          </div>
          <div className="p-3 space-y-0.5 max-h-[440px] overflow-y-auto">
            {agentActivity.length === 0 ? (
              <div className="px-2 py-8 text-center text-[12px] text-muted-foreground">
                No activity yet. Start a triage session.
              </div>
            ) : (
              [...agentActivity].reverse().map((a, i) => (
                <div key={i} className="flex gap-3 px-2 py-2 rounded-md hover:bg-muted/50">
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: activityColor[a.kind] ?? "var(--muted-foreground)" }}
                    />
                    {i < agentActivity.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-[13px] font-500 leading-tight">{a.event}</div>
                    <div className="text-[12px] text-muted-foreground font-mono mt-0.5">{a.detail}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{a.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageWrap>
  );
}
