/**
 * Interfaz común de las fuentes P2P.
 * Cualquier proveedor (Binance P2P, Bybit, OKX, Hodl Hodl, Peach...) debe
 * implementar `P2PSource` para integrarse sin tocar el núcleo del sistema.
 */

export type Side = "buy" | "sell";
export type DataMode = "real" | "demo";

export interface RawOffer {
  provider: string;
  providerName: string;
  asset: string;
  fiat: string;
  side: Side;
  price: number;
  amountMin: number | null;
  amountMax: number | null;
  paymentMethod: string | null;
  location: string | null;
  counterparty: string | null;
  sourceUrl: string | null;
  timestamp: string;
  dataMode: DataMode;
}

export interface SearchParams {
  asset: string;
  fiat: string;
  side: Side;
  amount?: number | null;
  paymentMethod?: string | null;
  location?: string | null;
  limit: number;
}

export type SourceStatus = "available" | "unavailable" | "requires_credentials";

export interface SourceResult {
  offers: RawOffer[];
  status: SourceStatus;
  message?: string;
}

export interface P2PSource {
  key: string;
  name: string;
  isReal: boolean;
  website?: string;
  /** Devuelve ofertas normalizadas o el motivo por el que no están disponibles. */
  fetchOffers(params: SearchParams): Promise<SourceResult>;
}

export interface NormalizedOpportunity extends RawOffer {
  referencePrice: number | null;
  spread: number | null;
  spreadPct: number | null;
  score: number;
}
