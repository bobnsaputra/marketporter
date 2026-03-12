-- Orders table for MarketPorter

create table public.orders (
  id text primary key,
  link text not null,
  customer_id text references public.customers(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  price_jpy numeric(12,2),
  price_idr numeric(12,2),
  slabbed boolean default false,
  rate_used integer,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- prevent duplicate exact links (no normalization per request)
create unique index orders_link_unique_idx on public.orders (link);

alter table public.orders enable row level security;

create policy "Allow insert for authenticated"
  on public.orders for insert
  with check (auth.role() = 'authenticated');

create policy "Allow select to authenticated"
  on public.orders for select
  using (true);

-- Auto-update updated_at
create trigger on_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();
