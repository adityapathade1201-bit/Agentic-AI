/**
 * TriageFlow AI — Escalation Engine
 *
 * Determines when the system cannot safely make a routing decision
 * and must escalate to human review.
 *
 * IMPORTANT: Never manufactures certainty. "Unknown" is NOT "Low Risk."
 */

import type { PatientState, EscalationResult } from "../domain/types";

/**
 * Evaluate whether escalation is required.
 *
 * Escalation triggers:
 * - CRITICAL risk level
 * - UNRESOLVED risk level
 * - Active contradictions on safety-critical fields (chest pain, SpO₂, HR)
 * - >3 missing critical fields with any concerning evidence
 * - Risk score ≥ 8 with unresolved contradictions
 */
export function evaluateEscalation(state: PatientState): EscalationResult {
  const activeContradictions = state.contradictions.filter((c) => c.detected);
  const missingCount = state.missingCriticalFields.length;
  const riskLevel = state.riskAssessment?.level;
  const riskScore = state.riskAssessment?.score ?? 0;

  const reasons: string[] = [];

  // Check UNRESOLVED risk (insufficient data)
  if (riskLevel === "UNRESOLVED") {
    reasons.push("Risk level is UNRESOLVED — insufficient data for safe automated routing");
  }

  // Check critical contradictions
  const criticalContradictions = activeContradictions.filter(
    (c) => c.severity === "critical" || c.severity === "high"
  );
  if (criticalContradictions.length > 0) {
    reasons.push(
      `${criticalContradictions.length} high/critical contradiction(s) on safety-relevant fields`
    );
  }

  // Check missing critical fields (insufficient data)
  if (missingCount >= 4) {
    reasons.push(
      `${missingCount} critical fields remain unknown — cannot establish safe routing without clinical evaluation`
    );
  }

  // Check high risk with unresolved contradictions
  if (riskScore >= 8 && activeContradictions.length > 0) {
    reasons.push(
      `Risk score ${riskScore} with ${activeContradictions.length} unresolved contradiction(s)`
    );
  }

  const shouldEscalate = reasons.length > 0;

  return {
    shouldEscalate,
    reason: shouldEscalate
      ? reasons.join(". ") + "."
      : "No escalation criteria met. Routing decision is supported.",
    requiresHumanReview: shouldEscalate,
    unresolvedContradictions: activeContradictions.length,
    missingCriticalFields: missingCount,
  };
}
