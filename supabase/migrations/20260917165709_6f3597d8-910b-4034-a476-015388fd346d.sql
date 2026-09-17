DELETE FROM public.subscriptions;
ALTER TABLE public.subscriptions RENAME COLUMN paddle_subscription_id TO stripe_subscription_id;
ALTER TABLE public.subscriptions RENAME COLUMN paddle_customer_id TO stripe_customer_id;
ALTER INDEX IF EXISTS idx_subscriptions_paddle_id RENAME TO idx_subscriptions_stripe_id;