import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_RESULTS_PER_SEARCH } from "@/lib/config";
import { entitlementEnvironment } from "@/lib/stripe";

// ---------- Tipos compartidos con la UI ----------

export interface QuotaState {
  plan: "free" | "monthly" | "yearly";
  limit: number;
  used: number;
  remaining: number;
}

export interface PortfolioMetricsDTO {
  initial_capital: number;
  cash: number;
  invested_cost: number;
  positions_value: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  roi_pct: number;
  peak_equity: number;
  max_drawdown: number;
  max_drawdown_pct: number;
}

export interface PositionDTO {
  asset: string;
  quantity: number;
  avg_cost: number;
  price: number;
  value: number;
  unrealized_pnl: number;
}

export interface OpportunityDTO {
  id: string;
  provider: string;
  provider_name: string;
  asset: string;
  fiat: string;
  side: "buy" | "sell";
  price: number;
  reference_price: number | null;
  spread: number | null;
  spread_pct: number | null;
  amount_min: number | null;
  amount_max: number | null;
  payment_method: string | null;
  location: string | null;
  counterparty: string | null;
  source_url: string | null;
  data_mode: "real" | "demo";
  captured_at: string;
}

export interface TradeDTO {
  id: string;
  asset: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  fees: number;
  realized_pnl: number;
  status: "open" | "closed";
  opportunity_id: string | null;
  created_at: string;
}

export interface RealTradeDTO {
  id: string;
  asset: string;
  fiat: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  fees: number;
  provider: string | null;
  counterparty: string | null;
  opportunity_id: string | null;
  executed_at: string;
  created_at: string;
}

const numeric = (value: unknown): number => Number(value ?? 0);

