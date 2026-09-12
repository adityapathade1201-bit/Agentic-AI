/**
 * TriageFlow AI — Automated Agent Evaluation Runner
 *
 * Runs the real production Agent Controller against all synthetic cases.
 * Demonstrates adaptive questioning, state updates, contradiction detection,
 * live reassessment, and escalation invariants.
 */

import { initSession, processAnswer, type AgentState } from "../engine/agentController";
import { evaluationSpecs, type CaseEvaluationSpec } from "./evaluationCases";
import type {
  EvaluationReport,
  TestCaseResult,
  AdaptiveStepTrace,
  InvariantCheckResult,
  TestResultStatus,
} from "./evaluationTypes";
import type { Answer, PatientState, RoutingOutcome } from "../domain/types";

function countKnown(ps: PatientState): number {
  let c = 0;
  if (ps.demographics.age.status !== "Unknown") c++;
  if (ps.demographics.sex.status !== "Unknown") c++;
  if (ps.demographics.weight.status !== "Unknown") c++;
  for (const s of ps.symptoms) {
    if (s.severity.status !== "Unknown") c++;
  }
  const vk: (keyof typeof ps.vitals)[] = ["heartRate", "spo2", "bloodPressureSystolic", "bloodPressureDiastolic", "temperature", "respiratoryRate"];
  for (const k of vk) {
    if (ps.vitals[k].status !== "Unknown") c++;
  }
  c += ps.riskFactors.length;
  return c;
}

function countUnknown(ps: PatientState): number {
  let c = 0;
  if (ps.demographics.age.status === "Unknown") c++;
  if (ps.demographics.sex.status === "Unknown") c++;
  if (ps.demographics.weight.status === "Unknown") c++;
  for (const s of ps.symptoms) {
    if (s.severity.status === "Unknown") c++;
  }
  const vk: (keyof typeof ps.vitals)[] = ["heartRate", "spo2", "bloodPressureSystolic", "bloodPressureDiastolic", "temperature", "respiratoryRate"];
  for (const k of vk) {
    if (ps.vitals[k].status === "Unknown") c++;
  }
  return c;
}

const ROUTING_URGENCY_RANK: Record<string, number> = {
  "Standard": 1,
  "Urgent Assessment": 2,
  "Immediate / Emergency": 3,
  "Immediate / Escalation": 4,
  "Human Review / Escalation": 4,
};

function classifyTriage(expected: string, actual: string): "CORRECT" | "UNDER_TRIAGE" | "OVER_TRIAGE" | "MISMATCH" {
  if (expected === actual) return "CORRECT";
  const expectedRank = ROUTING_URGENCY_RANK[expected] ?? 0;
  const actualRank = ROUTING_URGENCY_RANK[actual] ?? 0;
  if (actualRank < expectedRank) return "UNDER_TRIAGE";
  if (actualRank > expectedRank) return "OVER_TRIAGE";
  return "MISMATCH";
}

