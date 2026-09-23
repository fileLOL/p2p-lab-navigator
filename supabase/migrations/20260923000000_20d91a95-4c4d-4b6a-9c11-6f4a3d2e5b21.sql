-- ========== REAL TRADES (registro de operaciones reales fuera de P2P Lab) ==========
CREATE TABLE public.real_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  fiat TEXT NOT NULL DEFAULT 'EUR',
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  quantity NUMERIC(30,12) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20,8) NOT NULL CHECK (price > 0),
  total NUMERIC(20,8) NOT NULL,
  fees NUMERIC(20,8) NOT NULL DEFAULT 0,
  provider TEXT,
  counterparty TEXT,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_real_trades_user ON public.real_trades(user_id, executed_at DESC);
GRANT SELECT ON public.real_trades TO authenticated;
GRANT ALL ON public.real_trades TO service_role;
ALTER TABLE public.real_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own real trades read" ON public.real_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.real_trades FROM PUBLIC, anon;

-- Account deletion also clears real trades
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  DELETE FROM public.paper_trades WHERE user_id = uid;
  DELETE FROM public.paper_positions WHERE user_id = uid;
  DELETE FROM public.paper_wallets WHERE user_id = uid;
  DELETE FROM public.real_trades WHERE user_id = uid;
  DELETE FROM public.opportunities WHERE user_id = uid;
  DELETE FROM public.search_usage WHERE user_id = uid;
  DELETE FROM public.audit_log WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM public.email_search_usage WHERE usage_date < (now() AT TIME ZONE 'utc')::date;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;