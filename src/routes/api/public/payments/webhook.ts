import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { createStripeClient, verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return cachedClient;
}

/** Evita procesar dos veces el mismo aviso del proveedor. */
async function alreadyProcessed(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("payment_events")
    .insert({ event_id: eventId, event_type: eventType });
  if (!error) return false;
  if (error.code === "23505") return true;
  console.error("No se pudo registrar el evento de pago:", error.message);
  return false;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function readPriceId(item: any): string | null {
  return item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? null;
}

async function upsertSubscription(subscription: any, env: StripeEnv, eventAt: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Suscripción sin userId en metadata:", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = readPriceId(item);
  const productId =
    typeof item?.price?.product === "string" ? item.price.product : (item?.price?.product?.id ?? "");
  const periodStart = isoFromUnix(item?.current_period_start ?? subscription.current_period_start);
  const periodEnd = isoFromUnix(item?.current_period_end ?? subscription.current_period_end);

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_subscription_id: subscription.id,
      provider_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer?.id ?? ""),
      product_id: productId,
      price_id: priceId ?? "",
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      last_event_at: eventAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_subscription_id" },
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv, eventAt: string) {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, price_id, current_period_end, last_event_at")
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();

  if (!existing) {
    await upsertSubscription(subscription, env, eventAt);
    return;
  }

  // Descartar avisos que llegan desordenados.
  const previous = existing["last_event_at"] as string | null;
  if (previous && new Date(previous).getTime() > new Date(eventAt).getTime()) return;

  const item = subscription.items?.data?.[0];
  const remotePriceId = readPriceId(item);
  const periodStart = isoFromUnix(item?.current_period_start ?? subscription.current_period_start);
  const periodEnd = isoFromUnix(item?.current_period_end ?? subscription.current_period_end);

  // Un cambio de plan dentro del mismo periodo queda programado:
  // las ventajas llegan con el cobro de la renovación.
  const samePeriod =
    Boolean(periodEnd) && periodEnd === (existing["current_period_end"] as string | null);
  const scheduledChange =
    Boolean(remotePriceId) && remotePriceId !== existing["price_id"] && samePeriod;

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      ...(scheduledChange
        ? { pending_price_id: remotePriceId }
        : { price_id: remotePriceId ?? existing["price_id"], pending_price_id: null }),
      last_event_at: eventAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing["id"]);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv, eventAt: string) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", last_event_at: eventAt, updated_at: new Date().toISOString() })
    .eq("provider_subscription_id", subscription.id)
    .eq("environment", env);
}

/** Respaldo: si el aviso de la suscripción no llega, la recuperamos del proveedor. */
async function handleCheckoutCompleted(session: any, env: StripeEnv, eventAt: string) {
  if (session.payment_status === "unpaid") return;
  if (!session.subscription) return;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(subscription, env, eventAt);
}

async function handleInvoiceEvent(invoice: any, env: StripeEnv, eventAt: string) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription?.id ??
        invoice.parent?.subscription_details?.subscription ??
        invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription);
  if (!subscriptionId) return;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated(subscription, env, eventAt);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  if (event.id && (await alreadyProcessed(event.id, event.type))) return;

  const eventAt = event.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString();

  switch (event.type) {
    case "customer.subscription.created":
      await upsertSubscription(event.data.object, env, eventAt);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env, eventAt);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env, eventAt);
      break;
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object, env, eventAt);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoiceEvent(event.data.object, env, eventAt);
      break;
    default:
      break;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