/** Evaluate a single patient case through the live agent loop */
export function evaluateCase(spec: CaseEvaluationSpec): TestCaseResult {
  const startTime = Date.now();
  const runtimeErrors: string[] = [];
  const adaptiveTrace: AdaptiveStepTrace[] = [];
  const askedQuestions: { id: string; text: string; answer: string }[] = [];
  const statusReasons: string[] = [];

  let state: AgentState;
  try {
    state = initSession(spec.patientCase);
  } catch (err) {
    runtimeErrors.push(`Failed to initialize session: ${String(err)}`);
    return {
      caseId: spec.patientCase.id,
      caseLabel: spec.patientCase.label,
      difficulty: spec.patientCase.difficulty,
      status: "FAIL",
      statusReasons: [`Session init failed: ${String(err)}`],
      expectedRouting: spec.expectedRouting,
      actualRouting: "None (Crash)",
      routingMatched: false,
      triageClassification: "MISMATCH",
      finalRiskLevel: "LOW",
      finalRiskScore: 0,
      finalSessionStatus: "active",
      questionsAskedCount: 0,
      askedQuestionIds: [],
      askedQuestions: [],
      contradictionExpected: spec.expectedContradiction,
      contradictionDetected: false,
      contradictionCount: 0,
      contradictions: [],
      escalationTriggered: false,
      escalationReason: null,
      reassessmentCount: 0,
      adaptiveTrace: [],
      invariantChecks: [
        { name: "Session Initialization", passed: false, message: `Threw error: ${String(err)}` }
      ],
      fullDecisionTrace: [],
      executionTimeMs: Date.now() - startTime,
      runtimeErrors,
    };
  }

  let turn = 0;
  let reassessmentCount = 0;

  // Run the agent loop until session terminates (status !== "active") or safety bound (20)
  while (state.status === "active" && state.currentQuestion !== null && turn < 20) {
    turn++;
    const currentQ = state.currentQuestion;
    const qId = currentQ.question.id;
    const qText = currentQ.question.text;
    const rawAnswer = spec.patientCase.scriptedAnswers[qId] ?? "Unsure";

    // Snapshot state BEFORE action
    const riskBefore = state.riskAssessment?.score ?? 0;
    const levelBefore = state.riskAssessment?.level ?? "LOW";
    const routingBefore = (state.routingDecision?.outcome ?? "Standard") as RoutingOutcome;
    const knownBefore = countKnown(state.patientState);
    const unknownBefore = countUnknown(state.patientState);
    const missingBefore = [...state.patientState.missingCriticalFields];
    const topCandidates = (state.allCandidates ?? []).slice(0, 3).map((c) => ({
      id: c.question.id,
      text: c.question.text,
      score: c.score,
    }));

    askedQuestions.push({ id: qId, text: qText, answer: rawAnswer });

    // Construct answer payload
    const answerPayload: Answer = {
      questionId: qId,
      selectedOption: rawAnswer,
      freeText: rawAnswer,
      answeredAt: new Date().toISOString(),
    };

    // Execute production step
    try {
      state = processAnswer(state, answerPayload);
      reassessmentCount++;
    } catch (err) {
      runtimeErrors.push(`Error processing answer for ${qId}: ${String(err)}`);
      break;
    }

    // Snapshot state AFTER action & reassessment
    const riskAfter = state.riskAssessment?.score ?? 0;
    const levelAfter = state.riskAssessment?.level ?? "LOW";
    const routingAfter = (state.routingDecision?.outcome ?? "Standard") as RoutingOutcome;
    const knownAfter = countKnown(state.patientState);
    const unknownAfter = countUnknown(state.patientState);
    const missingAfter = [...state.patientState.missingCriticalFields];
    const riskDelta = Math.round((riskAfter - riskBefore) * 10) / 10;
    const riskChanged = riskBefore !== riskAfter || levelBefore !== levelAfter;
    const routingChanged = routingBefore !== routingAfter;

    adaptiveTrace.push({
      turnNumber: turn,
      questionId: qId,
      questionText: qText,
      category: currentQ.question.category,
      selectionScore: currentQ.score,
      selectionRationale: currentQ.question.rationale,
      candidatesCount: state.allCandidates?.length ?? 0,
      topCandidates,
      stateBefore: {
        knownFieldsCount: knownBefore,
        unknownFieldsCount: unknownBefore,
        missingCriticalFields: missingBefore,
        riskScore: riskBefore,
        riskLevel: levelBefore,
        routingOutcome: routingBefore,
      },
      answerReceived: {
        rawAnswer,
        resolvesField: currentQ.question.resolvesField,
      },
      stateAfter: {
        knownFieldsCount: knownAfter,
        unknownFieldsCount: unknownAfter,
        missingCriticalFields: missingAfter,
        riskScore: riskAfter,
        riskLevel: levelAfter,
        routingOutcome: routingAfter,
        riskDelta,
        riskChanged,
        routingChanged,
        newContradictions: state.contradictions.slice(),
      },
      reassessmentTriggered: true,
      escalationState: state.escalation ?? {
        shouldEscalate: false,
        reason: "None",
        requiresHumanReview: false,
        unresolvedContradictions: 0,
        missingCriticalFields: missingAfter.length,
      },
    });
  }

  const finalRouting = state.routingDecision?.outcome ?? "Unknown";
  const finalRiskLevel = state.riskAssessment?.level ?? "LOW";
  const finalRiskScore = state.riskAssessment?.score ?? 0;
  const routingMatched = finalRouting === spec.expectedRouting;
  const triageClass = classifyTriage(spec.expectedRouting, finalRouting);
  const detectedContradictions = state.contradictions.filter((c) => c.detected);
  const contradictionDetected = detectedContradictions.length > 0;
  const escalationTriggered = state.escalation?.shouldEscalate ?? false;

  // Run invariant checks
  const invariantChecks: InvariantCheckResult[] = [];

  // Invariant 1: No duplicate questions asked
  const uniqueAskedIds = new Set(state.askedQuestionIds);
  const noDuplicateQuestions = uniqueAskedIds.size === state.askedQuestionIds.length;
  invariantChecks.push({
    name: "No Duplicate Questions",
    passed: noDuplicateQuestions,
    message: noDuplicateQuestions
      ? `All ${state.askedQuestionIds.length} asked questions were distinct.`
      : `Duplicate questions detected in asked IDs: ${state.askedQuestionIds.join(", ")}`,
  });

  // Invariant 2: Question count <= MAX_QUESTIONS (10)
  const questionCountValid = state.questionsAsked <= 10;
  invariantChecks.push({
    name: "Max Questions Bound (<= 10)",
    passed: questionCountValid,
    message: `Asked ${state.questionsAsked} questions (limit: 10).`,
  });

  // Invariant 3: Question count within case expected range
  const questionCountInRange =
    state.questionsAsked >= spec.minAllowedQuestions &&
    state.questionsAsked <= spec.maxAllowedQuestions;
  invariantChecks.push({
    name: "Question Count Within Case Bounds",
    passed: questionCountInRange,
    message: `Asked ${state.questionsAsked} questions (expected [${spec.minAllowedQuestions}, ${spec.maxAllowedQuestions}]).`,
  });

  // Invariant 4: Contradiction requirement check
  const contradictionCheckPassed = spec.expectedContradiction
    ? contradictionDetected
    : !contradictionDetected;
  invariantChecks.push({
    name: spec.expectedContradiction ? "Contradiction Correctly Detected" : "No False Positive Contradiction",
    passed: contradictionCheckPassed,
    message: spec.expectedContradiction
      ? contradictionDetected
        ? `Contradiction detected as expected (${detectedContradictions.length} detected: ${detectedContradictions.map((c) => c.field).join(", ")})`
        : "Expected contradiction was NOT detected."
      : contradictionDetected
        ? `Unexpected contradiction detected: ${detectedContradictions.map((c) => c.field).join(", ")}`
        : "No false positive contradictions detected.",
  });

  // Invariant 5: Escalation requirement check
  const escalationCheckPassed = spec.expectedEscalation === escalationTriggered;
  invariantChecks.push({
    name: "Escalation Policy Compliance",
    passed: escalationCheckPassed,
    message: spec.expectedEscalation
      ? escalationTriggered
        ? `Escalation triggered as required (${state.escalation?.reason})`
        : "Escalation was required by case spec but was NOT triggered."
      : !escalationTriggered
        ? "No unnecessary escalation triggered."
        : `Escalation triggered unexpectedly: ${state.escalation?.reason}`,
  });

  // Invariant 6: Valid Terminal Session Status
  const validTerminalState =
    state.status === "completed" || state.status === "escalated";
  invariantChecks.push({
    name: "Valid Terminal Session Status",
    passed: validTerminalState,
    message: `Session reached terminal status "${state.status}".`,
  });

  // Invariant 7: Escalation status alignment
  const escalationStatusAligned =
    escalationTriggered ? state.status === "escalated" : state.status === "completed";
  invariantChecks.push({
    name: "Session Status Aligns with Escalation State",
    passed: escalationStatusAligned,
    message: `Escalation=${escalationTriggered}, SessionStatus="${state.status}".`,
  });

  // Invariant 8: No unhandled runtime errors
  const noErrors = runtimeErrors.length === 0;
  invariantChecks.push({
    name: "Zero Runtime Errors",
    passed: noErrors,
    message: noErrors ? "Clean execution without exceptions." : `Errors: ${runtimeErrors.join("; ")}`,
  });

  // Invariant 9: Routing Accuracy
  invariantChecks.push({
    name: "Routing Decision Matches Expected Outcome",
    passed: routingMatched,
    message: routingMatched
      ? `Actual "${finalRouting}" matches expected "${spec.expectedRouting}".`
      : `MISMATCH: Actual "${finalRouting}" vs Expected "${spec.expectedRouting}" (${triageClass}).`,
  });

  // Determine overall status
  const anyInvariantFailed = invariantChecks.some((c) => !c.passed);
  let status: TestResultStatus = "PASS";
  if (!routingMatched || !noErrors || !questionCountValid || !noDuplicateQuestions) {
    status = "FAIL";
    if (!routingMatched) statusReasons.push(`Routing mismatch: expected "${spec.expectedRouting}", got "${finalRouting}"`);
    if (!noErrors) statusReasons.push(`Runtime errors encountered`);
    if (!noDuplicateQuestions) statusReasons.push(`Duplicate questions asked`);
    if (!questionCountValid) statusReasons.push(`Max questions exceeded`);
  } else if (anyInvariantFailed) {
    status = "WARNING";
    const failedChecks = invariantChecks.filter((c) => !c.passed);
    statusReasons.push(...failedChecks.map((c) => `${c.name}: ${c.message}`));
  }

  return {
    caseId: spec.patientCase.id,
    caseLabel: spec.patientCase.label,
    difficulty: spec.patientCase.difficulty,
    status,
    statusReasons,
    expectedRouting: spec.expectedRouting,
    actualRouting: finalRouting,
    routingMatched,
    triageClassification: triageClass,
    finalRiskLevel,
    finalRiskScore,
    finalSessionStatus: state.status,
    questionsAskedCount: state.questionsAsked,
    askedQuestionIds: state.askedQuestionIds,
    askedQuestions,
    contradictionExpected: spec.expectedContradiction,
    contradictionDetected,
    contradictionCount: detectedContradictions.length,
    contradictions: detectedContradictions,
    escalationTriggered,
    escalationReason: state.escalation?.reason ?? null,
    reassessmentCount,
    adaptiveTrace,
    invariantChecks,
    fullDecisionTrace: state.decisionTrace,
    executionTimeMs: Date.now() - startTime,
    runtimeErrors,
  };
}

