-- Rana Personal Finance – Database Schema
-- Run this once in the Supabase SQL Editor for a fresh project.
-- No authentication – the anon role has full access to all tables.

-- To reset tables if you already ran an older schema, uncomment and run these first:
-- drop table if exists investment_updates cascade;
-- drop table if exists investments cascade;
-- drop table if exists incomes cascade;
-- drop table if exists expenses cascade;

-- --------------------------------------------------------
-- expenses
-- --------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  amount numeric(18,2) not null check (amount > 0),
  category text not null,
  note text,
  spent_on date not null
);

alter table expenses enable row level security;

create policy "anon select expenses" on expenses for select to anon using (true);
create policy "anon insert expenses" on expenses for insert to anon with check (true);
create policy "anon update expenses" on expenses for update to anon using (true) with check (true);
create policy "anon delete expenses" on expenses for delete to anon using (true);

create index if not exists idx_expenses_spent_on on expenses(spent_on);

-- --------------------------------------------------------
-- incomes
-- --------------------------------------------------------
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  source text not null,
  amount numeric(18,2) not null check (amount > 0),
  received_on date not null,
  is_recurring boolean not null default false
);

alter table incomes enable row level security;

create policy "anon select incomes" on incomes for select to anon using (true);
create policy "anon insert incomes" on incomes for insert to anon with check (true);
create policy "anon update incomes" on incomes for update to anon using (true) with check (true);
create policy "anon delete incomes" on incomes for delete to anon using (true);

create index if not exists idx_incomes_received_on on incomes(received_on);

-- --------------------------------------------------------
-- investments
-- --------------------------------------------------------
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  capital numeric(18,2) not null check (capital > 0),
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date)
);

alter table investments enable row level security;

create policy "anon select investments" on investments for select to anon using (true);
create policy "anon insert investments" on investments for insert to anon with check (true);
create policy "anon update investments" on investments for update to anon using (true) with check (true);
create policy "anon delete investments" on investments for delete to anon using (true);

create index if not exists idx_investments_start_date on investments(start_date);
create index if not exists idx_investments_end_date on investments(end_date);

-- --------------------------------------------------------
-- investment_updates (value snapshots, many per investment)
-- --------------------------------------------------------
create table if not exists investment_updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  investment_id uuid not null references investments(id) on delete cascade,
  recorded_on date not null,
  value numeric(18,2) not null check (value >= 0),
  note text,
  unique (investment_id, recorded_on)
);

alter table investment_updates enable row level security;

create policy "anon select investment_updates" on investment_updates for select to anon using (true);
create policy "anon insert investment_updates" on investment_updates for insert to anon with check (true);
create policy "anon update investment_updates" on investment_updates for update to anon using (true) with check (true);
create policy "anon delete investment_updates" on investment_updates for delete to anon using (true);

create index if not exists idx_investment_updates_investment_id on investment_updates(investment_id);
create index if not exists idx_investment_updates_recorded_on on investment_updates(recorded_on);
