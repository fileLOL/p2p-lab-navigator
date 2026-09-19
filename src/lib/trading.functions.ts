import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ExchangeConnectionDTO {
  connected: boolean;
  exchange: string;
  apiKeyPreview: string | null;
  createdAt: string | null;
}

export interface RealBalanceDTO {
  asset: string;
  free: number;
  locked: number;
}

export interface RealOrderDTO {
  id: string;
  exchange: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number | null;
  quote_quantity: number | null;
  order_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

async function loadUserKeys(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("exchange_keys")
    .select("api_key, api_secret_encrypted, created_at, exchange")
    .eq("user_id", userId)
    .eq("exchange", "binance")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const getExchangeConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExchangeConnectionDTO> => {
    const row = await loadUserKeys(context.userId);
    if (!row) return { connected: false, exchange: "binance", apiKeyPreview: null, createdAt: null };
    return {
      connected: true,
      exchange: row.exchange,
      apiKeyPreview: `${row.api_key.slice(0, 4)}…${row.api_key.slice(-4)}`,
      createdAt: row.created_at,
    };
  });

const connectSchema = z.object({
  apiKey: z.string().min(10).max(128).regex(/^[A-Za-z0-9]+$/),
  apiSecret: z.string().min(10).max(128).regex(/^[A-Za-z0-9]+$/),
});

export const connectExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => connectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { fetchAccountBalances, translateBinanceError } = await import("@/lib/binance.server");
    try {
      // Valida les claus consultant el saldo abans de desar-les.
      await fetchAccountBalances(data.apiKey, data.apiSecret);
    } catch (error) {
      throw new Error(translateBinanceError(error));
    }

    const { encryptSecret } = await import("@/lib/exchange-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("exchange_keys").upsert(
      {
        user_id: context.userId,
        exchange: "binance",
        api_key: data.apiKey,
        api_secret_encrypted: encryptSecret(data.apiSecret),
      },
      { onConflict: "user_id,exchange" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const disconnectExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("exchange_keys")
      .delete()
      .eq("user_id", context.userId)
      .eq("exchange", "binance");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getRealBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await loadUserKeys(context.userId);
    if (!row) throw new Error("Primero conecta tu cuenta de Binance.");
    const { decryptSecret } = await import("@/lib/exchange-crypto.server");
    const { fetchAccountBalances, translateBinanceError } = await import("@/lib/binance.server");
    try {
      const balances = await fetchAccountBalances(row.api_key, decryptSecret(row.api_secret_encrypted));
      return { balances: balances satisfies RealBalanceDTO[] };
    } catch (error) {
      throw new Error(translateBinanceError(error));
    }
  });

export const getRealPrice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ asset: z.string().min(2).max(10), fiat: z.string().min(3).max(4) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchSymbolPrice } = await import("@/lib/binance.server");
    return { price: await fetchSymbolPrice(`${data.asset}${data.fiat}`) };
  });

const orderSchema = z.object({
  asset: z.string().min(2).max(10),
  fiat: z.string().min(3).max(4),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive().max(1_000_000),
  confirmation: z.string(),
});

export const placeRealOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.confirmation !== "CONFIRMAR") {
      throw new Error("Debes escribir CONFIRMAR para ejecutar una orden real.");
    }
    const row = await loadUserKeys(context.userId);
    if (!row) throw new Error("Primero conecta tu cuenta de Binance.");

    const { decryptSecret } = await import("@/lib/exchange-crypto.server");
    const binance = await import("@/lib/binance.server");
    const symbol = `${data.asset}${data.fiat}`;

    let result;
    try {
      result = await binance.placeMarketOrder(row.api_key, decryptSecret(row.api_secret_encrypted), {
        symbol,
        side: data.side,
        quantity: data.quantity,
      });
    } catch (error) {
      const message = binance.translateBinanceError(error);
      await context.supabase.from("real_orders").insert({
        user_id: context.userId,
        symbol,
        side: data.side,
        quantity: data.quantity,
        status: "failed",
        error: message,
      });
      throw new Error(message);
    }

    const executed = Number(result.executedQty || data.quantity);
    const quote = Number(result.cummulativeQuoteQty || 0);
    const { error } = await context.supabase.from("real_orders").insert({
      user_id: context.userId,
      symbol: result.symbol,
      side: data.side,
      quantity: executed,
      price: executed > 0 ? quote / executed : null,
      quote_quantity: quote || null,
      order_id: String(result.orderId),
      status: result.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, orderId: String(result.orderId), status: result.status };
  });

export const listRealOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("real_orders")
      .select("id, exchange, symbol, side, quantity, price, quote_quantity, order_id, status, error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((o) => ({
      ...o,
      quantity: Number(o.quantity),
      price: o.price == null ? null : Number(o.price),
      quote_quantity: o.quote_quantity == null ? null : Number(o.quote_quantity),
    })) as RealOrderDTO[];
  });
