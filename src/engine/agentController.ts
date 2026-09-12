/**
 * TriageFlow AI — Agent Controller
 *
 * Orchestrates the full triage workflow:
 * 1. Inspect current patient state
 * 2. Identify unknown / critical information
 * 3. Generate candidate questions
 * 4. Rank questions
 * 5. Choose next question
 * 6. Receive answer / new vital
 * 7. Update state
 * 8. Execute risk engine
 * 9. Detect contradictions
 * 10. Reassess
 * 11. Decide: continue, route, or escalate
 *
 * Produces a structured DecisionTrace for transparency.
 */

import type {
  SyntheticPatientCase,
  PatientState,
  RiskAssessment,
  RoutingDecision,
  DecisionTraceEntry,
  ScoredQuestion,
  Answer,
  AgentActivityEvent,
  Contradiction,
  SessionStatus,
  EscalationResult,
  SymptomSeverity,
} from "../domain/types";

import {
  initializePatientState,
  updateVitalField,
  updateSymptomSeverity,
  updateSymptomOnset,
  updateDemographic,
  applyRiskAssessment,
  applyRoutingDecision,
} from "./stateManager";
import { calculateRisk } from "./riskEngine";
import { determineRouting } from "./routingEngine";
import { selectNextQuestion, getAllScoredQuestions } from "./questionSelector";
import { reassess } from "./reassessmentEngine";
import { evaluateEscalation } from "./escalationEngine";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const MAX_QUESTIONS = 10;

export interface AgentState {
  status: SessionStatus;
  patientState: PatientState;
  currentQuestion: ScoredQuestion | null;
  riskAssessment: RiskAssessment | null;
  routingDecision: RoutingDecision | null;
  decisionTrace: DecisionTraceEntry[];
  agentActivity: AgentActivityEvent[];
  contradictions: Contradiction[];
  escalation: EscalationResult | null;
  questionsAsked: number;
  askedQuestionIds: string[];
  turnNumber: number;
  startedAt: string;
  caseId: string;
  expectedRouting: string | null;
  allCandidates: ScoredQuestion[];
}

/** Initialize a new triage session from a patient case */
export function initSession(patientCase: SyntheticPatientCase): AgentState {
  const patientState = initializePatientState(patientCase);
  const trace: DecisionTraceEntry[] = [];
  const activity: AgentActivityEvent[] = [];
  let step = 0;

  // Step 1: State initialized
  const knownCount = countKnownFields(patientState);
  const unknownCount = countUnknownFields(patientState);

  trace.push({
    step: ++step,
    time: timestamp(),
    type: "STATE_INITIALIZED",
    component: "State Engine",
    action: "Patient state initialized",
    result: `${knownCount} fields known, ${unknownCount} unknown`,
    note: "Baseline snapshot created from intake form.",
  });
  activity.push({
    time: timestamp(),
    event: "Patient state initialized",
    detail: patientCase.id,
    kind: "state",
  });

  // Step 2: Initial risk calculation
  const initialRisk = calculateRisk(patientState);
  applyRiskAssessment(patientState, initialRisk);

  trace.push({
    step: ++step,
    time: timestamp(),
    type: "RISK_CALCULATED",
    component: "Risk Engine",
    action: "Initial risk assessment",
    result: `score ${initialRisk.score} (${initialRisk.level})`,
    note: "Baseline risk from available intake data. Rule-based synthetic scoring.",
  });
  activity.push({
    time: timestamp(),
    event: "Risk calculated",
    detail: `score ${initialRisk.score} · ${initialRisk.level}`,
    kind: "risk",
  });

  // Step 3: Initial routing
  const initialRouting = determineRouting(initialRisk.level, patientState);
  applyRoutingDecision(patientState, initialRouting);

  trace.push({
    step: ++step,
    time: timestamp(),
    type: "ROUTING_UPDATED",
    component: "Routing Policy",
    action: "Initial routing decision",
    result: initialRouting.outcome,
    note: initialRouting.reason,
  });

  // Step 4: Identify missing information
  const missing = patientState.missingCriticalFields;
  trace.push({
    step: ++step,
    time: timestamp(),
    type: "MISSING_INFO_IDENTIFIED",
    component: "Agent Controller",
    action: "Missing information identified",
    result: missing.length > 0 ? missing.slice(0, 3).join(", ") + (missing.length > 3 ? ` (+${missing.length - 3} more)` : "") : "No critical gaps",
    note: "Gaps ranked by expected risk impact.",
  });

  // Step 5: Select first question
  const allCandidates = getAllScoredQuestions(patientState, []);
  const firstQuestion = selectNextQuestion(patientState, []);

  if (firstQuestion) {
    trace.push({
      step: ++step,
      time: timestamp(),
      type: "CANDIDATES_EVALUATED",
      component: "Agent Controller",
      action: "Candidate questions evaluated",
      result: `${allCandidates.filter((c) => c.score > 5).length} candidates scored`,
      note: "Selected highest information-gain probe under risk uncertainty.",
    });
    trace.push({
      step: ++step,
      time: timestamp(),
      type: "QUESTION_SELECTED",
      component: "Agent Controller",
      action: "Next question selected",
      result: `"${firstQuestion.question.text}"`,
      note: firstQuestion.question.rationale,
    });
    activity.push({
      time: timestamp(),
      event: "Question selected",
      detail: firstQuestion.question.text.substring(0, 50) + (firstQuestion.question.text.length > 50 ? "…" : ""),
      kind: "question",
    });
  }

  return {
    status: "active",
    patientState,
    currentQuestion: firstQuestion,
    riskAssessment: initialRisk,
    routingDecision: initialRouting,
    decisionTrace: trace,
    agentActivity: activity,
    contradictions: [],
    escalation: null,
    questionsAsked: 0,
    askedQuestionIds: [],
    turnNumber: 1,
    startedAt: timestamp(),
    caseId: patientCase.id,
    expectedRouting: patientCase.expectedRouting,
    allCandidates,
  };
}

