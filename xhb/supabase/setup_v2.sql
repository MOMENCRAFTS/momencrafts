-- ============================================================
-- XHB × MomenCrafts — Founders' HQ (v2) — IDEMPOTENT SETUP
-- Safe to re-run: uses IF NOT EXISTS, no destructive drops.
-- Functions and RLS are superseded by 013_xhb_gate_rls.sql.
-- ============================================================


-- ---------- 1. Allowlist
create table if not exists public.allowed_users (
  email        text primary key,
  display_name text not null default '',
  added_at     timestamptz not null default now()
);

-- Seed founders (idempotent — skips if already present)
insert into public.allowed_users (email, display_name) values
  ('momen@momencrafts.com', 'Momen')
  on conflict (email) do nothing;

-- ---------- 2. Sessions / Questions / Answers
create table if not exists public.sessions (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  template   text not null default 'custom',
  status     text not null default 'active',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  position       int  not null default 0,
  prompt         text not null,
  context        text not null default '',
  status         text not null default 'sealed',
  outcome        text,
  decision       text not null default '',
  decision_owner text not null default '',
  resolved_at    timestamptz,
  created_by     text not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.answers (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  author_email text not null,
  body         text not null default '',
  updated_at   timestamptz not null default now(),
  unique (question_id, author_email)
);

-- ---------- 3. Plan / Updates / Documents / Nudges / Episodes
create table if not exists public.plan_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  detail     text not null default '',
  phase      text not null default 'General',
  status     text not null default 'next',
  owner      text not null default '',
  due        text not null default '',
  position   int  not null default 0,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.updates (
  id           uuid primary key default gen_random_uuid(),
  author_email text not null,
  body         text not null,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  kind       text not null default 'other',
  status     text not null default '',
  url        text not null default '',
  content    text not null default '',
  approvals  jsonb not null default '{}',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete set null,
  from_email text not null,
  to_email   text not null,
  message    text not null default '',
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.episodes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  url        text not null default '',
  note       text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- 4. Seed Documents vault
insert into public.documents (title, kind, status) values
  ('AI Forest — Remastered Master Architecture', 'source',  'v1.0 — SOURCE OF TRUTH (frozen until Phase 1 data)'),
  ('XHB Investor Deck (34 slides)',              'derived', 'Derived — awaiting v2 reconciliation pass'),
  ('XHB Complete Specification (30 pages)',       'derived', 'Derived — awaiting v2 reconciliation pass'),
  ('Founders MOU and Good-Faith Acknowledgment', 'legal',   'Draft — awaiting lawyer review, then signature'),
  ('Phase 1 Statement of Work',                  'legal',   'To be drafted from remaster Phase 0+1'),
  ('Founders / Shareholders Agreement',          'legal',   'Later — at incorporation, supersedes the MOU');

-- ---------- 5. Helper functions
-- NOTE: These are superseded by xhb.current_email() and xhb.is_allowed()
-- in 013_xhb_gate_rls.sql. Kept here as thin wrappers for backward compat.
create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.allowed_users a
   where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))); $$;

create or replace function public.jwt_email()
returns text language sql stable as
$$ select lower(coalesce(auth.jwt() ->> 'email', '')); $$;

-- ---------- 6. Row Level Security
alter table public.allowed_users enable row level security;
alter table public.sessions      enable row level security;
alter table public.questions     enable row level security;
alter table public.answers       enable row level security;
alter table public.plan_items    enable row level security;
alter table public.updates       enable row level security;
alter table public.documents     enable row level security;
alter table public.nudges        enable row level security;
alter table public.episodes      enable row level security;

create policy allowed_read on public.allowed_users
  for select to authenticated using (public.is_allowed());

-- Full access for allowlisted founders on shared tables
do $$
declare t text;
begin
  foreach t in array array['sessions','questions','plan_items','updates','documents','nudges','episodes'] loop
    execute format('create policy %I_all on public.%I for all to authenticated using (public.is_allowed()) with check (public.is_allowed())', t, t);
  end loop;
end $$;

-- Answers: sealed mechanic (server-side enforcement)
create policy answers_select on public.answers
  for select to authenticated
  using (public.is_allowed() and (
    author_email = public.jwt_email()
    or exists (select 1 from public.questions q where q.id = question_id and q.status <> 'sealed')));

create policy answers_insert on public.answers
  for insert to authenticated
  with check (public.is_allowed() and author_email = public.jwt_email());

create policy answers_update on public.answers
  for update to authenticated
  using (public.is_allowed() and author_email = public.jwt_email()
    and exists (select 1 from public.questions q where q.id = question_id and q.status = 'sealed'))
  with check (author_email = public.jwt_email());

-- ---------- 7. Realtime
do $$
declare t text;
begin
  foreach t in array array['sessions','questions','answers','plan_items','updates','documents','nudges','episodes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ============================================================
-- Done. Run 012_xhb_schema_content.sql then 013_xhb_gate_rls.sql
-- to complete the XHB gate setup.
-- ============================================================
