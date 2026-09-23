import type { P2PSource, RawOffer, SearchParams, Side, SourceResult } from "./types";

/**
 * Identificadores de método de pago que entiende la API y las URLs de Binance P2P.
 * Un per-aprovar: los nombres amigables (config.ts) no coinciden con los códigos Binance.
 */
export const PAYMENT_METHOD_IDENTIFIERS: Record<string, string> = {
  "Transferencia bancaria": "BANK",
  Bizum: "BIZUM",
  "SEPA instantáneo": "SEPAINSTANT",
  Revolut: "Revolut",
  Wise: "Wise",
  Efectivo: "CASH",
};

function binanceIdentifier(paymentMethod: string | null | undefined): string | null {
  if (!paymentMethod) return null;
  return PAYMENT_METHOD_IDENTIFIERS[paymentMethod] ?? null;
}

/** Genera el enlace del mercado P2P de Binance pre-filtrado por operación y método. */
export function buildBinanceTradeUrl(
  side: Side,
  asset: string,
  fiat: string,
  paymentMethod: string | null | undefined = null,
): string {
  const direction = side === "buy" ? "buy" : "sell";
  const method = binanceIdentifier(paymentMethod);
  const path = method
    ? `${method}/${encodeURIComponent(asset)}`
    : `${direction}/${encodeURIComponent(asset)}/`;
  return `https://p2p.binance.com/en/trade/${path}?fiat=${encodeURIComponent(fiat)}`;
}

/** Adaptador real: Binance P2P (endpoint público, sin credenciales). */
export const binanceP2PSource: P2PSource = {
  key: "binance_p2p",
  name: "Binance P2P",
  isReal: true,
  website: "https://p2p.binance.com",
  async fetchOffers(params: SearchParams): Promise<SourceResult> {
    try {
      const methodIdentifier = binanceIdentifier(params.paymentMethod);
      const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          page: 1,
          rows: Math.min(20, Math.max(params.limit, 10)),
          asset: params.asset,
          fiat: params.fiat,
          // En Binance "BUY" lista anuncios donde el usuario compra cripto.
          tradeType: params.side === "buy" ? "BUY" : "SELL",
          payTypes: methodIdentifier ? [methodIdentifier] : [],
          countries: [],
          transAmount: params.amount ? String(params.amount) : "",
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        return {
          offers: [],
          status: "unavailable",
          message: `Binance P2P respondió ${res.status}`,
        };
      }

      const json = (await res.json()) as { data?: BinanceAdv[] };
      const rows = Array.isArray(json.data) ? json.data : [];
      const now = new Date().toISOString();

      const offers: RawOffer[] = rows.map((row) => ({
        provider: "binance_p2p",
        providerName: "Binance P2P",
        asset: row.adv?.asset ?? params.asset,
        fiat: row.adv?.fiatUnit ?? params.fiat,
        side: params.side,
        price: Number(row.adv?.price ?? 0),
        amountMin: row.adv?.minSingleTransAmount ? Number(row.adv.minSingleTransAmount) : null,
        amountMax: row.adv?.maxSingleTransAmount ? Number(row.adv.maxSingleTransAmount) : null,
        paymentMethod: row.adv?.tradeMethods?.[0]?.tradeMethodName ?? null,
        location: row.advertiser?.nickName ? null : null,
        counterparty: row.advertiser?.nickName ?? null,
        sourceUrl: buildBinanceTradeUrl(
          params.side,
          row.adv?.asset ?? params.asset,
          row.adv?.fiatUnit ?? params.fiat,
          row.adv?.tradeMethods?.[0]?.tradeMethodName ?? params.paymentMethod,
        ),
        timestamp: now,
        dataMode: "real",
      }));

      const valid = offers.filter((o) => o.price > 0);
      if (valid.length === 0) {
        return { offers: [], status: "available", message: "Sin anuncios para estos filtros." };
      }
      return { offers: valid, status: "available" };
    } catch (error) {
      return {
        offers: [],
        status: "unavailable",
        message: error instanceof Error ? error.message : "Fuente no disponible",
      };
    }
  },
};

interface BinanceAdv {
  adv?: {
    asset?: string;
    fiatUnit?: string;
    price?: string;
    minSingleTransAmount?: string;
    maxSingleTransAmount?: string;
    tradeMethods?: { tradeMethodName?: string }[];
  };
  advertiser?: { nickName?: string };
}

/** Plantilla para futuras fuentes que aún requieren credenciales. */
function pendingSource(key: string, name: string, website: string, reason: string): P2PSource {
  return {
    key,
    name,
    isReal: true,
    website,
    async fetchOffers() {
      return { offers: [], status: "requires_credentials", message: reason };
    },
  };
}

export const bybitSource = pendingSource(
  "bybit_p2p",
  "Bybit P2P",
  "https://www.bybit.com/fiat/trade/otc",
  "Requiere credenciales de API.",
);
export const okxSource = pendingSource(
  "okx_p2p",
  "OKX P2P",
  "https://www.okx.com/p2p-markets",
  "Requiere credenciales de API.",
);
export const hodlHodlSource = pendingSource(
  "hodlhodl",
  "Hodl Hodl",
  "https://hodlhodl.com",
  "Adaptador preparado, pendiente de habilitar.",
);
export const peachSource = pendingSource(
  "peach",
  "Peach Bitcoin",
  "https://peachbitcoin.com",
  "Sin API pública estable.",
);

/** Fuente DEMO: datos sintéticos, siempre etiquetados como demo. */
export const demoSource: P2PSource = {
  key: "demo",
  name: "Fuente demo",
  isReal: false,
  async fetchOffers(params: SearchParams): Promise<SourceResult> {
    const base = DEMO_BASE_PRICES[params.asset] ?? 100;
    const methods = ["Transferencia bancaria", "Bizum", "Revolut", "SEPA instantáneo", "Wise"];
    const now = Date.now();
    const offers: RawOffer[] = Array.from({ length: params.limit }, (_, i) => {
      const drift = ((i % 5) - 2) / 100; // -2% .. +2%
      const price = base * (1 + (params.side === "buy" ? drift : -drift));
      return {
        provider: "demo",
        providerName: "Fuente demo",
        asset: params.asset,
        fiat: params.fiat,
        side: params.side,
        price: Number(price.toFixed(price < 10 ? 4 : 2)),
        amountMin: 20 + i * 10,
        amountMax: 500 + i * 100,
        paymentMethod: params.paymentMethod ?? methods[i % methods.length]!,
        location: params.location ?? "ES",
        counterparty: `demo_trader_${i + 1}`,
        sourceUrl: null,
        timestamp: new Date(now - i * 60000).toISOString(),
        dataMode: "demo",
      };
    });
    return { offers, status: "available", message: "Datos de demostración (no reales)." };
  },
};

const DEMO_BASE_PRICES: Record<string, number> = {
  BTC: 66500,
  ETH: 2120,
  USDT: 0.87,
  USDC: 0.87,
};

export const ALL_SOURCES: P2PSource[] = [
  binanceP2PSource,
  bybitSource,
  okxSource,
  hodlHodlSource,
  peachSource,
  demoSource,
];

export const REAL_SOURCES: P2PSource[] = [
  binanceP2PSource,
  bybitSource,
  okxSource,
  hodlHodlSource,
  peachSource,
];
