
-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','monthly','yearly')),
  plan_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ========== SEARCH USAGE ==========
CREATE TABLE public.search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  searches INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);
CREATE INDEX idx_search_usage_user_date ON public.search_usage(user_id, usage_date DESC);
GRANT SELECT ON public.search_usage TO authenticated;
GRANT ALL ON public.search_usage TO service_role;
ALTER TABLE public.search_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.search_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== OPPORTUNITY SOURCES ==========
CREATE TABLE public.opportunity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unavailable' CHECK (status IN ('available','unavailable','requires_credentials')),
  is_real BOOLEAN NOT NULL DEFAULT false,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.opportunity_sources TO anon, authenticated;
GRANT ALL ON public.opportunity_sources TO service_role;
ALTER TABLE public.opportunity_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sources public read" ON public.opportunity_sources FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.opportunity_sources (key, name, status, is_real, website, notes) VALUES
 ('binance_p2p','Binance P2P','requires_credentials',true,'https://p2p.binance.com','Endpoint público sujeto a bloqueo geográfico y rate limiting.'),
 ('bybit_p2p','Bybit P2P','requires_credentials',true,'https://www.bybit.com/fiat/trade/otc','Adaptador definido, pendiente de credenciales.'),
 ('okx_p2p','OKX P2P','requires_credentials',true,'https://www.okx.com/p2p-markets','Adaptador definido, pendiente de credenciales.'),
 ('hodlhodl','Hodl Hodl','requires_credentials',true,'https://hodlhodl.com','API pública documentada, pendiente de habilitar.'),
 ('peach','Peach Bitcoin','unavailable',true,'https://peachbitcoin.com','Sin API pública estable.'),
 ('demo','Fuente de demostración','available',false,null,'Datos sintéticos etiquetados como DEMO.');

-- ========== ASSET PRICES (reference) ==========
CREATE TABLE public.asset_prices (
  asset TEXT NOT NULL,
  fiat TEXT NOT NULL,
  price NUMERIC(20,8) NOT NULL,
  source TEXT NOT NULL DEFAULT 'demo',
  is_real BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset, fiat)
);
GRANT SELECT ON public.asset_prices TO anon, authenticated;
GRANT ALL ON public.asset_prices TO service_role;
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices public read" ON public.asset_prices FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.asset_prices (asset, fiat, price, source, is_real) VALUES
 ('BTC','EUR',97900,'seed',false),
 ('ETH','EUR',3100,'seed',false),
 ('USDT','EUR',0.92,'seed',false),
 ('USDC','EUR',0.92,'seed',false);

