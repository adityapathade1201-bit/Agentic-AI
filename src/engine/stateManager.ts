/**
 * TriageFlow AI — Patient State Manager
 *
 * Manages patient state with full history tracking.
 * Never silently overwrites previous observations.
 * Every update generates a PatientEvent.
 */

import type {
  PatientState,
  FieldEntry,
  FieldStatus,
  PatientEvent,
  Symptom,
  SymptomSeverity,
  Vitals,
  Demographics,
  SyntheticPatientCase,
  Contradiction,
  RiskAssessment,
  RoutingDecision,
} from "../domain/types";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function makeField<T>(value: T | null, source = "Intake"): FieldEntry<T> {
  const status: FieldStatus = value === null ? "Unknown" : "Known";
  return {
    value,
    status,
    history: value !== null ? [{ value, timestamp: timestamp(), source }] : [],
    lastUpdated: timestamp(),
    source,
  };
}

/** Initialize a PatientState from a synthetic case */
export function initializePatientState(patientCase: SyntheticPatientCase): PatientState {
  const demographics: Demographics = {
    age: makeField(patientCase.age),
    sex: makeField(patientCase.sex),
    weight: makeField(patientCase.weight),
  };

  const symptoms: Symptom[] = patientCase.initialSymptoms.map((s) => ({
    name: s.name,
    severity: makeField<SymptomSeverity>(s.severity ?? null),
    onset: makeField<string>(s.onset ?? null),
    notes: "",
  }));

  const vitals: Vitals = {
    heartRate: makeField(patientCase.vitals.heartRate),
    spo2: makeField(patientCase.vitals.spo2),
    bloodPressureSystolic: makeField(patientCase.vitals.bloodPressureSystolic),
    bloodPressureDiastolic: makeField(patientCase.vitals.bloodPressureDiastolic),
    temperature: makeField(patientCase.vitals.temperature),
    respiratoryRate: makeField(patientCase.vitals.respiratoryRate),
  };

  const riskFactors = patientCase.riskFactors.map((rf) => makeField<string>(rf));

  const missingCriticalFields = computeMissingCriticalFields(demographics, symptoms, vitals);

  return {
    caseId: patientCase.id,
    demographics,
    symptoms,
    vitals,
    riskFactors,
    missingCriticalFields,
    contradictions: [],
    riskAssessment: null,
    routingDecision: null,
    events: [],
    lastUpdated: timestamp(),
  };
}

/** Compute which critical fields are still unknown */
export function computeMissingCriticalFields(
  demographics: Demographics,
  symptoms: Symptom[],
  vitals: Vitals
): string[] {
  const missing: string[] = [];
  if (demographics.age.status === "Unknown") missing.push("Patient age");
  if (vitals.heartRate.status === "Unknown") missing.push("Heart rate");
  if (vitals.spo2.status === "Unknown") missing.push("Oxygen saturation (SpO₂)");
  if (vitals.bloodPressureSystolic.status === "Unknown") missing.push("Blood pressure");
  if (vitals.temperature.status === "Unknown") missing.push("Temperature");
  if (vitals.respiratoryRate.status === "Unknown") missing.push("Respiratory rate");

  // Check if key symptoms are unresolved
  for (const symptom of symptoms) {
    if (symptom.severity.status === "Unknown") {
      missing.push(`${symptom.name} severity`);
    }
    if (symptom.onset.status === "Unknown" && symptom.severity.value && symptom.severity.value !== "none") {
      missing.push(`${symptom.name} onset time`);
    }
  }

  return missing;
}

/** Update a vital sign field. Returns the event and optional contradiction. */
export function updateVitalField(
  state: PatientState,
  vitalKey: keyof Vitals,
  newValue: number | null,
  source: string
): { event: PatientEvent; contradiction: Contradiction | null } {
  const field = state.vitals[vitalKey];
  const prevValue = field.value;
  const prevStr = prevValue !== null ? String(prevValue) : "unknown";
  const newStr = newValue !== null ? String(newValue) : "unknown";

  // Determine new status
  let newStatus: FieldStatus = "Updated";
  let contradiction: Contradiction | null = null;

  if (prevValue === null && newValue !== null) {
    newStatus = "Known";
  } else if (prevValue !== null && newValue !== null) {
    // Check for significant changes that might be contradictions
    const significantChange = checkVitalContradiction(vitalKey, prevValue, newValue);
    if (significantChange) {
      newStatus = "Conflicting";
      contradiction = {
        detected: true,
        field: vitalKey,
        previousValue: prevStr,
        newValue: newStr,
        reason: significantChange,
        severity: "high",
        detectedAt: timestamp(),
      };
    }
  }

  // Preserve history
  if (field.value !== null) {
    field.history.unshift({ value: field.value, timestamp: field.lastUpdated, source: field.source });
  }

  // Apply update
  field.value = newValue;
  field.status = newStatus;
  field.lastUpdated = timestamp();
  field.source = source;

  // Add to history
  field.history.unshift({ value: newValue, timestamp: timestamp(), source });

  const event: PatientEvent = {
    time: timestamp(),
    source,
    field: vitalKey,
    previousValue: prevStr,
    newValue: newStr,
    status: newStatus,
  };

  state.events.push(event);
  state.lastUpdated = timestamp();

  // Re-compute missing fields
  state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);

  if (contradiction) {
    state.contradictions.push(contradiction);
  }

  return { event, contradiction };
}

