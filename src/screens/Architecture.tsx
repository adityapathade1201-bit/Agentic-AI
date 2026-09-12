import {
  Cpu,
  Calculator,
  Route,
  LifeBuoy,
  Database,
  GitBranch,
  ShieldAlert,
  ArrowRight,
  ArrowDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  RefreshCw,
  Eye,
  UserCheck,
  FileSpreadsheet,
  Activity,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { Card, SectionLabel, Button } from "../components/ui";
import { PageWrap } from "../components/Shell";

interface ArchitectureProps {
  onStart?: () => void;
  onDashboard?: () => void;
}

export default function Architecture({ onStart, onDashboard }: ArchitectureProps) {
  return (
    <PageWrap>
      {/* Top Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <SectionLabel>System Design & Safety Boundaries</SectionLabel>
          <h1 className="font-display font-700 text-[28px] md:text-[32px] mt-1 leading-tight text-foreground">
            System Architecture
          </h1>
          <p className="text-muted-foreground text-[14.5px] mt-1">
            Adaptive emergency triage with bounded AI responsibility.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onDashboard && (
            <Button variant="secondary" size="md" onClick={onDashboard}>
              <LayoutDashboard size={15} /> Back to Dashboard
            </Button>
          )}
          {onStart && (
            <Button size="md" onClick={onStart} className="px-5">
              Start Simulation <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Architectural Anchor Callout */}
      <div className="mb-8 rounded-lg border-2 border-primary/30 bg-primary/5 p-5 md:p-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="grid place-items-center h-10 w-10 rounded-md bg-primary text-primary-foreground shrink-0 mt-0.5">
            <ShieldAlert size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-primary font-600 mb-1">
              Core Architectural Principle
            </div>
            <h2 className="font-display font-700 text-[19px] md:text-[22px] text-foreground leading-snug">
              &ldquo;AI proposes. Deterministic policy decides. Humans handle unsafe uncertainty.&rdquo;
            </h2>
            <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-[85ch]">
              LLMs and adaptive agents excel at information gathering and conversational probing under uncertainty, but
              clinical safety mandates that final risk calculations, routing thresholds, and safety escalations remain
              100% deterministic, transparent, and auditable.
            </p>
          </div>
        </div>
      </div>

      {/* Main Flow Diagram */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionLabel>End-to-End Control Flow</SectionLabel>
            <h2 className="font-display font-600 text-lg text-foreground">
              Clinical Triage Pipeline & Observability
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[12px] font-mono">
            <span className="flex items-center gap-1.5 text-[#1a56db]">
              <span className="h-2 w-2 rounded-full bg-[#1a56db]" /> Agent Probing
            </span>
            <span className="flex items-center gap-1.5 text-[#0694a2]">
              <span className="h-2 w-2 rounded-full bg-[#0694a2]" /> Deterministic Safety
            </span>
            <span className="flex items-center gap-1.5 text-[#8b5cf6]">
              <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" /> Persistence / Audit
            </span>
          </div>
        </div>

        {/* Central Pipeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Main 10-Step Sequential Flow */}
          <div className="lg:col-span-8 space-y-3">
            {/* Step 1: Patient Input */}
            <Card className="border-l-4 border-l-border hover:border-l-primary transition-all">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-muted text-muted-foreground shrink-0 font-mono text-[13px] font-700">
                  01
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Patient Input / Intake</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Intake Form
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Baseline demographics, chief complaint, initial symptoms, and optional triage vital measurements.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 2: Agent Controller */}
            <Card className="border-l-4 border-l-[#1a56db] bg-[#1a56db]/5">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#1a56db] text-white shrink-0">
                  <Cpu size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Agent Controller</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#1a56db]/10 text-[#1a56db] font-600">
                      agentController.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Central orchestrator that coordinates the full triage lifecycle, dispatches steps, and maintains
                    the complete step-by-step decision trace.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 3: Patient State Manager */}
            <Card className="border-l-4 border-l-[#0694a2]">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#0694a2]/10 text-[#0694a2] shrink-0">
                  <Boxes size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Patient State Manager</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#0694a2]/10 text-[#0694a2] font-600">
                      stateManager.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Maintains immutable history for all demographic, symptom, vital, and risk factor fields. Tracks
                    Known / Unknown / Updated / Conflicting statuses and identifies missing critical gaps.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 4: Adaptive Question Selector */}
            <Card className="border-l-4 border-l-[#1a56db] bg-[#1a56db]/5">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#1a56db] text-white shrink-0">
                  <Eye size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Adaptive Question Selector</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#1a56db]/10 text-[#1a56db] font-600">
                      questionSelector.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Selects the next most informative inquiry using dynamic scoring (Safety Relevance + Risk Impact +
                    Uncertainty Reduction + Routing Impact &minus; Already Known Penalty).
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 5: Deterministic Risk Engine */}
            <Card className="border-l-4 border-l-[#0694a2]">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#0694a2]/10 text-[#0694a2] shrink-0">
                  <Calculator size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Deterministic Risk Engine</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#0694a2]/10 text-[#0694a2] font-600">
                      riskEngine.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Calculates a synthetic rule-based risk score (0.0&ndash;10.0) and maps to LOW / MODERATE / HIGH /
                    CRITICAL / UNRESOLVED. Strictly deterministic: zero LLM inference in risk computation.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 6: Contradiction Detector */}
            <Card className="border-l-4 border-l-[#c27803]">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#c27803]/10 text-[#c27803] shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Contradiction Detector</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#c27803]/10 text-[#c27803] font-600">
                      contradictionDetector.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Detects conflicting patient claims, severe vital fluctuations (e.g. &Delta;HR &ge; 30, &Delta;SpO₂ &ge; 8),
                    and impossible physiological state changes over time.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 7: Reassessment Engine */}
            <Card className="border-l-4 border-l-[#0694a2]">
              <div className="flex items-start gap-3.5">
                <div className="grid place-items-center h-9 w-9 rounded-md bg-[#0694a2]/10 text-[#0694a2] shrink-0">
                  <RefreshCw size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-600 text-[14.5px] text-foreground">Reassessment Engine</span>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#0694a2]/10 text-[#0694a2] font-600">
                      reassessmentEngine.ts
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                    Evaluates delta changes between pre-turn and post-turn states. Adapts routing and ensures patient
                    deterioration or symptom escalation updates routing in real-time.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 8 & 9: Routing & Escalation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="border-l-4 border-l-[#c27803]">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center h-8 w-8 rounded-md bg-[#c27803]/10 text-[#c27803] shrink-0">
                    <Route size={16} />
                  </div>
                  <div>
                    <div className="font-600 text-[14px] text-foreground">Routing Policy</div>
                    <div className="font-mono text-[10px] text-[#c27803]">routingEngine.ts</div>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Maps deterministic risk levels to Standard, Urgent, or Immediate Emergency clinical tracks.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-l-4 border-l-[#e02424] bg-[#e02424]/5">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center h-8 w-8 rounded-md bg-[#e02424] text-white shrink-0">
                    <LifeBuoy size={16} />
                  </div>
                  <div>
                    <div className="font-600 text-[14px] text-foreground">Escalation Policy</div>
                    <div className="font-mono text-[10px] text-[#e02424] font-600">escalationEngine.ts</div>
                    <p className="text-[12px] text-muted-foreground mt-1">
                      Prevents artificial certainty. Triggers human clinician review when contradictions or critical data gaps persist.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex justify-center my-0.5 text-muted-foreground">
              <ArrowDown size={18} strokeWidth={2.2} />
            </div>

            {/* Step 10: Final Disposition */}
            <Card className="border-2 border-primary/40 bg-card">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center h-9 w-9 rounded-md bg-primary text-primary-foreground">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div className="font-600 text-[14.5px] text-foreground">Final Routing / Human Clinician Handoff</div>
                    <div className="text-[12.5px] text-muted-foreground">
                      Standard &middot; Urgent Assessment &middot; Immediate Emergency &middot; Human Review / Escalation
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded bg-primary/10 text-primary font-600">
                  Terminal Disposition
                </span>
              </div>
            </Card>
          </div>

          {/* Right Column: Supporting Infrastructure (Supabase & Decision Trace) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Supabase Persistence Card */}
            <Card className="border-t-4 border-t-[#8b5cf6] flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="grid place-items-center h-8 w-8 rounded-md bg-[#8b5cf6]/10 text-[#8b5cf6]">
                  <Database size={17} />
                </div>
                <div>
                  <h3 className="font-display font-600 text-[15px] text-foreground">Supabase Persistence</h3>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    PostgreSQL &middot; Anonymous Auth &middot; RLS
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-4">
                Asynchronous, non-blocking cloud persistence. Agent execution never depends on remote availability.
              </p>

              <div className="space-y-2 font-mono text-[11.5px]">
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>1. triage_sessions</span>
                  <span className="text-muted-foreground text-[10px]">Session Root</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>2. answers</span>
                  <span className="text-muted-foreground text-[10px]">Q&amp;A Log</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>3. patient_state_snapshots</span>
                  <span className="text-muted-foreground text-[10px]">Turn Versions</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>4. risk_assessments</span>
                  <span className="text-muted-foreground text-[10px]">Scores</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>5. routing_decisions</span>
                  <span className="text-muted-foreground text-[10px]">Outcomes</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>6. patient_events</span>
                  <span className="text-muted-foreground text-[10px]">Mutations</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>7. contradictions</span>
                  <span className="text-muted-foreground text-[10px]">Conflicts</span>
                </div>
                <div className="p-2 rounded bg-muted/70 border border-border flex items-center justify-between">
                  <span>8. decision_trace_entries</span>
                  <span className="text-muted-foreground text-[10px]">Agent Loop</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-md bg-muted/40 border border-border text-[11.5px] text-muted-foreground">
                <div className="font-600 text-foreground mb-0.5">Strict Security Isolation</div>
                Row Level Security enforced on all 8 tables using <code className="text-primary">auth.uid() = user_id</code>.
              </div>
            </Card>

            {/* Decision Trace Card */}
            <Card className="border-t-4 border-t-primary">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="grid place-items-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                  <GitBranch size={17} />
                </div>
                <div>
                  <h3 className="font-display font-600 text-[15px] text-foreground">Decision Trace &amp; Audit Trail</h3>
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    100% Explainability
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                Every inquiry, state transition, risk computation, and routing update is logged with component source,
                action, rationale, and exact millisecond timestamp.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 rounded bg-muted border border-border">
                  <div className="font-700 text-foreground text-[13px]">100%</div>
                  <div className="text-muted-foreground text-[10px]">Deterministic Trace</div>
                </div>
                <div className="p-2 rounded bg-muted border border-border">
                  <div className="font-700 text-foreground text-[13px]">Zero</div>
                  <div className="text-muted-foreground text-[10px]">Black-Box Output</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Component Responsibilities Grid (A-H) */}
      <div className="mb-10">
        <SectionLabel>Separation of Concerns</SectionLabel>
        <h2 className="font-display font-600 text-lg text-foreground mb-4">
          Component Responsibility Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* A. LLM / Agent */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#1a56db]/10 text-[#1a56db]">
                <Cpu size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">A. LLM / Agent Layer</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Interprets patient intake &amp; free-text responses</li>
              <li>&bull; Identifies information gaps &amp; uncertainty</li>
              <li>&bull; Selects highest information-gain inquiries</li>
              <li className="text-primary font-500">&bull; MUST NOT be final routing authority</li>
            </ul>
          </Card>

          {/* B. Deterministic Risk Engine */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#0694a2]/10 text-[#0694a2]">
                <Calculator size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">B. Risk Engine</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Evaluates rule-based synthetic scoring</li>
              <li>&bull; Operates strictly on structured patient state</li>
              <li>&bull; Recalculates risk after each turn</li>
              <li className="text-primary font-500">&bull; Zero LLM inference for risk score</li>
            </ul>
          </Card>

          {/* C. Contradiction Detector */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#c27803]/10 text-[#c27803]">
                <AlertTriangle size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">C. Contradiction Detector</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Detects conflicting patient statements</li>
              <li>&bull; Flags rapid physiological fluctuations</li>
              <li>&bull; Preserves immutable change history</li>
              <li className="text-primary font-500">&bull; Triggers safety escalation when severe</li>
            </ul>
          </Card>

          {/* D. Reassessment Engine */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#0694a2]/10 text-[#0694a2]">
                <RefreshCw size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">D. Reassessment Engine</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Re-evaluates risk on new evidence</li>
              <li>&bull; Adapts routing continuously during triage</li>
              <li>&bull; Catches patient deterioration dynamically</li>
              <li className="text-primary font-500">&bull; No static single-pass assumptions</li>
            </ul>
          </Card>

          {/* E. Routing Policy */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#c27803]/10 text-[#c27803]">
                <Route size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">E. Routing Policy</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Maps deterministic scores to clinical tracks</li>
              <li>&bull; Standard vs Urgent vs Immediate Emergency</li>
              <li>&bull; Explicit transparent rule boundaries</li>
              <li className="text-primary font-500">&bull; Verified against clinical benchmark suite</li>
            </ul>
          </Card>

          {/* F. Escalation Policy */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#e02424]/10 text-[#e02424]">
                <LifeBuoy size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">F. Escalation Policy</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Prevents unsafe automated certainty</li>
              <li>&bull; Escalates on critical data gaps or conflicts</li>
              <li>&bull; Hands off to human physician evaluation</li>
              <li className="text-primary font-500">&bull; Fails safe under high uncertainty</li>
            </ul>
          </Card>

          {/* G. Supabase Persistence */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-[#8b5cf6]/10 text-[#8b5cf6]">
                <Database size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">G. Supabase Persistence</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Stores 8 core and audit tables</li>
              <li>&bull; Anonymous Auth &amp; strict RLS user isolation</li>
              <li>&bull; Asynchronous background writes</li>
              <li className="text-primary font-500">&bull; Zero runtime dependency on cloud availability</li>
            </ul>
          </Card>

          {/* H. Decision Trace */}
          <Card className="flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="grid place-items-center h-7 w-7 rounded bg-primary/10 text-primary">
                <GitBranch size={15} />
              </div>
              <h3 className="font-display font-600 text-[14px]">H. Decision Trace</h3>
            </div>
            <ul className="text-[12.5px] text-muted-foreground space-y-1.5 flex-1">
              <li>&bull; Details why each question was selected</li>
              <li>&bull; Records every risk score &amp; routing delta</li>
              <li>&bull; Complete auditable execution record</li>
              <li className="text-primary font-500">&bull; Enables full post-triage clinical review</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Agent Decision Loop Section */}
      <div className="mb-10">
        <SectionLabel>Execution Lifecycle</SectionLabel>
        <h2 className="font-display font-600 text-lg text-foreground mb-4">
          The Canonical Agent Decision Loop
        </h2>

        <Card className="overflow-x-auto">
          <div className="min-w-[800px] flex items-center justify-between py-2">
            {[
              { label: "Observe State", sub: "Inspect known fields", color: "#1a56db" },
              { label: "Identify Uncertainty", sub: "Missing critical gaps", color: "#1a56db" },
              { label: "Generate Candidates", sub: "Probe question pool", color: "#1a56db" },
              { label: "Rank Questions", sub: "Info-gain formula", color: "#1a56db" },
              { label: "Ask Question", sub: "Adaptive turn", color: "#0694a2" },
              { label: "Update State", sub: "History tracking", color: "#0694a2" },
              { label: "Recalculate Risk", sub: "Deterministic rules", color: "#0694a2" },
              { label: "Detect Conflicts", sub: "Delta analysis", color: "#c27803" },
              { label: "Reassess", sub: "Compare pre/post", color: "#0694a2" },
              { label: "Route / Escalate", sub: "Safe disposition", color: "#e02424" },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center text-center px-1.5">
                  <div
                    className="grid place-items-center h-7 w-7 rounded-full text-[11px] font-mono font-700 text-white mb-1.5 shadow-sm"
                    style={{ background: step.color }}
                  >
                    {idx + 1}
                  </div>
                  <div className="font-600 text-[12.5px] text-foreground whitespace-nowrap">{step.label}</div>
                  <div className="text-[10.5px] text-muted-foreground whitespace-nowrap">{step.sub}</div>
                </div>
                {idx < arr.length - 1 && (
                  <ChevronRight size={14} className="text-muted-foreground shrink-0 mx-0.5" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Safety Boundary Callout */}
      <div className="mb-10">
        <SectionLabel>Regulatory &amp; Safety Compliance</SectionLabel>
        <h2 className="font-display font-600 text-lg text-foreground mb-4">
          Safety Boundary &amp; Prototype Disclaimers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-[var(--risk-mod)] bg-[#fdf3e2]/40">
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="text-[#8a6d1f] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-600 text-[14px] text-[#8a6d1f]">Simulation &amp; Decision Support Only</h3>
                <p className="text-[12.5px] text-[#8a6d1f] mt-1 leading-relaxed">
                  TriageFlow AI is a research and hackathon decision-support prototype. It does NOT provide medical
                  diagnosis or replace professional clinical evaluation.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-l-4 border-l-primary bg-primary/5">
            <div className="flex items-start gap-3">
              <UserCheck size={18} className="text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-600 text-[14px] text-foreground">Deterministic Authority &amp; Human-in-the-Loop</h3>
                <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                  The LLM never makes final routing decisions. Unresolved contradictions or critical missing information
                  automatically escalate to immediate human clinical review.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-6 mt-6">
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
          TriageFlow AI Architecture &middot; Version 0.4
        </div>
        <div className="flex items-center gap-3">
          {onDashboard && (
            <Button variant="secondary" size="md" onClick={onDashboard}>
              Back to Dashboard
            </Button>
          )}
          {onStart && (
            <Button size="md" onClick={onStart}>
              Start Simulation <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>
    </PageWrap>
  );
}