// ---------- Dashboard / cartera ----------

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: metricsRaw, error: metricsError }, { data: quotaRaw }, { data: profile }] =
      await Promise.all([
        supabase.rpc("refresh_equity"),
        supabase.rpc("get_quota", { _env: entitlementEnvironment() }),
        supabase
          .from("profiles")
          .select("id, email, display_name, plan, plan_started_at")
          .eq("id", userId)
          .maybeSingle(),
      ]);
    if (metricsError) throw new Error(metricsError.message);

    const [{ data: positions }, { data: prices }, { data: trades }] = await Promise.all([
      supabase.from("paper_positions").select("asset, quantity, avg_cost").eq("user_id", userId),
      supabase
        .from("asset_prices")
        .select("asset, price, fiat, is_real, updated_at")
        .eq("fiat", "EUR"),
      supabase
        .from("paper_trades")
        .select(
          "id, asset, side, quantity, price, total, fees, realized_pnl, status, opportunity_id, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const priceMap: Record<string, number> = {};
    for (const p of prices ?? []) priceMap[p.asset] = numeric(p.price);

    const positionsDto: PositionDTO[] = (positions ?? []).map((p) => {
      const qty = numeric(p.quantity);
      const avg = numeric(p.avg_cost);
      const price = priceMap[p.asset] ?? avg;
      return {
        asset: p.asset,
        quantity: qty,
        avg_cost: avg,
        price,
        value: qty * price,
        unrealized_pnl: qty * price - qty * avg,
      };
    });

    const metrics = metricsRaw as unknown as PortfolioMetricsDTO;

    return {
      profile: profile ?? null,
      quota: quotaRaw as unknown as QuotaState,
      metrics: {
        ...metrics,
        initial_capital: numeric(metrics.initial_capital),
        cash: numeric(metrics.cash),
        invested_cost: numeric(metrics.invested_cost),
        positions_value: numeric(metrics.positions_value),
        equity: numeric(metrics.equity),
        realized_pnl: numeric(metrics.realized_pnl),
        unrealized_pnl: numeric(metrics.unrealized_pnl),
        total_pnl: numeric(metrics.total_pnl),
        roi_pct: numeric(metrics.roi_pct),
        peak_equity: numeric(metrics.peak_equity),
        max_drawdown: numeric(metrics.max_drawdown),
        max_drawdown_pct: numeric(metrics.max_drawdown_pct),
      } satisfies PortfolioMetricsDTO,
      positions: positionsDto,
      trades: (trades ?? []).map((t) => ({
        ...t,
        quantity: numeric(t.quantity),
        price: numeric(t.price),
        total: numeric(t.total),
        fees: numeric(t.fees),
        realized_pnl: numeric(t.realized_pnl),
      })) as TradeDTO[],
      prices: priceMap,
    };
  });

// ---------- Operaciones ----------

export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page?: number; pageSize?: number }) =>
    z
      .object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(50).default(10),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const from = data.page * data.pageSize;
    const {
      data: rows,
      count,
      error,
    } = await context.supabase
      .from("paper_trades")
      .select(
        "id, asset, side, quantity, price, total, fees, realized_pnl, status, opportunity_id, created_at",
        { count: "exact" },
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return {
      trades: (rows ?? []).map((t) => ({
        ...t,
        quantity: numeric(t.quantity),
        price: numeric(t.price),
        total: numeric(t.total),
        fees: numeric(t.fees),
        realized_pnl: numeric(t.realized_pnl),
      })) as TradeDTO[],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

// ---------- Búsqueda de oportunidades ----------

const searchSchema = z.object({
  asset: z.string().min(2).max(10),
  fiat: z.string().min(3).max(4),
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive().max(1_000_000).nullable().optional(),
  paymentMethod: z.string().max(60).nullable().optional(),
  location: z.string().max(60).nullable().optional(),
  allowDemo: z.boolean().default(true),
});

export const searchOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: quotaRaw, error: quotaError } = await supabase.rpc("consume_search", {
      _env: entitlementEnvironment(),
    });
    if (quotaError) throw new Error(quotaError.message);
    const quotaResult = quotaRaw as unknown as QuotaState & { allowed: boolean };
    if (!quotaResult.allowed) {
      return {
        allowed: false as const,
        quota: quotaResult,
        opportunities: [] as OpportunityDTO[],
        sourceStatus: [] as { key: string; name: string; status: string; message?: string }[],
        dataMode: "real" as const,
      };
    }

    const { binanceP2PSource, okxSource, demoSource } = await import("@/lib/p2p/sources.server");
    const { fetchReferencePrice } = await import("@/lib/p2p/prices.server");
    const { normalizeOffers } = await import("@/lib/p2p/engine");

    const params = {
      asset: data.asset,
      fiat: data.fiat,
      side: data.side,
      amount: data.amount ?? null,
      paymentMethod: data.paymentMethod ?? null,
      location: data.location ?? null,
      limit: MAX_RESULTS_PER_SEARCH,
    };

    const realSources = [binanceP2PSource, okxSource];
    const [reference, ...realResults] = await Promise.all([
      fetchReferencePrice(data.asset, data.fiat),
      ...realSources.map((source) => source.fetchOffers(params)),
    ]);

    const sourceStatus = realSources.map((source, i) => ({
      key: source.key,
      name: source.name,
      status: realResults[i]!.status,
      message: realResults[i]!.message,
    }));

    let offers = realResults.flatMap((result) => result.offers);
    let dataMode: "real" | "demo" = "real";
    if (offers.length === 0 && data.allowDemo) {
      const demo = await demoSource.fetchOffers(params);
      offers = demo.offers;
      dataMode = "demo";
      sourceStatus.push({
        key: demoSource.key,
        name: demoSource.name,
        status: demo.status,
        message: demo.message,
      });
    }

    const normalized = normalizeOffers(offers, reference.price, params);
    const searchId = crypto.randomUUID();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (reference.price && reference.isReal) {
      await supabaseAdmin.from("asset_prices").upsert({
        asset: data.asset,
        fiat: data.fiat,
        price: reference.price,
        source: reference.source,
        is_real: true,
        updated_at: new Date().toISOString(),
      });
    }

    let stored: OpportunityDTO[] = [];
    if (normalized.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("opportunities")
        .insert(
          normalized.map((o) => ({
            user_id: userId,
            search_id: searchId,
            provider: o.provider,
            provider_name: o.providerName,
            asset: o.asset,
            fiat: o.fiat,
            side: o.side,
            price: o.price,
            reference_price: o.referencePrice,
            spread: o.spread,
            spread_pct: o.spreadPct,
            amount_min: o.amountMin,
            amount_max: o.amountMax,
            payment_method: o.paymentMethod,
            location: o.location,
            counterparty: o.counterparty,
            source_url: o.sourceUrl,
            data_mode: o.dataMode,
          })),
        )
        .select("*");
      if (insertError) throw new Error(insertError.message);
      stored = (inserted ?? []).map(mapOpportunity);
    }

    return {
      allowed: true as const,
      quota: quotaResult,
      searchId,
      opportunities: stored,
      sourceStatus,
      dataMode,
      referencePrice: reference.price,
      referenceIsReal: reference.isReal,
    };
  });

