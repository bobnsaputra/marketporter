-- Customers table for MarketPorter

create table public.customers (
  id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  rate integer not null default 130,
  amount numeric(12,2) not null,
  description text,
  created_at timestamptz default now()
);

alter table public.customers enable row level security;

create policy "Allow insert for authenticated"
  on public.customers for insert
  with check (auth.role() = 'authenticated');

create policy "Allow select to authenticated"
  on public.customers for select
  using (true);

-- Note: tighten RLS policies for production as needed
