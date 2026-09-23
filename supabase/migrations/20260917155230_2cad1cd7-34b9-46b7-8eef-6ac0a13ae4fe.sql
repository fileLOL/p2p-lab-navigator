create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_paddle_id on public.subscriptions(paddle_subscription_id);

grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
      and environment = check_env
      and (
        (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$$;

revoke execute on function public.has_active_subscription(uuid, text) from public, anon;

create or replace function public.sync_plan_from_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_price text;
  v_plan text;
begin
  select s.price_id into v_price
  from public.subscriptions s
  where s.user_id = new.user_id
    and (
      (s.status in ('active','trialing','past_due') and (s.current_period_end is null or s.current_period_end > now()))
      or (s.status = 'canceled' and s.current_period_end > now())
    )
  order by s.created_at desc
  limit 1;

  if v_price is null then
    v_plan := 'free';
  elsif v_price like '%yearly%' then
    v_plan := 'yearly';
  else
    v_plan := 'monthly';
  end if;

  update public.profiles
     set plan = v_plan,
         plan_started_at = case when plan is distinct from v_plan then now() else plan_started_at end,
         updated_at = now()
   where id = new.user_id;

  return new;
end;
$$;

create trigger subscriptions_sync_plan
after insert or update on public.subscriptions
for each row execute function public.sync_plan_from_subscription();

create or replace function public.change_plan(_plan text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if _plan <> 'free' then
    raise exception 'plan_requires_payment';
  end if;

  update public.profiles
     set plan = 'free', plan_started_at = now(), updated_at = now()
   where id = v_uid;

  perform public.log_action('plan_change', jsonb_build_object('plan', _plan));

  return public.get_quota();
end;
$$;

revoke execute on function public.change_plan(text) from public, anon;