import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PayPalEnv = "sandbox" | "live";

const API_BASE: Record<PayPalEnv, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

/** Catálogo de planes: el mismo identificador legible que usa la app. */
export const PAYPAL_PRICES = {
  p2plab_premium_monthly: {
    name: "P2P Lab Premium Mensual",
    interval: "MONTH" as const,
    value: "5.00",
  },
  p2plab_premium_yearly: {
    name: "P2P Lab Premium Anual",
    interval: "YEAR" as const,
    value: "50.00",
  },
};

export type PriceId = keyof typeof PAYPAL_PRICES;

export function isKnownPrice(priceId: string): priceId is PriceId {
  return Object.prototype.hasOwnProperty.call(PAYPAL_PRICES, priceId);
}

function credentials(env: PayPalEnv): { clientId: string; secret: string } {
  const clientId =
    env === "sandbox" ? process.env["PAYPAL_SANDBOX_CLIENT_ID"] : process.env["PAYPAL_CLIENT_ID"];
  const secret =
    env === "sandbox"
      ? process.env["PAYPAL_SANDBOX_CLIENT_SECRET"]
      : process.env["PAYPAL_CLIENT_SECRET"];
  if (!clientId || !secret) {
    throw new Error("Los pagos todavía no están configurados para este entorno.");
  }
  return { clientId, secret };
}

const tokenCache: Partial<Record<PayPalEnv, { token: string; expiresAt: number }>> = {};

