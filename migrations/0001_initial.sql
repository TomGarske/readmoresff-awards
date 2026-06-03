-- ReadMoreSFF Awards · initial schema
-- Run in Supabase SQL editor or via `supabase db push`.

-- ============================================================================
-- ENUMS
-- ============================================================================

create type submission_status as enum (
  'draft',
  'submitted',
  'anonymized',
  'judged',
  'advanced',
  'eliminated'
);

create type assignment_status as enum (
  'pending',
  'in_progress',
  'submitted',
  'reassigned'
);

create type round_kind as enum ('round_1', 'round_2', 'final');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profile mirrors auth.users (linked by id).
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  legal_name   text,
  pen_name     text,
  city         text,
  country      text,
  mailing_address jsonb,        -- {street, city, region, postal, country}
  bio          text,
  is_judge     boolean not null default false,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table challenges (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  format        text not null,
  word_limit    int  not null,
  fee_list_cents int not null,
  fee_promo_cents int not null,
  registration_opens timestamptz,
  registration_closes timestamptz,
  created_at    timestamptz not null default now()
);

create table rounds (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  kind          round_kind not null,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  advance_per_group int not null,
  group_size_target int not null default 40,
  created_at    timestamptz not null default now(),
  unique (challenge_id, kind)
);

-- Registration = paid entry. One per writer per challenge.
create table registrations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  challenge_id      uuid not null references challenges(id) on delete cascade,
  stripe_session_id text unique,
  amount_paid_cents int,
  promo_applied     boolean not null default false,
  paid_at           timestamptz,
  refunded_at       timestamptz,
  withdrew_at       timestamptz,
  created_at        timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- Groups within a round (each writer in one group per round).
create table groups (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references rounds(id) on delete cascade,
  number       int  not null,                -- 1..N within the round
  prompt_genre  text not null,                -- slug from prompts.ts
  prompt_theme  text not null,
  prompt_object text not null,
  created_at   timestamptz not null default now(),
  unique (round_id, number)
);

create table group_members (
  registration_id uuid not null references registrations(id) on delete cascade,
  group_id        uuid not null references groups(id) on delete cascade,
  primary key (registration_id, group_id)
);

-- A submission = a story uploaded for one round.
create table submissions (
  id                  uuid primary key default gen_random_uuid(),
  registration_id     uuid not null references registrations(id) on delete cascade,
  round_id            uuid not null references rounds(id) on delete cascade,
  title               text,
  synopsis            text,
  file_r2_key         text,
  anonymized_r2_key   text,
  word_count          int,
  status              submission_status not null default 'draft',
  submitted_at        timestamptz,
  created_at          timestamptz not null default now(),
  unique (registration_id, round_id)
);

-- Judges (humans). Profile is_judge=true is the gate; this table is per-challenge config.
create table judges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  challenge_id  uuid not null references challenges(id) on delete cascade,
  specialty_genres text[] default '{}',   -- prompt slugs they're best on
  notes         text,
  created_at    timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- A judge is assigned a specific submission to score.
create table assignments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  judge_id      uuid not null references judges(id) on delete cascade,
  status        assignment_status not null default 'pending',
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  unique (submission_id, judge_id)
);

-- One score row per assignment.
create table scores (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references assignments(id) on delete cascade unique,
  prompt_adherence  int,    -- 1-25
  originality       int,    -- 1-25
  prose             int,    -- 1-25
  structure         int,    -- 1-25
  total             int generated always as (
    coalesce(prompt_adherence,0) + coalesce(originality,0) + coalesce(prose,0) + coalesce(structure,0)
  ) stored,
  feedback_md       text,
  submitted_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- Advance lists are the result of a round.
create table advance_lists (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds(id) on delete cascade,
  group_id        uuid references groups(id),     -- null for final-round results
  submission_ids  uuid[] not null default '{}',
  finalized_at    timestamptz not null default now()
);

-- Audit log for admin/judge actions.
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  target_kind text,
  target_id   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index on submissions (round_id, status);
create index on submissions (registration_id);
create index on group_members (group_id);
create index on assignments (judge_id, status);
create index on scores (assignment_id);

-- ============================================================================
-- TRIGGER: auto-create profile row when a user signs up via Supabase auth
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
