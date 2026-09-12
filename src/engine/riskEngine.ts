/**
 * TriageFlow AI — Deterministic Risk Engine
 *
 * ⚠ SIMULATION ENGINE — NOT clinically validated.
 * Uses synthetic, rule-based scoring for demonstration purposes.
 *
 * Scoring thresholds (synthetic, documented):
 *   Severe chest pain                   → +3
 *   Moderate chest pain                 → +1.5
 *   SpO₂ < 92%                          → +2
 *   SpO₂ 92–94%                         → +1
 *   Heart rate > 120 bpm                → +1
 *   Heart rate > 140 bpm                → +2 (replaces +1)
 *   Respiratory rate > 24               → +1
 *   Age > 60                            → +1
 *   Hypertension risk factor            → +0.5
 *   Smoker risk factor                  → +0.5
 *   Diabetes risk factor                → +0.5
 *   Prior MI risk factor                → +1
 *   Shortness of breath (present)       → +1
 *   Shortness of breath (severe)        → +1.5
 *   Active contradiction                → +1 each
 *   Score capped if >2 critical unknowns → UNRESOLVED
 *
 * Level mapping:
 *   0–3   → LOW
 *   4–5   → MODERATE
 *   6–7   → HIGH
 *   8–10  → CRITICAL
 *   Contradictions + >2 unknowns → UNRESOLVED
 */

import type { PatientState, RiskAssessment, RiskLevel, ContributingFactor } from "../domain/types";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function calculateRisk(state: PatientState): RiskAssessment {
  let score = 0;
  const factors: ContributingFactor[] = [];
  const missingCritical: string[] = [];
  const reasons: string[] = [];

  // ── Chest pain scoring ──
  const chestPain = state.symptoms.find((s) => s.name.toLowerCase().includes("chest pain"));
  if (chestPain) {
    if (chestPain.severity.value === "severe") {
      score += 3;
      factors.push({ description: "Chest pain (severe)", weight: 3 });
    } else if (chestPain.severity.value === "moderate") {
      score += 1.5;
      factors.push({ description: "Chest pain (moderate)", weight: 1.5 });
    } else if (chestPain.severity.status === "Unknown") {
      missingCritical.push("Chest pain severity");
    }
  }

  // ── SpO₂ scoring ──
  const spo2 = state.vitals.spo2.value;
  if (spo2 !== null) {
    if (spo2 < 92) {
      score += 2;
      factors.push({ description: `SpO₂ ${spo2}% (hypoxia)`, weight: 2 });
    } else if (spo2 <= 94) {
      score += 1;
      factors.push({ description: `SpO₂ ${spo2}% (borderline)`, weight: 1 });
    }
  } else {
    missingCritical.push("Oxygen saturation (SpO₂)");
  }

  // ── Heart rate scoring ──
  const hr = state.vitals.heartRate.value;
  if (hr !== null) {
    if (hr > 140) {
      score += 2;
      factors.push({ description: `Heart rate ${hr} bpm (tachycardia)`, weight: 2 });
    } else if (hr > 120) {
      score += 1;
      factors.push({ description: `Heart rate ${hr} bpm (elevated)`, weight: 1 });
    }
  } else {
    missingCritical.push("Heart rate");
  }

  // ── Respiratory rate scoring ──
  const rr = state.vitals.respiratoryRate.value;
  if (rr !== null && rr > 24) {
    score += 1;
    factors.push({ description: `Respiratory rate ${rr} /min (tachypnea)`, weight: 1 });
  }

  // ── Age scoring ──
  const age = state.demographics.age.value;
  if (age !== null && age > 60) {
    score += 1;
    factors.push({ description: `Age ${age} (elderly)`, weight: 1 });
  }

  // ── Risk factor scoring ──
  for (const rf of state.riskFactors) {
    const val = rf.value?.toLowerCase() ?? "";
    if (val.includes("hypertension")) {
      score += 0.5;
      factors.push({ description: "Hypertension", weight: 0.5 });
    }
    if (val.includes("smoker")) {
      score += 0.5;
      factors.push({ description: "Smoker", weight: 0.5 });
    }
    if (val.includes("diabetes")) {
      score += 0.5;
      factors.push({ description: "Diabetes", weight: 0.5 });
    }
    if (val.includes("prior mi") || val.includes("previous mi") || val.includes("myocardial infarction")) {
      score += 1;
      factors.push({ description: "Prior MI", weight: 1 });
    }
  }

  // ── Shortness of breath scoring ──
  const sob = state.symptoms.find((s) => s.name.toLowerCase().includes("shortness of breath"));
  if (sob) {
    if (sob.severity.value === "severe") {
      score += 1.5;
      factors.push({ description: "Shortness of breath (severe)", weight: 1.5 });
    } else if (sob.severity.value === "moderate" || sob.severity.value === "mild") {
      score += 1;
      factors.push({ description: `Shortness of breath (${sob.severity.value})`, weight: 1 });
    }
  }

  // ── Nausea scoring (minor) ──
  const nausea = state.symptoms.find((s) => s.name.toLowerCase().includes("nausea"));
  if (nausea && nausea.severity.value && nausea.severity.value !== "none" && nausea.severity.value !== "resolved") {
    score += 0.5;
    factors.push({ description: `Nausea (${nausea.severity.value})`, weight: 0.5 });
  }

  // ── Contradiction scoring ──
  const activeContradictions = state.contradictions.filter((c) => c.detected);
  if (activeContradictions.length > 0) {
    const contradictionScore = activeContradictions.length;
    score += contradictionScore;
    factors.push({
      description: `${activeContradictions.length} active contradiction(s)`,
      weight: contradictionScore,
    });
    reasons.push("Contradictory information present — requires reassessment");
  }

  // ── Missing critical info ──
  const allMissing = [...state.missingCriticalFields];
  missingCritical.push(...allMissing.filter((m) => !missingCritical.includes(m)));

  // Clamp score to 0-10
  score = Math.min(10, Math.max(0, Math.round(score * 10) / 10));

  // ── Determine level ──
  let level: RiskLevel;
  if (activeContradictions.length > 0 && missingCritical.length > 2) {
    level = "UNRESOLVED";
    reasons.push("Multiple unresolved contradictions with significant missing data");
  } else if (score >= 8) {
    level = "CRITICAL";
    reasons.push("Risk score exceeds critical threshold (≥8)");
  } else if (score >= 6) {
    level = "HIGH";
    reasons.push("Risk score in high range (6–7)");
  } else if (score >= 4) {
    level = "MODERATE";
    reasons.push("Risk score in moderate range (4–5)");
  } else {
    level = "LOW";
    reasons.push("Risk score below moderate threshold (<4)");
  }

  return {
    score,
    level,
    contributingFactors: factors,
    missingCriticalInformation: [...new Set(missingCritical)],
    reasons,
    evaluatedAt: timestamp(),
  };
}
