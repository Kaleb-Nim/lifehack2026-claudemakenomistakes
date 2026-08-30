-- Orders table for the real (non-hardcoded) consumer bot.
-- This is the only Supabase table this app uses — the product catalog lives
-- in Postgres+ParadeDB instead (see db/catalog_db.py).
--
-- Apply with `supabase db push` once linked, or paste into the SQL editor
-- in the Supabase dashboard.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  telegram_chat_id bigint not null,
  merchant_name text not null,
  product_name text not null,
  product_ref text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'SGD',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'held', 'cancelled', 'pending_refund')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep existing installations in sync: `create table if not exists` does not
-- update the status check on a table that has already been created.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'held', 'cancelled', 'pending_refund'));

create index if not exists orders_telegram_user_id_idx
  on orders (telegram_user_id);

-- Bot backend only ever talks to Supabase with the service_role key, which
-- bypasses RLS. Enabling RLS with no anon/authenticated policies means this
-- table is unreachable from any public client (e.g. if a Supabase API key
-- ever leaked into a frontend) — see the security checklist in the
-- supabase skill.
alter table orders enable row level security;

create or replace function set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();
