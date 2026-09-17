const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
};

export interface ReferencePrice {
  price: number | null;
  isReal: boolean;
  source: string;
}

/** Precio de referencia de mercado. Devuelve null si no hay dato fiable. */
export async function fetchReferencePrice(asset: string, fiat: string): Promise<ReferencePrice> {
  const id = COINGECKO_IDS[asset];
  if (!id) return { price: null, isReal: false, source: "unknown" };
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=${fiat.toLowerCase()}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return { price: null, isReal: false, source: "coingecko_error" };
    const json = (await res.json()) as Record<string, Record<string, number>>;
    const price = json[id]?.[fiat.toLowerCase()];
    if (typeof price !== "number" || price <= 0)
      return { price: null, isReal: false, source: "coingecko_empty" };
    return { price, isReal: true, source: "coingecko" };
  } catch {
    return { price: null, isReal: false, source: "coingecko_unavailable" };
  }
}
