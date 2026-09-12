# TriageFlow AI — Architecture

> ⚠ This document describes a **simulation prototype**. The deterministic components described here use synthetic thresholds that are NOT clinically validated.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Agent Controller                          │
│  Orchestrates the full triage loop. Maintains decision trace.   │
│                                                                 │
│  1. Inspect current state                                       │
│  2. Identify missing/critical information                       │
│  3. Generate & rank candidate questions                         │
│  4. Select next question (highest information gain)             │
│  5. Receive answer                                              │
│  6. Update patient state (with history)                         │
│  7. Run risk engine → deterministic score                       │
│  8. Detect contradictions                                       │
│  9. Reassess: recalculate risk + routing                        │
│  10. Decide: continue / route / escalate                        │
└──────────────┬──────────────────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
     ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│  Question    │  │  State Manager   │
│  Selector    │  │                  │
│              │  │  - initialize    │
│  - candidate │  │  - apply update  │
│    pool      │  │  - preserve      │
│  - scoring   │  │    history       │
│    formula   │  │  - detect status │
│  - ranking   │  │    transitions   │
│              │  │  - track missing │
└──────────────┘  │    fields        │
                  └────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
   ┌──────────────┐ ┌───────────┐ ┌───────────────┐
   │ Contradiction│ │   Risk    │ │   Routing     │
   │ Detector     │ │  Engine   │ │   Engine      │
   │              │ │           │ │               │
   │ - symptom    │ │ - rules   │ │ LOW → Standard│
   │   reversals  │ │ - scoring │ │ MOD → Urgent  │
   │ - vital      │ │ - factors │ │ HIGH → Immed. │
   │   deltas     │ │ - level   │ │ CRIT → Escal. │
   │ - impossible │ │   mapping │ │ UNRES → Human │
   │   values     │ │           │ │   Review      │
   └──────────────┘ └───────────┘ └───────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
   ┌──────────────┐ ┌───────────────┐
   │ Reassessment │ │  Escalation   │
   │ Engine       │ │  Engine       │
   │              │ │               │
   │ - compare    │ │ - CRITICAL    │
   │   old/new    │ │   risk level  │
   │ - re-run     │ │ - unresolved  │
   │   risk       │ │   contradic.  │
   │ - re-run     │ │ - missing     │
   │   routing    │ │   safety data │
   │ - trace      │ │ - NEVER       │
   │   entries    │ │   manufactures│
   │              │ │   certainty   │
   └──────────────┘ └───────────────┘
```

## Component Responsibilities

### Agent Controller (`agentController.ts`)

The central orchestrator. Manages the full lifecycle of a triage session:

- **`initSession(patientCase)`** — Creates initial patient state, runs baseline risk assessment, selects first question
- **`processAnswer(answer)`** — Applies answer to state, triggers reassessment, selects next question or completes session
- Produces a complete **Decision Trace** — every step is logged with component, action, result, and note

### Question Selector (`questionSelector.ts`)

Adaptively selects the next question based on current patient state. **Does NOT follow a fixed sequence.**

**Scoring formula:**
```
priority = safetyRelevance + riskImpact + uncertaintyReduction + routingImpact - alreadyKnownPenalty
```

- `safetyRelevance` — How safety-critical is this information? (0-10)
- `riskImpact` — How much could this answer change the risk score? (0-10)
- `uncertaintyReduction` — Does this resolve a missing critical field? (0-3)
- `routingImpact` — Could this change the routing decision? (1-3)
- `alreadyKnownPenalty` — Is this information already known? (-15)

### Patient State Manager (`stateManager.ts`)

Manages patient state with **full history tracking**:

- **Never silently overwrites** — Previous values archived in event history
- Every update generates a `PatientEvent` with source, timestamp, previous/new value
- Fields tracked as `Known | Unknown | Updated | Conflicting`
- `computeMissingCriticalFields()` — Identifies gaps in safety-critical data

### Risk Engine (`riskEngine.ts`)

**Pure deterministic function** — no model inference.

Takes current patient state, applies documented synthetic rules, returns:
- Score (0-10)
- Level (LOW / MODERATE / HIGH / CRITICAL / UNRESOLVED)
- Contributing factors with weights
- Missing critical information list

**The routing layer NEVER asks the LLM to calculate this score.**

### Contradiction Detector (`contradictionDetector.ts`)

Deterministic rule-based detection:

| Check | Threshold |
|-------|-----------|
| Symptom: resolved → severe | Always contradiction |
| Symptom: none → severe | Always contradiction |
| Heart rate change | ≥ 30 bpm |
| SpO₂ change | ≥ 8% |
| Blood pressure change | ≥ 30 mmHg |
| Temperature change | ≥ 1.5°C |
| Impossible HR | < 20 or > 250 |
| Impossible SpO₂ | < 0 or > 100 |

### Routing Engine (`routingEngine.ts`)

**Deterministic mapping** — no inference:

| Risk Level | Routing Outcome | Escalate? |
|-----------|----------------|-----------|
| LOW | Standard | No |
| MODERATE | Urgent Assessment | No |
| HIGH | Immediate / Emergency | No |
| CRITICAL | Immediate / Escalation | Yes |
| UNRESOLVED | Human Review / Escalation | Yes |

Override rules apply when contradictions exist or critical data is missing.

### Reassessment Engine (`reassessmentEngine.ts`)

Triggered after **every state update**:

1. Detect new contradictions
2. Recalculate risk score
3. Recalculate routing decision
4. Generate trace entries for all changes
5. Compare old vs new: `riskChanged`, `routingChanged`

### Escalation Engine (`escalationEngine.ts`)

**Never manufactures certainty.** "Unknown" is NOT "Low Risk."

Escalation triggers:
- CRITICAL risk level
- UNRESOLVED risk level
- Active contradictions on safety-critical fields
- >3 missing critical fields with concerning evidence
- Risk score ≥ 8 with unresolved contradictions

## Data Flow

```
User selects case
    │
    ▼
