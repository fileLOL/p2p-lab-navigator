/**
 * Configuración central de P2P Lab.
 * Única fuente de verdad para planes, activos y textos legales.
 * El capital inicial vive en la base de datos (paper_wallets.initial_capital),
 * este valor solo se usa como referencia informativa en la landing.
 */

export const APP_NAME = "P2P Lab";

export const DEFAULT_FIAT = "EUR";

export type PlanId = "free" | "monthly" | "yearly";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: string;
  priceDetail: string;
  dailySearches: number; // -1 = ilimitadas
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: "0 €",
    priceDetail: "gratis para siempre",
    dailySearches: 5,
    features: [
      "5 búsquedas al día",
      "Hasta 10 oportunidades por búsqueda",
      "Paper trading ilimitado",
      "Cartera virtual e historial",
      "Estadísticas básicas",
    ],
  },
  monthly: {
    id: "monthly",
    name: "Premium Mensual",
    price: "5 €",
    priceDetail: "al mes",
    dailySearches: 50,
    features: [
      "50 búsquedas al día",
      "Hasta 10 oportunidades por búsqueda",
      "Paper trading ilimitado",
      "Estadísticas avanzadas",
    ],
  },
  yearly: {
    id: "yearly",
    name: "Premium Anual",
    price: "50 €",
    priceDetail: "al año",
    dailySearches: -1,
    features: [
      "Búsquedas ilimitadas",
      "Hasta 10 oportunidades por búsqueda",
      "Paper trading ilimitado",
      "Estadísticas avanzadas",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "monthly", "yearly"];

export const MAX_RESULTS_PER_SEARCH = 10;

export const ASSETS = ["BTC", "ETH", "USDT", "USDC"] as const;
export type Asset = (typeof ASSETS)[number];

export const FIATS = ["EUR", "USD"] as const;

export const PAYMENT_METHODS = [
  "Transferencia bancaria",
  "Bizum",
  "SEPA instantáneo",
  "Revolut",
  "Wise",
  "Efectivo",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SPREAD_DISCLAIMER =
  "El diferencial mostrado no es necesariamente el beneficio final. Las comisiones, liquidez, límites, tiempos y otros costes pueden modificar el resultado.";

export const SIMULATION_DISCLAIMER =
  "El paper trading utiliza capital virtual y no representa una inversión real.";

export const GENERAL_DISCLAIMER = [
  "P2P Lab es una herramienta de análisis y simulación.",
  "Los datos pueden cambiar en cualquier momento.",
  "Los diferenciales no garantizan beneficios.",
  "Las operaciones simuladas no representan rentabilidades futuras.",
  "Las operaciones reales se realizan fuera de P2P Lab, con el proveedor correspondiente.",
];
