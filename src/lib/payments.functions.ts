import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv } from "@/lib/stripe.server";

const envSchema = z.enum(["sandbox", "live"]);

const ALLOWED_PRICE_IDS = new Set(["p2plab_premium_monthly", "p2plab_premium_yearly"]);

const SUBSCRIPTION_COLUMNS =
  "stripe_subscription_id, status, price_id, pending_price_id, current_period_end, cancel_at_period_end";

async function loadStripe(environment: StripeEnv) {
  const { createStripeClient, getStripeErrorMessage, usesManagedPayments } = await import(
    "@/lib/stripe.server"
  );
  return {
    stripe: createStripeClient(environment),
    getStripeErrorMessage,
    managed: usesManagedPayments(environment),
  };
}

async function resolveOrCreateCustomer(
  stripe: Stripe,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: { userId: options.userId },
  });
  return created.id;
}

async function resolveStripePriceId(stripe: Stripe, priceId: string): Promise<string> {
  const prices = await stripe.prices.list({ lookup_keys: [priceId] });
  const price = prices.data[0];
  if (!price) throw new Error("El plan seleccionado no está disponible.");
  return price.id;
}

type CheckoutSessionResult = { clientSecret: string } | { error: string };

/** Crea la sesión de pago embebida para suscribirse a un plan. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        priceId: z.string().min(1).max(80),
        environment: envSchema,
        returnUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    if (!ALLOWED_PRICE_IDS.has(data.priceId)) return { error: "Plan no válido." };
    const { stripe, getStripeErrorMessage } = await loadStripe(data.environment);
    try {
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const stripePriceId = await resolveStripePriceId(stripe, data.priceId);
      const customerId = await resolveOrCreateCustomer(stripe, {
        userId: context.userId,
        ...(user?.email ? { email: user.email } : {}),
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePriceId, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId: context.userId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId } },
        managed_payments: { enabled: true },
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export interface SubscriptionDTO {
  status: string;
  price_id: string;
  pending_price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export const getSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ environment: envSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select(
        "status, price_id, pending_price_id, current_period_end, cancel_at_period_end, environment",
      )
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as SubscriptionDTO | null) ?? null;
  });

/**
 * Cancela la suscripción: se programa al final del periodo ya pagado,
 * así el usuario mantiene su plan hasta la fecha de renovación.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ environment: envSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No tienes ninguna suscripción activa.");
    if (row.status === "canceled") throw new Error("Esta suscripción ya está cancelada.");

    const { stripe, getStripeErrorMessage } = await loadStripe(data.environment);
    try {
      await stripe.subscriptions.update(row.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }

    await context.supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", row.stripe_subscription_id);

    return { ok: true, current_period_end: row.current_period_end as string | null };
  });

/**
 * Cambia entre Mensual y Anual: se aplica en la siguiente renovación,
 * sin cargos ni reembolsos parciales en el periodo actual.
 */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ environment: envSchema, priceId: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!ALLOWED_PRICE_IDS.has(data.priceId)) throw new Error("Plan no válido.");
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.status === "canceled") {
      throw new Error("No tienes ninguna suscripción activa que cambiar.");
    }
    if (row.cancel_at_period_end) {
      throw new Error("Tu suscripción está cancelada; no se puede cambiar de plan.");
    }
    if ((row.pending_price_id ?? row.price_id) === data.priceId) {
      throw new Error("Ya tienes ese plan programado.");
    }

    const { stripe, getStripeErrorMessage } = await loadStripe(data.environment);
    try {
      const stripePriceId = await resolveStripePriceId(stripe, data.priceId);
      const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) throw new Error("No tienes ninguna suscripción activa que cambiar.");

      await stripe.subscriptions.update(row.stripe_subscription_id, {
        items: [{ id: itemId, price: stripePriceId }],
        proration_behavior: "none",
        billing_cycle_anchor: "unchanged",
      });
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }

    return { ok: true };
  });

/** Enlace al portal de facturación para gestionar el método de pago o las facturas. */
export const getBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ environment: envSchema, returnUrl: z.string().url().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.stripe_customer_id) throw new Error("No tienes ninguna suscripción activa.");

    const { stripe, getStripeErrorMessage } = await loadStripe(data.environment);
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: row.stripe_customer_id,
        ...(data.returnUrl ? { return_url: data.returnUrl } : {}),
      });
      return { url: portal.url };
    } catch (error) {
      throw new Error(getStripeErrorMessage(error));
    }
  });
