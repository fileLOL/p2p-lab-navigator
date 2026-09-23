CREATE TABLE public.real_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset text NOT NULL,
  fiat text NOT NULL DEFAULT 'EUR',
  side text NOT NULL CHECK (side IN ('buy','sell')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price > 0),
  total numeric NOT NULL,
  fees numeric NOT NULL DEFAULT 0,
  provider text,
  counterparty text,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX real_trades_user_idx ON public.real_trades(user_id, executed_at DESC);
GRANT SELECT, DELETE ON public.real_trades TO authenticated;
GRANT ALL ON public.real_trades TO service_role;
ALTER TABLE public.real_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own real trades" ON public.real_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own real trades" ON public.real_trades FOR DELETE TO authenticated USING (auth.uid() = user_id);