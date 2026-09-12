/**
 * TriageFlow AI — Adaptive Question Selector
 *
 * Chooses the next question based on CURRENT patient state.
 * Does NOT follow a fixed sequence.
 *
 * Scoring formula (synthetic, documented):
 *   priority = safetyRelevance + riskImpact + uncertaintyReduction + routingImpact - alreadyKnownPenalty
 *
 * ⚠ This formula is NOT medically validated. It is a demonstration of
 * adaptive, state-aware question selection.
 */

import type { PatientState, Question, ScoredQuestion, QuestionCategory } from "../domain/types";

/** The full candidate question pool */
const questionPool: Question[] = [
  {
    id: "q-chest-pain",
    text: "Are you currently experiencing chest pain?",
    category: "symptom",
    resolvesField: "Chest pain severity",
    safetyRelevance: 10,
    riskImpact: 9,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Chest pain is a primary safety indicator. Its presence or absence significantly affects risk scoring.",
  },
  {
    id: "q-chest-pain-severity",
    text: "How would you rate the severity of your chest pain?",
    category: "severity",
    resolvesField: "Chest pain severity",
    safetyRelevance: 9,
    riskImpact: 9,
    options: [
      { label: "Mild", value: "mild" },
      { label: "Moderate", value: "moderate" },
      { label: "Severe", value: "severe" },
      { label: "Resolved", value: "resolved" },
    ],
    allowFreeText: false,
    rationale: "Severity grading directly determines risk score contribution (+1.5 moderate, +3 severe).",
  },
  {
    id: "q-shortness-breath",
    text: "Are you currently experiencing shortness of breath?",
    category: "symptom",
    resolvesField: "Shortness of breath severity",
    safetyRelevance: 9,
    riskImpact: 8,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Respiratory status is unresolved and may materially affect the risk assessment.",
  },
  {
    id: "q-nausea",
    text: "Are you experiencing nausea or vomiting?",
    category: "symptom",
    resolvesField: "Nausea severity",
    safetyRelevance: 5,
    riskImpact: 4,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Nausea in combination with chest pain may indicate cardiac involvement.",
  },
  {
    id: "q-dizziness",
    text: "Are you feeling dizzy or lightheaded?",
    category: "symptom",
    resolvesField: "Dizziness severity",
    safetyRelevance: 6,
    riskImpact: 5,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Dizziness may indicate hemodynamic instability.",
  },
  {
    id: "q-sweating",
    text: "Are you experiencing unusual sweating (diaphoresis)?",
    category: "symptom",
    resolvesField: "Sweating severity",
    safetyRelevance: 6,
    riskImpact: 5,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Diaphoresis in combination with chest pain is a concerning sign.",
  },
  {
    id: "q-palpitations",
    text: "Are you experiencing heart palpitations?",
    category: "symptom",
    resolvesField: "Palpitations severity",
    safetyRelevance: 6,
    riskImpact: 5,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Palpitations may indicate arrhythmia or cardiac distress.",
  },
  {
    id: "q-symptom-onset",
    text: "When did your symptoms begin?",
    category: "onset",
    resolvesField: "Symptom onset time",
    safetyRelevance: 7,
    riskImpact: 6,
    options: [
      { label: "Less than 30 min ago", value: "< 30 min" },
      { label: "30 min – 2 hours ago", value: "30 min – 2 hours" },
      { label: "2 – 6 hours ago", value: "2–6 hours" },
      { label: "More than 6 hours ago", value: "> 6 hours" },
    ],
    allowFreeText: true,
    rationale: "Onset time helps determine acuity and urgency of intervention.",
  },
  {
    id: "q-symptom-worse",
    text: "Have your symptoms become worse since they started?",
    category: "severity",
    resolvesField: "Symptom progression",
    safetyRelevance: 8,
    riskImpact: 7,
    options: [
      { label: "Yes, getting worse", value: "Yes" },
      { label: "No, stable", value: "No" },
      { label: "Improving", value: "Improving" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Worsening symptoms indicate deterioration and may require escalation.",
  },
  {
    id: "q-blood-pressure",
    text: "What is your current blood pressure reading?",
    category: "vital",
    resolvesField: "Blood pressure",
    safetyRelevance: 7,
    riskImpact: 6,
    options: [
      { label: "Normal (around 120/80)", value: "120/80" },
      { label: "Elevated (130–140 / 85–90)", value: "135/88" },
      { label: "High (above 140/90)", value: "155/95" },
      { label: "Don't know", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Blood pressure is a missing critical vital that may alter risk assessment.",
  },
  {
    id: "q-heart-rate",
    text: "What is your current heart rate?",
    category: "vital",
    resolvesField: "Heart rate",
    safetyRelevance: 7,
    riskImpact: 7,
    options: [
      { label: "Normal (60–100 bpm)", value: "80" },
      { label: "Elevated (100–120 bpm)", value: "110" },
      { label: "Very fast (above 120 bpm)", value: "135" },
      { label: "Don't know", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Heart rate status directly impacts risk scoring thresholds.",
  },
  {
    id: "q-oxygen-sat",
    text: "What is your current oxygen saturation (SpO₂)?",
    category: "vital",
    resolvesField: "Oxygen saturation (SpO₂)",
    safetyRelevance: 9,
    riskImpact: 8,
    options: [
      { label: "Normal (96–100%)", value: "98" },
      { label: "Borderline (92–95%)", value: "93" },
      { label: "Low (below 92%)", value: "89" },
      { label: "Don't know", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "SpO₂ below 92% significantly increases risk score. This is a critical safety indicator.",
  },
  {
    id: "q-temperature",
    text: "What is your current body temperature?",
    category: "vital",
    resolvesField: "Temperature",
    safetyRelevance: 4,
    riskImpact: 3,
    options: [
      { label: "Normal (36.5–37.5°C)", value: "37.0" },
      { label: "Mild fever (37.5–38.5°C)", value: "38.0" },
      { label: "High fever (above 38.5°C)", value: "39.0" },
      { label: "Don't know", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Temperature helps identify infection-related complications.",
  },
  {
    id: "q-respiratory-rate",
    text: "What is your breathing rate (breaths per minute)?",
    category: "vital",
    resolvesField: "Respiratory rate",
    safetyRelevance: 6,
    riskImpact: 5,
    options: [
      { label: "Normal (12–20/min)", value: "16" },
      { label: "Slightly fast (20–24/min)", value: "22" },
      { label: "Fast (above 24/min)", value: "28" },
      { label: "Don't know", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Elevated respiratory rate indicates respiratory distress.",
  },
  {
    id: "q-prior-mi",
    text: "Do you have a history of heart attack (myocardial infarction)?",
    category: "history",
    resolvesField: "Prior MI",
    safetyRelevance: 7,
    riskImpact: 7,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: false,
    rationale: "Prior MI history adds +1 to risk score and changes routing urgency.",
  },
  {
    id: "q-medications",
    text: "Are you currently taking any medications?",
    category: "history",
    resolvesField: "Medications",
    safetyRelevance: 4,
    riskImpact: 3,
    options: [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Current medications may interact with treatment decisions.",
  },
  {
    id: "q-age",
    text: "What is your age?",
    category: "history",
    resolvesField: "Patient age",
    safetyRelevance: 5,
    riskImpact: 5,
    options: [
      { label: "Under 40", value: "35" },
      { label: "40–60", value: "50" },
      { label: "Over 60", value: "70" },
      { label: "Unsure", value: "Unsure" },
    ],
    allowFreeText: true,
    rationale: "Age over 60 adds +1 to risk score.",
  },
];

/** Check if a field is already known in patient state */
function isFieldKnown(state: PatientState, resolvesField: string): boolean {
  const lower = resolvesField.toLowerCase();

  // Check symptoms
  for (const s of state.symptoms) {
    if (lower.includes(s.name.toLowerCase()) && lower.includes("severity")) {
      return s.severity.status === "Known" || s.severity.status === "Updated";
    }
  }

  // Check vitals
  if (lower.includes("heart rate")) return state.vitals.heartRate.status !== "Unknown";
  if (lower.includes("spo") || lower.includes("oxygen")) return state.vitals.spo2.status !== "Unknown";
  if (lower.includes("blood pressure")) return state.vitals.bloodPressureSystolic.status !== "Unknown";
  if (lower.includes("temperature")) return state.vitals.temperature.status !== "Unknown";
  if (lower.includes("respiratory")) return state.vitals.respiratoryRate.status !== "Unknown";

  // Check demographics
  if (lower.includes("age")) return state.demographics.age.status !== "Unknown";

  // Check onset
  if (lower.includes("onset")) {
    const activeSymptoms = state.symptoms.filter(
      (s) => s.severity.value && s.severity.value !== "none" && s.severity.value !== "resolved"
    );
    return activeSymptoms.every((s) => s.onset.status !== "Unknown");
  }

  // Check risk factors
  if (lower.includes("prior mi")) {
    return state.riskFactors.some(
      (rf) => rf.value && (rf.value.toLowerCase().includes("mi") || rf.value.toLowerCase().includes("no prior mi"))
    );
  }

  if (lower.includes("medications")) return false; // We don't track medications explicitly

  // Check symptom progression
  if (lower.includes("progression")) return false; // Tracked implicitly

  return false;
}

/** Calculate uncertainty reduction score — how much unknown info this question resolves */
function uncertaintyReduction(state: PatientState, question: Question): number {
  const known = isFieldKnown(state, question.resolvesField);
  if (known) return 0;

  // Higher reduction for critical missing fields
  if (state.missingCriticalFields.some((f) => f.toLowerCase().includes(question.resolvesField.toLowerCase()))) {
    return 3;
  }
  return 2;
}

/** Estimate routing impact — how much this answer could change routing */
function routingImpact(state: PatientState, question: Question): number {
  const currentLevel = state.riskAssessment?.level ?? "LOW";

  // If we're at boundary levels, questions that could tip the score matter more
  if (question.category === "vital" && (currentLevel === "MODERATE" || currentLevel === "HIGH")) {
    return 3;
  }
  if (question.category === "symptom" && question.safetyRelevance >= 8) {
    return 2;
  }
  return 1;
}

/** Select and rank questions based on current patient state */
export function selectNextQuestion(
  state: PatientState,
  askedQuestionIds: string[]
): ScoredQuestion | null {
  const candidates: ScoredQuestion[] = [];

  for (const question of questionPool) {
    // Skip already-asked questions
    if (askedQuestionIds.includes(question.id)) continue;

    const known = isFieldKnown(state, question.resolvesField);
    const alreadyKnownPenalty = known ? 15 : 0;

    // For chest-pain-severity, only ask if chest pain is confirmed
    if (question.id === "q-chest-pain-severity") {
      const cp = state.symptoms.find((s) => s.name.toLowerCase().includes("chest pain"));
      if (!cp || cp.severity.value === "none" || cp.severity.value === "resolved") continue;
      // Only ask if we haven't already got a specific severity
      if (cp.severity.value === "mild" || cp.severity.value === "moderate" || cp.severity.value === "severe") {
        continue;
      }
    }

    const uncReduction = uncertaintyReduction(state, question);
    const rtImpact = routingImpact(state, question);

    const score =
      question.safetyRelevance +
      question.riskImpact +
      uncReduction +
      rtImpact -
      alreadyKnownPenalty;

    candidates.push({
      question,
      score,
      breakdown: {
        safetyRelevance: question.safetyRelevance,
        riskImpact: question.riskImpact,
        uncertaintyReduction: uncReduction,
        routingImpact: rtImpact,
        alreadyKnownPenalty,
      },
    });
  }

  // Sort by descending score
  candidates.sort((a, b) => b.score - a.score);

  // Filter out questions with very low scores (already known)
  const viable = candidates.filter((c) => c.score > 5);

  return viable.length > 0 ? viable[0] : null;
}

/** Get all scored candidates for transparency (decision trace) */
export function getAllScoredQuestions(
  state: PatientState,
  askedQuestionIds: string[]
): ScoredQuestion[] {
  const candidates: ScoredQuestion[] = [];

  for (const question of questionPool) {
    if (askedQuestionIds.includes(question.id)) continue;

    const known = isFieldKnown(state, question.resolvesField);
    const alreadyKnownPenalty = known ? 15 : 0;
    const uncReduction = uncertaintyReduction(state, question);
    const rtImpact = routingImpact(state, question);

    const score =
      question.safetyRelevance +
      question.riskImpact +
      uncReduction +
      rtImpact -
      alreadyKnownPenalty;

    candidates.push({
      question,
      score,
      breakdown: {
        safetyRelevance: question.safetyRelevance,
        riskImpact: question.riskImpact,
        uncertaintyReduction: uncReduction,
        routingImpact: rtImpact,
        alreadyKnownPenalty,
      },
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}
