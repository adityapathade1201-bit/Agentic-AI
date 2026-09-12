/**
 * TriageFlow AI — Evaluation Cases
 *
 * Re-exports the 6 canonical synthetic cases and defines
 * specific test expectations and invariant requirements for each case.
 */

import { patientCases } from "../data/patientCases";
import type { SyntheticPatientCase } from "../domain/types";

export interface CaseEvaluationSpec {
  patientCase: SyntheticPatientCase;
  expectedRouting: string;
  expectedRiskLevel?: string;
  expectedMinRiskScore?: number;
  expectedMaxRiskScore?: number;
  expectedContradiction: boolean;
  expectedEscalation: boolean;
  maxAllowedQuestions: number;
  minAllowedQuestions: number;
  requiredFieldsInTrace?: string[];
  description: string;
}

export const evaluationSpecs: CaseEvaluationSpec[] = [
  {
    patientCase: patientCases[0], // TRG-3001
    expectedRouting: "Standard",
    expectedRiskLevel: "LOW",
    expectedMaxRiskScore: 3.5,
    expectedContradiction: false,
    expectedEscalation: false,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 1,
    description: "Low-Risk — Mild headache, normal vitals, standard routing expected without escalation",
  },
  {
    patientCase: patientCases[1], // TRG-3002
    expectedRouting: "Urgent Assessment",
    expectedRiskLevel: "MODERATE",
    expectedContradiction: false,
    expectedEscalation: false,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 1,
    description: "Moderate-Risk — Chest discomfort, hypertension, urgent assessment expected",
  },
  {
    patientCase: patientCases[2], // TRG-3003
    expectedRouting: "Immediate / Emergency",
    expectedRiskLevel: "CRITICAL",
    expectedMinRiskScore: 8.0,
    expectedContradiction: false,
    expectedEscalation: false,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 1,
    description: "High-Risk — Severe chest pain, tachycardia, hypoxia, immediate emergency routing",
  },
  {
    patientCase: patientCases[3], // TRG-3004
    expectedRouting: "Immediate / Escalation",
    expectedRiskLevel: "CRITICAL",
    expectedContradiction: true,
    expectedEscalation: true,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 2,
    description: "Contradiction — Resolved chest pain flips to severe; contradiction must be detected & escalated",
  },
  {
    patientCase: patientCases[4], // TRG-3005
    expectedRouting: "Human Review / Escalation",
    expectedRiskLevel: "UNRESOLVED",
    expectedContradiction: false,
    expectedEscalation: true,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 3,
    description: "Insufficient Data — Severe lack of data with unsure answers must escalate to human review (Unknown != Low Risk)",
  },
  {
    patientCase: patientCases[5], // TRG-3006
    expectedRouting: "Immediate / Emergency",
    expectedRiskLevel: "CRITICAL",
    expectedContradiction: false,
    expectedEscalation: false,
    maxAllowedQuestions: 10,
    minAllowedQuestions: 2,
    description: "Changing Vitals — Deteriorating vitals (rising HR, dropping SpO2) causing dynamic risk recalculation and routing update",
  },
];