function mapOpportunity(row: Record<string, unknown>): OpportunityDTO {
  return {
    id: String(row["id"]),
    provider: String(row["provider"]),
    provider_name: String(row["provider_name"]),
    asset: String(row["asset"]),
    fiat: String(row["fiat"]),
    side: row["side"] === "sell" ? "sell" : "buy",
    price: numeric(row["price"]),
    reference_price: row["reference_price"] == null ? null : numeric(row["reference_price"]),
    spread: row["spread"] == null ? null : numeric(row["spread"]),
    spread_pct: row["spread_pct"] == null ? null : numeric(row["spread_pct"]),
    amount_min: row["amount_min"] == null ? null : numeric(row["amount_min"]),
    amount_max: row["amount_max"] == null ? null : numeric(row["amount_max"]),
    payment_method: (row["payment_method"] as string | null) ?? null,
    location: (row["location"] as string | null) ?? null,
    counterparty: (row["counterparty"] as string | null) ?? null,
    source_url: (row["source_url"] as string | null) ?? null,
    data_mode: row["data_mode"] === "demo" ? "demo" : "real",
    captured_at: String(row["captured_at"]),
  };
}

export const getLastOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", context.userId)
      .order("captured_at", { ascending: false })
      .limit(MAX_RESULTS_PER_SEARCH);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapOpportunity(row as Record<string, unknown>));
  });

// ---------- Registro de operaciones reales ----------

const realTradeSchema = z.object({
  asset: z.string().min(2).max(10),
  fiat: z.string().min(3).max(4).default("EUR"),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().positive(),
  price: z.number().positive(),
  fees: z.number().min(0).default(0),
  provider: z.string().max(80).nullable().optional(),
  counterparty: z.string().max(120).nullable().optional(),
  opportunityId: z.string().uuid().nullable().optional(),
  executedAt: z.string().nullable().optional(),
});