-- ========== OPPORTUNITIES ==========
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  asset TEXT NOT NULL,
  fiat TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  price NUMERIC(20,8) NOT NULL,
  reference_price NUMERIC(20,8),
  spread NUMERIC(20,8),
  spread_pct NUMERIC(10,4),
  amount_min NUMERIC(20,2),
  amount_max NUMERIC(20,2),
  payment_method TEXT,
  location TEXT,
  counterparty TEXT,
  source_url TEXT,
  data_mode TEXT NOT NULL CHECK (data_mode IN ('real','demo')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_opportunities_user ON public.opportunities(user_id, captured_at DESC);
CREATE INDEX idx_opportunities_search ON public.opportunities(search_id);
GRANT SELECT ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own opportunities read" ON public.opportunities FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== PAPER WALLET ==========
CREATE TABLE public.paper_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_capital NUMERIC(20,2) NOT NULL DEFAULT 20,
  cash NUMERIC(20,8) NOT NULL DEFAULT 20,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  peak_equity NUMERIC(20,8) NOT NULL DEFAULT 20,
  max_drawdown NUMERIC(20,8) NOT NULL DEFAULT 0,
  fiat TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paper_wallets TO authenticated;
GRANT ALL ON public.paper_wallets TO service_role;
ALTER TABLE public.paper_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet read" ON public.paper_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.paper_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  quantity NUMERIC(30,12) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(20,8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, asset)
);
GRANT SELECT ON public.paper_positions TO authenticated;
GRANT ALL ON public.paper_positions TO service_role;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own positions read" ON public.paper_positions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  quantity NUMERIC(30,12) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20,8) NOT NULL CHECK (price > 0),
  total NUMERIC(20,8) NOT NULL,
  fees NUMERIC(20,8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20,8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_paper_trades_user ON public.paper_trades(user_id, created_at DESC);
GRANT SELECT ON public.paper_trades TO authenticated;
GRANT ALL ON public.paper_trades TO service_role;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades read" ON public.paper_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== AUDIT LOG ==========
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit read" ON public.audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION public.plan_daily_limit(_plan TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan WHEN 'free' THEN 5 WHEN 'monthly' THEN 50 WHEN 'yearly' THEN -1 ELSE 5 END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email,'usuario'),'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.paper_wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.log_action(_action TEXT, _metadata JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.audit_log (user_id, action, metadata) VALUES (auth.uid(), _action, COALESCE(_metadata,'{}'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_action(TEXT, JSONB) TO authenticated;

-- Quota: consume one search atomically
CREATE OR REPLACE FUNCTION public.consume_search()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_plan TEXT;
  v_limit INT;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_used INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT plan INTO v_plan FROM public.profiles WHERE id = uid;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  v_limit := public.plan_daily_limit(v_plan);

  INSERT INTO public.search_usage (user_id, usage_date, searches)
  VALUES (uid, v_today, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT searches INTO v_used FROM public.search_usage
  WHERE user_id = uid AND usage_date = v_today FOR UPDATE;

  IF v_limit >= 0 AND v_used >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'plan', v_plan, 'limit', v_limit, 'used', v_used, 'remaining', 0);
  END IF;

  UPDATE public.search_usage SET searches = searches + 1, updated_at = now()
  WHERE user_id = uid AND usage_date = v_today
  RETURNING searches INTO v_used;

  INSERT INTO public.audit_log (user_id, action, metadata) VALUES (uid, 'search', jsonb_build_object('used', v_used));

  RETURN jsonb_build_object('allowed', true, 'plan', v_plan, 'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit < 0 THEN -1 ELSE v_limit - v_used END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_search() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quota()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_plan TEXT;
  v_limit INT;
  v_used INT := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT plan INTO v_plan FROM public.profiles WHERE id = uid;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  v_limit := public.plan_daily_limit(v_plan);
  SELECT COALESCE(searches,0) INTO v_used FROM public.search_usage
  WHERE user_id = uid AND usage_date = (now() AT TIME ZONE 'utc')::date;
  v_used := COALESCE(v_used, 0);
  RETURN jsonb_build_object('plan', v_plan, 'limit', v_limit, 'used', v_used,
    'remaining', CASE WHEN v_limit < 0 THEN -1 ELSE GREATEST(v_limit - v_used, 0) END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_quota() TO authenticated;

-- Paper trading: buy
CREATE OR REPLACE FUNCTION public.paper_buy(_asset TEXT, _price NUMERIC, _quantity NUMERIC, _fees NUMERIC DEFAULT 0, _opportunity_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_cost NUMERIC;
  v_cash NUMERIC;
  v_qty NUMERIC;
  v_avg NUMERIC;
  v_trade UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _price IS NULL OR _price <= 0 OR _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF _opportunity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = _opportunity_id AND o.user_id = uid) THEN
    RAISE EXCEPTION 'invalid_opportunity';
  END IF;
  _fees := COALESCE(_fees, 0);
  IF _fees < 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  v_cost := _price * _quantity + _fees;

  SELECT cash INTO v_cash FROM public.paper_wallets WHERE user_id = uid FOR UPDATE;
  IF v_cash IS NULL THEN
    INSERT INTO public.paper_wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
    SELECT cash INTO v_cash FROM public.paper_wallets WHERE user_id = uid FOR UPDATE;
  END IF;
  IF v_cost > v_cash + 0.00000001 THEN RAISE EXCEPTION 'insufficient_cash'; END IF;

  UPDATE public.paper_wallets SET cash = cash - v_cost, updated_at = now() WHERE user_id = uid;

  SELECT quantity, avg_cost INTO v_qty, v_avg FROM public.paper_positions WHERE user_id = uid AND asset = _asset FOR UPDATE;
  IF v_qty IS NULL THEN
    INSERT INTO public.paper_positions (user_id, asset, quantity, avg_cost)
    VALUES (uid, _asset, _quantity, v_cost / _quantity);
  ELSE
    UPDATE public.paper_positions
      SET quantity = v_qty + _quantity,
          avg_cost = ((v_qty * v_avg) + v_cost) / (v_qty + _quantity),
          updated_at = now()
      WHERE user_id = uid AND asset = _asset;
  END IF;

  INSERT INTO public.paper_trades (user_id, asset, side, quantity, price, total, fees, status, opportunity_id)
  VALUES (uid, _asset, 'buy', _quantity, _price, _price * _quantity, _fees, 'open', _opportunity_id)
  RETURNING id INTO v_trade;

  INSERT INTO public.audit_log (user_id, action, metadata)
  VALUES (uid, 'paper_buy', jsonb_build_object('asset', _asset, 'quantity', _quantity, 'price', _price));

  RETURN jsonb_build_object('trade_id', v_trade, 'cost', v_cost);
END;
$$;
GRANT EXECUTE ON FUNCTION public.paper_buy(TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;

-- Paper trading: sell
CREATE OR REPLACE FUNCTION public.paper_sell(_asset TEXT, _price NUMERIC, _quantity NUMERIC, _fees NUMERIC DEFAULT 0, _opportunity_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_qty NUMERIC;
  v_avg NUMERIC;
  v_proceeds NUMERIC;
  v_pnl NUMERIC;
  v_trade UUID;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _price IS NULL OR _price <= 0 OR _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  _fees := COALESCE(_fees, 0);
  IF _fees < 0 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF _opportunity_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = _opportunity_id AND o.user_id = uid) THEN
    RAISE EXCEPTION 'invalid_opportunity';
  END IF;

  SELECT quantity, avg_cost INTO v_qty, v_avg FROM public.paper_positions WHERE user_id = uid AND asset = _asset FOR UPDATE;
  IF v_qty IS NULL OR _quantity > v_qty + 0.000000000001 THEN RAISE EXCEPTION 'insufficient_position'; END IF;

  v_proceeds := _price * _quantity - _fees;
  v_pnl := v_proceeds - (v_avg * _quantity);

  UPDATE public.paper_wallets
    SET cash = cash + v_proceeds, realized_pnl = realized_pnl + v_pnl, updated_at = now()
    WHERE user_id = uid;

  IF v_qty - _quantity <= 0.000000000001 THEN
    DELETE FROM public.paper_positions WHERE user_id = uid AND asset = _asset;
    UPDATE public.paper_trades SET status = 'closed' WHERE user_id = uid AND asset = _asset AND status = 'open';
  ELSE
    UPDATE public.paper_positions SET quantity = v_qty - _quantity, updated_at = now()
      WHERE user_id = uid AND asset = _asset;
  END IF;

  INSERT INTO public.paper_trades (user_id, asset, side, quantity, price, total, fees, realized_pnl, status, opportunity_id)
  VALUES (uid, _asset, 'sell', _quantity, _price, _price * _quantity, _fees, v_pnl, 'closed', _opportunity_id)
  RETURNING id INTO v_trade;

  INSERT INTO public.audit_log (user_id, action, metadata)
  VALUES (uid, 'paper_sell', jsonb_build_object('asset', _asset, 'quantity', _quantity, 'price', _price, 'pnl', v_pnl));

  RETURN jsonb_build_object('trade_id', v_trade, 'realized_pnl', v_pnl, 'proceeds', v_proceeds);
END;
$$;
GRANT EXECUTE ON FUNCTION public.paper_sell(TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;

-- Equity snapshot + drawdown tracking
CREATE OR REPLACE FUNCTION public.refresh_equity()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  v_cash NUMERIC;
  v_initial NUMERIC;
  v_realized NUMERIC;
  v_market NUMERIC := 0;
  v_cost NUMERIC := 0;
  v_equity NUMERIC;
  v_peak NUMERIC;
  v_dd NUMERIC;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.paper_wallets (user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT cash, initial_capital, realized_pnl, peak_equity, max_drawdown
    INTO v_cash, v_initial, v_realized, v_peak, v_dd
    FROM public.paper_wallets WHERE user_id = uid FOR UPDATE;

  SELECT COALESCE(SUM(p.quantity * COALESCE(ap.price, p.avg_cost)), 0),
         COALESCE(SUM(p.quantity * p.avg_cost), 0)
    INTO v_market, v_cost
    FROM public.paper_positions p
    LEFT JOIN public.asset_prices ap ON ap.asset = p.asset AND ap.fiat = 'EUR'
    WHERE p.user_id = uid;

  v_equity := v_cash + v_market;
  IF v_equity > v_peak THEN v_peak := v_equity; END IF;
  IF v_peak > 0 AND (v_peak - v_equity) > v_dd THEN v_dd := v_peak - v_equity; END IF;

  UPDATE public.paper_wallets SET peak_equity = v_peak, max_drawdown = v_dd, updated_at = now() WHERE user_id = uid;

  RETURN jsonb_build_object(
    'initial_capital', v_initial,
    'cash', v_cash,
    'invested_cost', v_cost,
    'positions_value', v_market,
    'equity', v_equity,
    'realized_pnl', v_realized,
    'unrealized_pnl', v_market - v_cost,
    'total_pnl', v_realized + (v_market - v_cost),
    'roi_pct', CASE WHEN v_initial > 0 THEN ((v_equity - v_initial) / v_initial) * 100 ELSE 0 END,
    'peak_equity', v_peak,
    'max_drawdown', v_dd,
    'max_drawdown_pct', CASE WHEN v_peak > 0 THEN (v_dd / v_peak) * 100 ELSE 0 END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_equity() TO authenticated;

-- Plan change (simulated payment)
CREATE OR REPLACE FUNCTION public.change_plan(_plan TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _plan NOT IN ('free','monthly','yearly') THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  UPDATE public.profiles SET plan = _plan, plan_started_at = now(), updated_at = now() WHERE id = uid;
  INSERT INTO public.audit_log (user_id, action, metadata) VALUES (uid, 'plan_change', jsonb_build_object('plan', _plan, 'payment', 'simulated'));
  RETURN public.get_quota();
END;
$$;
GRANT EXECUTE ON FUNCTION public.change_plan(TEXT) TO authenticated;

-- Account deletion
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
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
