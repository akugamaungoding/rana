-- Rana Personal Finance Database Schema
-- Run this once in the Supabase SQL Editor for a fresh project.

-- Enable UUID extension (required for gen_random_uuid())
create extension if not exists "pgcrypto";

-- --------------------------------------------------------
-- expenses
-- --------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  amount numeric(18,2) not null check (amount > 0),
  category text not null,
  note text,
  spent_on date not null
);

alter table expenses enable row level security;

create policy "users can select their own expenses"
  on expenses for select
  using (user_id = auth.uid());

create policy "users can insert their own expenses"
  on expenses for insert
  with check (user_id = auth.uid());

create policy "users can update their own expenses"
  on expenses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own expenses"
  on expenses for delete
  using (user_id = auth.uid());

create index if not exists idx_expenses_user_id on expenses(user_id);
create index if not exists idx_expenses_spent_on on expenses(spent_on);
create index if not exists idx_expenses_user_spent_on on expenses(user_id, spent_on);

-- --------------------------------------------------------
-- incomes
-- --------------------------------------------------------
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  source text not null,
  amount numeric(18,2) not null check (amount > 0),
  received_on date not null,
  is_recurring boolean not null default false
);

alter table incomes enable row level security;

create policy "users can select their own incomes"
  on incomes for select
  using (user_id = auth.uid());

create policy "users can insert their own incomes"
  on incomes for insert
  with check (user_id = auth.uid());

create policy "users can update their own incomes"
  on incomes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own incomes"
  on incomes for delete
  using (user_id = auth.uid());

create index if not exists idx_incomes_user_id on incomes(user_id);
create index if not exists idx_incomes_received_on on incomes(received_on);
create index if not exists idx_incomes_user_received_on on incomes(user_id, received_on);

-- --------------------------------------------------------
-- investments
-- --------------------------------------------------------
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  name text not null,
  capital numeric(18,2) not null check (capital > 0),
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date)
);

alter table investments enable row level security;

create policy "users can select their own investments"
  on investments for select
  using (user_id = auth.uid());

create policy "users can insert their own investments"
  on investments for insert
  with check (user_id = auth.uid());

create policy "users can update their own investments"
  on investments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own investments"
  on investments for delete
  using (user_id = auth.uid());

create index if not exists idx_investments_user_id on investments(user_id);
create index if not exists idx_investments_start_date on investments(start_date);
create index if not exists idx_investments_end_date on investments(end_date);

-- --------------------------------------------------------
-- investment_updates
-- --------------------------------------------------------
create table if not exists investment_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  investment_id uuid not null references investments(id) on delete cascade,
  recorded_on date not null,
  value numeric(18,2) not null check (value >= 0),
  note text
);

alter table investment_updates enable row level security;

create policy "users can select their own investment updates"
  on investment_updates for select
  using (user_id = auth.uid());

create policy "users can insert their own investment updates"
  on investment_updates for insert
  with check (user_id = auth.uid());

create policy "users can update their own investment updates"
  on investment_updates for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own investment updates"
  on investment_updates for delete
  using (user_id = auth.uid());

create index if not exists idx_investment_updates_user_id on investment_updates(user_id);
create index if not exists idx_investment_updates_investment_id on investment_updates(investment_id);
create index if not exists idx_investment_updates_recorded_on on investment_updates(recorded_on);
create index if not exists idx_investment_updates_user_investment on investment_updates(user_id, investment_id);

-- Unique constraint: one update per investment per date
alter table investment_updates
  add constraint investment_updates_investment_id_recorded_on_key
  unique (investment_id, recorded_on);