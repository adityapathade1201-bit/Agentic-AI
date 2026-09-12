# TriageFlow AI — Adaptive Emergency Triage Agent

> ⚠ **Simulation Only.** This system is a decision-support prototype and does not provide medical diagnosis. All patient data is synthetic test data. Risk scoring thresholds are not clinically validated.

## Purpose

TriageFlow AI is a **local, deterministic triage simulation** that demonstrates genuine agentic behavior:

**Goal → Observe → Decide → Ask → Receive → Update → Assess → Adapt → Reassess → Route or Escalate**

The system asks only the questions that matter, continuously reassesses risk as new information arrives, detects contradictions, and escalates to human review when uncertainty becomes unsafe.

## Architecture Overview

```
Agent Controller (orchestrator)
│
├── Question Selector    — Ranks questions by information gain
├── State Manager        — Tracks patient state with full history
├── Risk Engine          — Deterministic, rule-based scoring (0-10)
├── Contradiction Detector — Detects conflicting observations
├── Routing Engine       — Maps risk to routing outcomes
├── Reassessment Engine  — Re-evaluates after every state change
└── Escalation Engine    — Prevents unsafe certainty
```

**Key design decision:** The LLM/Agent is NOT the final routing authority. Deterministic engines control all safety-critical routing.

## Folder Structure

```
src/
├── domain/
│   └── types.ts              # Strongly typed domain models
├── data/
│   └── patientCases.ts       # 6 synthetic patient cases
├── engine/
│   ├── stateManager.ts       # Patient state with history tracking
│   ├── contradictionDetector.ts  # Deterministic contradiction detection
│   ├── riskEngine.ts         # Rule-based risk scoring
│   ├── questionSelector.ts   # Adaptive question ranking
│   ├── agentController.ts    # Orchestrates the full triage loop
│   ├── routingEngine.ts      # Risk → routing mapping
│   ├── reassessmentEngine.ts # Triggered on every state change
│   └── escalationEngine.ts   # Escalation policy
├── context/
│   └── TriageContext.tsx      # React context for application state
├── components/
│   ├── Shell.tsx              # Sidebar, Header, BottomNav
│   └── ui.tsx                 # Reusable UI components
├── screens/
│   ├── Landing.tsx            # Welcome / intro screen
│   ├── Overview.tsx           # Command center dashboard
│   ├── StartTriage.tsx        # Case selector
│   ├── ActiveTriage.tsx       # Live adaptive interview
│   ├── Reasoning.tsx          # Patient State, Risk, Trace, Reassessment
│   └── Evaluation.tsx         # Metrics dashboard + Settings
├── lib/
│   └── data.ts                # Shared types (RiskLevel, FieldStatus)
├── App.tsx                    # Root component with routing
├── main.tsx                   # Entry point
└── index.css                  # Tailwind v4 + design tokens
```

## How to Run Locally

```bash
npm install
npm run dev
```

## How the Agentic Behavior Works

1. **Initialize** — Load a synthetic patient case with intentionally incomplete data
2. **Observe** — State engine identifies known vs unknown fields
3. **Decide** — Question selector ranks candidates by safety relevance, risk impact, and uncertainty reduction
4. **Ask** — Agent presents the highest-priority question
5. **Receive** — User provides an answer (or selects from options)
6. **Update** — State manager applies the update, preserving full history
7. **Detect** — Contradiction detector checks for conflicting observations
8. **Assess** — Risk engine recalculates the deterministic score
9. **Route** — Routing engine maps the new risk level to a routing outcome
10. **Adapt** — If state has materially changed, the next question selection adapts
11. **Escalate** — If critical uncertainty remains, the system escalates to human review

## How the Risk Engine Works

Transparent synthetic scoring (0-10 scale):

| Factor | Weight |
|--------|--------|
| Severe chest pain | +3 |
| Moderate chest pain | +1.5 |
| SpO₂ < 92% | +2 |
| SpO₂ 92-94% | +1 |
| Heart rate > 140 bpm | +2 |
| Heart rate > 120 bpm | +1 |
| Age > 60 | +1 |
| Prior MI | +1 |
| Shortness of breath | +1 to +1.5 |
| Hypertension / Smoker / Diabetes | +0.5 each |
| Active contradiction | +1 each |

**Level mapping:** 0-3 LOW, 4-5 MODERATE, 6-7 HIGH, 8-10 CRITICAL

**UNRESOLVED:** Contradictions present AND >2 missing critical fields

## How Contradiction Detection Works

Deterministic rules detect:
- Symptom severity reversals (e.g., `resolved → severe`)
- Vital sign large deltas (HR ±30, SpO₂ ±8, BP ±30)
- Impossible/out-of-range values
- Conflicting state transitions

**Contradictions are never silently overwritten.** Previous values are preserved in history, and the field is marked as `Conflicting`.

## How Reassessment Works

After every state update:
1. Compare old and new state
2. Run contradiction detector
3. Invalidate affected assessments
4. Recalculate risk score
5. Recalculate routing decision
6. Generate decision trace entries

## Synthetic Patient Cases

| ID | Label | Difficulty | Demonstrates |
|----|-------|-----------|-------------|
| TRG-3001 | Mild Headache | Low | Standard routing |
| TRG-3002 | Chest Discomfort | Moderate | Urgent assessment |
| TRG-3003 | Severe Chest Pain | High | Immediate routing |
| TRG-3004 | Pain Status Conflict | Critical | Contradiction detection |
| TRG-3005 | Insufficient Data | High | Escalation from uncertainty |
| TRG-3006 | Deteriorating Patient | Critical | Live reassessment |

## Future Integration Plan

The architecture is modular to support future integration:
- **Supabase** — Replace local state with persistent storage
- **LLM API** — Agent controller can call an LLM for question interpretation (routing stays deterministic)
- **Real-time vitals** — WebSocket feed for live vital sign updates
- **Multi-user** — Session management across multiple clinicians