/** Run the complete evaluation across all synthetic patient cases */
export function runAllEvaluations(): EvaluationReport {
  const startTime = new Date().toISOString();
  const caseResults = evaluationSpecs.map((spec) => evaluateCase(spec));

  const totalCases = caseResults.length;
  const passedCases = caseResults.filter((c) => c.status === "PASS").length;
  const failedCases = caseResults.filter((c) => c.status === "FAIL").length;
  const warningCases = caseResults.filter((c) => c.status === "WARNING").length;

  const exactRoutingMatchCount = caseResults.filter((c) => c.routingMatched).length;
  const routingAccuracy = totalCases > 0 ? exactRoutingMatchCount / totalCases : 0;
  const totalQuestions = caseResults.reduce((sum, c) => sum + c.questionsAskedCount, 0);
  const averageQuestions = totalCases > 0 ? Math.round((totalQuestions / totalCases) * 10) / 10 : 0;

  const contradictionCases = caseResults.filter((c) => c.contradictionExpected);
  const contradictionPassed = contradictionCases.filter((c) => c.contradictionDetected).length;
  const contradictionDetectionRate =
    contradictionCases.length > 0 ? contradictionPassed / contradictionCases.length : 1;

  const escalationCount = caseResults.filter((c) => c.escalationTriggered).length;
  const escalationRate = totalCases > 0 ? escalationCount / totalCases : 0;

  const totalReassessments = caseResults.reduce((sum, c) => sum + c.reassessmentCount, 0);
  const reassessmentRate = totalCases > 0 ? Math.round((totalReassessments / totalCases) * 10) / 10 : 0;

  const underTriageCount = caseResults.filter((c) => c.triageClassification === "UNDER_TRIAGE").length;
  const overTriageCount = caseResults.filter((c) => c.triageClassification === "OVER_TRIAGE").length;

  let totalInvariantsChecked = 0;
  let invariantsPassed = 0;
  for (const c of caseResults) {
    totalInvariantsChecked += c.invariantChecks.length;
    invariantsPassed += c.invariantChecks.filter((i) => i.passed).length;
  }
  const invariantsFailed = totalInvariantsChecked - invariantsPassed;

  let overallStatus: TestResultStatus = "PASS";
  if (failedCases > 0) overallStatus = "FAIL";
  else if (warningCases > 0) overallStatus = "WARNING";

  return {
    timestamp: startTime,
    overallStatus,
    totalCases,
    passedCases,
    failedCases,
    warningCases,
    routingAccuracy,
    averageQuestions,
    contradictionDetectionRate,
    escalationRate,
    reassessmentRate,
    underTriageCount,
    overTriageCount,
    exactRoutingMatchCount,
    totalInvariantsChecked,
    invariantsPassed,
    invariantsFailed,
    caseResults,
    bugsIdentified: [],
  };
}