async function getAccessToken(env: PayPalEnv): Promise<string> {
  const cached = tokenCache[env];
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const { clientId, secret } = credentials(env);
  const res = await fetch(`${API_BASE[env]}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error("No se ha podido conectar con el proveedor de pagos.");
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache[env] = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function paypalFetch<T>(
  env: PayPalEnv,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> {
  const token = await getAccessToken(env);
  const res = await fetch(`${API_BASE[env]}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("PayPal error", res.status, path, text.slice(0, 500));
    throw new Error(readPayPalError(text));
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function readPayPalError(text: string): string {
  try {
    const json = JSON.parse(text) as {
      message?: string;
      details?: { description?: string }[];
    };
    return (
      json.details?.[0]?.description ??
      json.message ??
      "No se ha podido completar la operación de pago."
    );
  } catch {
    return "No se ha podido completar la operación de pago.";
  }
}

interface PayPalLink {
  rel: string;
  href: string;
  method?: string;
}

/** Crea (una sola vez) el producto y el plan de suscripción en PayPal. */
export async function ensurePlan(env: PayPalEnv, priceId: PriceId): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("paypal_plans")
    .select("paypal_plan_id")
    .eq("price_id", priceId)
    .eq("environment", env)
    .maybeSingle();
  if (existing?.paypal_plan_id) return existing.paypal_plan_id;

  const definition = PAYPAL_PRICES[priceId];

  const product = await paypalFetch<{ id: string }>(env, "/v1/catalogs/products", {
    method: "POST",
    body: {
      name: "P2P Lab Premium",
      description: "Acceso Premium a las búsquedas de oportunidades de P2P Lab.",
      type: "SERVICE",
      category: "SOFTWARE",
    },
  });

  const plan = await paypalFetch<{ id: string }>(env, "/v1/billing/plans", {
    method: "POST",
    body: {
      product_id: product.id,
      name: definition.name,
      description: definition.name,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: definition.interval, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: definition.value, currency_code: "EUR" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    },
  });

  await supabaseAdmin.from("paypal_plans").insert({
    price_id: priceId,
    environment: env,
    paypal_product_id: product.id,
    paypal_plan_id: plan.id,
  });

  return plan.id;
}

async function priceIdForPlan(env: PayPalEnv, planId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("paypal_plans")
    .select("price_id")
    .eq("environment", env)
    .eq("paypal_plan_id", planId)
    .maybeSingle();
  return data?.price_id ?? null;
}

export interface PayPalSubscription {
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  subscriber?: { payer_id?: string; email_address?: string };
  billing_info?: {
    last_payment?: { time?: string };
    next_billing_time?: string;
    final_payment_time?: string;
  };
  links?: PayPalLink[];
}

export async function getRemoteSubscription(
  env: PayPalEnv,
  subscriptionId: string,
): Promise<PayPalSubscription> {
  return paypalFetch<PayPalSubscription>(env, `/v1/billing/subscriptions/${subscriptionId}`);
}

export function approveUrlFrom(links: PayPalLink[] | undefined): string | null {
  return links?.find((l) => l.rel === "approve")?.href ?? null;
}

/** Traduce el estado de PayPal al que usa la app. */
function mapStatus(
  remoteStatus: string,
  cancelAtPeriodEnd: boolean,
  periodEnd: string | null,
): string {
  switch (remoteStatus) {
    case "ACTIVE":
      return "active";
    case "SUSPENDED":
      return "past_due";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "incomplete";
    case "CANCELLED":
    case "EXPIRED":
      // Cancelada pero con periodo pagado por delante: se mantiene el acceso.
      if (cancelAtPeriodEnd && periodEnd && new Date(periodEnd).getTime() > Date.now()) {
        return "canceling";
      }
      return "canceled";
    default:
      return remoteStatus.toLowerCase();
  }
}

/**
 * Lee el estado autoritativo en PayPal y lo guarda en la base de datos.
 * Se usa tanto desde el aviso automático como al volver del pago.
 */
export async function syncSubscription(
  env: PayPalEnv,
  subscriptionId: string,
  eventAt?: string,
): Promise<{ ok: boolean }> {
  const remote = await getRemoteSubscription(env, subscriptionId);

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select(
      "id, user_id, price_id, pending_price_id, current_period_start, current_period_end, cancel_at_period_end, last_event_at",
    )
    .eq("provider_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();

  // Descartar avisos más antiguos que el último ya aplicado.
  if (eventAt && existing?.last_event_at && new Date(eventAt) < new Date(existing.last_event_at)) {
    return { ok: true };
  }

  const userId = remote.custom_id ?? existing?.user_id;
  if (!userId) {
    console.error("Suscripción de PayPal sin usuario asociado:", subscriptionId);
    return { ok: false };
  }

  const remotePriceId = (await priceIdForPlan(env, remote.plan_id)) ?? existing?.price_id ?? null;
  if (!remotePriceId) {
    console.error("No se reconoce el plan de PayPal:", remote.plan_id);
    return { ok: false };
  }

  const periodStart = remote.billing_info?.last_payment?.time ?? null;
  const periodEnd =
    remote.billing_info?.next_billing_time ??
    remote.billing_info?.final_payment_time ??
    existing?.current_period_end ??
    null;

  const samePeriod =
    Boolean(existing?.current_period_start) &&
    Boolean(periodStart) &&
    new Date(existing?.current_period_start as string).getTime() ===
      new Date(periodStart as string).getTime();

  // Un cambio de plan aprobado no debe dar las ventajas del nuevo plan
  // hasta que se cobre: queda pendiente hasta la renovación.
  const scheduledChange = Boolean(existing) && samePeriod && remotePriceId !== existing?.price_id;

  const cancelAtPeriodEnd =
    existing?.cancel_at_period_end ??
    (remote.status === "CANCELLED" || remote.status === "EXPIRED");

  const status = mapStatus(remote.status, Boolean(cancelAtPeriodEnd), periodEnd);
  const now = new Date().toISOString();

  if (existing) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status,
        current_period_start: periodStart ?? existing.current_period_start,
        current_period_end: periodEnd,
        ...(scheduledChange
          ? { pending_price_id: remotePriceId }
          : { price_id: remotePriceId, pending_price_id: null }),
        last_event_at: eventAt ?? now,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      provider: "paypal",
      provider_subscription_id: subscriptionId,
      provider_customer_id: remote.subscriber?.payer_id ?? "",
      product_id: "p2plab_premium",
      price_id: remotePriceId,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      environment: env,
      last_event_at: eventAt ?? now,
      updated_at: now,
    });
  }

  return { ok: true };
}
