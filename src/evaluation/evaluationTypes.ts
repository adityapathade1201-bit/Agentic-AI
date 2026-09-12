/**
 * TriageFlow AI — Agent Evaluation & Validation Types
 *
 * Types for automated evaluation, invariant assertions,
 * per-question adaptive tracing, and structured report generation.
 */

import type {
  RiskLevel,
  RoutingOutcome,
  SessionStatus,
  ScoredQuestion,
  Contradiction,
  EscalationResult,
  DecisionTraceEntry,
} from "../domain/types";

export type TestResultStatus = "PASS" | "FAIL" | "WARNING";

/** Snapshot of patient & risk state before and after each question */
export interface AdaptiveStepTrace {
  turnNumber: number;
  questionId: string;
  questionText: string;
  category: string;
  selectionScore: number;
  selectionRationale: string;
  candidatesCount: number;
  topCandidates: { id: string; text: string; score: number }[];

  // State BEFORE action
  stateBefore: {
    knownFieldsCount: number;
    unknownFieldsCount: number;
    missingCriticalFields: string[];
    riskScore: number;
    riskLevel: RiskLevel;
    routingOutcome: RoutingOutcome;
  };

  // Action / Answer
  answerReceived: {
    rawAnswer: string;
    resolvesField: string;
  };

  // State AFTER action & reassessment
  stateAfter: {
    knownFieldsCount: number;
    unknownFieldsCount: number;
    missingCriticalFields: string[];
    riskScore: number;
    riskLevel: RiskLevel;
    routingOutcome: RoutingOutcome;
    riskDelta: number;
    riskChanged: boolean;
    routingChanged: boolean;
    newContradictions: Contradiction[];
  };

  // Reassessment & escalation
  reassessmentTriggered: boolean;
  escalationState: EscalationResult;
}

/** Invariant assertion result */
export interface InvariantCheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

/** Result for a single patient case evaluation */
export interface TestCaseResult {
  caseId: string;
  caseLabel: string;
  difficulty: string;
  status: TestResultStatus;
  statusReasons: string[];

  // Routing verification
  expectedRouting: string;
  actualRouting: RoutingOutcome | string;
  routingMatched: boolean;
  triageClassification: "CORRECT" | "UNDER_TRIAGE" | "OVER_TRIAGE" | "MISMATCH";

  // Final risk & state
  finalRiskLevel: RiskLevel;
  finalRiskScore: number;
  finalSessionStatus: SessionStatus;

  // Question metrics
  questionsAskedCount: number;
  askedQuestionIds: string[];
  askedQuestions: { id: string; text: string; answer: string }[];

  // Contradiction metrics
  contradictionExpected: boolean;
  contradictionDetected: boolean;
  contradictionCount: number;
  contradictions: Contradiction[];

  // Escalation & reassessment
  escalationTriggered: boolean;
  escalationReason: string | null;
  reassessmentCount: number;

  // Step-by-step adaptive trace
  adaptiveTrace: AdaptiveStepTrace[];

  // Invariant checks
  invariantChecks: InvariantCheckResult[];

  // Full agent decision trace
  fullDecisionTrace: DecisionTraceEntry[];

  // Execution timing & errors
  executionTimeMs: number;
  runtimeErrors: string[];
}

/** Summary statistics across all evaluated cases */
export interface EvaluationReport {
  timestamp: string;
  overallStatus: TestResultStatus;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  warningCases: number;

  // Core metrics
  routingAccuracy: number; // e.g. 1.0 (100%)
  averageQuestions: number;
  contradictionDetectionRate: number;
  escalationRate: number;
  reassessmentRate: number; // average reassessments per case

  // Triage safety metrics
  underTriageCount: number;
  overTriageCount: number;
  exactRoutingMatchCount: number;

  // Invariant check summary
  totalInvariantsChecked: number;
  invariantsPassed: number;
  invariantsFailed: number;

  // Individual case results
  caseResults: TestCaseResult[];

  // Bugs and observations
  bugsIdentified: {
    id: string;
    description: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    component: string;
    fixed: boolean;
  }[];
}
