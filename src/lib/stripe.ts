import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Los pagos todavía no están configurados para este entorno. Completa la activación de pagos reales.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

export function isPaymentsConfigured(): boolean {
  return Boolean(clientToken);
}

/**
 * Entorno usado para decidir el plan y la cuota del usuario.
 * Nunca lanza: si no hay pagos configurados asume el entorno real,
 * de modo que una compra de pruebas jamás da ventajas en el sitio publicado.
 */
export function entitlementEnvironment(): StripeEnv {
  return clientToken?.startsWith("pk_test_") ? "sandbox" : "live";
}
