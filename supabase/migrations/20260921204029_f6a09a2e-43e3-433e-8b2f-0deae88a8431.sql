ALTER TABLE public.subscriptions RENAME COLUMN stripe_subscription_id TO provider_subscription_id;
ALTER TABLE public.subscriptions RENAME COLUMN stripe_customer_id TO provider_customer_id;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'paypal';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS listing_url TEXT;

CREATE TABLE IF NOT EXISTS public.paypal_plans (
  price_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  paypal_product_id TEXT NOT NULL,
  paypal_plan_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (price_id, environment)
);
GRANT ALL ON public.paypal_plans TO service_role;
ALTER TABLE public.paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.plan_for_env(_uid uuid, _env text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT CASE WHEN s.price_id LIKE '%yearly%' THEN 'yearly' ELSE 'monthly' END
    FROM public.subscriptions s
    WHERE s.user_id = _uid
      AND s.environment = _env
      AND s.status IN ('active','trialing','past_due','canceling')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
    ORDER BY s.created_at DESC
    LIMIT 1
  ), 'free');
$function$;

CREATE OR REPLACE FUNCTION public.sync_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_plan text;
begin
  v_plan := public.plan_for_env(new.user_id, new.environment);

  if new.environment = 'sandbox' then
    update public.profiles
       set sandbox_plan = v_plan, updated_at = now()
     where id = new.user_id;
  else
    update public.profiles
       set plan = v_plan,
           plan_started_at = case when plan is distinct from v_plan then now() else plan_started_at end,
           updated_at = now()
     where id = new.user_id;
  end if;

  return new;
end;
$function$;