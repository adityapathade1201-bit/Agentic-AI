# TriageFlow AI — Adaptive Emergency Triage Agent

> ⚠️ **Simulation Only.** This system is a decision-support prototype and does not provide medical diagnosis. All patient data is synthetic test data. Risk scoring thresholds are not clinically validated.

## 🏥 Overview

**TriageFlow AI** is an Adaptive Emergency Triage Agent designed to demonstrate how an agentic system can make routing decisions from incomplete and changing patient information.

Instead of following a fixed questionnaire, the system dynamically determines what information is most useful to collect next, updates the patient state, evaluates simulated risk, detects contradictions, reassesses previous decisions, and escalates unresolved high-risk situations.

### Core Agentic Loop

```text
Goal
  ↓
Observe
  ↓
Decide
  ↓
Ask
  ↓
Receive Information
  ↓
Update Patient State
  ↓
Assess Risk
  ↓
Evaluate
  ↓
Adapt
  ↓
Reassess
  ↓
Route / Escalate