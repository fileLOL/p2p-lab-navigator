import { BarChart3, Loader2 } from "lucide-react";

import { MetricCard, toneOf } from "@/components/MetricCard";
import { useRealOverview } from "@/hooks/useRealOverview";
import { computeTradeStats, formatMoney } from "@/lib/accounting";

export function RealStatsView() {
  const { data, isLoading, error } = useRealOverview();
  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const stats = computeTradeStats(
    data.trades.map((t) => ({
      side: t.side,
      realizedPnl: t.realized_pnl,
      total: t.total,
      asset: t.asset,
    })),
  );
  const volume = data.trades.reduce((a, t) => a + t.total, 0);
  const byAsset = data.positions.filter((p) => p.realized_pnl !== 0 || p.quantity > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Beneficio total"
          value={formatMoney(data.metrics.total_pnl)}
          tone={toneOf(data.metrics.total_pnl)}
        />
        <MetricCard
          label="Beneficio realizado"
          value={formatMoney(data.metrics.realized_pnl)}
          tone={toneOf(data.metrics.realized_pnl)}
        />
        <MetricCard
          label="Ratio de acierto"
          value={stats.closedTrades > 0 ? `${stats.winRatePct.toFixed(1)} %` : "—"}
          hint={`${stats.wins} ganadoras / ${stats.losses} perdedoras`}
        />
        <MetricCard label="Volumen real" value={formatMoney(volume)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="surface-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resumen de actividad real
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Operaciones totales" value={String(stats.totalTrades)} />
            <Row label="Ventas" value={String(stats.closedTrades)} />
            <Row
              label="Mejor operación"
              value={stats.bestTrade ? formatMoney(stats.bestTrade.realizedPnl) : "—"}
            />
            <Row
              label="Peor operación"
              value={stats.worstTrade ? formatMoney(stats.worstTrade.realizedPnl) : "—"}
            />
          </dl>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resultado por activo
          </p>
          {byAsset.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BarChart3 className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aún no hay operaciones reales.</p>
            </div>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {byAsset.map((a) => (
                <div key={`${a.asset}-${a.fiat}`} className="flex items-center justify-between">
                  <dt>
                    {a.asset} <span className="text-xs text-muted-foreground">{a.fiat}</span>
                  </dt>
                  <dd className={`num ${a.realized_pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {formatMoney(a.realized_pnl, a.fiat)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
