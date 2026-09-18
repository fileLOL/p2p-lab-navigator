ALTER TABLE public.paper_wallets ALTER COLUMN initial_capital SET DEFAULT 25000;
ALTER TABLE public.paper_wallets ALTER COLUMN cash SET DEFAULT 25000;
ALTER TABLE public.paper_wallets ALTER COLUMN peak_equity SET DEFAULT 25000;

UPDATE public.paper_wallets
SET cash = cash + 24980,
    initial_capital = 25000,
    peak_equity = GREATEST(peak_equity + 24980, 25000),
    updated_at = now()
WHERE initial_capital = 20;