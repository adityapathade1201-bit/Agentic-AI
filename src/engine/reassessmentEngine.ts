/**
 * TriageFlow AI — Reassessment Engine
 *
 * Triggers reassessment whenever new patient information arrives.
 * Compares old and new state, detects contradictions, recalculates
 * risk, and updates routing.
 */

import type {
  PatientState,
  RiskAssessment,
  RoutingDecision,
  DecisionTraceEntry,
  Contradiction,
} from "../domain/types";
import { calculateRisk } from "./riskEngine";
import { determineRouting } from "./routingEngine";
import { detectContradictions } from "./contradictionDetector";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export interface ReassessmentResult {
  previousRisk: RiskAssessment | null;
  newRisk: RiskAssessment;
  previousRouting: RoutingDecision | null;
  newRouting: RoutingDecision;
  newContradictions: Contradiction[];
  riskChanged: boolean;
  routingChanged: boolean;
  traceEntries: DecisionTraceEntry[];
  stepOffset: number;
}

/**
 * Perform a full reassessment of the patient state.
 * Called after every state update (answer received, vital change, etc.)
 */
export function reassess(
  state: PatientState,
  currentStep: number
): ReassessmentResult {
  let step = currentStep;
  const traceEntries: DecisionTraceEntry[] = [];

  const previousRisk = state.riskAssessment;
  const previousRouting = state.routingDecision;

  // Step 1: Detect contradictions
  const allContradictions = detectContradictions(state);
  const newContradictions: Contradiction[] = [];

  for (const c of allContradictions) {
    if (!state.contradictions.some((existing) => existing.field === c.field && existing.previousValue === c.previousValue && existing.newValue === c.newValue)) {
      state.contradictions.push(c);
      newContradictions.push(c);
    }
  }

  // Create trace entries for all newly detected contradictions
  for (const c of newContradictions) {
    traceEntries.push({
      step: ++step,
      time: timestamp(),
      type: "CONTRADICTION_DETECTED",
      component: "Contradiction Detector",
      action: `Contradiction detected on "${c.field}"`,
      result: `${c.previousValue} → ${c.newValue}`,
      note: c.reason,
    });
  }

  // Step 2: Recalculate risk
  const newRisk = calculateRisk(state);
  const riskChanged = !previousRisk || previousRisk.score !== newRisk.score || previousRisk.level !== newRisk.level;

  traceEntries.push({
    step: ++step,
    time: timestamp(),
    type: "RISK_CALCULATED",
    component: "Risk Engine",
    action: riskChanged ? "Risk reassessed" : "Risk confirmed",
    result: previousRisk
      ? `score ${previousRisk.score} → ${newRisk.score} (${newRisk.level})`
      : `score ${newRisk.score} (${newRisk.level})`,
    note: riskChanged
      ? "Risk score changed after new information. Rule-based synthetic scoring."
      : "Risk score unchanged. No material impact from new information.",
  });

  // Step 3: Recalculate routing
  const newRouting = determineRouting(newRisk.level, state);
  const routingChanged = !previousRouting || previousRouting.outcome !== newRouting.outcome;

  if (routingChanged) {
    traceEntries.push({
      step: ++step,
      time: timestamp(),
      type: "ROUTING_UPDATED",
      component: "Routing Policy",
      action: "Routing decision updated",
      result: previousRouting
        ? `${previousRouting.outcome} → ${newRouting.outcome}`
        : newRouting.outcome,
      note: newRouting.reason,
    });
  }

  // Apply to state
  state.riskAssessment = newRisk;
  state.routingDecision = newRouting;

  return {
    previousRisk,
    newRisk,
    previousRouting,
    newRouting,
    newContradictions,
    riskChanged,
    routingChanged,
    traceEntries,
    stepOffset: step,
  };
}
