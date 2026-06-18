-- Options Blow-Up Finder — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- One row per screening run.
create table if not exists public.screen_runs (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  universe_size int not null default 0,
  notes         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- One row per ranked candidate within a run.
create table if not exists public.candidates (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.screen_runs(id) on delete cascade,
  rank            int not null,
  symbol          text not null,
  name            text,
  price           numeric,
  change_pct      numeric,
  composite_score int not null default 0,
  direction       text not null default 'neutral',
  signals         jsonb not null default '{}'::jsonb,
  contract        jsonb,
  rationale       text,
  created_at      timestamptz not null default now()
);

create index if not exists candidates_run_id_idx on public.candidates (run_id);
create index if not exists candidates_score_idx on public.candidates (composite_score desc);
create index if not exists screen_runs_ran_at_idx on public.screen_runs (ran_at desc);

-- Row Level Security: public read of results, writes only via service role
-- (the service role key bypasses RLS, so no insert policy is needed).
alter table public.screen_runs enable row level security;
alter table public.candidates enable row level security;

drop policy if exists "public read runs" on public.screen_runs;
create policy "public read runs" on public.screen_runs
  for select using (true);

drop policy if exists "public read candidates" on public.candidates;
create policy "public read candidates" on public.candidates
  for select using (true);
