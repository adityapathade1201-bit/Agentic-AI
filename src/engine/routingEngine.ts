/**
 * TriageFlow AI — Routing Engine
 *
 * Deterministic mapping from risk level/state to routing outcomes.
 * This engine selects ROUTING, not diagnosis.
 */

import type { RiskLevel, RoutingDecision, RoutingOutcome, PatientState } from "../domain/types";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const routingMap: Record<RiskLevel, { outcome: RoutingOutcome; escalate: boolean }> = {
  LOW: { outcome: "Standard", escalate: false },
  MODERATE: { outcome: "Urgent Assessment", escalate: false },
  HIGH: { outcome: "Immediate / Emergency", escalate: false },
  CRITICAL: { outcome: "Immediate / Escalation", escalate: true },
  UNRESOLVED: { outcome: "Human Review / Escalation", escalate: true },
};

/** Determine routing from risk level and patient state */
export function determineRouting(
  riskLevel: RiskLevel,
  state: PatientState
): RoutingDecision {
  const base = routingMap[riskLevel];
  const contradictionCount = state.contradictions.filter((c) => c.detected).length;
  const missingCount = state.missingCriticalFields.length;

  // Override: if MODERATE but has contradictions, escalate to urgent
  let outcome = base.outcome;
  let escalate = base.escalate;
  let reason = `Risk level ${riskLevel} maps to ${outcome}`;

  if (riskLevel === "MODERATE" && contradictionCount > 0) {
    outcome = "Urgent Assessment";
    reason = `Risk level ${riskLevel} with ${contradictionCount} contradiction(s) — elevated to urgent`;
  }

  // Override: if concerning evidence with many unknowns
  if (missingCount > 3 && contradictionCount > 0) {
    outcome = "Human Review / Escalation";
    escalate = true;
    reason = `${missingCount} missing critical fields with ${contradictionCount} contradiction(s) — escalating to human review`;
  }

  // Override: if HIGH and worsening (has contradictions indicating deterioration)
  if (riskLevel === "HIGH" && contradictionCount > 0) {
    outcome = "Immediate / Escalation";
    escalate = true;
    reason = `Risk level HIGH with active contradiction(s) — escalating to immediate`;
  }

  return {
    outcome,
    riskLevel,
    escalate,
    reason,
    decidedAt: timestamp(),
  };
}

/** Get the color for a routing outcome */
export function getRoutingColor(outcome: RoutingOutcome): string {
  switch (outcome) {
    case "Standard":
      return "var(--risk-low)";
    case "Urgent Assessment":
      return "var(--risk-mod)";
    case "Immediate / Emergency":
      return "var(--risk-high)";
    case "Immediate / Escalation":
      return "var(--risk-crit)";
    case "Human Review / Escalation":
      return "var(--risk-crit)";
  }
}