/** Process an answer and advance the agent loop */
export function processAnswer(agentState: AgentState, answer: Answer): AgentState {
  const state = { ...agentState };
  const ps = state.patientState;
  let step = state.decisionTrace.length;

  // Record answer
  state.decisionTrace.push({
    step: ++step,
    time: timestamp(),
    type: "ANSWER_RECEIVED",
    component: "Patient / Input",
    action: "Answer received",
    result: answer.selectedOption ?? answer.freeText ?? "No answer",
    note: `Response to: "${state.currentQuestion?.question.text ?? "unknown"}"`,
  });
  state.agentActivity.push({
    time: timestamp(),
    event: "Answer received",
    detail: answer.selectedOption ?? answer.freeText ?? "—",
    kind: "state",
  });

  // Apply the answer to patient state
  const currentQ = state.currentQuestion?.question;
  if (currentQ) {
    applyAnswerToState(ps, currentQ.id, currentQ.resolvesField, answer);
    state.askedQuestionIds.push(currentQ.id);
    state.questionsAsked += 1;

    state.decisionTrace.push({
      step: ++step,
      time: timestamp(),
      type: "STATE_UPDATED",
      component: "State Engine",
      action: "State updated",
      result: `${currentQ.resolvesField} updated`,
      note: "Versioned write; prior values retained.",
    });
  }

  // Reassess
  const reassessResult = reassess(ps, step);
  step = reassessResult.stepOffset;
  state.decisionTrace.push(...reassessResult.traceEntries);

  state.riskAssessment = reassessResult.newRisk;
  state.routingDecision = reassessResult.newRouting;

  // Log activity events
  if (reassessResult.riskChanged) {
    state.agentActivity.push({
      time: timestamp(),
      event: "Risk recalculated",
      detail: `score ${reassessResult.previousRisk?.score ?? "?"} → ${reassessResult.newRisk.score}`,
      kind: "risk",
    });
  }
  if (reassessResult.routingChanged) {
    state.agentActivity.push({
      time: timestamp(),
      event: "Routing updated",
      detail: `${reassessResult.previousRouting?.outcome ?? "?"} → ${reassessResult.newRouting.outcome}`,
      kind: "route",
    });
  }
  if (reassessResult.newContradictions.length > 0) {
    for (const c of reassessResult.newContradictions) {
      state.contradictions.push(c);
      state.agentActivity.push({
        time: timestamp(),
        event: "Contradiction detected",
        detail: `${c.field}: ${c.previousValue} → ${c.newValue}`,
        kind: "conflict",
      });
    }
  }

  // Evaluate escalation
  const escalation = evaluateEscalation(ps);
  state.escalation = escalation;

  if (escalation.shouldEscalate) {
    state.decisionTrace.push({
      step: ++step,
      time: timestamp(),
      type: "ESCALATION_TRIGGERED",
      component: "Escalation Policy",
      action: "Escalation triggered",
      result: "Requires human review",
      note: escalation.reason,
    });
    state.agentActivity.push({
      time: timestamp(),
      event: "Escalation triggered",
      detail: escalation.reason.substring(0, 60) + "…",
      kind: "escalation",
    });
  }

  // Decide: continue or complete
  const shouldContinue = decideWhetherToContinue(state, escalation);

  if (shouldContinue) {
    // Select next question
    const allCandidates = getAllScoredQuestions(ps, state.askedQuestionIds);
    const nextQuestion = selectNextQuestion(ps, state.askedQuestionIds);
    state.allCandidates = allCandidates;

    if (nextQuestion) {
      state.currentQuestion = nextQuestion;
      state.turnNumber += 1;

      state.decisionTrace.push({
        step: ++step,
        time: timestamp(),
        type: "QUESTION_SELECTED",
        component: "Agent Controller",
        action: "Next question selected",
        result: `"${nextQuestion.question.text}"`,
        note: nextQuestion.question.rationale,
      });
      state.agentActivity.push({
        time: timestamp(),
        event: "Question selected",
        detail: nextQuestion.question.text.substring(0, 50) + "…",
        kind: "question",
      });
    } else {
      // No more questions to ask
      completeSession(state, step);
    }
  } else {
    completeSession(state, step);
  }

  return state;
}

