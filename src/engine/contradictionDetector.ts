/**
 * TriageFlow AI — Contradiction Detector
 *
 * Deterministic contradiction detection logic.
 * No LLM or model inference — pure rule-based detection.
 *
 * Detects:
 * - Symptom severity reversals (resolved → severe)
 * - Vital sign large deltas
 * - Impossible / inconsistent values
 */

import type { PatientState, Contradiction, ContradictionSeverity } from "../domain/types";

/** Run all contradiction checks on current patient state */
export function detectContradictions(state: PatientState): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Check symptom contradictions from event history
  contradictions.push(...detectSymptomContradictions(state));

  // Check vital sign contradictions from event history
  contradictions.push(...detectVitalContradictions(state));

  // Check impossible values
  contradictions.push(...detectImpossibleValues(state));

  return contradictions;
}

/** Detect symptom severity contradictions from event log */
function detectSymptomContradictions(state: PatientState): Contradiction[] {
  const contradictions: Contradiction[] = [];

  for (const symptom of state.symptoms) {
    if (symptom.severity.status !== "Conflicting") continue;

    // Check history for contradictory transitions
    const history = symptom.severity.history;
    if (history.length < 2) continue;

    const current = symptom.severity.value;
    // Find the prior distinct value
    for (let i = 1; i < history.length; i++) {
      const prev = history[i].value;
      if (prev === current) continue;

      if (isSymptomContradiction(prev, current)) {
        contradictions.push({
          detected: true,
          field: `${symptom.name} severity`,
          previousValue: prev ?? "unknown",
          newValue: current ?? "unknown",
          reason: `${symptom.name}: "${prev}" → "${current}" is a contradictory transition`,
          severity: classifySymptomContradictionSeverity(prev, current),
          detectedAt: symptom.severity.lastUpdated,
        });
        break;
      }
    }
  }

  return contradictions;
}

function isSymptomContradiction(prev: string | null, next: string | null): boolean {
  if (!prev || !next) return false;
  // resolved → severe / moderate
  if (prev === "resolved" && (next === "severe" || next === "moderate")) return true;
  // none → severe
  if (prev === "none" && next === "severe") return true;
  // severe → none (without resolving)
  if (prev === "severe" && next === "none") return true;
  return false;
}

function classifySymptomContradictionSeverity(
  prev: string | null,
  next: string | null
): ContradictionSeverity {
  if (next === "severe") return "critical";
  if (prev === "resolved" && next === "moderate") return "high";
  return "moderate";
}

/** Detect vital sign large deltas from history */
function detectVitalContradictions(state: PatientState): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const checks: {
    key: string;
    field: { value: number | null; history: { value: number | null }[]; status: string; lastUpdated: string };
    threshold: number;
    label: string;
    unit: string;
  }[] = [
    { key: "heartRate", field: state.vitals.heartRate, threshold: 30, label: "Heart rate", unit: "bpm" },
    { key: "spo2", field: state.vitals.spo2, threshold: 8, label: "SpO₂", unit: "%" },
    { key: "bloodPressureSystolic", field: state.vitals.bloodPressureSystolic, threshold: 30, label: "Systolic BP", unit: "mmHg" },
    { key: "temperature", field: state.vitals.temperature, threshold: 1.5, label: "Temperature", unit: "°C" },
    { key: "respiratoryRate", field: state.vitals.respiratoryRate, threshold: 8, label: "Respiratory rate", unit: "/min" },
  ];

  for (const check of checks) {
    if (check.field.status !== "Conflicting") continue;
    if (check.field.value === null || check.field.history.length < 2) continue;

    // Find the prior distinct value
    for (let i = 1; i < check.field.history.length; i++) {
      const prevVal = check.field.history[i].value;
      if (prevVal === null) continue;
      const delta = Math.abs(check.field.value - prevVal);
      if (delta >= check.threshold) {
        contradictions.push({
          detected: true,
          field: check.key,
          previousValue: `${prevVal}${check.unit}`,
          newValue: `${check.field.value}${check.unit}`,
          reason: `${check.label} changed by Δ${delta.toFixed(1)} (threshold: ${check.threshold})`,
          severity: delta >= check.threshold * 1.5 ? "critical" : "high",
          detectedAt: check.field.lastUpdated,
        });
        break;
      }
    }
  }

  return contradictions;
}

/** Detect biologically impossible values */
function detectImpossibleValues(state: PatientState): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const { vitals, demographics } = state;

  // Heart rate checks
  if (vitals.heartRate.value !== null) {
    if (vitals.heartRate.value < 20 || vitals.heartRate.value > 250) {
      contradictions.push({
        detected: true,
        field: "heartRate",
        previousValue: "",
        newValue: String(vitals.heartRate.value),
        reason: `Heart rate ${vitals.heartRate.value} bpm is outside physiological range (20–250)`,
        severity: "critical",
        detectedAt: vitals.heartRate.lastUpdated,
      });
    }
  }

  // SpO2 checks
  if (vitals.spo2.value !== null) {
    if (vitals.spo2.value < 0 || vitals.spo2.value > 100) {
      contradictions.push({
        detected: true,
        field: "spo2",
        previousValue: "",
        newValue: String(vitals.spo2.value),
        reason: `SpO₂ ${vitals.spo2.value}% is outside valid range (0–100)`,
        severity: "critical",
        detectedAt: vitals.spo2.lastUpdated,
      });
    }
  }

  // Temperature checks
  if (vitals.temperature.value !== null) {
    if (vitals.temperature.value < 25 || vitals.temperature.value > 45) {
      contradictions.push({
        detected: true,
        field: "temperature",
        previousValue: "",
        newValue: String(vitals.temperature.value),
        reason: `Temperature ${vitals.temperature.value}°C is outside physiological range (25–45)`,
        severity: "critical",
        detectedAt: vitals.temperature.lastUpdated,
      });
    }
  }

  // Age checks
  if (demographics.age.value !== null) {
    if (demographics.age.value < 0 || demographics.age.value > 130) {
      contradictions.push({
        detected: true,
        field: "age",
        previousValue: "",
        newValue: String(demographics.age.value),
        reason: `Age ${demographics.age.value} is outside valid range (0–130)`,
        severity: "moderate",
        detectedAt: demographics.age.lastUpdated,
      });
    }
  }

  return contradictions;
}

/** Count active (unresolved) contradictions */
export function countActiveContradictions(state: PatientState): number {
  return state.contradictions.filter((c) => c.detected).length;
}
