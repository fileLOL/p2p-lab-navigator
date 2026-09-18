import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { createStripeClient, verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

// Stripe (managed payments) webhook receiver — handles customer.subscription.* events.

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

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function readItem(subscription: any) {
  const item = subscription.items?.data?.[0];
  return {
    priceId: item?.price?.lookup_key ?? item?.price?.metadata?.lovable_external_id ?? null,
    productId: typeof item?.price?.product === "string" ? item.price.product : null,
    periodStart: item?.current_period_start ?? subscription.current_period_start,
    periodEnd: item?.current_period_end ?? subscription.current_period_end,
  };
}

/** Devuelve true si el evento ya se procesó antes (reintento del proveedor). */
async function alreadyProcessed(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("payment_events")
    .insert({ event_id: eventId, event_type: eventType });
  if (!error) return false;
  if (error.code === "23505") return true;
  console.error("No se pudo registrar el evento de pago:", error.message);
  return false;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv, eventAt?: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Webhook: falta userId en metadata de la suscripción");
    return;
  }
  const { priceId, productId, periodStart, periodEnd } = readItem(subscription);
  if (!priceId) {
    console.warn("Webhook: falta lookup_key del precio", { subscriptionId: subscription.id });
    return;
  }

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: productId ?? "",
        price_id: priceId,
        status: subscription.status,
        current_period_start: isoFromUnix(periodStart),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        pending_price_id: null,
        last_event_at: eventAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv, eventAt?: string) {
  const { priceId, productId, periodStart, periodEnd } = readItem(subscription);

  const { data: existing } = await getSupabase()
    .from("subscriptions")
    .select("price_id, current_period_start, last_event_at")
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .maybeSingle();

  if (!existing) {
    // Llegó antes el "actualizado" que el "creado": registramos la suscripción entera.
    await handleSubscriptionCreated(subscription, env, eventAt);
    return;
  }

  // Descartar avisos más antiguos que el último ya aplicado.
  if (eventAt && existing.last_event_at && new Date(eventAt) < new Date(existing.last_event_at)) {
    return;
  }

  const newStart = isoFromUnix(periodStart);
  const samePeriod =
    Boolean(existing.current_period_start) &&
    Boolean(newStart) &&
    new Date(existing.current_period_start as string).getTime() ===
      new Date(newStart as string).getTime();
  // Un cambio de plan programado no debe dar las ventajas del nuevo plan
  // hasta que se cobre: se guarda como pendiente hasta la renovación.
  const scheduledChange = Boolean(priceId) && samePeriod && priceId !== existing.price_id;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: newStart,
      current_period_end: isoFromUnix(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      ...(scheduledChange
        ? { pending_price_id: priceId }
        : priceId
          ? { price_id: priceId, pending_price_id: null }
          : {}),
      ...(productId && !scheduledChange ? { product_id: productId } : {}),
      last_event_at: eventAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv, eventAt?: string) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      last_event_at: eventAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

/**
 * Respaldo: si customer.subscription.created se perdió, el evento de sesión
 * completada recupera la suscripción desde Stripe y la registra igualmente.
 */
async function handleCheckoutSessionCompleted(session: any, env: StripeEnv, eventAt: string) {
  if (session.mode !== "subscription" || !session.subscription) return;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  await handleSubscriptionCreated(subscription, env, eventAt);
}

/** El cobro de una renovación falló: Stripe reintenta y el estado pasa a past_due. */
async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv, eventAt: string) {
  const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
  await handleSubscriptionUpdated(subscription, env, eventAt);
}

/* eslint-enable @typescript-eslint/no-explicit-any */

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const eventAt = new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();

  if (await alreadyProcessed(event.id, event.type)) {
    console.log("Evento ya procesado, se ignora:", event.id);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutSessionCompleted(event.data.object, env, eventAt);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env, eventAt);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env, eventAt);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env, eventAt);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object, env, eventAt);
      break;
    default:
      console.log("Evento no gestionado:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook con parámetro env inválido:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Error en webhook de pagos:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
