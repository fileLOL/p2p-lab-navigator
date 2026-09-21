import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const envSchema = z.enum(["sandbox", "live"]);

const ALLOWED_PRICE_IDS = new Set(["p2plab_premium_monthly", "p2plab_premium_yearly"]);

const SUBSCRIPTION_COLUMNS =
  "provider_subscription_id, status, price_id, pending_price_id, current_period_end, cancel_at_period_end";

type PayPalEnvironment = "sandbox" | "live";

async function loadPayPal() {
  return import("@/lib/paypal.server");
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No se ha podido completar la operación de pago.";
}

/** Crea la suscripción en el proveedor y devuelve el enlace de aprobación. */
export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        priceId: z.string().min(1).max(80),
        environment: envSchema,
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ approveUrl: string } | { error: string }> => {
    if (!ALLOWED_PRICE_IDS.has(data.priceId)) return { error: "Plan no válido." };
    const paypal = await loadPayPal();
    if (!paypal.isKnownPrice(data.priceId)) return { error: "Plan no válido." };

    try {
      const {
        data: { user },
      } = await context.supabase.auth.getUser();

      const planId = await paypal.ensurePlan(data.environment, data.priceId);
      const subscription = await paypal.paypalFetch<paypal.PayPalSubscription>(
        data.environment,
        "/v1/billing/subscriptions",
        {
          method: "POST",
          body: {
            plan_id: planId,
            custom_id: context.userId,
            ...(user?.email ? { subscriber: { email_address: user.email } } : {}),
            application_context: {
              brand_name: "P2P Lab",
              locale: "es-ES",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              return_url: data.returnUrl,
              cancel_url: data.cancelUrl,
            },
          },
        },
      );

      const approveUrl = paypal.approveUrlFrom(subscription.links);
      if (!approveUrl) return { error: "No se ha podido iniciar el pago." };
      return { approveUrl };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  });

/** Lee el estado real en el proveedor y lo guarda (usado al volver del pago). */
export const syncSubscriptionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ environment: envSchema, subscriptionId: z.string().min(1).max(80).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let subscriptionId = data.subscriptionId;
    if (!subscriptionId) {
      const { data: row } = await context.supabase
        .from("subscriptions")
        .select("provider_subscription_id")
        .eq("user_id", context.userId)
        .eq("environment", data.environment)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      subscriptionId = row?.provider_subscription_id;
    }
    if (!subscriptionId) return { ok: false as const };

    const paypal = await loadPayPal();
    try {
      const remote = await paypal.getRemoteSubscription(data.environment, subscriptionId);
      if (remote.custom_id && remote.custom_id !== context.userId) return { ok: false as const };
      await paypal.syncSubscription(data.environment, subscriptionId);
      return { ok: true as const };
    } catch (error) {
      console.error("No se pudo sincronizar la suscripción:", errorMessage(error));
      return { ok: false as const };
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
 * Cancela la suscripción: no se cobran más renovaciones, pero el usuario
 * mantiene su plan hasta el final del periodo ya pagado.
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
    if (row.status === "canceled" || row.cancel_at_period_end) {
      throw new Error("Esta suscripción ya está cancelada.");
    }

    const paypal = await loadPayPal();
    try {
      await paypal.paypalFetch(
        data.environment as PayPalEnvironment,
        `/v1/billing/subscriptions/${row.provider_subscription_id}/cancel`,
        { method: "POST", body: { reason: "Cancelada por el usuario desde P2P Lab" } },
      );
    } catch (error) {
      throw new Error(errorMessage(error));
    }

    const keepsAccess =
      row.current_period_end && new Date(row.current_period_end).getTime() > Date.now();

    await context.supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        status: keepsAccess ? "canceling" : "canceled",
        pending_price_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", row.provider_subscription_id);

    return { ok: true, current_period_end: row.current_period_end as string | null };
  });

/**
 * Cambia entre Mensual y Anual. El proveedor pide aprobar el cambio;
 * las ventajas del nuevo plan llegan con el cobro de la renovación.
 */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        environment: envSchema,
        priceId: z.string().min(1).max(80),
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
      .parse(input),
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

    const paypal = await loadPayPal();
    if (!paypal.isKnownPrice(data.priceId)) throw new Error("Plan no válido.");

    try {
      const planId = await paypal.ensurePlan(data.environment, data.priceId);
      const revised = await paypal.paypalFetch<{
        links?: { rel: string; href: string }[];
      }>(
        data.environment as PayPalEnvironment,
        `/v1/billing/subscriptions/${row.provider_subscription_id}/revise`,
        {
          method: "POST",
          body: {
            plan_id: planId,
            application_context: {
              brand_name: "P2P Lab",
              locale: "es-ES",
              return_url: data.returnUrl,
              cancel_url: data.cancelUrl,
            },
          },
        },
      );

      const approveUrl = paypal.approveUrlFrom(revised.links);
      if (approveUrl) return { ok: true as const, approveUrl };

      await paypal.syncSubscription(
        data.environment as PayPalEnvironment,
        row.provider_subscription_id,
      );
      return { ok: true as const, approveUrl: null };
    } catch (error) {
      throw new Error(errorMessage(error));
    }
  });

/** Gestión del método de pago y las facturas en la cuenta del proveedor. */
export const getBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ environment: envSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.provider_subscription_id) throw new Error("No tienes ninguna suscripción activa.");

    return {
      url:
        data.environment === "sandbox"
          ? "https://www.sandbox.paypal.com/myaccount/autopay/"
          : "https://www.paypal.com/myaccount/autopay/",
    };
  });
