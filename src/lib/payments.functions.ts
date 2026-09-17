import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const envSchema = z.enum(["sandbox", "live"]);

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ priceId: z.string().min(1).max(80), environment: envSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = (await response.json()) as { data?: { id: string }[] };
    if (!result.data?.length) throw new Error("El precio no está disponible.");
    return result.data[0]!.id;
  });

export interface SubscriptionDTO {
  status: string;
  price_id: string;
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
      .select("status, price_id, current_period_end, cancel_at_period_end, environment")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as SubscriptionDTO | null) ?? null;
  });

const ALLOWED_PRICE_IDS = new Set(["p2plab_premium_monthly", "p2plab_premium_yearly"]);

const SUBSCRIPTION_COLUMNS =
  "paddle_subscription_id, status, current_period_end, cancel_at_period_end";

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

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(data.environment);
    await paddle.subscriptions.cancel(row.paddle_subscription_id, {
      effectiveFrom: "next_billing_period",
    });

    await context.supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("paddle_subscription_id", row.paddle_subscription_id);

    return { ok: true, current_period_end: row.current_period_end as string | null };
  });

/**
 * Cambia entre Mensual y Anual: se programa para la siguiente renovación,
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

    const { gatewayFetch, getPaddleClient } = await import("@/lib/paddle.server");
    const priceRes = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const priceJson = (await priceRes.json()) as { data?: { id: string }[] };
    const paddlePriceId = priceJson.data?.[0]?.id;
    if (!paddlePriceId) throw new Error("El precio no está disponible.");

    const paddle = getPaddleClient(data.environment);
    await paddle.subscriptions.update(row.paddle_subscription_id, {
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      prorationBillingMode: "full_next_billing_period",
    });

    return { ok: true };
  });

/** Enlace al portal del proveedor para cancelar o cambiar el método de pago. */
export const getBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ environment: envSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("No tienes ninguna suscripción activa.");

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(row.paddle_customer_id, [
      row.paddle_subscription_id,
    ]);
    return { url: session.urls.general.overview };
  });
