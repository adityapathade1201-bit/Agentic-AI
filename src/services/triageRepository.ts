/**
 * TriageFlow AI — Core & Audit Triage Repository (Phase 6B-2)
 *
 * Provides database abstraction for the 5 core triage tables plus
 * 3 observability/audit tables:
 * - patient_events
 * - contradictions
 * - decision_trace_entries
 *
 * All operations fail gracefully if Supabase is offline or unconfigured.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type {
  Answer,
  PatientState,
  RiskAssessment,
  RoutingDecision,
  Question,
  SessionStatus,
  RoutingOutcome,
  RiskLevel,
  PatientEvent,
  Contradiction,
  DecisionTraceEntry,
  ContradictionSeverity,
  TraceEventType,
  FieldStatus,
} from "../domain/types";

export interface PersistedSessionRecord {
  id: string;
  user_id: string;
  case_id: string;
  status: SessionStatus;
  expected_routing: RoutingOutcome | null;
  final_routing: RoutingOutcome | null;
  final_risk_score: number | null;
  final_risk_level: RiskLevel | null;
  is_escalated: boolean;
  escalation_reason: string | null;
  questions_asked_count: number;
  started_at: string;
  completed_at: string | null;
}

export interface PersistedAnswerRecord {
  id: string;
  session_id: string;
  turn_number: number;
  question_id: string;
  question_text: string;
  category: string;
  selected_option: string | null;
  free_text: string;
  selection_score: number | null;
  resolves_field: string;
  answered_at: string;
}

export interface PersistedSnapshotRecord {
  id: string;
  session_id: string;
  turn_number: number;
  demographics: unknown;
  symptoms: unknown;
  vitals: unknown;
  risk_factors: unknown;
  missing_critical_fields: unknown;
  captured_at: string;
}

export interface PersistedPatientEventRecord {
  id: string;
  session_id: string;
  turn_number: number;
  source: string;
  field: string;
  previous_value: string;
  new_value: string;
  status: FieldStatus;
  event_time: string;
  created_at: string;
}

export interface PersistedContradictionRecord {
  id: string;
  session_id: string;
  turn_number: number;
  field: string;
  previous_value: string;
  new_value: string;
  severity: ContradictionSeverity;
  reason: string;
  detected_at: string;
  created_at: string;
}

export interface PersistedDecisionTraceRecord {
  id: string;
  session_id: string;
  step_number: number;
  turn_number: number | null;
  stage: string | null;
  event_type: TraceEventType;
  component: string;
  action: string;
  result: string;
  note: string;
  timestamp: string;
  created_at: string;
}

export interface SessionHistoryBundle {
  session: PersistedSessionRecord;
  answers: PersistedAnswerRecord[];
  snapshots: PersistedSnapshotRecord[];
  riskAssessments: Array<{
    turn_number: number;
    score: number;
    level: RiskLevel;
    contributing_factors: unknown;
    missing_critical_info: unknown;
    reasons: unknown;
    evaluated_at: string;
  }>;
  routingDecisions: Array<{
    turn_number: number;
    outcome: RoutingOutcome;
    risk_level: string;
    is_escalated: boolean;
    reason: string;
    decided_at: string;
  }>;
  patientEvents: PersistedPatientEventRecord[];
  contradictions: PersistedContradictionRecord[];
  decisionTrace: PersistedDecisionTraceRecord[];
}

export class TriageRepository {
  /**
   * Create a new triage session record.
   */
  static async createSession(
    sessionId: string,
    userId: string,
    caseId: string,
    expectedRouting: string | null = null
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from("triage_sessions").insert({
        id: sessionId,
        user_id: userId,
        case_id: caseId,
        status: "active",
        expected_routing: expectedRouting,
        questions_asked_count: 0,
        started_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to create session in Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in createSession:", err);
      return false;
    }
  }

  /**
   * Update session summary state (e.g. on completion or escalation).
   */
  static async updateSession(
    sessionId: string,
    updates: {
      status?: SessionStatus;
      final_routing?: RoutingOutcome | string;
      final_risk_score?: number;
      final_risk_level?: RiskLevel;
      is_escalated?: boolean;
      escalation_reason?: string | null;
      questions_asked_count?: number;
      completed_at?: string;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase
        .from("triage_sessions")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to update session in Supabase:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in updateSession:", err);
      return false;
    }
  }

  /**
   * Record an answered inquiry.
   */
  static async addAnswer(
    sessionId: string,
    turnNumber: number,
    answer: Answer,
    question: Question,
    score: number | null = null
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from("answers").insert({
        session_id: sessionId,
        turn_number: turnNumber,
        question_id: question.id,
        question_text: question.text,
        category: question.category,
        selected_option: answer.selectedOption,
        free_text: answer.freeText || "",
        selection_score: score,
        resolves_field: question.resolvesField,
        answered_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save answer:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in addAnswer:", err);
      return false;
    }
  }

  /**
   * Save a turn-by-turn patient state snapshot.
   */
  static async savePatientStateSnapshot(
    sessionId: string,
    turnNumber: number,
    patientState: PatientState
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from("patient_state_snapshots").insert({
        session_id: sessionId,
        turn_number: turnNumber,
        demographics: patientState.demographics,
        symptoms: patientState.symptoms,
        vitals: patientState.vitals,
        risk_factors: patientState.riskFactors,
        missing_critical_fields: patientState.missingCriticalFields,
        captured_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save patient snapshot:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in savePatientStateSnapshot:", err);
      return false;
    }
  }

  /**
   * Save evaluated risk assessment for this turn.
   */
  static async saveRiskAssessment(
    sessionId: string,
    turnNumber: number,
    risk: RiskAssessment
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from("risk_assessments").insert({
        session_id: sessionId,
        turn_number: turnNumber,
        score: risk.score,
        level: risk.level,
        contributing_factors: risk.contributingFactors,
        missing_critical_info: risk.missingCriticalInformation,
        reasons: risk.reasons,
        evaluated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save risk assessment:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in saveRiskAssessment:", err);
      return false;
    }
  }

  /**
   * Save evaluated routing decision for this turn.
   */
  static async saveRoutingDecision(
    sessionId: string,
    turnNumber: number,
    routing: RoutingDecision
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from("routing_decisions").insert({
        session_id: sessionId,
        turn_number: turnNumber,
        outcome: routing.outcome,
        risk_level: routing.riskLevel,
        is_escalated: routing.escalate,
        reason: routing.reason,
        decided_at: new Date().toISOString(),
      });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save routing decision:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in saveRoutingDecision:", err);
      return false;
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PHASE 6B-2: AUDIT TRAIL, MUTATIONS & DECISION TRACE REPOSITORY METHODS
     ────────────────────────────────────────────────────────────────────────── */

  /**
   * Record a single patient state mutation event.
   */
  static async addPatientEvent(
    sessionId: string,
    turnNumber: number,
    event: PatientEvent
  ): Promise<boolean> {
    return this.addPatientEvents(sessionId, turnNumber, [event]);
  }

  /**
   * Record multiple patient state mutation events (batch).
   */
  static async addPatientEvents(
    sessionId: string,
    turnNumber: number,
    events: PatientEvent[]
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || events.length === 0) return true;

    try {
      const rows = events.map((ev) => ({
        session_id: sessionId,
        turn_number: turnNumber,
        source: ev.source,
        field: ev.field,
        previous_value: ev.previousValue ?? "",
        new_value: ev.newValue ?? "",
        status: ev.status,
        event_time: ev.time || new Date().toISOString(),
      }));

      const { error } = await supabase.from("patient_events").insert(rows);

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save patient events:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in addPatientEvents:", err);
      return false;
    }
  }

  /**
   * Record a detected contradiction.
   */
  static async addContradiction(
    sessionId: string,
    turnNumber: number,
    contradiction: Contradiction
  ): Promise<boolean> {
    return this.addContradictions(sessionId, turnNumber, [contradiction]);
  }

  /**
   * Record detected contradictions (batch).
   */
  static async addContradictions(
    sessionId: string,
    turnNumber: number,
    contradictions: Contradiction[]
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || contradictions.length === 0) return true;

    try {
      const rows = contradictions.map((c) => ({
        session_id: sessionId,
        turn_number: turnNumber,
        field: c.field,
        previous_value: c.previousValue ?? "",
        new_value: c.newValue ?? "",
        severity: c.severity,
        reason: c.reason,
        detected_at: c.detectedAt || new Date().toISOString(),
      }));

      const { error } = await supabase.from("contradictions").insert(rows);

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save contradictions:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in addContradictions:", err);
      return false;
    }
  }

  /**
   * Record a single decision trace step.
   */
  static async addDecisionTraceEntry(
    sessionId: string,
    entry: DecisionTraceEntry,
    turnNumber?: number
  ): Promise<boolean> {
    return this.addDecisionTraceEntries(sessionId, [entry], turnNumber);
  }

  /**
   * Record decision trace steps with idempotency (upsert on session_id, step_number).
   */
  static async addDecisionTraceEntries(
    sessionId: string,
    entries: DecisionTraceEntry[],
    turnNumber?: number
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase || entries.length === 0) return true;

    try {
      const rows = entries.map((e) => ({
        session_id: sessionId,
        step_number: e.step,
        turn_number: turnNumber ?? null,
        stage: e.type,
        event_type: e.type,
        component: e.component,
        action: e.action,
        result: e.result,
        note: e.note ?? "",
        timestamp: e.time || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("decision_trace_entries")
        .upsert(rows, { onConflict: "session_id,step_number" });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to save decision trace entries:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in addDecisionTraceEntries:", err);
      return false;
    }
  }

  /**
   * Get all patient events for a session.
   */
  static async getPatientEvents(sessionId: string): Promise<PersistedPatientEventRecord[]> {
    if (!isSupabaseConfigured || !supabase || !sessionId) return [];

    try {
      const { data, error } = await supabase
        .from("patient_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to query patient events:", error.message);
        return [];
      }
      return (data ?? []) as PersistedPatientEventRecord[];
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getPatientEvents:", err);
      return [];
    }
  }

  /**
   * Get all contradictions for a session.
   */
  static async getContradictions(sessionId: string): Promise<PersistedContradictionRecord[]> {
    if (!isSupabaseConfigured || !supabase || !sessionId) return [];

    try {
      const { data, error } = await supabase
        .from("contradictions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to query contradictions:", error.message);
        return [];
      }
      return (data ?? []) as PersistedContradictionRecord[];
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getContradictions:", err);
      return [];
    }
  }

  /**
   * Get all decision trace entries for a session.
   */
  static async getDecisionTrace(sessionId: string): Promise<PersistedDecisionTraceRecord[]> {
    if (!isSupabaseConfigured || !supabase || !sessionId) return [];

    try {
      const { data, error } = await supabase
        .from("decision_trace_entries")
        .select("*")
        .eq("session_id", sessionId)
        .order("step_number", { ascending: true });

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to query decision trace:", error.message);
        return [];
      }
      return (data ?? []) as PersistedDecisionTraceRecord[];
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getDecisionTrace:", err);
      return [];
    }
  }

  /**
   * Fetch the latest active session for the authenticated user to support page reload restoration.
   */
  static async getLatestActiveSession(userId: string): Promise<PersistedSessionRecord | null> {
    if (!isSupabaseConfigured || !supabase || !userId) return null;

    try {
      const { data, error } = await supabase
        .from("triage_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to query latest active session:", error.message);
        return null;
      }
      return data as PersistedSessionRecord | null;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getLatestActiveSession:", err);
      return null;
    }
  }

  /**
   * Retrieve a single session record by its ID.
   */
  static async getSession(sessionId: string): Promise<PersistedSessionRecord | null> {
    if (!isSupabaseConfigured || !supabase || !sessionId) return null;

    try {
      const { data, error } = await supabase
        .from("triage_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (error) {
        console.warn("[PERSISTENCE_ERROR] Failed to query session:", error.message);
        return null;
      }
      return data as PersistedSessionRecord | null;
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getSession:", err);
      return null;
    }
  }

  /**
   * Retrieve full session history bundle including all 8 tables.
   */
  static async getSessionHistory(sessionId: string): Promise<SessionHistoryBundle | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const [
        sessRes,
        ansRes,
        snapRes,
        riskRes,
        routeRes,
        eventRes,
        contraRes,
        traceRes,
      ] = await Promise.all([
        supabase.from("triage_sessions").select("*").eq("id", sessionId).single(),
        supabase.from("answers").select("*").eq("session_id", sessionId).order("turn_number", { ascending: true }),
        supabase.from("patient_state_snapshots").select("*").eq("session_id", sessionId).order("turn_number", { ascending: true }),
        supabase.from("risk_assessments").select("*").eq("session_id", sessionId).order("turn_number", { ascending: true }),
        supabase.from("routing_decisions").select("*").eq("session_id", sessionId).order("turn_number", { ascending: true }),
        supabase.from("patient_events").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
        supabase.from("contradictions").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
        supabase.from("decision_trace_entries").select("*").eq("session_id", sessionId).order("step_number", { ascending: true }),
      ]);

      if (sessRes.error || !sessRes.data) {
        return null;
      }

      return {
        session: sessRes.data as PersistedSessionRecord,
        answers: (ansRes.data ?? []) as PersistedAnswerRecord[],
        snapshots: (snapRes.data ?? []) as PersistedSnapshotRecord[],
        riskAssessments: (riskRes.data ?? []) as SessionHistoryBundle["riskAssessments"],
        routingDecisions: (routeRes.data ?? []) as SessionHistoryBundle["routingDecisions"],
        patientEvents: (eventRes.data ?? []) as PersistedPatientEventRecord[],
        contradictions: (contraRes.data ?? []) as PersistedContradictionRecord[],
        decisionTrace: (traceRes.data ?? []) as PersistedDecisionTraceRecord[],
      };
    } catch (err) {
      console.warn("[PERSISTENCE_ERROR] Unexpected error in getSessionHistory:", err);
      return null;
    }
  }
}
