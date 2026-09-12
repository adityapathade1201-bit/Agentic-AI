/**
 * TriageFlow AI — Domain Types
 *
 * Strongly typed models for the adaptive emergency triage simulation.
 * These types are SYNTHETIC and used for demonstration purposes only.
 */

/* ── Field-level status tracking ─────────────────────────────── */

export type FieldStatus = "Known" | "Unknown" | "Updated" | "Conflicting";

export interface FieldEntry<T = string> {
  value: T | null;
  status: FieldStatus;
  /** Previous values, newest first */
  history: { value: T | null; timestamp: string; source: string }[];
  lastUpdated: string;
  source: string;
}

/* ── Risk levels ─────────────────────────────────────────────── */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNRESOLVED";

/* ── Vitals ──────────────────────────────────────────────────── */

export interface Vitals {
  heartRate: FieldEntry<number>;
  spo2: FieldEntry<number>;
  bloodPressureSystolic: FieldEntry<number>;
  bloodPressureDiastolic: FieldEntry<number>;
  temperature: FieldEntry<number>;
  respiratoryRate: FieldEntry<number>;
}

/* ── Symptom ─────────────────────────────────────────────────── */

export type SymptomSeverity = "none" | "mild" | "moderate" | "severe" | "resolved";

export interface Symptom {
  name: string;
  severity: FieldEntry<SymptomSeverity>;
  onset: FieldEntry<string>;
  notes: string;
}

/* ── Patient demographics ────────────────────────────────────── */

export interface Demographics {
  age: FieldEntry<number>;
  sex: FieldEntry<string>;
  weight: FieldEntry<number>;
}

/* ── Patient State ───────────────────────────────────────────── */

export interface PatientState {
  caseId: string;
  demographics: Demographics;
  symptoms: Symptom[];
  vitals: Vitals;
  riskFactors: FieldEntry<string>[];
  missingCriticalFields: string[];
  contradictions: Contradiction[];
  riskAssessment: RiskAssessment | null;
  routingDecision: RoutingDecision | null;
  events: PatientEvent[];
  lastUpdated: string;
}

/* ── Risk Assessment ─────────────────────────────────────────── */

export interface ContributingFactor {
  description: string;
  weight: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  contributingFactors: ContributingFactor[];
  missingCriticalInformation: string[];
  reasons: string[];
  evaluatedAt: string;
}

/* ── Routing ─────────────────────────────────────────────────── */

export type RoutingOutcome =
  | "Standard"
  | "Urgent Assessment"
  | "Immediate / Emergency"
  | "Immediate / Escalation"
  | "Human Review / Escalation";

export interface RoutingDecision {
  outcome: RoutingOutcome;
  riskLevel: RiskLevel;
  escalate: boolean;
  reason: string;
  decidedAt: string;
}

/* ── Questions ───────────────────────────────────────────────── */

export type QuestionCategory = "symptom" | "vital" | "history" | "onset" | "severity";

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  /** Which state field(s) this question resolves */
  resolvesField: string;
  safetyRelevance: number;
  riskImpact: number;
  options: QuestionOption[];
  /** Allow free-text input */
  allowFreeText: boolean;
  /** Why this question matters */
  rationale: string;
}

export interface ScoredQuestion {
  question: Question;
  score: number;
  breakdown: {
    safetyRelevance: number;
    riskImpact: number;
    uncertaintyReduction: number;
    routingImpact: number;
    alreadyKnownPenalty: number;
  };
}

/* ── Answer ───────────────────────────────────────────────────── */

export interface Answer {
  questionId: string;
  selectedOption: string | null;
  freeText: string;
  answeredAt: string;
}

/* ── Decision Trace ──────────────────────────────────────────── */

export type TraceEventType =
  | "STATE_INITIALIZED"
  | "MISSING_INFO_IDENTIFIED"
  | "CANDIDATES_EVALUATED"
  | "QUESTION_SELECTED"
  | "ANSWER_RECEIVED"
  | "STATE_UPDATED"
  | "CONTRADICTION_DETECTED"
  | "RISK_CALCULATED"
  | "ROUTING_UPDATED"
  | "REASSESSMENT_TRIGGERED"
  | "ESCALATION_TRIGGERED"
  | "SESSION_COMPLETED";

export interface DecisionTraceEntry {
  step: number;
  time: string;
  type: TraceEventType;
  component: string;
  action: string;
  result: string;
  note: string;
}

/* ── Patient Event ───────────────────────────────────────────── */

export interface PatientEvent {
  time: string;
  source: string;
  field: string;
  previousValue: string;
  newValue: string;
  status: FieldStatus;
}

/* ── Contradiction ───────────────────────────────────────────── */

export type ContradictionSeverity = "low" | "moderate" | "high" | "critical";

export interface Contradiction {
  detected: boolean;
  field: string;
  previousValue: string;
  newValue: string;
  reason: string;
  severity: ContradictionSeverity;
  detectedAt: string;
}

/* ── Escalation ──────────────────────────────────────────────── */

export interface EscalationResult {
  shouldEscalate: boolean;
  reason: string;
  requiresHumanReview: boolean;
  unresolvedContradictions: number;
  missingCriticalFields: number;
}

/* ── Agent Activity (for the overview feed) ──────────────────── */

export type ActivityKind = "conflict" | "route" | "risk" | "vital" | "question" | "state" | "escalation";

export interface AgentActivityEvent {
  time: string;
  event: string;
  detail: string;
  kind: ActivityKind;
}

/* ── Triage Session ──────────────────────────────────────────── */

export type SessionStatus = "idle" | "active" | "completed" | "escalated";

export interface TriageSession {
  id: string;
  caseId: string;
  status: SessionStatus;
  patientState: PatientState;
  riskAssessment: RiskAssessment | null;
  routingDecision: RoutingDecision | null;
  decisionTrace: DecisionTraceEntry[];
  agentActivity: AgentActivityEvent[];
  contradictions: Contradiction[];
  questionsAsked: number;
  startedAt: string;
  completedAt: string | null;
  /** Expected routing for evaluation accuracy */
  expectedRouting: RoutingOutcome | null;
}

/* ── Synthetic Patient Case (input data) ─────────────────────── */

export interface SyntheticPatientCase {
  id: string;
  label: string;
  description: string;
  difficulty: "Low" | "Moderate" | "High" | "Critical";
  age: number | null;
  sex: string | null;
  weight: number | null;
  initialSymptoms: {
    name: string;
    severity: SymptomSeverity | null;
    onset: string | null;
  }[];
  vitals: {
    heartRate: number | null;
    spo2: number | null;
    bloodPressureSystolic: number | null;
    bloodPressureDiastolic: number | null;
    temperature: number | null;
    respiratoryRate: number | null;
  };
  riskFactors: string[];
  /** Scripted answers for auto-play / deterministic simulation */
  scriptedAnswers: Record<string, string>;
  expectedRouting: RoutingOutcome;
}
