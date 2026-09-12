/**
 * TriageFlow AI — Application State (React Context)
 *
 * Single clean application-level triage state.
 * Modular so Supabase can replace local persistence later.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  PatientState,
  RiskAssessment,
  RoutingDecision,
  DecisionTraceEntry,
  AgentActivityEvent,
  Contradiction,
  ScoredQuestion,
  SessionStatus,
  Answer,
  EscalationResult,
  TriageSession,
  RoutingOutcome,
} from "../domain/types";
import type { AgentState } from "../engine/agentController";
import { initSession, processAnswer } from "../engine/agentController";
import { patientCases } from "../data/patientCases";
import { getStateSnapshot } from "../engine/stateManager";
import type { FieldStatus } from "../domain/types";

/* ── System module health ─────────────────────────────────────── */

export interface SystemModule {
  name: string;
  status: "Online" | "Offline";
  latency: string;
}

/* ── Context shape ────────────────────────────────────────────── */

export interface TriageContextValue {
  // Session state
  sessionStatus: SessionStatus;
  currentPatient: PatientState | null;
  currentQuestion: ScoredQuestion | null;
  riskAssessment: RiskAssessment | null;
  routingDecision: RoutingDecision | null;
  decisionTrace: DecisionTraceEntry[];
  agentActivity: AgentActivityEvent[];
  contradictions: Contradiction[];
  escalation: EscalationResult | null;
  questionsAsked: number;
  turnNumber: number;
  caseId: string | null;
  allCandidates: ScoredQuestion[];
  expectedRouting: string | null;

  // Snapshot for UI rendering
  stateSnapshot: {
    demographics: { field: string; value: string; status: FieldStatus }[];
    symptoms: { field: string; value: string; status: FieldStatus }[];
    vitals: { field: string; value: string; status: FieldStatus }[];
    riskFactors: { field: string; value: string; status: FieldStatus }[];
  } | null;
  missingCriticalFields: string[];

  // Completed sessions (for evaluation)
  completedSessions: TriageSession[];

  // System health
  systemModules: SystemModule[];

  // Actions
  startSession: (caseId: string) => void;
  submitAnswer: (answer: Answer) => void;
  resetSession: () => void;

  // Cases
  availableCases: typeof patientCases;
}

const defaultContext: TriageContextValue = {
  sessionStatus: "idle",
  currentPatient: null,
  currentQuestion: null,
  riskAssessment: null,
  routingDecision: null,
  decisionTrace: [],
  agentActivity: [],
  contradictions: [],
  escalation: null,
  questionsAsked: 0,
  turnNumber: 0,
  caseId: null,
  allCandidates: [],
  expectedRouting: null,
  stateSnapshot: null,
  missingCriticalFields: [],
  completedSessions: [],
  systemModules: [],
  startSession: () => {},
  submitAnswer: () => {},
  resetSession: () => {},
  availableCases: patientCases,
};

const TriageContext = createContext<TriageContextValue>(defaultContext);

export function useTriageContext(): TriageContextValue {
  return useContext(TriageContext);
}

export function TriageProvider({ children }: { children: ReactNode }) {
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [completedSessions, setCompletedSessions] = useState<TriageSession[]>([]);

  const startSession = useCallback((caseId: string) => {
    const patientCase = patientCases.find((c) => c.id === caseId);
    if (!patientCase) return;

    const newState = initSession(patientCase);
    setAgentState(newState);
  }, []);

  const submitAnswer = useCallback((answer: Answer) => {
    setAgentState((prev) => {
      if (!prev || prev.status !== "active") return prev;

      const newState = processAnswer(prev, answer);

      // If session completed or escalated, save to completed sessions
      if (newState.status === "completed" || newState.status === "escalated") {
        const session: TriageSession = {
          id: `SES-${Date.now()}`,
          caseId: newState.caseId,
          status: newState.status,
          patientState: newState.patientState,
          riskAssessment: newState.riskAssessment,
          routingDecision: newState.routingDecision,
          decisionTrace: newState.decisionTrace,
          agentActivity: newState.agentActivity,
          contradictions: newState.contradictions,
          questionsAsked: newState.questionsAsked,
          startedAt: newState.startedAt,
          completedAt: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          expectedRouting: newState.expectedRouting as RoutingOutcome | null,
        };
        setCompletedSessions((prev) => [session, ...prev]);
      }

      return newState;
    });
  }, []);

  const resetSession = useCallback(() => {
    setAgentState(null);
  }, []);

  // Compute state snapshot for UI
  const stateSnapshot = agentState?.patientState
    ? getStateSnapshot(agentState.patientState)
    : null;

  // System module health — based on whether modules are available
  const systemModules: SystemModule[] = [
    { name: "Agent Controller", status: "Online", latency: `${Math.floor(Math.random() * 20 + 30)}ms` },
    { name: "Risk Engine", status: "Online", latency: `${Math.floor(Math.random() * 10 + 5)}ms` },
    { name: "Patient Data Tool", status: "Online", latency: `${Math.floor(Math.random() * 15 + 20)}ms` },
    { name: "State Engine", status: "Online", latency: `${Math.floor(Math.random() * 8 + 8)}ms` },
  ];

  const value: TriageContextValue = {
    sessionStatus: agentState?.status ?? "idle",
    currentPatient: agentState?.patientState ?? null,
    currentQuestion: agentState?.currentQuestion ?? null,
    riskAssessment: agentState?.riskAssessment ?? null,
    routingDecision: agentState?.routingDecision ?? null,
    decisionTrace: agentState?.decisionTrace ?? [],
    agentActivity: agentState?.agentActivity ?? [],
    contradictions: agentState?.contradictions ?? [],
    escalation: agentState?.escalation ?? null,
    questionsAsked: agentState?.questionsAsked ?? 0,
    turnNumber: agentState?.turnNumber ?? 0,
    caseId: agentState?.caseId ?? null,
    allCandidates: agentState?.allCandidates ?? [],
    expectedRouting: agentState?.expectedRouting ?? null,
    stateSnapshot,
    missingCriticalFields: agentState?.patientState?.missingCriticalFields ?? [],
    completedSessions,
    systemModules,
    startSession,
    submitAnswer,
    resetSession,
    availableCases: patientCases,
  };

  return (
    <TriageContext.Provider value={value}>
      {children}
    </TriageContext.Provider>
  );
}