/** Check if a vital change is significant enough to be a contradiction */
function checkVitalContradiction(key: keyof Vitals, oldVal: number, newVal: number): string | null {
  const delta = Math.abs(newVal - oldVal);
  switch (key) {
    case "heartRate":
      if (delta >= 30) return `Heart rate changed significantly: ${oldVal} → ${newVal} bpm (Δ${delta})`;
      break;
    case "spo2":
      if (delta >= 8) return `SpO₂ changed significantly: ${oldVal}% → ${newVal}% (Δ${delta})`;
      break;
    case "bloodPressureSystolic":
      if (delta >= 30) return `Systolic BP changed significantly: ${oldVal} → ${newVal} mmHg (Δ${delta})`;
      break;
    case "temperature":
      if (delta >= 1.5) return `Temperature changed significantly: ${oldVal}°C → ${newVal}°C (Δ${delta.toFixed(1)})`;
      break;
    case "respiratoryRate":
      if (delta >= 8) return `Respiratory rate changed significantly: ${oldVal} → ${newVal} /min (Δ${delta})`;
      break;
  }
  return null;
}

/** Update a symptom severity. Returns the event and optional contradiction. */
export function updateSymptomSeverity(
  state: PatientState,
  symptomName: string,
  newSeverity: SymptomSeverity,
  source: string
): { event: PatientEvent; contradiction: Contradiction | null } {
  const symptom = state.symptoms.find((s) => s.name === symptomName);
  if (!symptom) {
    // Add new symptom
    const newSymptom: Symptom = {
      name: symptomName,
      severity: makeField<SymptomSeverity>(newSeverity, source),
      onset: makeField<string>(null),
      notes: "",
    };
    state.symptoms.push(newSymptom);
    const event: PatientEvent = {
      time: timestamp(),
      source,
      field: `${symptomName} severity`,
      previousValue: "unknown",
      newValue: newSeverity,
      status: "Known",
    };
    state.events.push(event);
    state.lastUpdated = timestamp();
    state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);
    return { event, contradiction: null };
  }

  const prevSeverity = symptom.severity.value;
  const prevStr = prevSeverity ?? "unknown";

  // Detect contradiction: e.g. resolved → severe
  let newStatus: FieldStatus = "Updated";
  let contradiction: Contradiction | null = null;

  if (prevSeverity === null) {
    newStatus = "Known";
  } else if (prevSeverity !== newSeverity) {
    const isContradiction = checkSymptomContradiction(prevSeverity, newSeverity);
    if (isContradiction) {
      newStatus = "Conflicting";
      contradiction = {
        detected: true,
        field: `${symptomName} severity`,
        previousValue: prevStr,
        newValue: newSeverity,
        reason: `${symptomName} severity changed from "${prevStr}" to "${newSeverity}"`,
        severity: newSeverity === "severe" ? "critical" : "high",
        detectedAt: timestamp(),
      };
    }
  }

  // Preserve history
  if (symptom.severity.value !== null) {
    symptom.severity.history.unshift({
      value: symptom.severity.value,
      timestamp: symptom.severity.lastUpdated,
      source: symptom.severity.source,
    });
  }

  symptom.severity.value = newSeverity;
  symptom.severity.status = newStatus;
  symptom.severity.lastUpdated = timestamp();
  symptom.severity.source = source;
  symptom.severity.history.unshift({ value: newSeverity, timestamp: timestamp(), source });

  const event: PatientEvent = {
    time: timestamp(),
    source,
    field: `${symptomName} severity`,
    previousValue: prevStr,
    newValue: newSeverity,
    status: newStatus,
  };

  state.events.push(event);
  state.lastUpdated = timestamp();
  state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);

  if (contradiction) {
    state.contradictions.push(contradiction);
  }

  return { event, contradiction };
}

/** Check if a symptom severity change is contradictory */
function checkSymptomContradiction(prev: SymptomSeverity, next: SymptomSeverity): boolean {
  // resolved → severe / moderate is a contradiction
  if (prev === "resolved" && (next === "severe" || next === "moderate")) return true;
  // none → severe is a contradiction
  if (prev === "none" && next === "severe") return true;
  // severe → none without going through resolved is suspicious
  if (prev === "severe" && next === "none") return true;
  return false;
}

