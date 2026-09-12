-- ============================================================================
-- TriageFlow AI — Agent Audit Trail & Decision Trace Migration (Phase 6B-2)
--
-- 3 Observability Tables:
-- 1. patient_events (field-level mutations over time)
-- 2. contradictions (clinical discrepancies detected during triage)
-- 3. decision_trace_entries (full deterministic agent reasoning chain)
--
-- Enforces User-Level Isolation using Supabase Anonymous Auth (auth.uid() = user_id via session_id).
-- ============================================================================

-- ============================================================================
-- 1. PATIENT EVENTS (Field-Level State Mutations)
-- ============================================================================
create table if not exists public.patient_events (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null default 0,
    source text not null,
    field text not null,
    previous_value text not null default '',
    new_value text not null default '',
    status text not null,
    event_time text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_patient_events_session on public.patient_events(session_id);
create index if not exists idx_patient_events_session_turn on public.patient_events(session_id, turn_number);
create index if not exists idx_patient_events_created on public.patient_events(created_at desc);

-- ============================================================================
-- 2. CONTRADICTIONS (Detected Clinical Inconsistencies)
-- ============================================================================
create table if not exists public.contradictions (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null default 0,
    field text not null,
    previous_value text not null default '',
    new_value text not null default '',
    severity text not null check (severity in ('low', 'moderate', 'high', 'critical')),
    reason text not null,
    detected_at text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_contradictions_session on public.contradictions(session_id);
create index if not exists idx_contradictions_session_turn on public.contradictions(session_id, turn_number);
create index if not exists idx_contradictions_created on public.contradictions(created_at desc);

-- ============================================================================
-- 3. DECISION TRACE ENTRIES (Full Agent Reasoning & Observability Log)
-- ============================================================================
create table if not exists public.decision_trace_entries (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    step_number int not null,
    turn_number int,
    stage text,
    event_type text not null,
    component text not null,
    action text not null,
    result text not null,
    note text not null default '',
    timestamp text not null,
    created_at timestamptz not null default now(),
    constraint uq_decision_trace_session_step unique (session_id, step_number)
);

create index if not exists idx_decision_trace_session on public.decision_trace_entries(session_id);
create index if not exists idx_decision_trace_session_step on public.decision_trace_entries(session_id, step_number);
create index if not exists idx_decision_trace_session_turn on public.decision_trace_entries(session_id, turn_number);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all 3 audit tables
alter table public.patient_events enable row level security;
alter table public.contradictions enable row level security;
alter table public.decision_trace_entries enable row level security;

-- 1. PATIENT EVENTS
create policy "Users can select own patient events"
    on public.patient_events for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = patient_events.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own patient events"
    on public.patient_events for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = patient_events.session_id and s.user_id = auth.uid()
    ));

-- 2. CONTRADICTIONS
create policy "Users can select own contradictions"
    on public.contradictions for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = contradictions.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own contradictions"
    on public.contradictions for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = contradictions.session_id and s.user_id = auth.uid()
    ));

-- 3. DECISION TRACE ENTRIES
create policy "Users can select own decision trace entries"
    on public.decision_trace_entries for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = decision_trace_entries.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own decision trace entries"
    on public.decision_trace_entries for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = decision_trace_entries.session_id and s.user_id = auth.uid()
    ));
