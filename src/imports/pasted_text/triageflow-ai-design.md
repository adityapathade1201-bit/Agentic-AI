Design a complete modern web application UI/UX for a hackathon project called **TriageFlow AI**.

## Product

TriageFlow AI is an **Adaptive Emergency Triage Agent** for a simulated environment.

The system starts with incomplete patient information, asks adaptive questions based on current uncertainty and risk, uses a deterministic risk-scoring tool, maintains patient state, reassesses when new information appears, detects contradictory information, and escalates unresolved high-risk cases.

This is **decision support for a simulated environment, NOT medical diagnosis**.

## Design goal

Create a premium, highly credible healthcare AI dashboard that looks like a serious technical product rather than a generic chatbot.

Visual direction:

* modern clinical + AI
* clean
* minimal
* high information density without feeling cluttered
* professional hospital command-center aesthetic
* subtle futuristic AI styling
* excellent typography
* strong hierarchy
* accessible contrast
* responsive desktop-first design

Avoid:

* cartoon healthcare graphics
* excessive gradients
* generic ChatGPT-style chat interface
* excessive glassmorphism
* unnecessary 3D graphics
* fake medical claims
* decorative elements that reduce usability

## Core navigation

Create a left sidebar with:

* Overview
* Start Triage
* Active Cases
* Patient State
* Risk Assessment
* Decision Trace
* Reassessment
* Evaluation
* Settings

Top header:

* TriageFlow AI logo
* "Simulation Environment" badge
* system status indicator
* profile/settings area

## Screen 1 — Overview Dashboard

Create a dashboard showing:

### Header

"Adaptive Emergency Triage"

Subtitle:
"Ask less. Reassess continuously. Escalate safely."

Primary CTA:
"Start New Triage"

### KPI cards

* Active Cases
* Completed Assessments
* High-Risk Cases
* Average Questions / Case

### Current System Status

Show:

* Agent Controller: Online
* Risk Engine: Online
* Patient Data Tool: Online
* State Engine: Online

### Recent Cases

Table columns:

* Patient ID
* Risk
* Questions
* Routing
* Status
* Updated

### Agent Activity panel

Show an event stream such as:

* Patient state initialized
* Question selected
* Vital received
* Risk recalculated
* Contradiction detected
* Routing updated

## Screen 2 — Start Triage

Create a patient intake page.

Show:

* Case ID
* Patient age
* Sex
* Initial symptoms
* Known risk factors
* Available vitals

Important:
The form must intentionally support **incomplete patient information**.

Include missing fields with an "Unknown" state instead of forcing users to enter data.

Primary button:
"Initialize Triage"

## Screen 3 — Active Triage

This is the most important page.

Use a three-column layout.

### LEFT — Patient State

Show structured state:

* Demographics
* Symptoms
* Duration
* Risk Factors
* Vitals
* Unknown / Missing Critical Information

Each field should have a small status:

* Known
* Unknown
* Newly Updated
* Conflicting

### CENTER — Adaptive Interview

Show the current agent question in a clean conversational card.

Example:

"Are you currently experiencing shortness of breath?"

Show buttons:

* Yes
* No
* Unsure

Also provide:

* text input
* submit answer button

Under the question display:

"Why this question?"

Example:
"Current respiratory status is unresolved and may affect risk assessment."

This explanation should be visually secondary but clearly readable.

### RIGHT — Agent Decision Panel

Show:

Current Risk:
MODERATE

Risk Score:
6

Routing:
URGENT ASSESSMENT

Confidence should NOT be presented as fake medical certainty.

Instead show:
"Decision status: Supported"

Show:

* Risk factors contributing to score
* Missing critical information
* Next action

Include a button:
"View Decision Trace"

## Screen 4 — Patient State

Create a detailed state-inspection view.

Show a timeline of patient information:

Time
Source
Field
Previous Value
New Value
Status

Example:

14:02 | Patient | chest pain | unknown | active | updated

14:04 | Patient | pain status | active | resolved | updated

14:07 | New answer | pain status | resolved | severe | CONFLICT

Use strong visual distinction for contradictions.

## Screen 5 — Risk Assessment

Create a risk-engine dashboard.

Show:

* current synthetic risk score
* risk category
* factors affecting score
* missing information
* timestamp
* previous score
* score change

Include a visual progression:

Risk 4 → Risk 6 → Risk 9

And a label:

"Risk recalculated after new information."

IMPORTANT:
Clearly label this as a **simulation risk engine** and not a clinically validated medical scoring system.

## Screen 6 — Decision Trace

This should visually explain how the agent reached the current decision.

Create a vertical timeline:

1. Patient state initialized
2. Missing information identified
3. Candidate questions evaluated
4. Next question selected
5. Answer received
6. Risk tool executed
7. State updated
8. Risk reassessed
9. Routing decision generated

Each step should include:

* timestamp
* component
* action
* result
* short explanation

Use the design concept of an "audit trail".

## Screen 7 — Reassessment / Contradiction

Create a dedicated page for changing patient information.

Example:

Previous:
Chest pain = Resolved

New:
Chest pain = Severe

Show:

⚠ Contradiction detected

Then:

Old state
↓
Conflict detected
↓
State invalidated
↓
Risk recalculated
↓
Routing reassessed

Final action:
"Escalate for human review"

Make it very clear that the system does NOT silently overwrite conflicting information.

## Screen 8 — Evaluation

Create a technical evaluation dashboard.

Metrics:

* Cases Tested
* Correct Routing
* High-Risk Detection
* Under-Triage
* Over-Triage
* Avg Questions / Case
* Contradictions Detected
* Escalations
* Average Decision Time

Add charts:

* routing distribution
* risk progression
* average questions
* contradiction recovery

Use clean technical visualizations.

## Important UX concept

The application should make the following idea visually obvious:

**The AI is not the final decision-maker.**

The interface should show:

LLM / Agent
→ interprets information and chooses useful questions

Deterministic Risk Engine
→ calculates synthetic risk

Routing Policy
→ chooses predefined routing outcome

Escalation Policy
→ prevents unsafe certainty

## Landing page / branding

Create a polished landing screen with:

TriageFlow AI

"Adaptive Emergency Triage Agent"

Supporting text:
"An explainable agent that asks only what matters, continuously reassesses risk, and escalates when uncertainty becomes unsafe."

CTA:
"Enter Simulation"

Secondary:
"View Architecture"

Include a visible disclaimer:

"Simulation only. This system is a decision-support prototype and does not provide medical diagnosis."

## Responsive behavior

Desktop:

* full sidebar
* 3-column triage workspace

Tablet:

* collapsible sidebar
* 2-column workspace

Mobile:

* bottom navigation
* stacked cards
* simplified state view

## Design system

Create reusable components:

* Sidebar
* Header
* KPI Card
* Patient State Card
* Risk Card
* Question Card
* Decision Trace Item
* Timeline
* Status Badge
* Alert
* Metric Card
* Data Table
* Chart Card
* Primary / Secondary Buttons

Keep spacing, typography, radius, borders, iconography, and states consistent.

Provide:

* normal state
* loading state
* empty state
* error state
* contradiction state
* high-risk state
* escalation state

The resulting design should feel like a **production-quality AI emergency operations platform built for an advanced agentic AI hackathon**.