function completeSession(state: AgentState, step: number): void {
  state.status = state.escalation?.shouldEscalate ? "escalated" : "completed";
  state.currentQuestion = null;

  state.decisionTrace.push({
    step: step + 1,
    time: timestamp(),
    type: "SESSION_COMPLETED",
    component: "Agent Controller",
    action: state.status === "escalated" ? "Session escalated for human review" : "Session completed",
    result: `${state.routingDecision?.outcome ?? "Unknown"} · ${state.questionsAsked} questions asked`,
    note: state.status === "escalated"
      ? "Agent cannot establish safe routing — deferring to human."
      : "Sufficient information gathered for routing decision.",
  });
  state.agentActivity.push({
    time: timestamp(),
    event: state.status === "escalated" ? "Session escalated" : "Session completed",
    detail: `${state.routingDecision?.outcome ?? "?"} · ${state.questionsAsked} questions`,
    kind: state.status === "escalated" ? "escalation" : "state",
  });
}

/** Decide whether to continue asking questions */
function decideWhetherToContinue(
  state: AgentState,
  escalation: EscalationResult
): boolean {
  // Stop if we've hit the max
  if (state.questionsAsked >= MAX_QUESTIONS) return false;

  // Stop if escalated with critical contradictions
  if (escalation.shouldEscalate && escalation.unresolvedContradictions > 1) return false;

  // Stop if risk is CRITICAL and we have enough info
  if (state.riskAssessment?.level === "CRITICAL" && state.patientState.missingCriticalFields.length <= 2) {
    return false;
  }

  // Stop if LOW risk and all critical fields known
  if (state.riskAssessment?.level === "LOW" && state.patientState.missingCriticalFields.length <= 1) {
    return false;
  }

  // Continue if there are still important unknowns
  return true;
}

