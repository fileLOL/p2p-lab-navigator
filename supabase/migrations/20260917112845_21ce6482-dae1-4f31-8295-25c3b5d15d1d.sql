-- Private salt store (no user access)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_secrets (key, value)
VALUES ('email_usage_salt', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Email-scoped daily search usage (survives account deletion)
CREATE TABLE IF NOT EXISTS public.email_search_usage (
  email_hash TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  searches INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email_hash, usage_date)
);
GRANT ALL ON public.email_search_usage TO service_role;
ALTER TABLE public.email_search_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.email_usage_hash(_email TEXT)
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_salt TEXT;
BEGIN
  IF _email IS NULL OR btrim(_email) = '' THEN RETURN NULL; END IF;
  SELECT value INTO v_salt FROM public.app_secrets WHERE key = 'email_usage_salt';
  RETURN encode(sha256(convert_to(COALESCE(v_salt,'') || lower(btrim(_email)), 'utf8')), 'hex');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.email_usage_hash(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_email_hash()
RETURNS TEXT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  RETURN public.email_usage_hash(v_email);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.current_email_hash() FROM PUBLIC, anon, authenticated;

-- Quota now counts against the max of account usage and email usage
CREATE OR REPLACE FUNCTION public.consume_search()
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
  SELECT plan INTO v_plan FROM public.profiles WHERE id = uid;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.consume_search() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_search() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quota()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
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
  SELECT plan INTO v_plan FROM public.profiles WHERE id = uid;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.get_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quota() TO authenticated;

-- Account deletion keeps the email-scoped counter for today, cleans older rows
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  DELETE FROM public.paper_trades WHERE user_id = uid;
  DELETE FROM public.paper_positions WHERE user_id = uid;
  DELETE FROM public.paper_wallets WHERE user_id = uid;
  DELETE FROM public.opportunities WHERE user_id = uid;
  DELETE FROM public.search_usage WHERE user_id = uid;
  DELETE FROM public.audit_log WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM public.email_search_usage WHERE usage_date < (now() AT TIME ZONE 'utc')::date;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;