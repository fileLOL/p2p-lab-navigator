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
  const coinGecko = await fetchCoinGeckoPrice(asset, fiat);
  if (coinGecko.price) return coinGecko;
  return fetchBinanceQuotePrice(asset, fiat);
}

async function fetchCoinGeckoPrice(asset: string, fiat: string): Promise<ReferencePrice> {
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

/** Respaldo: precio de referencia público de Binance P2P. */
async function fetchBinanceQuotePrice(asset: string, fiat: string): Promise<ReferencePrice> {
  try {
    const res = await fetch(
      `https://p2p.binance.com/bapi/c2c/v1/public/c2c/agent/quote-price?asset=${encodeURIComponent(asset)}&fiat=${encodeURIComponent(fiat)}&tradeType=BUY`,
      {
        headers: {
          accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return { price: null, isReal: false, source: "binance_quote_error" };
    const json = (await res.json()) as { data?: { price?: number } };
    const price = json.data?.price;
    if (typeof price !== "number" || price <= 0)
      return { price: null, isReal: false, source: "binance_quote_empty" };
    return { price, isReal: true, source: "binance_p2p" };
  } catch {
    return { price: null, isReal: false, source: "binance_quote_unavailable" };
  }
}
