create table public.exchange_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange text not null default 'binance',
  api_key text not null,
  api_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  unique (user_id, exchange)
);

alter table public.exchange_keys enable row level security;

create policy "Users manage own exchange keys"
  on public.exchange_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.real_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange text not null default 'binance',
  symbol text not null,
  side text not null check (side in ('BUY','SELL')),
  quantity numeric not null,
  price numeric,
  quote_quantity numeric,
  order_id text,
  status text not null default 'created',
  error text,
  created_at timestamptz not null default now()
);

create index idx_real_orders_user on public.real_orders(user_id, created_at desc);

alter table public.real_orders enable row level security;

create policy "Users read own real orders"
  on public.real_orders for select
  using (auth.uid() = user_id);

create policy "Users insert own real orders"
  on public.real_orders for insert
  with check (auth.uid() = user_id);