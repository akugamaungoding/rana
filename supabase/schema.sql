-- Rana Personal Finance – Database Schema
-- Safe to re-run. No login: the anon key can read and write every row.
-- Tables are empty of user ownership. Do not add user_id back unless the app has auth.

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

alter table expenses drop constraint if exists expenses_user_id_fkey;
alter table expenses drop column if exists user_id;
alter table expenses enable row level security;

drop policy if exists "users can select their own expenses" on expenses;
drop policy if exists "users can insert their own expenses" on expenses;
drop policy if exists "users can update their own expenses" on expenses;
drop policy if exists "users can delete their own expenses" on expenses;
drop policy if exists "anon select expenses" on expenses;
drop policy if exists "anon insert expenses" on expenses;
drop policy if exists "anon update expenses" on expenses;
drop policy if exists "anon delete expenses" on expenses;
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

alter table incomes drop constraint if exists incomes_user_id_fkey;
alter table incomes drop column if exists user_id;
alter table incomes enable row level security;

drop policy if exists "users can select their own incomes" on incomes;
drop policy if exists "users can insert their own incomes" on incomes;
drop policy if exists "users can update their own incomes" on incomes;
drop policy if exists "users can delete their own incomes" on incomes;
drop policy if exists "anon select incomes" on incomes;
drop policy if exists "anon insert incomes" on incomes;
drop policy if exists "anon update incomes" on incomes;
drop policy if exists "anon delete incomes" on incomes;
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

alter table investments drop constraint if exists investments_user_id_fkey;
alter table investments drop column if exists user_id;
alter table investments enable row level security;

drop policy if exists "users can select their own investments" on investments;
drop policy if exists "users can insert their own investments" on investments;
drop policy if exists "users can update their own investments" on investments;
drop policy if exists "users can delete their own investments" on investments;
drop policy if exists "anon select investments" on investments;
drop policy if exists "anon insert investments" on investments;
drop policy if exists "anon update investments" on investments;
drop policy if exists "anon delete investments" on investments;
create policy "anon select investments" on investments for select to anon using (true);
create policy "anon insert investments" on investments for insert to anon with check (true);
create policy "anon update investments" on investments for update to anon using (true) with check (true);
create policy "anon delete investments" on investments for delete to anon using (true);

create index if not exists idx_investments_start_date on investments(start_date);
create index if not exists idx_investments_end_date on investments(end_date);

-- --------------------------------------------------------
-- investment_updates
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

alter table investment_updates drop constraint if exists investment_updates_user_id_fkey;
alter table investment_updates drop column if exists user_id;
alter table investment_updates enable row level security;

drop policy if exists "users can select their own investment updates" on investment_updates;
drop policy if exists "users can insert their own investment updates" on investment_updates;
drop policy if exists "users can update their own investment updates" on investment_updates;
drop policy if exists "users can delete their own investment updates" on investment_updates;
drop policy if exists "anon select investment_updates" on investment_updates;
drop policy if exists "anon insert investment_updates" on investment_updates;
drop policy if exists "anon update investment_updates" on investment_updates;
drop policy if exists "anon delete investment_updates" on investment_updates;
create policy "anon select investment_updates" on investment_updates for select to anon using (true);
create policy "anon insert investment_updates" on investment_updates for insert to anon with check (true);
create policy "anon update investment_updates" on investment_updates for update to anon using (true) with check (true);
create policy "anon delete investment_updates" on investment_updates for delete to anon using (true);

create index if not exists idx_investment_updates_investment_id on investment_updates(investment_id);
create index if not exists idx_investment_updates_recorded_on on investment_updates(recorded_on);

-- PostgREST will not see these tables until anon can use them.
grant usage on schema public to anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
revoke all on table public.incomes from anon, authenticated;
revoke all on table public.investments from anon, authenticated;
revoke all on table public.investment_updates from anon, authenticated;
grant select, insert, update, delete on table public.expenses to anon, authenticated;
grant select, insert, update, delete on table public.incomes to anon, authenticated;
grant select, insert, update, delete on table public.investments to anon, authenticated;
grant select, insert, update, delete on table public.investment_updates to anon, authenticated;
