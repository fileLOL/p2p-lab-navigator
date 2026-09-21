import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import { syncSubscription, type PayPalEnv } from "@/lib/paypal.server";

// Receptor de avisos de PayPal. No confiamos en el contenido del aviso:
// solo lo usamos como disparador y releemos el estado real en PayPal.

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

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource?: {
    id?: string;
    billing_agreement_id?: string;
    [key: string]: unknown;
  };
}

/** Identificador de la suscripción según el tipo de evento. */
function subscriptionIdFrom(event: PayPalWebhookEvent): string | null {
  const type = event.event_type ?? "";
  if (type.startsWith("BILLING.SUBSCRIPTION.")) return event.resource?.id ?? null;
  if (type.startsWith("PAYMENT.SALE.")) return event.resource?.billing_agreement_id ?? null;
  return null;
}

const HANDLED = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.DENIED",
]);

async function handleWebhook(req: Request, env: PayPalEnv) {
  const event = (await req.json()) as PayPalWebhookEvent;
  const eventType = event.event_type ?? "";

  if (!HANDLED.has(eventType)) {
    console.log("Evento no gestionado:", eventType);
    return;
  }

  const eventId = event.id ?? `${eventType}-${Date.now()}`;
  if (await alreadyProcessed(eventId, eventType)) {
    console.log("Evento ya procesado, se ignora:", eventId);
    return;
  }

  const subscriptionId = subscriptionIdFrom(event);
  if (!subscriptionId) {
    console.warn("Aviso sin suscripción asociada:", eventType);
    return;
  }

  const eventAt = event.create_time ?? new Date().toISOString();
  await syncSubscription(env, subscriptionId, eventAt);
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
