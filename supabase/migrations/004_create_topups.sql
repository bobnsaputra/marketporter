-- Topups table for MarketPorter

create table public.topups (
  id text primary key default gen_random_uuid()::text,
  customer_id text references public.customers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'IDR',
  note text,
  voided boolean default false,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_topups_customer_id on public.topups (customer_id);
create index if not exists idx_topups_created_at on public.topups (created_at desc);
create index if not exists idx_topups_voided on public.topups (voided);

alter table public.topups enable row level security;

create policy "Allow insert for authenticated"
  on public.topups for insert
  with check (auth.role() = 'authenticated');

create policy "Allow select to authenticated"
  on public.topups for select
  using (true);

-- Auto-update updated_at using the project's handle_updated_at() helper
create trigger on_topups_updated_at
  before update on public.topups
  for each row execute function public.handle_updated_at();

-- Trigger to update customer balance after insert
create or replace function public.fn_topups_after_insert()
returns trigger as $$
begin
  update public.customers
    set amount = coalesce(amount,0) + new.amount
    where id = new.customer_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_topups_after_insert on public.topups;
create trigger trg_topups_after_insert
  after insert on public.topups
  for each row execute function public.fn_topups_after_insert();

-- Helper to void (rollback) a topup. Marks the topup voided and subtracts
-- the amount from the customer's `amount` field. Run as a privileged role
-- or keep SECURITY DEFINER owner trusted.
create or replace function public.void_topup(p_topup_id text, p_actor uuid, p_reason text)
returns void as $$
declare
  v_customer text;
  v_amount numeric(12,2);
  v_voided boolean;
begin
  select customer_id, amount, voided
    into v_customer, v_amount, v_voided
    from public.topups
    where id = p_topup_id
    for update;

  if not found then
    raise exception 'topup not found: %', p_topup_id;
  end if;

  if v_voided then
    raise exception 'topup already voided: %', p_topup_id;
  end if;

  -- Subtract from customer amount (denormalized counter)
  update public.customers
    set amount = coalesce(amount,0) - v_amount
    where id = v_customer;

  update public.topups
    set voided = true,
        voided_at = now(),
        voided_by = p_actor,
        void_reason = p_reason
    where id = p_topup_id;

  return;
end;
$$ language plpgsql security definer;

-- Note: adjust RLS policies to your access model and review SECURITY DEFINER usage.