/** Update symptom onset time */
export function updateSymptomOnset(
  state: PatientState,
  symptomName: string,
  onset: string,
  source: string
): PatientEvent {
  const symptom = state.symptoms.find((s) => s.name === symptomName);
  if (!symptom) {
    const newSymptom: Symptom = {
      name: symptomName,
      severity: makeField<SymptomSeverity>(null),
      onset: makeField<string>(onset, source),
      notes: "",
    };
    state.symptoms.push(newSymptom);
  } else {
    const prevValue = symptom.onset.value ?? "unknown";
    if (symptom.onset.value !== null) {
      symptom.onset.history.unshift({
        value: symptom.onset.value,
        timestamp: symptom.onset.lastUpdated,
        source: symptom.onset.source,
      });
    }
    symptom.onset.value = onset;
    symptom.onset.status = symptom.onset.value === null ? "Known" : "Updated";
    symptom.onset.lastUpdated = timestamp();
    symptom.onset.source = source;
    symptom.onset.history.unshift({ value: onset, timestamp: timestamp(), source });

    const event: PatientEvent = {
      time: timestamp(),
      source,
      field: `${symptomName} onset`,
      previousValue: prevValue,
      newValue: onset,
      status: "Updated",
    };
    state.events.push(event);
    state.lastUpdated = timestamp();
    state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);
    return event;
  }

  const event: PatientEvent = {
    time: timestamp(),
    source,
    field: `${symptomName} onset`,
    previousValue: "unknown",
    newValue: onset,
    status: "Known",
  };
  state.events.push(event);
  state.lastUpdated = timestamp();
  state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);
  return event;
}

/** Update demographics field */
export function updateDemographic(
  state: PatientState,
  key: keyof Demographics,
  value: number | string,
  source: string
): PatientEvent {
  const field = state.demographics[key] as FieldEntry<number | string>;
  const prevStr = field.value !== null ? String(field.value) : "unknown";

  if (field.value !== null) {
    field.history.unshift({ value: field.value, timestamp: field.lastUpdated, source: field.source });
  }

  field.value = value;
  field.status = field.status === "Unknown" ? "Known" : "Updated";
  field.lastUpdated = timestamp();
  field.source = source;
  field.history.unshift({ value, timestamp: timestamp(), source });

  const event: PatientEvent = {
    time: timestamp(),
    source,
    field: key,
    previousValue: prevStr,
    newValue: String(value),
    status: field.status,
  };
  state.events.push(event);
  state.lastUpdated = timestamp();
  state.missingCriticalFields = computeMissingCriticalFields(state.demographics, state.symptoms, state.vitals);
  return event;
}

/** Update risk assessment on state */
export function applyRiskAssessment(state: PatientState, assessment: RiskAssessment): void {
  state.riskAssessment = assessment;
  state.lastUpdated = timestamp();
}

/** Update routing decision on state */
export function applyRoutingDecision(state: PatientState, decision: RoutingDecision): void {
  state.routingDecision = decision;
  state.lastUpdated = timestamp();
}

/** Get flat list of all fields with their statuses for display */
export function getStateSnapshot(state: PatientState): {
  demographics: { field: string; value: string; status: FieldStatus }[];
  symptoms: { field: string; value: string; status: FieldStatus }[];
  vitals: { field: string; value: string; status: FieldStatus }[];
  riskFactors: { field: string; value: string; status: FieldStatus }[];
} {
  const vitalLabels: Record<keyof Vitals, { label: string; unit: string }> = {
    heartRate: { label: "Heart rate", unit: " bpm" },
    spo2: { label: "SpO₂", unit: "%" },
    bloodPressureSystolic: { label: "BP (systolic)", unit: " mmHg" },
    bloodPressureDiastolic: { label: "BP (diastolic)", unit: " mmHg" },
    temperature: { label: "Temperature", unit: "°C" },
    respiratoryRate: { label: "Respiratory rate", unit: " /min" },
  };

  return {
    demographics: [
      { field: "Age", value: state.demographics.age.value !== null ? String(state.demographics.age.value) : "Unknown", status: state.demographics.age.status },
      { field: "Sex", value: state.demographics.sex.value ?? "Unknown", status: state.demographics.sex.status },
      { field: "Weight", value: state.demographics.weight.value !== null ? `${state.demographics.weight.value} kg` : "Unknown", status: state.demographics.weight.status },
    ],
    symptoms: state.symptoms.map((s) => ({
      field: s.name,
      value: s.severity.value ? `${s.severity.value}${s.onset.value ? ` (onset: ${s.onset.value})` : ""}` : "Unknown",
      status: s.severity.status,
    })),
    vitals: (Object.keys(vitalLabels) as (keyof Vitals)[]).map((key) => {
      const v = state.vitals[key];
      const meta = vitalLabels[key];
      return {
        field: meta.label,
        value: v.value !== null ? `${v.value}${meta.unit}` : "Unknown",
        status: v.status,
      };
    }),
    riskFactors: state.riskFactors.length > 0
      ? state.riskFactors.map((rf, i) => ({
          field: `Risk factor ${i + 1}`,
          value: rf.value ?? "Unknown",
          status: rf.status,
        }))
      : [{ field: "Risk factors", value: "None reported", status: "Known" as FieldStatus }],
  };
}
