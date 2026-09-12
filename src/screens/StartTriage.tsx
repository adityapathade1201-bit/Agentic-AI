import { useState } from "react";
import { PlayCircle, Info, AlertTriangle } from "lucide-react";
import { Card, SectionLabel, Button, RiskBadge } from "../components/ui";
import { PageWrap } from "../components/Shell";
import { useTriageContext } from "../context/TriageContext";

export default function StartTriage({ onInit }: { onInit: () => void }) {
  const { startSession, availableCases, sessionStatus } = useTriageContext();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleInit = () => {
    if (!selectedCaseId) return;
    startSession(selectedCaseId);
    onInit();
  };

  const difficultyColors: Record<string, { color: string; bg: string }> = {
    Low: { color: "var(--risk-low)", bg: "#e6f6ef" },
    Moderate: { color: "var(--risk-mod)", bg: "#fdf3e2" },
    High: { color: "var(--risk-high)", bg: "#fdeaea" },
    Critical: { color: "var(--risk-crit)", bg: "#f9e5e5" },
  };

  return (
    <PageWrap>
      <div className="max-w-[920px] mx-auto">
        <SectionLabel>Patient Intake</SectionLabel>
        <h2 className="font-display font-700 text-[24px] mt-1">Start Triage</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-[60ch]">
          Select a synthetic patient case below. Each case starts with intentionally
          incomplete information — the agent will resolve gaps adaptively.
        </p>

        {sessionStatus === "active" && (
          <div className="flex items-start gap-2.5 rounded-md border border-[var(--risk-mod)] bg-[#fdf3e2] px-4 py-3 mb-4">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--risk-mod)" }} />
            <p className="text-[12.5px] leading-snug" style={{ color: "#8a6d1f" }}>
              <strong>Session in progress.</strong> Starting a new triage will replace the current session.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {availableCases.map((c) => {
            const selected = selectedCaseId === c.id;
            const diff = difficultyColors[c.difficulty] ?? difficultyColors.Low;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`text-left rounded-lg border-2 p-4 transition-all cursor-pointer ${
                  selected
                    ? "border-primary bg-accent/60 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[12px] font-600 text-primary">{c.id}</span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{ background: diff.bg, color: diff.color }}
                  >
                    {c.difficulty}
                  </span>
                </div>
                <div className="font-600 text-[13.5px] mb-1 leading-snug">{c.label}</div>
                <p className="text-[12px] text-muted-foreground leading-snug">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.initialSymptoms.slice(0, 3).map((s) => (
                    <span
                      key={s.name}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {s.name}: {s.severity ?? "?"}
                    </span>
                  ))}
                </div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Age: {c.age ?? "?"} · Vitals: {c.vitals.heartRate ? `HR ${c.vitals.heartRate}` : "?"}{" "}
                  {c.vitals.spo2 ? `SpO₂ ${c.vitals.spo2}%` : ""}
                </div>
              </button>
            );
          })}
        </div>

        {selectedCaseId && (
          <Card className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[12px] font-600 text-primary">{selectedCaseId}</span>
              <span className="text-[13px] font-500">
                {availableCases.find((c) => c.id === selectedCaseId)?.label}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-[13px]">
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Initial Symptoms</div>
                {availableCases.find((c) => c.id === selectedCaseId)?.initialSymptoms.map((s) => (
                  <div key={s.name} className="flex items-center justify-between py-0.5">
                    <span>{s.name}</span>
                    <span className="font-mono text-muted-foreground">{s.severity ?? "Unknown"}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Available Vitals</div>
                {(() => {
                  const c = availableCases.find((c) => c.id === selectedCaseId);
                  if (!c) return null;
                  return (
                    <>
                      <div className="flex justify-between py-0.5"><span>Heart Rate</span><span className="font-mono text-muted-foreground">{c.vitals.heartRate ?? "Unknown"}</span></div>
                      <div className="flex justify-between py-0.5"><span>SpO₂</span><span className="font-mono text-muted-foreground">{c.vitals.spo2 ? `${c.vitals.spo2}%` : "Unknown"}</span></div>
                      <div className="flex justify-between py-0.5"><span>BP</span><span className="font-mono text-muted-foreground">{c.vitals.bloodPressureSystolic ? `${c.vitals.bloodPressureSystolic}/${c.vitals.bloodPressureDiastolic}` : "Unknown"}</span></div>
                    </>
                  );
                })()}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Risk Factors</div>
                {(() => {
                  const c = availableCases.find((c) => c.id === selectedCaseId);
                  if (!c || c.riskFactors.length === 0) return <span className="text-muted-foreground italic">None reported</span>;
                  return c.riskFactors.map((rf) => (
                    <div key={rf} className="py-0.5">{rf}</div>
                  ));
                })()}
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-start gap-2.5 rounded-md bg-accent/60 border border-border px-3.5 py-3 mb-4">
          <Info size={15} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-[12.5px] text-muted-foreground leading-snug">
            All cases use <span className="font-mono text-[11.5px]">synthetic test data</span>.
            Missing critical fields are tracked explicitly and shown as{" "}
            <span className="font-mono text-[11.5px]">Unknown</span>.
            The risk engine never imputes silent defaults.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={handleInit}
            disabled={!selectedCaseId}
            className="px-5"
          >
            <PlayCircle size={16} /> Initialize Triage
          </Button>
        </div>
      </div>
    </PageWrap>
  );
}
