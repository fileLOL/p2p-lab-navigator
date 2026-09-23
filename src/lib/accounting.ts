/**
 * Contabilidad del paper trading (funciones puras y testeables).
 * Los valores oficiales provienen del backend; estas funciones se usan
 * para derivar métricas de presentación y para los tests de coherencia.
 */

export interface PositionInput {
  asset: string;
  quantity: number;
  avgCost: number;
}

export interface PortfolioInput {
  initialCapital: number;
  cash: number;
  realizedPnl: number;
  positions: PositionInput[];
  prices: Record<string, number>;
  peakEquity?: number;
  maxDrawdown?: number;
}

export interface PortfolioMetrics {
  initialCapital: number;
  cash: number;
  investedCost: number;
  positionsValue: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  roiPct: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
}

export function computePortfolio(input: PortfolioInput): PortfolioMetrics {
  const investedCost = input.positions.reduce((acc, p) => acc + p.quantity * p.avgCost, 0);
  const positionsValue = input.positions.reduce(
    (acc, p) => acc + p.quantity * (input.prices[p.asset] ?? p.avgCost),
    0,
  );
  const equity = input.cash + positionsValue;
  const unrealizedPnl = positionsValue - investedCost;
  const peak = Math.max(input.peakEquity ?? input.initialCapital, equity);
  const drawdown = Math.max(input.maxDrawdown ?? 0, peak - equity);

  return {
    initialCapital: input.initialCapital,
    cash: input.cash,
    investedCost,
    positionsValue,
    equity,
    realizedPnl: input.realizedPnl,
    unrealizedPnl,
    totalPnl: input.realizedPnl + unrealizedPnl,
    roiPct:
      input.initialCapital > 0 ? ((equity - input.initialCapital) / input.initialCapital) * 100 : 0,
    maxDrawdown: drawdown,
    maxDrawdownPct: peak > 0 ? (drawdown / peak) * 100 : 0,
  };
}

export interface TradeLike {
  side: "buy" | "sell";
  realizedPnl: number;
  total: number;
  asset: string;
  createdAt?: string;
}

export interface TradeStats {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  realizedPnl: number;
  bestTrade: TradeLike | null;
  worstTrade: TradeLike | null;
}

export function computeTradeStats(trades: TradeLike[]): TradeStats {
  const sells = trades.filter((t) => t.side === "sell");
  const wins = sells.filter((t) => t.realizedPnl > 0).length;
  const losses = sells.filter((t) => t.realizedPnl < 0).length;
  const realizedPnl = sells.reduce((acc, t) => acc + t.realizedPnl, 0);

  let best: TradeLike | null = null;
  let worst: TradeLike | null = null;
  for (const t of sells) {
    if (!best || t.realizedPnl > best.realizedPnl) best = t;
    if (!worst || t.realizedPnl < worst.realizedPnl) worst = t;
  }

  return {
    totalTrades: trades.length,
    closedTrades: sells.length,
    wins,
    losses,
    winRatePct: sells.length > 0 ? (wins / sells.length) * 100 : 0,
    realizedPnl,
    bestTrade: best,
    worstTrade: worst,
  };
}

export interface QuoteInput {
  price: number;
  amountFiat: number;
  feePct?: number;
}

export interface Quote {
  price: number;
  amountFiat: number;
  fees: number;
  quantity: number;
  totalCost: number;
}

/** Cotiza una compra: el importe indicado incluye las comisiones. */
export function quoteBuy({ price, amountFiat, feePct = 0 }: QuoteInput): Quote {
  const fees = (amountFiat * feePct) / 100;
  const net = Math.max(amountFiat - fees, 0);
  const quantity = price > 0 ? net / price : 0;
  return { price, amountFiat, fees, quantity, totalCost: net + fees };
}

/** Cotiza una venta a partir de la cantidad de activo. */
export function quoteSell({
  price,
  quantity,
  feePct = 0,
}: {
  price: number;
  quantity: number;
  feePct?: number;
}): { gross: number; fees: number; net: number } {
  const gross = price * quantity;
  const fees = (gross * feePct) / 100;
  return { gross, fees, net: gross - fees };
}

export function formatMoney(value: number, fiat = "EUR", digits = 2): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: fiat,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPct(value: number, digits = 2): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)} %`;
}

export function formatQty(value: number): string {
  if (value === 0) return "0";
  const digits = value < 1 ? 8 : 6;
  return value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

// ---------- Operaciones reales (registradas por el usuario) ----------

export interface RealTradeInput {
  id: string;
  asset: string;
  fiat: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
  executedAt: string;
}

export interface RealPosition {
  asset: string;
  fiat: string;
  quantity: number;
  avgCost: number;
  realizedPnl: number;
}

export interface RealLedger {
  positions: RealPosition[];
  /** Beneficio realizado de cada venta, por id de operación. */
  tradePnl: Record<string, number>;
  /** Ventas que superan la cantidad registrada (saldo anterior a la app). */
  oversold: string[];
}

/** Coste medio ponderado por activo y moneda. Las comisiones suman al coste o restan a la venta. */
export function computeRealLedger(trades: RealTradeInput[]): RealLedger {
  const sorted = [...trades].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
  const map = new Map<string, RealPosition>();
  const tradePnl: Record<string, number> = {};
  const oversold: string[] = [];
  for (const t of sorted) {
    const key = `${t.asset}|${t.fiat}`;
    const pos = map.get(key) ?? { asset: t.asset, fiat: t.fiat, quantity: 0, avgCost: 0, realizedPnl: 0 };
    if (t.side === "buy") {
      const cost = pos.quantity * pos.avgCost + t.quantity * t.price + t.fees;
      pos.quantity += t.quantity;
      pos.avgCost = pos.quantity > 0 ? cost / pos.quantity : 0;
      tradePnl[t.id] = 0;
    } else {
      const covered = Math.min(t.quantity, pos.quantity);
      if (t.quantity > pos.quantity + 1e-12) oversold.push(t.id);
      const proceeds = covered * t.price - t.fees * (t.quantity > 0 ? covered / t.quantity : 0);
      const pnl = proceeds - covered * pos.avgCost;
      pos.realizedPnl += pnl;
      pos.quantity -= covered;
      if (pos.quantity <= 1e-12) {
        pos.quantity = 0;
        pos.avgCost = 0;
      }
      tradePnl[t.id] = pnl;
    }
    map.set(key, pos);
  }
  return { positions: [...map.values()], tradePnl, oversold };
}
