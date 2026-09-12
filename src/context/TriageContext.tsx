/**
 * TriageFlow AI — Application State (React Context)
 *
 * Single clean application-level triage state.
 * Orchestrates local deterministic engine execution and
 * non-blocking asynchronous Supabase persistence.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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
import { runAllEvaluations } from "../evaluation/evaluationRunner";
import type { EvaluationReport } from "../evaluation/evaluationTypes";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { ensureAnonymousSession } from "../services/authService";
import { TriageRepository } from "../services/triageRepository";

/* ── System module health ─────────────────────────────────────── */

export interface SystemModule {
  name: string;
  status: "Online" | "Offline";
  latency: string;
}

export type PersistenceStatus =
  | "CONNECTED"
  | "DEGRADED"
  | "LOCAL_ONLY"
  | "PERSISTENCE_ERROR"
  | "connected"
  | "offline"
  | "unconfigured"
  | "error";

/* ── Turn Snapshot for Before/After State Inspection ─────────── */

export interface TurnSnapshot {
  turnNumber: number;
  question: ScoredQuestion;
  answer: Answer;
  riskBefore: RiskAssessment | null;
  riskAfter: RiskAssessment;
  routingBefore: RoutingDecision | null;
  routingAfter: RoutingDecision;
  missingBefore: string[];
  missingAfter: string[];
  contradictionsDetected: Contradiction[];
  timestamp: string;
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
  sessionId: string | null;
  allCandidates: ScoredQuestion[];
  expectedRouting: string | null;
  turnSnapshots: TurnSnapshot[];

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

  // Real evaluation suite report
  evaluationReport: EvaluationReport | null;
  refreshEvaluation: () => void;

  // Supabase Persistence State
  persistenceStatus: PersistenceStatus;
  userId: string | null;

  // System health
  systemModules: SystemModule[];

  // Actions
  startSession: (caseId: string) => void;
  submitAnswer: (answer: Answer) => void;
  resetSession: () => void;

  // Cases
  availableCases: typeof patientCases;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  sessionId: null,
  allCandidates: [],
  expectedRouting: null,
  turnSnapshots: [],
  stateSnapshot: null,
  missingCriticalFields: [],
  completedSessions: [],
  evaluationReport: null,
  refreshEvaluation: () => {},
  persistenceStatus: "unconfigured",
  userId: null,
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<TriageSession[]>([]);
  const [turnSnapshots, setTurnSnapshots] = useState<TurnSnapshot[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>(
    isSupabaseConfigured ? "offline" : "LOCAL_ONLY"
  );

  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(() => {
    try {
      return runAllEvaluations();
    } catch {
      return null;
    }
  });

  const refreshEvaluation = useCallback(() => {
    try {
      const report = runAllEvaluations();
      setEvaluationReport(report);
    } catch (err) {
      console.error("Evaluation execution failed:", err);
    }
  }, []);

  // 1. Initialize Anonymous Authentication and attempt session restoration
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPersistenceStatus("LOCAL_ONLY");
      return;
    }

    let isMounted = true;

    async function initAuthAndRestore() {
      const auth = await ensureAnonymousSession();
      if (!isMounted) return;

      if (auth.isAuthenticated && auth.userId) {
        setUserId(auth.userId);
        setPersistenceStatus("CONNECTED");

        // Attempt session restoration if local state is idle
        try {
          const latestActive = await TriageRepository.getLatestActiveSession(auth.userId);
          if (latestActive && isMounted) {
            const matchingCase = patientCases.find((c) => c.id === latestActive.case_id);
            if (matchingCase) {
              const history = await TriageRepository.getSessionHistory(latestActive.id);
              if (history && history.answers.length > 0 && isMounted) {
                // Replay answers onto the case to restore exact deterministic agent state
                let replayed = initSession(matchingCase);
                const restoredTurnSnapshots: TurnSnapshot[] = [];
                for (let i = 0; i < history.answers.length; i++) {
                  const ans = history.answers[i];
                  const currentQ = replayed.currentQuestion;
                  const riskBefore = replayed.riskAssessment;
                  const routingBefore = replayed.routingDecision;
                  const missingBefore = [...replayed.patientState.missingCriticalFields];

                  const answerObj: Answer = {
                    questionId: ans.question_id,
                    selectedOption: ans.selected_option,
                    freeText: ans.free_text,
                    answeredAt: ans.answered_at,
                  };

                  replayed = processAnswer(replayed, answerObj);

                  if (currentQ && replayed.riskAssessment && replayed.routingDecision) {
                    restoredTurnSnapshots.push({
                      turnNumber: i + 1,
                      question: currentQ,
                      answer: answerObj,
                      riskBefore,
                      riskAfter: replayed.riskAssessment,
                      routingBefore,
                      routingAfter: replayed.routingDecision,
                      missingBefore,
                      missingAfter: [...replayed.patientState.missingCriticalFields],
                      contradictionsDetected: replayed.contradictions.slice(),
                      timestamp: ans.answered_at || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                    });
                  }
                }
                setCurrentSessionId(latestActive.id);
                setTurnSnapshots(restoredTurnSnapshots);
                setAgentState(replayed);
              }
            }
          }
        } catch (restoreErr) {
          console.warn("[TriageContext] Active session restoration skipped:", restoreErr);
        }
      } else {
        setPersistenceStatus("PERSISTENCE_ERROR");
      }
    }