export const listRealTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { page?: number; pageSize?: number }) =>
    z
      .object({
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(50).default(10),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const from = data.page * data.pageSize;
    const {
      data: rows,
      count,
      error,
    } = await context.supabase
      .from("real_trades")
      .select("*", { count: "exact" })
      .eq("user_id", context.userId)
      .order("executed_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return {
      trades: (rows ?? []).map((t) => mapRealTrade(t as Record<string, unknown>)),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

export const createRealTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => realTradeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.opportunityId) {
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .select("id")
        .eq("id", data.opportunityId)
        .eq("user_id", userId)
        .maybeSingle();
      if (oppError) throw new Error(oppError.message);
      if (!opp) throw new Error("La oportunidad no es válida o ha caducado.");
    }

    const total = data.price * data.quantity + data.fees;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("real_trades")
      .insert({
        user_id: userId,
        asset: data.asset,
        fiat: data.fiat,
        side: data.side,
        quantity: data.quantity,
        price: data.price,
        total,
        fees: data.fees,
        provider: data.provider ?? null,
        counterparty: data.counterparty ?? null,
        opportunity_id: data.opportunityId ?? null,
        executed_at: data.executedAt
          ? new Date(data.executedAt).toISOString()
          : new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inserted) throw new Error("No se pudo registrar la operación.");

    await supabase.rpc("log_action", {
      _action: "real_trade_create",
      _metadata: {
        asset: data.asset,
        side: data.side,
        quantity: data.quantity,
        price: data.price,
      },
    });

    return { trade: mapRealTrade(inserted as Record<string, unknown>) };
  });

export const deleteRealTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("real_trades")
      .select("id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) throw new Error("La operación no existe o no te pertenece.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("real_trades")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

function mapRealTrade(row: Record<string, unknown>): RealTradeDTO {
  return {
    id: String(row["id"]),
    asset: String(row["asset"]),
    fiat: String(row["fiat"] ?? "EUR"),
    side: row["side"] === "sell" ? "sell" : "buy",
    quantity: numeric(row["quantity"]),
    price: numeric(row["price"]),
    total: numeric(row["total"]),
    fees: numeric(row["fees"]),
    provider: (row["provider"] as string | null) ?? null,
    counterparty: (row["counterparty"] as string | null) ?? null,
    opportunity_id: (row["opportunity_id"] as string | null) ?? null,
    executed_at: String(row["executed_at"]),
    created_at: String(row["created_at"]),
  };
}

// ---------- Paper trading ----------

const tradeSchema = z.object({
  asset: z.string().min(2).max(10),
  price: z.number().positive(),
  quantity: z.number().positive(),
  fees: z.number().min(0).default(0),
  opportunityId: z.string().uuid().nullable().optional(),
});

type TradeArgs = {
  _asset: string;
  _price: number;
  _quantity: number;
  _fees: number;
  _opportunity_id?: string;
};

function tradeArgs(data: z.infer<typeof tradeSchema>): TradeArgs {
  const base: TradeArgs = {
    _asset: data.asset,
    _price: data.price,
    _quantity: data.quantity,
    _fees: data.fees,
  };
  return data.opportunityId ? { ...base, _opportunity_id: data.opportunityId } : base;
}

export const paperBuy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tradeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("paper_buy", tradeArgs(data));
    if (error) throw new Error(translateDbError(error.message));
    return { ok: true as const };
  });

export const paperSell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => tradeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("paper_sell", tradeArgs(data));
    if (error) throw new Error(translateDbError(error.message));
    return { ok: true as const, result: result as unknown as { realized_pnl: number } };
  });

function translateDbError(message: string): string {
  if (message.includes("insufficient_cash"))
    return "No tienes suficiente efectivo virtual para esta operación.";
  if (message.includes("insufficient_position"))
    return "No tienes suficiente cantidad de este activo.";
  if (message.includes("invalid_opportunity")) return "La oportunidad no es válida o ha caducado.";
  if (message.includes("invalid_input")) return "Los datos de la operación no son válidos.";
  return message;
}

// ---------- Planes ----------

export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plan: z.enum(["free", "monthly", "yearly"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: quota, error } = await context.supabase.rpc("change_plan", {
      _plan: data.plan,
      _env: entitlementEnvironment(),
    });
    if (error) {
      if (error.message.includes("plan_requires_payment")) {
        throw new Error("Los planes de pago se activan al completar el pago.");
      }
      throw new Error(error.message);
    }
    return { quota: quota as unknown as QuotaState };
  });

