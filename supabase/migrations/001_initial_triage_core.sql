-- ============================================================================
-- TriageFlow AI — Core Triage Schema & RLS Migration (Phase 6B-1)
--
-- 5 Core Tables for Session State, Q&A History, and Evaluated Clinical Outcomes.
-- Enforces User-Level Isolation using Supabase Anonymous Auth (auth.uid() = user_id).
-- ============================================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. TRIAGE SESSIONS (Root Entity)
-- ============================================================================
create table if not exists public.triage_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    case_id text not null,
    status text not null check (status in ('idle', 'active', 'completed', 'escalated')),
    expected_routing text,
    final_routing text,
    final_risk_score numeric(4, 1),
    final_risk_level text check (final_risk_level is null or final_risk_level in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNRESOLVED')),
    is_escalated boolean not null default false,
    escalation_reason text,
    questions_asked_count int not null default 0,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_triage_sessions_user_id on public.triage_sessions(user_id);
create index if not exists idx_triage_sessions_case_id on public.triage_sessions(case_id);
create index if not exists idx_triage_sessions_status on public.triage_sessions(status);
create index if not exists idx_triage_sessions_created on public.triage_sessions(created_at desc);

-- ============================================================================
-- 2. ANSWERS (Append-Only Log of Inquiries)
-- ============================================================================
create table if not exists public.answers (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null,
    question_id text not null,
    question_text text not null,
    category text not null,
    selected_option text,
    free_text text default '',
    selection_score numeric(5, 2),
    resolves_field text not null,
    answered_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_answers_session_turn on public.answers(session_id, turn_number);

-- ============================================================================
-- 3. PATIENT STATE SNAPSHOTS (Immutable Turn-by-Turn Versioning)
-- ============================================================================
create table if not exists public.patient_state_snapshots (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null,
    demographics jsonb not null default '{}'::jsonb,
    symptoms jsonb not null default '[]'::jsonb,
    vitals jsonb not null default '{}'::jsonb,
    risk_factors jsonb not null default '[]'::jsonb,
    missing_critical_fields jsonb not null default '[]'::jsonb,
    captured_at timestamptz not null default now()
);

create index if not exists idx_patient_snapshots_session on public.patient_state_snapshots(session_id, turn_number);

-- ============================================================================
-- 4. RISK ASSESSMENTS (Calculated Scores per Turn)
-- ============================================================================
create table if not exists public.risk_assessments (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null,
    score numeric(4, 1) not null,
    level text not null check (level in ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNRESOLVED')),
    contributing_factors jsonb not null default '[]'::jsonb,
    missing_critical_info jsonb not null default '[]'::jsonb,
    reasons jsonb not null default '[]'::jsonb,
    evaluated_at timestamptz not null default now()
);

create index if not exists idx_risk_assessments_session on public.risk_assessments(session_id, turn_number);

-- ============================================================================
-- 5. ROUTING DECISIONS (Evaluated Outcomes per Turn)
-- ============================================================================
create table if not exists public.routing_decisions (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.triage_sessions(id) on delete cascade,
    turn_number int not null,
    outcome text not null check (outcome in (
        'Standard',
        'Urgent Assessment',
        'Immediate / Emergency',
        'Immediate / Escalation',
        'Human Review / Escalation'
    )),
    risk_level text not null,
    is_escalated boolean not null default false,
    reason text not null,
    decided_at timestamptz not null default now()
);

create index if not exists idx_routing_decisions_session on public.routing_decisions(session_id, turn_number);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all 5 tables
alter table public.triage_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.patient_state_snapshots enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.routing_decisions enable row level security;

-- 1. TRIAGE SESSIONS
create policy "Users can select own triage sessions"
    on public.triage_sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert own triage sessions"
    on public.triage_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update own triage sessions"
    on public.triage_sessions for update
    using (auth.uid() = user_id);

-- 2. ANSWERS
create policy "Users can select own session answers"
    on public.answers for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = answers.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own session answers"
    on public.answers for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = answers.session_id and s.user_id = auth.uid()
    ));

-- 3. PATIENT STATE SNAPSHOTS
create policy "Users can select own session snapshots"
    on public.patient_state_snapshots for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = patient_state_snapshots.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own session snapshots"
    on public.patient_state_snapshots for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = patient_state_snapshots.session_id and s.user_id = auth.uid()
    ));

-- 4. RISK ASSESSMENTS
create policy "Users can select own session risk assessments"
    on public.risk_assessments for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = risk_assessments.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own session risk assessments"
    on public.risk_assessments for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = risk_assessments.session_id and s.user_id = auth.uid()
    ));

-- 5. ROUTING DECISIONS
create policy "Users can select own session routing decisions"
    on public.routing_decisions for select
    using (exists (
        select 1 from public.triage_sessions s
        where s.id = routing_decisions.session_id and s.user_id = auth.uid()
    ));

create policy "Users can insert own session routing decisions"
    on public.routing_decisions for insert
    with check (exists (
        select 1 from public.triage_sessions s
        where s.id = routing_decisions.session_id and s.user_id = auth.uid()
    ));
