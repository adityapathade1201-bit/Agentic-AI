# TriageFlow AI — Agent Evaluation & Validation Report

> **Phase 4: Agent Behavior Validation & Stress Testing**  
> Automated test harness executed against all synthetic patient cases using production engines without mocking.

---

## Executive Summary

| Metric | Result | Target Benchmark | Status |
|---|---|---|---|
| **Overall Status** | **PASS** | PASS | 🟢 PASSED |
| **Total Test Cases** | **6 / 6** | 6 Cases | 🟢 100% Complete |
| **Routing Accuracy** | **100.0%** (6/6) | 100% on benchmark cases | 🟢 PASSED |
| **Under-Triage Rate** | **0.0%** (0 cases) | 0% (Safety Critical) | 🟢 ZERO UNDER-TRIAGE |
| **Over-Triage Rate** | **0.0%** (0 cases) | Minimal | 🟢 ZERO OVER-TRIAGE |
| **Contradiction Detection Rate** | **100.0%** (1/1) | 100% | 🟢 PASSED |
| **Escalation Rate** | **33.3%** (2/6 cases) | Appropriate escalation | 🟢 PASSED |
| **Average Questions per Session** | **7.2** questions | ≤ 10 questions | 🟢 ADAPTIVE EARLY STOP |
| **Invariants Checked** | **54 / 54 passed** | 100% | 🟢 ZERO INVARIANT FAILURES |
| **Runtime Errors** | **0** | 0 | 🟢 CLEAN EXECUTION |

---

## Individual Patient Case Results

### Case 1: TRG-3001 — Low-Risk (Mild Headache)
- **Difficulty**: Low
- **Expected Routing**: `Standard`
- **Actual Final Routing**: `Standard` (`CORRECT`)
- **Final Risk Score / Level**: `0` / `LOW`
- **Session Status**: `completed` (Escalated: No)
- **Questions Asked**: 8 questions (`q-chest-pain`, `q-shortness-breath`, `q-blood-pressure`, `q-symptom-worse`, `q-respiratory-rate`, `q-prior-mi`, `q-nausea`, `q-symptom-onset`)
- **Contradiction Detected**: No
- **Adaptive Behavior Trace**:
  - Starts with unknown vital gaps (BP, Temp, RR) classified initially as `UNRESOLVED` to avoid false low-risk assumptions.
  - As negative chest pain, normal BP (120/80), negative SOB, and 2-hour headache onset are received, missing fields drop to ≤ 2.
  - Risk resolves to `0 (LOW)` and routing converges to `Standard`.
- **Invariants Checked**: 9/9 Passed.

---

### Case 2: TRG-3002 — Moderate-Risk (Chest Discomfort)
- **Difficulty**: Moderate
- **Expected Routing**: `Urgent Assessment`
- **Actual Final Routing**: `Urgent Assessment` (`CORRECT`)
- **Final Risk Score / Level**: `3.5` / `MODERATE`
- **Session Status**: `completed` (Escalated: No)
- **Questions Asked**: 9 questions (`q-shortness-breath`, `q-blood-pressure`, `q-dizziness`, `q-respiratory-rate`, `q-symptom-worse`, `q-prior-mi`, `q-nausea`, `q-symptom-onset`, `q-temperature`)
- **Contradiction Detected**: No
- **Adaptive Behavior Trace**:
  - Baseline moderate chest pain (+2) and hypertension (+0.5) establish initial baseline.
  - Turn 2 receives systolic BP 145 mmHg (+0.5).
  - Turn 3 confirms dizziness (+0.5), elevating total score to 3.5 (`MODERATE`).
  - Routing adapts dynamically from initial uncertainty to `Urgent Assessment`.
- **Invariants Checked**: 9/9 Passed.

---

### Case 3: TRG-3003 — High-Risk (Severe Chest Pain)
- **Difficulty**: High
- **Expected Routing**: `Immediate / Emergency`
- **Actual Final Routing**: `Immediate / Emergency` (`CORRECT`)
- **Final Risk Score / Level**: `10.0` / `CRITICAL`
- **Session Status**: `completed` (Escalated: No; routed to Emergency Department)
- **Questions Asked**: 7 questions (`q-shortness-breath`, `q-blood-pressure`, `q-sweating`, `q-symptom-worse`, `q-respiratory-rate`, `q-prior-mi`, `q-symptom-onset`)
- **Contradiction Detected**: No
- **Adaptive Behavior Trace**:
  - Initial presentation: Severe chest pain (+3), SpO₂ 89% (+2), HR 128 bpm (+1), Age 71 (+1), Multiple Risk Factors (+1.5). Baseline risk score: 9 (`CRITICAL`).
  - Turn 1 confirms shortness of breath (+1), driving score to 10 (`CRITICAL`).
  - Agent gathers confirmatory vitals (BP 170/105, diaphoresis, RR 24, prior MI) and routes immediately to `Immediate / Emergency`.
- **Invariants Checked**: 9/9 Passed.

---

### Case 4: TRG-3004 — Contradiction (Pain Status Conflict)
- **Difficulty**: Critical
- **Expected Routing**: `Immediate / Escalation`
- **Actual Final Routing**: `Immediate / Escalation` (`CORRECT`)
- **Final Risk Score / Level**: `7.0` / `HIGH`
- **Session Status**: `escalated` (Escalated: Yes)
- **Questions Asked**: 2 questions (`q-shortness-breath`, `q-chest-pain`)
- **Contradiction Detected**: **YES (1 active contradiction)**
  - *Field*: `Chest pain severity`
  - *Transition*: `resolved` → `severe`
  - *Reason*: Patient initially reported resolved chest pain, but answered "Yes" (severe) during questioning.