/** Apply an answer to the patient state based on question ID and field mapping */
function applyAnswerToState(
  ps: PatientState,
  questionId: string,
  resolvesField: string,
  answer: Answer
): void {
  const rawValue = answer.selectedOption ?? answer.freeText ?? "";
  const source = "Patient answer";

  switch (questionId) {
    case "q-chest-pain": {
      if (rawValue === "Yes") {
        // If chest pain was previously "resolved" or "none", this creates a contradiction
        const cp = ps.symptoms.find((s) => s.name.toLowerCase().includes("chest pain"));
        if (cp && (cp.severity.value === "resolved" || cp.severity.value === "none")) {
          updateSymptomSeverity(ps, "Chest pain", "severe", source);
        } else if (cp && cp.severity.status === "Unknown") {
          updateSymptomSeverity(ps, "Chest pain", "moderate", source);
        }
        // If already known as some severity, don't change it
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Chest pain", "none", source);
      }
      break;
    }
    case "q-chest-pain-severity": {
      const severity = rawValue as SymptomSeverity;
      if (["mild", "moderate", "severe", "resolved", "none"].includes(severity)) {
        updateSymptomSeverity(ps, "Chest pain", severity, source);
      }
      break;
    }
    case "q-shortness-breath": {
      if (rawValue === "Yes") {
        updateSymptomSeverity(ps, "Shortness of breath", "moderate", source);
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Shortness of breath", "none", source);
      }
      break;
    }
    case "q-nausea": {
      if (rawValue === "Yes") {
        updateSymptomSeverity(ps, "Nausea", "mild", source);
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Nausea", "none", source);
      }
      break;
    }
    case "q-dizziness": {
      if (rawValue === "Yes") {
        updateSymptomSeverity(ps, "Dizziness", "moderate", source);
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Dizziness", "none", source);
      }
      break;
    }
    case "q-sweating": {
      if (rawValue === "Yes") {
        updateSymptomSeverity(ps, "Sweating", "moderate", source);
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Sweating", "none", source);
      }
      break;
    }
    case "q-palpitations": {
      if (rawValue === "Yes") {
        updateSymptomSeverity(ps, "Palpitations", "moderate", source);
      } else if (rawValue === "No") {
        updateSymptomSeverity(ps, "Palpitations", "none", source);
      }
      break;
    }
    case "q-symptom-onset": {
      if (rawValue && rawValue !== "Unsure") {
        // Apply onset to the most severe active symptom
        const activeSymptom = ps.symptoms.find(
          (s) => s.severity.value && s.severity.value !== "none" && s.severity.value !== "resolved" && s.onset.status === "Unknown"
        );
        if (activeSymptom) {
          updateSymptomOnset(ps, activeSymptom.name, rawValue, source);
        }
      }
      break;
    }
    case "q-symptom-worse": {
      if (rawValue === "Yes") {
        // Worsening: if moderate → escalate to severe for the primary symptom
        const primarySymptom = ps.symptoms.find(
          (s) => s.severity.value === "moderate"
        );
        if (primarySymptom) {
          updateSymptomSeverity(ps, primarySymptom.name, "severe", source);
        }
      }
      break;
    }
    case "q-blood-pressure": {
      if (rawValue && rawValue !== "Unsure") {
        const parts = rawValue.split("/");
        const systolic = parseInt(parts[0]);
        const diastolic = parts[1] ? parseInt(parts[1]) : null;
        if (!isNaN(systolic)) {
          updateVitalField(ps, "bloodPressureSystolic", systolic, "Vitals Tool");
          if (diastolic && !isNaN(diastolic)) {
            updateVitalField(ps, "bloodPressureDiastolic", diastolic, "Vitals Tool");
          }
        }
      }
      break;
    }
    case "q-heart-rate": {
      if (rawValue && rawValue !== "Unsure") {
        const hr = parseInt(rawValue);
        if (!isNaN(hr)) {
          updateVitalField(ps, "heartRate", hr, "Vitals Tool");
        }
      }
      break;
    }
    case "q-oxygen-sat": {
      if (rawValue && rawValue !== "Unsure") {
        const spo2 = parseInt(rawValue);
        if (!isNaN(spo2)) {
          updateVitalField(ps, "spo2", spo2, "Vitals Tool");
        }
      }
      break;
    }
    case "q-temperature": {
      if (rawValue && rawValue !== "Unsure") {
        const temp = parseFloat(rawValue);
        if (!isNaN(temp)) {
          updateVitalField(ps, "temperature", temp, "Vitals Tool");
        }
      }
      break;
    }
    case "q-respiratory-rate": {
      if (rawValue && rawValue !== "Unsure") {
        const rr = parseInt(rawValue);
        if (!isNaN(rr)) {
          updateVitalField(ps, "respiratoryRate", rr, "Vitals Tool");
        }
      }
      break;
    }
    case "q-prior-mi": {
      if (rawValue === "Yes") {
        ps.riskFactors.push({
          value: "Prior MI",
          status: "Known",
          history: [{ value: "Prior MI", timestamp: timestamp(), source }],
          lastUpdated: timestamp(),
          source,
        });
      } else if (rawValue === "No") {
        ps.riskFactors.push({
          value: "No prior MI",
          status: "Known",
          history: [{ value: "No prior MI", timestamp: timestamp(), source }],
          lastUpdated: timestamp(),
          source,
        });
      }
      break;
    }
    case "q-age": {
      if (rawValue && rawValue !== "Unsure") {
        const age = parseInt(rawValue);
        if (!isNaN(age)) {
          updateDemographic(ps, "age", age, source);
        }
      }
      break;
    }
    default:
      break;
  }
}

/** Count fields with Known or Updated status */
function countKnownFields(ps: PatientState): number {
  let count = 0;
  if (ps.demographics.age.status !== "Unknown") count++;
  if (ps.demographics.sex.status !== "Unknown") count++;
  if (ps.demographics.weight.status !== "Unknown") count++;
  for (const s of ps.symptoms) {
    if (s.severity.status !== "Unknown") count++;
  }
  const vitalKeys: (keyof typeof ps.vitals)[] = ["heartRate", "spo2", "bloodPressureSystolic", "bloodPressureDiastolic", "temperature", "respiratoryRate"];
  for (const k of vitalKeys) {
    if (ps.vitals[k].status !== "Unknown") count++;
  }
  count += ps.riskFactors.length;
  return count;
}

function countUnknownFields(ps: PatientState): number {
  let count = 0;
  if (ps.demographics.age.status === "Unknown") count++;
  if (ps.demographics.sex.status === "Unknown") count++;
  if (ps.demographics.weight.status === "Unknown") count++;
  for (const s of ps.symptoms) {
    if (s.severity.status === "Unknown") count++;
  }
  const vitalKeys: (keyof typeof ps.vitals)[] = ["heartRate", "spo2", "bloodPressureSystolic", "bloodPressureDiastolic", "temperature", "respiratoryRate"];
  for (const k of vitalKeys) {
    if (ps.vitals[k].status === "Unknown") count++;
  }
  return count;
}
