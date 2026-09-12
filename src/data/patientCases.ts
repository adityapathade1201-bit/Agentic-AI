/**
 * TriageFlow AI — Synthetic Patient Cases
 *
 * ⚠ SYNTHETIC TEST DATA for demonstration only.
 * These cases are NOT based on real patients or clinical guidelines.
 * Each case starts with intentionally incomplete information to demonstrate
 * the adaptive questioning and reassessment capabilities.
 */

import type { SyntheticPatientCase } from "../domain/types";

export const patientCases: SyntheticPatientCase[] = [
  /* ── Case 1: LOW-RISK ──────────────────────────────────────── */
  {
    id: "TRG-3001",
    label: "Low-Risk — Mild Headache",
    description: "Young adult presenting with mild headache and no alarming vitals. Demonstrates standard routing path.",
    difficulty: "Low",
    age: 28,
    sex: "Female",
    weight: 65,
    initialSymptoms: [
      { name: "Headache", severity: "mild", onset: null },
      { name: "Chest pain", severity: null, onset: null },
      { name: "Shortness of breath", severity: null, onset: null },
      { name: "Nausea", severity: null, onset: null },
    ],
    vitals: {
      heartRate: 72,
      spo2: 98,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: [],
    scriptedAnswers: {
      "q-chest-pain": "No",
      "q-shortness-breath": "No",
      "q-nausea": "No",
      "q-symptom-onset": "~2 hours ago",
      "q-symptom-worse": "No",
      "q-blood-pressure": "120/80",
      "q-temperature": "37.0",
      "q-heart-rate": "72",
      "q-oxygen-sat": "98",
      "q-prior-mi": "No",
      "q-medications": "None",
      "q-allergies": "None",
    },
    expectedRouting: "Standard",
  },

  /* ── Case 2: MODERATE-RISK ─────────────────────────────────── */
  {
    id: "TRG-3002",
    label: "Moderate-Risk — Chest Discomfort",
    description: "Middle-aged patient with chest discomfort and hypertension. Demonstrates urgent assessment routing.",
    difficulty: "Moderate",
    age: 55,
    sex: "Male",
    weight: null,
    initialSymptoms: [
      { name: "Chest pain", severity: "moderate", onset: null },
      { name: "Shortness of breath", severity: null, onset: null },
      { name: "Nausea", severity: null, onset: null },
      { name: "Dizziness", severity: null, onset: null },
    ],
    vitals: {
      heartRate: 98,
      spo2: 95,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: ["Hypertension"],
    scriptedAnswers: {
      "q-chest-pain": "Yes",
      "q-shortness-breath": "Unsure",
      "q-nausea": "No",
      "q-dizziness": "Yes",
      "q-symptom-onset": "~40 minutes ago",
      "q-symptom-worse": "Unsure",
      "q-blood-pressure": "145/92",
      "q-temperature": "37.2",
      "q-prior-mi": "No",
      "q-medications": "Amlodipine",
      "q-respiratory-rate": "18",
    },
    expectedRouting: "Urgent Assessment",
  },

  /* ── Case 3: HIGH-RISK ─────────────────────────────────────── */
  {
    id: "TRG-3003",
    label: "High-Risk — Severe Chest Pain",
    description: "Elderly patient with severe chest pain, low SpO₂, and multiple risk factors. Demonstrates immediate routing.",
    difficulty: "High",
    age: 71,
    sex: "Male",
    weight: 82,
    initialSymptoms: [
      { name: "Chest pain", severity: "severe", onset: "~30 min ago" },
      { name: "Shortness of breath", severity: null, onset: null },
      { name: "Nausea", severity: "moderate", onset: null },
      { name: "Sweating", severity: null, onset: null },
    ],
    vitals: {
      heartRate: 128,
      spo2: 89,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: ["Hypertension", "Smoker", "Diabetes"],
    scriptedAnswers: {
      "q-chest-pain": "Yes",
      "q-shortness-breath": "Yes",
      "q-nausea": "Yes",
      "q-sweating": "Yes",
      "q-symptom-onset": "~30 minutes ago",
      "q-symptom-worse": "Yes",
      "q-blood-pressure": "170/105",
      "q-temperature": "37.5",
      "q-prior-mi": "Yes",
      "q-respiratory-rate": "24",
    },
    expectedRouting: "Immediate / Emergency",
  },

  /* ── Case 4: CONTRADICTION ─────────────────────────────────── */
  {
    id: "TRG-3004",
    label: "Contradiction — Pain Status Conflict",
    description: "Patient initially reports resolved chest pain, but later contradicts with severe pain. Demonstrates contradiction detection and reassessment.",
    difficulty: "Critical",
    age: 64,
    sex: "Male",
    weight: null,
    initialSymptoms: [
      { name: "Chest pain", severity: "resolved", onset: "~1 hour ago" },
      { name: "Shortness of breath", severity: null, onset: null },
      { name: "Nausea", severity: null, onset: null },
      { name: "Dizziness", severity: null, onset: null },
    ],
    vitals: {
      heartRate: 88,
      spo2: 96,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: ["Hypertension", "Smoker"],
    scriptedAnswers: {
      "q-chest-pain": "Yes",          // ← CONTRADICTION: was "resolved"
      "q-chest-pain-severity": "severe", // ← contradicts initial "resolved"
      "q-shortness-breath": "Yes",
      "q-nausea": "No",
      "q-symptom-onset": "~1 hour ago, but returned 10 min ago",
      "q-symptom-worse": "Yes",
      "q-blood-pressure": "155/98",
      "q-prior-mi": "No",
      "q-oxygen-sat": "91",           // ← SpO₂ drops during triage
      "q-respiratory-rate": "22",
    },
    expectedRouting: "Immediate / Escalation",
  },

  /* ── Case 5: MISSING DATA / UNRESOLVED ─────────────────────── */
  {
    id: "TRG-3005",
    label: "Unresolved — Insufficient Data",
    description: "Very sparse initial data with many unknown fields. Patient unable to provide clear answers. Demonstrates escalation due to uncertainty.",
    difficulty: "High",
    age: null,
    sex: null,
    weight: null,
    initialSymptoms: [
      { name: "Chest pain", severity: null, onset: null },
      { name: "Shortness of breath", severity: null, onset: null },
      { name: "Nausea", severity: null, onset: null },
      { name: "Confusion", severity: "moderate", onset: null },
    ],
    vitals: {
      heartRate: null,
      spo2: null,
      bloodPressureSystolic: null,
      bloodPressureDiastolic: null,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: [],
    scriptedAnswers: {
      "q-chest-pain": "Unsure",
      "q-shortness-breath": "Unsure",
      "q-nausea": "Unsure",
      "q-symptom-onset": "Unsure",
      "q-symptom-worse": "Unsure",
      "q-blood-pressure": "Unsure",
      "q-heart-rate": "Unsure",
      "q-oxygen-sat": "Unsure",
      "q-prior-mi": "Unsure",
      "q-age": "Unsure",
    },
    expectedRouting: "Human Review / Escalation",
  },

  /* ── Case 6: RAPIDLY CHANGING VITALS ───────────────────────── */
  {
    id: "TRG-3006",
    label: "Changing Vitals — Deteriorating Patient",
    description: "Patient with initially moderate vitals that deteriorate during triage. Heart rate rises and SpO₂ drops across turns. Demonstrates live reassessment.",
    difficulty: "Critical",
    age: 52,
    sex: "Female",
    weight: 70,
    initialSymptoms: [
      { name: "Chest pain", severity: "moderate", onset: "~20 min ago" },
      { name: "Shortness of breath", severity: "mild", onset: null },
      { name: "Nausea", severity: null, onset: null },
      { name: "Palpitations", severity: null, onset: null },
    ],
    vitals: {
      heartRate: 105,
      spo2: 94,
      bloodPressureSystolic: 138,
      bloodPressureDiastolic: 88,
      temperature: null,
      respiratoryRate: null,
    },
    riskFactors: ["Smoker"],
    scriptedAnswers: {
      "q-chest-pain": "Yes",
      "q-shortness-breath": "Yes",
      "q-nausea": "Yes",
      "q-palpitations": "Yes",
      "q-symptom-onset": "~20 minutes ago",
      "q-symptom-worse": "Yes",
      "q-temperature": "37.8",
      "q-prior-mi": "No",
      "q-heart-rate": "132",         // ← HR rising
      "q-oxygen-sat": "90",          // ← SpO₂ dropping
      "q-respiratory-rate": "26",
    },
    expectedRouting: "Immediate / Emergency",
  },
];
