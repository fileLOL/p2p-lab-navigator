-- 1. Separación de entorno de pruebas / real
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sandbox_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS pending_price_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

-- 2. Idempotencia de eventos del proveedor de pagos
CREATE TABLE IF NOT EXISTS public.payment_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- 3. Plan efectivo por entorno
CREATE OR REPLACE FUNCTION public.plan_for_env(_uid UUID, _env TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(CASE WHEN _env = 'sandbox' THEN p.sandbox_plan ELSE p.plan END, 'free')
  FROM public.profiles p WHERE p.id = _uid;
$$;
REVOKE EXECUTE ON FUNCTION public.plan_for_env(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_for_env(UUID, TEXT) TO authenticated;

-- 4. Sincronización de plan respetando el entorno
CREATE OR REPLACE FUNCTION public.sync_plan_from_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_price text;
  v_plan text;
begin
  select s.price_id into v_price
  from public.subscriptions s
  where s.user_id = new.user_id
    and s.environment = new.environment
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
$$;

-- 5. Cuota consciente del entorno
CREATE OR REPLACE FUNCTION public.get_quota(_env TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_plan TEXT;
  v_limit INT;
  v_used INT := 0;
  v_email_used INT := 0;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_hash TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_plan := COALESCE(public.plan_for_env(uid, _env), 'free');
  v_limit := public.plan_daily_limit(v_plan);

  SELECT COALESCE(searches,0) INTO v_used FROM public.search_usage
  WHERE user_id = uid AND usage_date = v_today;
  v_used := COALESCE(v_used, 0);

  v_hash := public.current_email_hash();
  IF v_hash IS NOT NULL THEN
    SELECT COALESCE(searches,0) INTO v_email_used FROM public.email_search_usage
    WHERE email_hash = v_hash AND usage_date = v_today;
    v_email_used := COALESCE(v_email_used, 0);
  END IF;

  v_used := GREATEST(v_used, v_email_used);

  RETURN jsonb_build_object('plan', v_plan, 'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit < 0 THEN -1 ELSE GREATEST(v_limit - v_used, 0) END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_quota(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quota(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quota()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_quota('live');
$$;

CREATE OR REPLACE FUNCTION public.consume_search(_env TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_plan TEXT;
  v_limit INT;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_used INT := 0;
  v_email_used INT := 0;
  v_hash TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_plan := COALESCE(public.plan_for_env(uid, _env), 'free');
  v_limit := public.plan_daily_limit(v_plan);
  v_hash := public.current_email_hash();

  INSERT INTO public.search_usage (user_id, usage_date, searches)
  VALUES (uid, v_today, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT searches INTO v_used FROM public.search_usage
  WHERE user_id = uid AND usage_date = v_today FOR UPDATE;
  v_used := COALESCE(v_used, 0);

  IF v_hash IS NOT NULL THEN
    INSERT INTO public.email_search_usage (email_hash, usage_date, searches)
    VALUES (v_hash, v_today, 0)
    ON CONFLICT (email_hash, usage_date) DO NOTHING;

    SELECT searches INTO v_email_used FROM public.email_search_usage
    WHERE email_hash = v_hash AND usage_date = v_today FOR UPDATE;
    v_email_used := COALESCE(v_email_used, 0);
  END IF;

  v_used := GREATEST(v_used, v_email_used);

  IF v_limit >= 0 AND v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'plan', v_plan, 'limit', v_limit, 'used', v_used, 'remaining', 0);
  END IF;

  v_used := v_used + 1;

  UPDATE public.search_usage SET searches = v_used, updated_at = now()
  WHERE user_id = uid AND usage_date = v_today;

  IF v_hash IS NOT NULL THEN
    UPDATE public.email_search_usage SET searches = v_used, updated_at = now()
    WHERE email_hash = v_hash AND usage_date = v_today;
  END IF;

  INSERT INTO public.audit_log (user_id, action, metadata) VALUES (uid, 'search', jsonb_build_object('used', v_used));

  RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit < 0 THEN -1 ELSE v_limit - v_used END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_search(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_search(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_search()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.consume_search('live');
$$;

-- 6. Volver a gratis respetando el entorno
CREATE OR REPLACE FUNCTION public.change_plan(_plan TEXT, _env TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if _plan <> 'free' then raise exception 'plan_requires_payment'; end if;

  if _env = 'sandbox' then
    update public.profiles set sandbox_plan = 'free', updated_at = now() where id = v_uid;
  else
    update public.profiles set plan = 'free', plan_started_at = now(), updated_at = now() where id = v_uid;
  end if;

  perform public.log_action('plan_change', jsonb_build_object('plan', _plan, 'env', _env));
  return public.get_quota(_env);
end;
$$;
REVOKE EXECUTE ON FUNCTION public.change_plan(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_plan(TEXT, TEXT) TO authenticated;

-- 7. Recolocar las suscripciones existentes en el entorno correcto
UPDATE public.profiles p SET plan = 'free'
WHERE p.plan <> 'free'
  AND NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id AND s.environment = 'live');
UPDATE public.subscriptions SET updated_at = now();