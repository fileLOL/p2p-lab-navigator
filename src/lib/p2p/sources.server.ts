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

      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        "accept-language": "es-ES,es;q=0.9,en;q=0.8",
        origin: "https://p2p.binance.com",
        referer: "https://p2p.binance.com/es",
        clienttype: "web",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      };
      let items: BinanceAdItem[] = [];
      let lastStatus = 0;
      // 1) Endpoint principal de búsqueda (el que usa la web de Binance).
      try {
        const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
          method: "POST",
          headers,
          body: JSON.stringify({
            fiat: params.fiat,
            asset: params.asset,
            tradeType: params.side === "buy" ? "BUY" : "SELL",
            page: 1,
            rows: 20,
            payTypes: methodIdentifier ? [methodIdentifier] : [],
            publisherType: null,
          }),
          signal: AbortSignal.timeout(12000),
        });
        lastStatus = res.status;
        if (res.ok) {
          const json = (await res.json()) as { data?: BinanceSearchItem[] };
          items = (json.data ?? []).map((d) => ({
            adNo: d.adv?.advNo,
            asset: d.adv?.asset,
            fiat: d.adv?.fiatUnit,
            price: Number(d.adv?.price ?? 0),
            minTransAmount: Number(d.adv?.minSingleTransAmount ?? 0) || undefined,
            maxTransAmount: Number(d.adv?.maxSingleTransAmount ?? 0) || undefined,
            tradeMethods: (d.adv?.tradeMethods ?? [])
              .map((m) => m.identifier)
              .filter((x): x is string => !!x),
            advertiser: { nickName: d.advertiser?.nickName },
          }));
        }
      } catch {
        /* se intenta el endpoint alternativo */
      }
      // 2) Endpoint alternativo.
      if (items.length === 0) {
        const res = await fetch(
          `https://p2p.binance.com/bapi/c2c/v1/public/c2c/agent/ad-list?${query.toString()}`,
          { headers, signal: AbortSignal.timeout(12000) },
        );
        lastStatus = res.status;
        if (res.ok) {
          const json = (await res.json()) as { data?: { items?: BinanceAdItem[] } };
          items = Array.isArray(json.data?.items) ? json.data.items : [];
        } else if (lastStatus !== 200) {
          return {
            offers: [],
            status: "unavailable",
            message: `Binance P2P respondió ${res.status}`,
          };
        }
      }
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

interface BinanceSearchItem {
  adv?: {
    advNo?: string;
    asset?: string;
    fiatUnit?: string;
    price?: string;
    minSingleTransAmount?: string;
    maxSingleTransAmount?: string;
    tradeMethods?: { identifier?: string }[];
  };
  advertiser?: { nickName?: string };
}

interface BinanceAdItem {
  adNo?: string | undefined;
  asset?: string | undefined;
  fiat?: string | undefined;
  price?: number | undefined;
  minTransAmount?: number | undefined;
  maxTransAmount?: number | undefined;
  tradeMethods?: string[] | undefined;
  advertiser?: { nickName?: string | undefined } | undefined;
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

const BYBIT_PAYMENT_IDS: Record<string, string> = {
  "Transferencia bancaria": "14",
  Bizum: "416",
  "SEPA instantáneo": "185",
  Revolut: "64",
  Wise: "78",
};

/** Adaptador real: Bybit P2P (endpoint público, sin credenciales). */
export const bybitSource: P2PSource = {
  key: "bybit_p2p",
  name: "Bybit P2P",
  isReal: true,
  website: "https://www.bybit.com/fiat/trade/otc",
  async fetchOffers(params: SearchParams): Promise<SourceResult> {
    try {
      const pay = params.paymentMethod ? BYBIT_PAYMENT_IDS[params.paymentMethod] : undefined;
      const res = await fetch("https://api2.bybit.com/fiat/otc/item/online", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: "https://www.bybit.com",
          referer: "https://www.bybit.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        },
        body: JSON.stringify({
          tokenId: params.asset,
          currencyId: params.fiat,
          // En Bybit side "1" = anuncios de venta (tú compras), "0" = anuncios de compra.
          side: params.side === "buy" ? "1" : "0",
          size: "20",
          page: "1",
          payment: pay ? [pay] : [],
          amount: params.amount ? String(params.amount) : "",
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        return { offers: [], status: "unavailable", message: `Bybit P2P respondió ${res.status}` };
      }
      const json = (await res.json()) as {
        result?: {
          items?: {
            id?: string;
            nickName?: string;
            tokenId?: string;
            currencyId?: string;
            price?: string;
            minAmount?: string;
            maxAmount?: string;
          }[];
        };
      };
      const now = new Date().toISOString();
      const side = params.side === "buy" ? "buy" : "sell";
      const offers: RawOffer[] = (json.result?.items ?? [])
        .map((it) => ({
          provider: "bybit_p2p",
          providerName: "Bybit P2P",
          asset: it.tokenId ?? params.asset,
          fiat: it.currencyId ?? params.fiat,
          side: params.side,
          price: Number(it.price ?? 0),
          amountMin: it.minAmount ? Number(it.minAmount) : null,
          amountMax: it.maxAmount ? Number(it.maxAmount) : null,
          paymentMethod: params.paymentMethod ?? null,
          location: null,
          counterparty: it.nickName ?? null,
          sourceUrl: `https://www.bybit.com/fiat/trade/otc/${side}/${encodeURIComponent(
            it.tokenId ?? params.asset,
          )}/${encodeURIComponent(it.currencyId ?? params.fiat)}`,
          timestamp: now,
          dataMode: "real" as const,
        }))
        .filter((o) => o.price > 0);
      if (offers.length === 0) {
        // Si el importe es demasiado alto, mostramos las mejores ofertas sin ese filtro.
        if (params.amount) {
          const retry = await bybitSource.fetchOffers({ ...params, amount: null });
          if (retry.offers.length > 0) {
            return {
              ...retry,
              message: `Ningún anuncio acepta ${params.amount} ${params.fiat}; se muestran las mejores ofertas con otros límites.`,
            };
          }
        }
        return { offers: [], status: "available", message: "Sin anuncios para estos filtros." };
      }
      return { offers, status: "available" };
    } catch (error) {
      return {
        offers: [],
        status: "unavailable",
        message: error instanceof Error ? error.message : "Fuente no disponible",
      };
    }
  },
};
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

// OKX se eliminó por completo: sus enlaces daban 404 y bloqueos.
export const ALL_SOURCES: P2PSource[] = [
  binanceP2PSource,
  bybitSource,
  hodlHodlSource,
  peachSource,
  demoSource,
];

export const REAL_SOURCES: P2PSource[] = [
  binanceP2PSource,
  bybitSource,
  hodlHodlSource,
  peachSource,
];