- **Adaptive Behavior Trace**:
  - Contradiction is detected on Turn 2 via `contradictionDetector.ts` and `stateManager.ts`.
  - Contradiction penalty (+1) and severe chest pain (+3) are applied immediately.
  - Escalation policy triggers human clinical review (`1 high/critical contradiction on safety-relevant fields`).
  - Routing immediately updates to `Immediate / Escalation` and terminates early without unnecessary questioning.
- **Invariants Checked**: 9/9 Passed.

---

### Case 5: TRG-3005 — Insufficient Data (High Uncertainty)
- **Difficulty**: High
- **Expected Routing**: `Human Review / Escalation`
- **Actual Final Routing**: `Human Review / Escalation` (`CORRECT`)
- **Final Risk Score / Level**: `1.5` / `UNRESOLVED`
- **Session Status**: `escalated` (Escalated: Yes)
- **Questions Asked**: 10 questions (`q-chest-pain`, `q-chest-pain-severity`, `q-shortness-breath`, `q-oxygen-sat`, `q-heart-rate`, `q-blood-pressure`, `q-symptom-worse`, `q-respiratory-rate`, `q-prior-mi`, `q-age`)
- **Contradiction Detected**: No
- **Adaptive Behavior Trace**:
  - Patient presents with confusion and missing vitals; all questions are answered "Unsure".
  - System enforces core safety rule: **"Unknown is NOT Low Risk"**.
  - Risk remains `UNRESOLVED` across all 10 turns.
  - Escalation engine triggers human review due to 10 unmeasured critical fields.
- **Invariants Checked**: 9/9 Passed.

---

### Case 6: TRG-3006 — Changing Vitals (Deteriorating Patient)
- **Difficulty**: Critical
- **Expected Routing**: `Immediate / Emergency`
- **Actual Final Routing**: `Immediate / Emergency` (`CORRECT`)
- **Final Risk Score / Level**: `7.0` / `HIGH`
- **Session Status**: `completed` (Escalated: No)
- **Questions Asked**: 7 questions (`q-respiratory-rate`, `q-palpitations`, `q-symptom-worse`, `q-prior-mi`, `q-nausea`, `q-symptom-onset`, `q-temperature`)
- **Contradiction Detected**: No
- **Adaptive Behavior Trace**:
  - Baseline score: 4.5 (`MODERATE`) → initial routing `Urgent Assessment`.
  - Turn 1: RR is measured at 26 /min (tachypnea, +1) → score increases to 5.5.
  - Turn 3: Patient reports worsening symptoms (+1) → score rises to 6.5 (`HIGH`).
  - Routing dynamically shifts from `Urgent Assessment` to `Immediate / Emergency`.
  - Reassessment engine recalculates risk at every turn, proving the system does not stick to initial decisions.
- **Invariants Checked**: 9/9 Passed.

---

## Bugs Identified & Fixed During Phase 4

1. **Prior MI Answering "No" Risk Bug**:
   - *Bug*: In `agentController.ts`, answering "No" added `{ value: "No prior MI" }` to risk factors. In `riskEngine.ts`, `val.includes("prior mi")` matched `"no prior mi"` and added +1 to the risk score for non-MI patients.
   - *Fix*: Added negative substring exclusion (`!val.includes("no prior") && !val.includes("no previous")`) to `riskEngine.ts`.

2. **Resolved Symptom Question Selector Ineligibility**:
   - *Bug*: In `questionSelector.ts`, `isFieldKnown()` treated symptoms with status `"Known"` and value `"resolved"` as already known, applying a -15 penalty. This prevented `q-chest-pain` from ever being asked in TRG-3004.
   - *Fix*: Updated `isFieldKnown()` so resolved symptoms are eligible for current presence confirmation.

3. **Contradiction State Synchronization Gap**:
   - *Bug*: `stateManager.ts` recorded contradictions on `PatientState.contradictions`, but `agentController.ts` only logged contradictions returned in `reassessResult.newContradictions`, which filtered out pre-existing entries.
   - *Fix*: Synchronized `AgentState.contradictions` directly from `PatientState.contradictions` and ensured trace entries are emitted for all detected contradictions.

4. **"Unknown is Low Risk" False Security Vulnerability**:
   - *Bug*: When all vitals and demographics were unknown (TRG-3005), the risk score was 0 and was mapped to `LOW` risk and `Standard` routing.
   - *Fix*: Updated `riskEngine.ts` to assign `UNRESOLVED` whenever ≥ 4 critical safety fields are missing and score is below moderate threshold.

5. **CRITICAL Risk Level Routing Discrepancy**:
   - *Bug*: `routingMap` mapped all `CRITICAL` risk to `Immediate / Escalation`, even when no contradictions or clinical uncertainty existed.
   - *Fix*: `CRITICAL` risk without contradictions now routes to `Immediate / Emergency` (emergency care), while `CRITICAL` with active contradictions routes to `Immediate / Escalation`.

6. **Missing Critical Vitals Question Prioritization**:
   - *Bug*: Non-critical exploratory questions (e.g. dizziness, palpitations) were sometimes scored higher by `questionSelector` than missing core vitals (e.g. temperature, blood pressure).
   - *Fix*: Boosted `uncertaintyReduction` bonus (+6) for questions resolving fields in `missingCriticalFields`.

---

## Execution Command

```bash
npm run evaluate
```
