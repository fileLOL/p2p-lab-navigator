import type { P2PSource, RawOffer, SearchParams, Side, SourceResult } from "./types";

/**
 * Identificadores de método de pago que entiende la API pública de Binance P2P.
 * Los códigos se obtienen del endpoint `trade-methods` y son sensibles a mayúsculas.
 */
export const PAYMENT_METHOD_IDENTIFIERS: Record<string, string> = {
  "Transferencia bancaria": "BANK",
  Bizum: "BIZUM",
  "SEPA instantáneo": "SEPAinstant",
  Revolut: "Revolut",
  Wise: "Wise",
  Efectivo: "CashDeposit",
};

/** Devuelve el nombre amigable a partir del identificador devuelto por Binance. */
const IDENTIFIER_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(PAYMENT_METHOD_IDENTIFIERS).map(([name, identifier]) => [identifier, name]),
);

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

/**
 * Enlace directo al anuncio concreto en Binance P2P.
 * Si el anuncio trae `adNo`, se abre su ficha; si no, el listado filtrado.
 */
function binanceOfferUrl(params: SearchParams, item: BinanceAdItem): string {
  if (item.adNo) {
    return `https://p2p.binance.com/es/adv?code=${encodeURIComponent(item.adNo)}`;
  }
  const query = new URLSearchParams({
    fiat: item.fiat ?? params.fiat,
    payment: item.tradeMethods?.[0] ?? binanceIdentifier(params.paymentMethod) ?? "all-payments",
  });
  if (params.amount) query.set("amount", String(params.amount));
  const side = params.side === "buy" ? "buy" : "sell";
  const asset = item.asset ?? params.asset;
  return `https://p2p.binance.com/es/trade/${side}/${encodeURIComponent(asset)}?${query.toString()}`;
}

/** Adaptador real: Binance P2P (endpoint público, sin credenciales). */
export const binanceP2PSource: P2PSource = {
  key: "binance_p2p",
  name: "Binance P2P",
  isReal: true,
  website: "https://p2p.binance.com",
  async fetchOffers(params: SearchParams): Promise<SourceResult> {
    try {
      const query = new URLSearchParams({
        fiat: params.fiat,
        asset: params.asset,
        tradeType: params.side === "buy" ? "BUY" : "SELL",
        limit: String(Math.min(20, Math.max(params.limit, 10))),
      });
      const methodIdentifier = binanceIdentifier(params.paymentMethod);
      if (methodIdentifier) query.set("tradeMethodIdentifiers", methodIdentifier);

      const res = await fetch(
        `https://p2p.binance.com/bapi/c2c/v1/public/c2c/agent/ad-list?${query.toString()}`,
        {
          headers: {
            accept: "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(12000),
        },
      );

      if (!res.ok) {
        return {
          offers: [],
          status: "unavailable",
          message: `Binance P2P respondió ${res.status}`,
        };
      }

      const json = (await res.json()) as { data?: { items?: BinanceAdItem[] } };
      const items = Array.isArray(json.data?.items) ? json.data.items : [];
      const now = new Date().toISOString();

      const offers: RawOffer[] = items.map((item) => ({
        provider: "binance_p2p",
        providerName: "Binance P2P",
        asset: item.asset ?? params.asset,
        fiat: item.fiat ?? params.fiat,
        side: params.side,
        price: Number(item.price ?? 0),
        amountMin: item.minTransAmount ? Number(item.minTransAmount) : null,
        amountMax: item.maxTransAmount ? Number(item.maxTransAmount) : null,
        paymentMethod:
          IDENTIFIER_TO_NAME[item.tradeMethods?.[0] ?? ""] ?? item.tradeMethods?.[0] ?? null,
        location: null,
        counterparty: item.advertiser?.nickName ?? null,
        sourceUrl: binanceOfferUrl(params, item),
        timestamp: now,
        dataMode: "real",
      }));

      const valid = offers
        .filter((o) => o.price > 0)
        .filter(
          (o) =>
            !params.amount ||
            (o.amountMin != null && o.amountMax != null
              ? params.amount >= o.amountMin && params.amount <= o.amountMax
              : true),
        );
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

interface BinanceAdItem {
  adNo?: string;
  asset?: string;
  fiat?: string;
  price?: number;
  minTransAmount?: number;
  maxTransAmount?: number;
  tradeMethods?: string[];
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
