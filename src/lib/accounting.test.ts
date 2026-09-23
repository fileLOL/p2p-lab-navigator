import { describe, expect, it } from "vitest";

import { computePortfolio, computeTradeStats, quoteBuy, quoteSell } from "./accounting";

describe("computePortfolio", () => {
  it("empieza con 25.000 € de capital y ROI 0", () => {
    const result = computePortfolio({
      initialCapital: 25000,
      cash: 25000,
      positions: [],
      prices: {},
      realizedPnl: 0,
      peakEquity: 25000,
    });
    expect(result.equity).toBe(25000);
    expect(result.investedCost).toBe(0);
    expect(result.roiPct).toBe(0);
    expect(result.maxDrawdown).toBe(0);
  });

  it("separa efectivo, coste invertido y valor de cartera", () => {
    const result = computePortfolio({
      initialCapital: 20,
      cash: 10,
      positions: [{ asset: "BTC", quantity: 0.0002, avgCost: 50000 }],
      prices: { BTC: 55000 },
      realizedPnl: 0,
      peakEquity: 20,
    });
    expect(result.investedCost).toBeCloseTo(10, 6);
    expect(result.positionsValue).toBeCloseTo(11, 6);
    expect(result.unrealizedPnl).toBeCloseTo(1, 6);
    expect(result.equity).toBeCloseTo(21, 6);
    expect(result.roiPct).toBeCloseTo(5, 6);
  });

  it("calcula el drawdown desde el máximo de patrimonio", () => {
    const result = computePortfolio({
      initialCapital: 20,
      cash: 18,
      positions: [],
      prices: {},
      realizedPnl: -2,
      peakEquity: 24,
    });
    expect(result.equity).toBe(18);
    expect(result.maxDrawdown).toBeCloseTo(6, 6);
    expect(result.maxDrawdownPct).toBeCloseTo(25, 6);
    expect(result.roiPct).toBeCloseTo(-10, 6);
  });
});

describe("quoteBuy / quoteSell", () => {
  it("descuenta comisiones al comprar", () => {
    const quote = quoteBuy({ price: 100, amountFiat: 50, feePct: 1 });
    expect(quote.fees).toBeCloseTo(0.5, 6);
    expect(quote.quantity).toBeCloseTo(0.495, 6);
    expect(quote.totalCost).toBeCloseTo(50, 6);
  });

  it("descuenta comisiones al vender", () => {
    const quote = quoteSell({ price: 100, quantity: 0.5, feePct: 2 });
    expect(quote.gross).toBeCloseTo(50, 6);
    expect(quote.fees).toBeCloseTo(1, 6);
    expect(quote.net).toBeCloseTo(49, 6);
  });
});

describe("computeTradeStats", () => {
  const trades = [
    { side: "buy" as const, realizedPnl: 0, total: 10, asset: "BTC" },
    { side: "sell" as const, realizedPnl: 2, total: 12, asset: "BTC" },
    { side: "sell" as const, realizedPnl: -1, total: 5, asset: "ETH" },
  ];

  it("cuenta operaciones, ganadoras y perdedoras", () => {
    const stats = computeTradeStats(trades);
    expect(stats.totalTrades).toBe(3);
    expect(stats.closedTrades).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winRatePct).toBeCloseTo(50, 6);
    expect(stats.realizedPnl).toBeCloseTo(1, 6);
    expect(stats.bestTrade?.realizedPnl).toBe(2);
    expect(stats.worstTrade?.realizedPnl).toBe(-1);
  });

  it("no divide por cero sin ventas", () => {
    const stats = computeTradeStats([{ side: "buy", realizedPnl: 0, total: 10, asset: "BTC" }]);
    expect(stats.winRatePct).toBe(0);
    expect(stats.bestTrade).toBeNull();
  });
});

import { computeRealLedger } from "./accounting";

describe("computeRealLedger", () => {
  it("calcula coste medio, venta parcial y comisiones", () => {
    const l = computeRealLedger([
      { id: "a", asset: "BTC", fiat: "EUR", side: "buy", quantity: 1, price: 100, fees: 2, executedAt: "2026-01-01" },
      { id: "b", asset: "BTC", fiat: "EUR", side: "buy", quantity: 1, price: 200, fees: 0, executedAt: "2026-01-02" },
      { id: "c", asset: "BTC", fiat: "EUR", side: "sell", quantity: 1, price: 300, fees: 1, executedAt: "2026-01-03" },
    ]);
    const p = l.positions[0]!;
    expect(p.quantity).toBe(1);
    expect(p.avgCost).toBeCloseTo(151);
    expect(l.tradePnl["c"]).toBeCloseTo(148);
    expect(l.oversold).toEqual([]);
  });
  it("marca ventas sin saldo registrado", () => {
    const l = computeRealLedger([
      { id: "x", asset: "ETH", fiat: "EUR", side: "sell", quantity: 1, price: 10, fees: 0, executedAt: "2026-01-01" },
    ]);
    expect(l.oversold).toEqual(["x"]);
  });
});