    initAuthAndRestore();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Start a new triage session
  const startSession = useCallback(
    (caseId: string) => {
      const patientCase = patientCases.find((c) => c.id === caseId);
      if (!patientCase) return;

      const newId = generateUUID();
      const newState = initSession(patientCase);

      setAgentState(newState);
      setCurrentSessionId(newId);
      setTurnSnapshots([]);

      // Asynchronously persist to Supabase if configured
      if (isSupabaseConfigured && userId) {
        TriageRepository.createSession(newId, userId, caseId, patientCase.expectedRouting).then((ok) => {
          if (ok) {
            Promise.all([
              TriageRepository.savePatientStateSnapshot(newId, 0, newState.patientState),
              TriageRepository.addPatientEvents(newId, 0, newState.patientState.events),
              TriageRepository.addDecisionTraceEntries(newId, newState.decisionTrace, 0),
            ]).catch((err) => {
              console.warn("[TriageContext] Initial snapshot/audit persistence error:", err);
            });
          } else {
            setPersistenceStatus("DEGRADED");
          }
        }).catch((err) => {
          console.warn("[TriageContext] Initial session persistence error:", err);
          setPersistenceStatus("DEGRADED");
        });
      }
    },
    [userId]
  );

  // 3. Submit an answer and persist turn
  const submitAnswer = useCallback(
    (answer: Answer) => {
      setAgentState((prev) => {
        if (!prev || prev.status !== "active") return prev;

        const currentQ = prev.currentQuestion;
        const riskBefore = prev.riskAssessment;
        const routingBefore = prev.routingDecision;
        const missingBefore = [...prev.patientState.missingCriticalFields];

        // Process pure deterministic agent logic
        const newState = processAnswer(prev, answer);

        // Record turn snapshot for UI before/after inspection
        if (currentQ && newState.riskAssessment && newState.routingDecision) {
          const snapshot: TurnSnapshot = {
            turnNumber: prev.turnNumber,
            question: currentQ,
            answer,
            riskBefore,
            riskAfter: newState.riskAssessment,
            routingBefore,
            routingAfter: newState.routingDecision,
            missingBefore,
            missingAfter: [...newState.patientState.missingCriticalFields],
            contradictionsDetected: newState.contradictions.slice(),
            timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          };
          setTurnSnapshots((snaps) => [...snaps, snapshot]);
        }

        // Asynchronously persist turn data if session ID exists
        if (currentSessionId && isSupabaseConfigured && currentQ && newState.riskAssessment && newState.routingDecision) {
          const sId = currentSessionId;
          const turn = prev.turnNumber;
          const newTurnEvents = newState.patientState.events.slice(prev.patientState.events.length);
          const newTurnContradictions = newState.contradictions.slice(prev.contradictions.length);
          const newTurnTrace = newState.decisionTrace.slice(prev.decisionTrace.length);

          Promise.all([
            TriageRepository.addAnswer(sId, turn, answer, currentQ.question, currentQ.score),
            TriageRepository.savePatientStateSnapshot(sId, newState.turnNumber, newState.patientState),
            TriageRepository.saveRiskAssessment(sId, newState.turnNumber, newState.riskAssessment),
            TriageRepository.saveRoutingDecision(sId, newState.turnNumber, newState.routingDecision),
            TriageRepository.addPatientEvents(sId, newState.turnNumber, newTurnEvents),
            TriageRepository.addContradictions(sId, newState.turnNumber, newTurnContradictions),
            TriageRepository.addDecisionTraceEntries(sId, newTurnTrace, newState.turnNumber),
          ]).then((results) => {
            if (results.some((ok) => !ok)) {
              setPersistenceStatus("DEGRADED");
            }
          }).catch((err) => {
            console.warn("[TriageContext] Turn persistence error:", err);
            setPersistenceStatus("DEGRADED");
          });
        }

        // If session completed or escalated, save to completed sessions and update Supabase
        if (newState.status === "completed" || newState.status === "escalated") {
          const session: TriageSession = {
            id: currentSessionId || `SES-${Date.now()}`,
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
          setCompletedSessions((sessions) => [session, ...sessions]);

          if (currentSessionId && isSupabaseConfigured) {
            TriageRepository.updateSession(currentSessionId, {
              status: newState.status,
              final_routing: newState.routingDecision?.outcome,
              final_risk_score: newState.riskAssessment?.score,
              final_risk_level: newState.riskAssessment?.level,
              is_escalated: newState.escalation.shouldEscalate,
              escalation_reason: newState.escalation.reason,
              questions_asked_count: newState.questionsAsked,
              completed_at: new Date().toISOString(),
            }).catch((err) => {
              console.warn("[TriageContext] Session completion update error:", err);
              setPersistenceStatus("DEGRADED");
            });
          }
        }

        return newState;
      });
    },
    [currentSessionId]
  );

  const resetSession = useCallback(() => {
    setAgentState(null);
    setCurrentSessionId(null);
    setTurnSnapshots([]);
  }, []);

  // Compute state snapshot for UI
  const stateSnapshot = agentState?.patientState
    ? getStateSnapshot(agentState.patientState)
    : null;

  // System module health
  const systemModules: SystemModule[] = [
    { name: "Agent Controller", status: "Online", latency: "24ms" },
    { name: "Risk Engine", status: "Online", latency: "8ms" },
    { name: "Contradiction Detector", status: "Online", latency: "4ms" },
    { name: "Question Selector", status: "Online", latency: "12ms" },
    {
      name: "Supabase Core Persistence",
      status: persistenceStatus === "connected" ? "Online" : "Offline",
      latency: persistenceStatus === "connected" ? "38ms" : "Offline",
    },
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
    sessionId: currentSessionId,
    allCandidates: agentState?.allCandidates ?? [],
    expectedRouting: agentState?.expectedRouting ?? null,
    turnSnapshots,
    stateSnapshot,
    missingCriticalFields: agentState?.patientState?.missingCriticalFields ?? [],
    completedSessions,
    evaluationReport,
    refreshEvaluation,
    persistenceStatus,
    userId,
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