// ---------- Perfil y cuenta ----------

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ displayName: z.string().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_log")
      .select("id, action, metadata, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirmation: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.confirmation !== "ELIMINAR") throw new Error("Confirmación incorrecta.");

    // Cancelar de inmediato cualquier suscripción para que no se siga cobrando.
    const { data: subs } = await context.supabase
      .from("subscriptions")
      .select("provider_subscription_id, environment, status")
      .eq("user_id", context.userId);
    if (subs?.length) {
      const { createStripeClient } = await import("@/lib/stripe.server");
      for (const sub of subs) {
        if (sub.status === "canceled") continue;
        try {
          const stripe = createStripeClient(sub.environment as "sandbox" | "live");
          await stripe.subscriptions.cancel(sub.provider_subscription_id);
        } catch (cancelError) {
          console.error("No se pudo cancelar la suscripción al borrar la cuenta", cancelError);
          throw new Error(
            "No hemos podido cancelar tu suscripción. Inténtalo de nuevo en unos minutos o contacta con soporte.",
          );
        }
      }
    }

    const { error } = await context.supabase.rpc("delete_my_account");
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (adminError) throw new Error(adminError.message);
    return { ok: true as const };
  });

export const getSources = createServerFn({ method: "GET" }).handler(async () => {
  const { ALL_SOURCES } = await import("@/lib/p2p/sources.server");
  return ALL_SOURCES.map((s) => ({
    key: s.key,
    name: s.name,
    isReal: s.isReal,
    website: s.website ?? null,
  }));
});

// ---------- Seguimiento real ----------

export interface RealOverviewDTO {
  positions: {
    asset: string;
    fiat: string;
    quantity: number;
    avg_cost: number;
    price: number | null;
    value: number | null;
    unrealized_pnl: number | null;
    realized_pnl: number;
  }[];
  trades: (RealTradeDTO & { realized_pnl: number; oversold: boolean })[];
  metrics: {
    invested_cost: number;
    positions_value: number;
    realized_pnl: number;
    unrealized_pnl: number;
    total_pnl: number;
    missing_prices: boolean;
  };
}

export const getRealOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RealOverviewDTO> => {
    const { computeRealLedger } = await import("@/lib/accounting");
    const { fetchReferencePrice } = await import("@/lib/p2p/prices.server");
    const { data: rows, error } = await context.supabase
      .from("real_trades")
      .select("*")
      .eq("user_id", context.userId)
      .order("executed_at", { ascending: true })
      .limit(2000);
    if (error) throw new Error(error.message);
    const trades = (rows ?? []).map((r) => mapRealTrade(r as Record<string, unknown>));
    const ledger = computeRealLedger(
      trades.map((t) => ({
        id: t.id,
        asset: t.asset,
        fiat: t.fiat,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        fees: t.fees,
        executedAt: t.executed_at,
      })),
    );
    const positions = await Promise.all(
      ledger.positions.map(async (p) => {
        const ref = p.quantity > 0 ? await fetchReferencePrice(p.asset, p.fiat) : null;
        const price = ref?.price ?? null;
        const value = price === null ? null : price * p.quantity;
        return {
          asset: p.asset,
          fiat: p.fiat,
          quantity: p.quantity,
          avg_cost: p.avgCost,
          price,
          value,
          unrealized_pnl: value === null ? null : value - p.quantity * p.avgCost,
          realized_pnl: p.realizedPnl,
        };
      }),
    );
    const open = positions.filter((p) => p.quantity > 0);
    const realized = positions.reduce((a, p) => a + p.realized_pnl, 0);
    const unrealized = open.reduce((a, p) => a + (p.unrealized_pnl ?? 0), 0);
    return {
      positions,
      trades: trades
        .map((t) => ({
          ...t,
          realized_pnl: ledger.tradePnl[t.id] ?? 0,
          oversold: ledger.oversold.includes(t.id),
        }))
        .reverse(),
      metrics: {
        invested_cost: open.reduce((a, p) => a + p.quantity * p.avg_cost, 0),
        positions_value: open.reduce((a, p) => a + (p.value ?? 0), 0),
        realized_pnl: realized,
        unrealized_pnl: unrealized,
        total_pnl: realized + unrealized,
        missing_prices: open.some((p) => p.price === null),
      },
    };
  });
