/**
 * Cliente mínimo de la API Spot de Binance. SOLO servidor.
 * Las claves del usuario nunca salen del backend: se descifran aquí,
 * se firma con HMAC-SHA256 y se llama a api.binance.com.
 */

const BINANCE_API_BASE = "https://api.binance.com";

export interface BinanceBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface BinanceOrderResult {
  orderId: number;
  symbol: string;
  side: string;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  price: string;
}

export class BinanceApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

async function signedRequest<T>(
  path: string,
  apiKey: string,
  apiSecret: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const query = new URLSearchParams({ ...params, timestamp: String(Date.now()) });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(query.toString()),
  );
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const url = `${BINANCE_API_BASE}${path}?${query.toString()}&signature=${sigHex}`;

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": apiKey },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { msg?: string } | null)?.msg ?? `Error de Binance (${res.status})`;
    const code = (body as { code?: number } | null)?.code ?? res.status;
    throw new BinanceApiError(msg, code);
  }
  return body as T;
}

/** Verifica las claves y devuelve los saldos con cantidad > 0. */
export async function fetchAccountBalances(
  apiKey: string,
  apiSecret: string,
): Promise<BinanceBalance[]> {
  const data = await signedRequest<{ balances: { asset: string; free: string; locked: string }[] }>(
    "/api/v3/account",
    apiKey,
    apiSecret,
    { recvWindow: "5000" },
  );
  return data.balances
    .map((b) => ({ asset: b.asset, free: Number(b.free), locked: Number(b.locked) }))
    .filter((b) => b.free > 0 || b.locked > 0);
}

/** Precio actual de un símbolo (p. ej. BTCEUR). Público, sin firma. */
export async function fetchSymbolPrice(symbol: string): Promise<number | null> {
  const res = await fetch(
    `${BINANCE_API_BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { price?: string };
  return body.price ? Number(body.price) : null;
}

/** Crea una orden de mercado real. quantity = cantidad del activo base. */
export async function placeMarketOrder(
  apiKey: string,
  apiSecret: string,
  args: { symbol: string; side: "BUY" | "SELL"; quantity: number },
): Promise<BinanceOrderResult> {
  return signedRequest<BinanceOrderResult>(
    "/api/v3/order",
    apiKey,
    apiSecret,
    {
      symbol: args.symbol,
      side: args.side,
      type: "MARKET",
      quantity: String(args.quantity),
      recvWindow: "5000",
    },
    "POST",
  );
}

/** Traduce errores habituales de Binance a mensajes claros en castellano. */
export function translateBinanceError(error: unknown): string {
  if (error instanceof BinanceApiError) {
    if (error.code === -2015)
      return "Claves inválidas, sin permiso de trading o IP no autorizada. Revisa la configuración de la clave en Binance.";
    if (error.code === -2014 || error.code === -2016) return "Las claves no son válidas.";
    if (error.code === -2010)
      return "Fondos insuficientes en tu cuenta de Binance para esta orden.";
    if (error.code === -1013 || error.code === -1111)
      return "La cantidad no cumple los mínimos o el formato del par en Binance.";
    if (error.code === -1121) return "El par de trading no existe en Binance.";
    return `Binance rechazó la operación: ${error.message}`;
  }
  return "No se ha podido conectar con Binance. Inténtalo de nuevo.";
}
