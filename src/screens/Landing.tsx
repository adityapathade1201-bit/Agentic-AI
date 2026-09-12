import { ShieldAlert, ArrowRight, Cpu, Calculator, Route, LifeBuoy } from "lucide-react";
import { Button } from "../components/ui";

const pipeline = [
  { icon: Cpu, name: "LLM / Agent", role: "Interprets information and chooses the questions that matter most.", tone: "#1a56db" },
  { icon: Calculator, name: "Deterministic Risk Engine", role: "Calculates a synthetic, rule-based risk score. No model inference.", tone: "#0694a2" },
  { icon: Route, name: "Routing Policy", role: "Maps the score onto a predefined routing outcome.", tone: "#c27803" },
  { icon: LifeBuoy, name: "Escalation Policy", role: "Prevents unsafe certainty — hands off to humans when in doubt.", tone: "#e02424" },
];

export default function Landing({
  onEnter,
  onArchitecture,
}: {
  onEnter: () => void;
  onArchitecture: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between h-16 px-6 md:px-10 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center h-8 w-8 rounded-md bg-primary text-primary-foreground">
            <ShieldAlert size={17} strokeWidth={2.2} />
          </div>
          <div className="font-display font-700 text-[16px]">TriageFlow AI</div>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Agentic AI Hackathon · v0.4
        </span>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1.05fr_1fr]">
        {/* Left — copy */}
        <div className="flex flex-col justify-center px-6 md:px-14 py-16 max-w-[640px]">
          <span className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-signal border border-border rounded-full px-3 py-1 mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-signal pulse-dot" />
            Adaptive Emergency Triage Agent
          </span>
          <h1 className="font-display font-800 text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.02] tracking-tight">
            Ask less.
            <br />
            Reassess continuously.
            <br />
            <span className="text-primary">Escalate safely.</span>
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground max-w-[52ch]">
            An explainable agent that asks only what matters, continuously
            reassesses risk, and escalates when uncertainty becomes unsafe.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="md" onClick={onEnter} className="px-5">
              Enter Simulation <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" size="md" onClick={onArchitecture}>
              View Architecture
            </Button>
          </div>

          <div className="mt-10 flex items-start gap-2.5 rounded-md border border-[var(--risk-mod)] bg-[#fdf3e2] px-4 py-3 max-w-[54ch]">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" style={{ color: "var(--risk-mod)" }} />
            <p className="text-[12.5px] leading-snug" style={{ color: "#8a6d1f" }}>
              <strong>Simulation only.</strong> This system is a decision-support
              prototype and does not provide medical diagnosis.
            </p>
          </div>
        </div>

        {/* Right — pipeline */}
        <div className="border-t lg:border-t-0 lg:border-l border-border bg-card px-6 md:px-12 py-14 flex flex-col justify-center">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
            Control flow
          </div>
          <h2 className="font-display font-600 text-xl mb-1">The AI is not the final decision-maker.</h2>
          <p className="text-[13px] text-muted-foreground mb-8">
            Four separable components, each with a bounded responsibility.
          </p>
          <div className="relative">
            <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
            <div className="space-y-4">
              {pipeline.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.name} className="relative flex gap-4 items-start">
                    <div
                      className="relative z-10 grid place-items-center h-10 w-10 rounded-lg border border-border bg-card shrink-0"
                      style={{ color: p.tone }}
                    >
                      <Icon size={19} strokeWidth={2} />
                    </div>
                    <div className="pt-0.5">
                      <div className="font-600 text-[14px]">{p.name}</div>
                      <div className="text-[13px] text-muted-foreground leading-snug">
                        {p.role}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
