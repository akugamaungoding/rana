-- Rana Personal Finance Database Schema
-- Run this once in the Supabase SQL Editor for a fresh project.
-- Mode: tanpa login (semua user share data)

-- Enable UUID extension (required for gen_random_uuid())
create extension if not exists "pgcrypto";

-- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkYXdtaG92ZHplaWx5ZmRrcWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2Nzg4MTIsImV4cCI6MjExMTI1NDgxMn0.meDB-06qzUBx80nSwjcBi00Hd_opFuhZyfX1Q91lCxY

-- --------------------------------------------------------
-- expenses
-- --------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000' references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  amount numeric(18,2) not null check (amount > 0),
  category text not null,
  note text,
  spent_on date not null
);

-- Nonaktifkan RLS, semua user bisa akses (mode tanpa login)
alter table expenses disable row level security;

-- Policy permissive: semua user bisa memilih/simpan/update/hapus
create policy "all users can select expenses"
  on expenses for select
  using (true);
create policy "all users can insert expenses"
  on expenses for insert
  with check (true);
create policy "all users can update expenses"
  on expenses for update
  using (true);
create policy "all users can delete expenses"
  on expenses for delete
  using (true);

create index if not exists idx_expenses_spent_on on expenses(spent_on);
create index if not exists idx_expenses_user_spent_on on expenses("00000000-0000-0000-0000-000000000000", spent_on);

-- --------------------------------------------------------
-- incomes
-- --------------------------------------------------------
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000' references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  source text not null,
  amount numeric(18,2) not null check (amount > 0),
  received_on date not null,
  is_recurring boolean not null default false
);

-- Nonaktifkan RLS, semua user bisa akses
alter table incomes disable row level security;

-- Policy permissive
create policy "all users can select incomes"
  on incomes for select
  using (true);
create policy "all users can insert incomes"
  on incomes for insert
  with check (true);
create policy "all users can update incomes"
  on incomes for update
  using (true);
create policy "all users can delete incomes"
  on incomes for delete
  using (true);

create index if not exists idx_incomes_received_on on incomes(received_on);
create index if not exists idx_incomes_user_received_on on incomes("00000000-0000-0000-0000-000000000000", received_on);

-- --------------------------------------------------------
-- investments
-- --------------------------------------------------------
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000' references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  capital numeric(18,2) not null check (capital > 0),
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date)
);

-- Nonaktifkan RLS, semua user bisa akses
alter table investments disable row level security;

-- Policy permissive
create policy "all users can select investments"
  on investments for select
  using (true);
create policy "all users can insert investments"
  on investments for insert
  with check (true);
create policy "all users can update investments"
  on investments for update
  using (true);
create policy "all users can delete investments"
  on investments for delete
  using (true);

create index if not exists idx_investments_start_date on investments(start_date);
create index if not exists idx_investments_end_date on investments(end_date);

-- --------------------------------------------------------
-- investment_updates
-- --------------------------------------------------------
create table if not exists investment_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000' references auth.users(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  recorded_on date not null,
  value numeric(18,2) not null check (value >= 0),
  note text
);

-- Nonaktifkan RLS, semua user bisa akses
alter table investment_updates disable row level security;

-- Policy permissive
create policy "all users can select investment_updates"
  on investment_updates for select
  using (true);
create policy "all users can insert investment_updates"
  on investment_updates for insert
  with check (true);
create policy "all users can update investment_updates"
  on investment_updates for update
  using (true);
create policy "all users can delete investment_updates"
  on investment_updates for delete
  using (true);

create index if not exists idx_investment_updates_investment_id on investment_updates(investment_id);
create index if not exists idx_investment_updates_recorded_on on investment_updates(recorded_on);
create index if not exists idx_investment_updates_user_investment on investment_updates("00000000-0000-0000-0000-000000000000", investment_id);

-- Unique constraint: one update per investment per date
alter table investment_updates
  add constraint investment_updates_investment_id_recorded_on_key
  unique (investment_id, recorded_on);