initSession() ──→ State initialized ──→ Risk calculated ──→ Routing set
    │                                                          │
    ▼                                                          │
Question selected (ranked by info gain)                        │
    │                                                          │
    ▼                                                          │
User answers ──→ processAnswer()                               │
    │                                                          │
    ├──→ State updated (with history)                          │
    ├──→ Contradictions checked                                │
    ├──→ Risk recalculated                                     │
    ├──→ Routing recalculated ◄────────────────────────────────┘
    ├──→ Escalation evaluated
    │
    ├──→ Continue? → Select next question → Loop
    └──→ Complete/Escalate → Session ends
```

## Safety Design Principles

1. **Deterministic routing** — All safety-critical decisions made by rule-based engines
2. **Never silently overwrite** — Contradictions surfaced, not hidden
3. **Full traceability** — Every decision logged in the Decision Trace
4. **Escalation over certainty** — System escalates when it cannot establish safe routing
5. **Transparent scoring** — Every risk factor and weight visible to the operator
6. **Modular separation** — LLM can interpret, but never decides routing

## Agent Evaluation & Validation

Phase 4 introduces an automated evaluation harness (`src/evaluation/`) to validate agent behavior and test system invariants against all synthetic patient cases without mocking or duplicating production logic.

### How the Evaluator Works

1. **Direct Engine Execution**: `evaluationRunner.ts` calls `initSession()` and iteratively executes `processAnswer()` using the production `agentController.ts`, `stateManager.ts`, `riskEngine.ts`, `contradictionDetector.ts`, `reassessmentEngine.ts`, and `escalationEngine.ts`.
2. **Adaptive State Tracing**: At every turn, the evaluator snapshots:
   - Candidate question ranking & selection rationale
   - Patient state before & after the action
   - Risk score delta & level transitions
   - Routing updates & contradiction detections
   - Reassessment & escalation trigger states
3. **Deterministic Invariant Assertions**: Every test case validates 9 core invariants:
   - No duplicate questions asked within a session
   - Question count bounded by `MAX_QUESTIONS` (≤ 10)
   - Question count within case expected bounds
   - Contradiction correctly detected or avoided without false positives
   - Escalation policy strictly followed (human review triggered when uncertainty/contradictions exceed policy)
   - Valid terminal session status (`completed` or `escalated`)
   - Session status strictly aligns with escalation state
   - Zero runtime errors or unhandled exceptions
   - Final routing decision matches expected outcome
4. **Triage Classification**: Routing is compared against expected outcomes and classified into:
   - `CORRECT` — Exact match
   - `UNDER_TRIAGE` — Safety failure where assigned urgency is lower than required
   - `OVER_TRIAGE` — Assigned urgency is higher than required
   - `MISMATCH` — Category divergence

### Metrics Measured

- **Routing Accuracy**: Percentage of synthetic cases where final routing matches clinical benchmark.
- **Average Questions per Case**: Efficiency metric demonstrating adaptive early-stopping when sufficient evidence is gathered.
- **Contradiction Detection Rate**: Proportion of conflicting transitions (e.g. resolved → severe chest pain) correctly captured.
- **Escalation Rate**: Proportion of sessions appropriately deferred to human clinicians.
- **Reassessment Rate**: Frequency of live risk recalculation after new information.
- **Under-Triage / Over-Triage Counts**: Core patient safety indicators.

### Running Evaluations

```bash
npm run evaluate
```

### Limitations

- Synthetic test suite reflects 6 curated scenarios (demographic, contradiction, missing-data, deteriorating vital edge cases).
- Rules and scoring weights are simulation benchmarks and are not clinically validated for real patient triage.