/** CLI Formatter and execution entrypoint */
export function printReport(report: EvaluationReport): void {
  const divider = "═".repeat(80);
  const subDivider = "─".repeat(80);

  console.log("\n" + divider);
  console.log("  TRIAGEFLOW AI — AGENT BEHAVIOR VALIDATION & STRESS TEST REPORT");
  console.log(divider);
  console.log(`  Execution Time:    ${report.timestamp}`);
  console.log(`  Overall Status:    ${report.overallStatus === "PASS" ? "🟢 PASS" : report.overallStatus === "WARNING" ? "🟡 WARNING" : "🔴 FAIL"}`);
  console.log(`  Total Cases:       ${report.totalCases}`);
  console.log(`  Passed / Warn / Fail: ${report.passedCases} / ${report.warningCases} / ${report.failedCases}`);
  console.log(`  Routing Accuracy:  ${(report.routingAccuracy * 100).toFixed(1)}% (${report.exactRoutingMatchCount}/${report.totalCases})`);
  console.log(`  Average Questions: ${report.averageQuestions} per case`);
  console.log(`  Contradiction Rate:${(report.contradictionDetectionRate * 100).toFixed(1)}%`);
  console.log(`  Escalation Rate:   ${(report.escalationRate * 100).toFixed(1)}% (${report.caseResults.filter(c => c.escalationTriggered).length}/${report.totalCases})`);
  console.log(`  Avg Reassessments: ${report.reassessmentRate} per case`);
  console.log(`  Under-Triage:      ${report.underTriageCount} (Safety Risk)`);
  console.log(`  Over-Triage:       ${report.overTriageCount}`);
  console.log(`  Invariants Checked:${report.invariantsPassed}/${report.totalInvariantsChecked} passed (${report.invariantsFailed} failed)`);
  console.log(divider);

  console.log("\nINDIVIDUAL CASE RESULTS:");
  for (const cr of report.caseResults) {
    const icon = cr.status === "PASS" ? "🟢 PASS" : cr.status === "WARNING" ? "🟡 WARN" : "🔴 FAIL";
    console.log(`\n${subDivider}`);
    console.log(`[${icon}] ${cr.caseId}: ${cr.caseLabel} (${cr.difficulty})`);
    console.log(`  Expected Routing:  "${cr.expectedRouting}"`);
    console.log(`  Actual Routing:    "${cr.actualRouting}" [${cr.triageClassification}]`);
    console.log(`  Risk Assessment:   Score ${cr.finalRiskScore} (${cr.finalRiskLevel})`);
    console.log(`  Session Status:    "${cr.finalSessionStatus}" | Escalated: ${cr.escalationTriggered ? "YES" : "NO"}`);
    console.log(`  Questions Asked:   ${cr.questionsAskedCount} questions [${cr.askedQuestionIds.join(", ")}]`);
    console.log(`  Contradiction:     Expected: ${cr.contradictionExpected ? "YES" : "NO"} | Detected: ${cr.contradictionDetected ? `YES (${cr.contradictionCount})` : "NO"}`);
    if (cr.contradictions.length > 0) {
      for (const c of cr.contradictions) {
        console.log(`    ↳ Contradiction: "${c.field}" — ${c.previousValue} → ${c.newValue} (${c.reason})`);
      }
    }
    if (cr.escalationReason) {
      console.log(`  Escalation Reason: ${cr.escalationReason}`);
    }

    console.log(`  Adaptive Turns (${cr.adaptiveTrace.length}):`);
    for (const step of cr.adaptiveTrace) {
      console.log(
        `    Turn ${step.turnNumber}: [${step.questionId}] "${step.questionText.substring(0, 35)}..." ` +
        `→ Answer: "${step.answerReceived.rawAnswer}" ` +
        `→ Risk: ${step.stateBefore.riskScore} (${step.stateBefore.riskLevel}) → ${step.stateAfter.riskScore} (${step.stateAfter.riskLevel}) ` +
        `[Δ${step.stateAfter.riskDelta >= 0 ? "+" : ""}${step.stateAfter.riskDelta}] ` +
        `→ Route: "${step.stateAfter.routingOutcome}"`
      );
    }

    console.log(`  Invariant Checks (${cr.invariantChecks.length}):`);
    for (const inv of cr.invariantChecks) {
      const invIcon = inv.passed ? "  ✓" : "  ✗ FAIL:";
      console.log(`    ${invIcon} ${inv.name}: ${inv.message}`);
    }
  }
  console.log("\n" + divider + "\n");
}

// Auto-run if executed directly via CLI
if (typeof process !== "undefined" && process?.argv && (process.argv[1]?.endsWith("evaluationRunner.ts") || process.argv[1]?.endsWith("evaluationRunner.js"))) {
  const report = runAllEvaluations();
  printReport(report);
}
