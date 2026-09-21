export type PaymentsEnv = "sandbox" | "live";

const configured = (import.meta.env["VITE_PAYMENTS_ENV"] as string | undefined)?.trim();

/** Entorno de cobro: pruebas en la vista previa, real en el sitio publicado. */
export function getPaymentsEnvironment(): PaymentsEnv {
  return configured === "live" ? "live" : "sandbox";
}

/**
 * Entorno usado para decidir el plan y la cuota del usuario.
 * Una compra de pruebas nunca da ventajas en el sitio publicado.
 */
export function entitlementEnvironment(): PaymentsEnv {
  return getPaymentsEnvironment();
}

export function isTestMode(): boolean {
  return getPaymentsEnvironment() === "sandbox";
}
