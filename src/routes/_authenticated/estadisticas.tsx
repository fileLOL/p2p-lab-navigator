import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MetricCard, toneOf } from "@/components/MetricCard";
import { useOverview } from "@/hooks/useOverview";
import { computeTradeStats, formatMoney, formatPct } from "@/lib/accounting";

export const Route = createFileRoute("/_authenticated/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — P2P Lab" },
      { name: "description", content: "Rentabilidad, ratio de acierto, drawdown y desglose por activo de tu simulación." },
      { property: "og:title", content: "Estadísticas — P2P Lab" },
      { property: "og:description", content: "Rendimiento detallado de tu cartera simulada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { data, isLoading } = useOverview();

  if (isLoading) {
    return (
      <AppShell title="Estadísticas">
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  const stats = computeTradeStats(
    data.trades.map((t) => ({ side: t.side, realizedPnl: t.realized_pnl, total: t.total, asset: t.asset })),
  );

  return (
    <AppShell title="Estadísticas" subtitle="Cómo está rindiendo tu simulación">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="ROI" value={formatPct(data.metrics.roi_pct)} tone={toneOf(data.metrics.roi_pct)} />
          <MetricCard
            label="Beneficio total"
            value={formatMoney(data.metrics.total_pnl)}
            tone={toneOf(data.metrics.total_pnl)}
          />
          <MetricCard
            label="Ratio de acierto"
            value={stats.closedTrades > 0 ? `${stats.winRate.toFixed(1)} %` : "—"}
            hint={`${stats.wins} ganadoras / ${stats.losses} perdedoras`}
          />
          <MetricCard
            label="Drawdown máximo"
            value={`${data.metrics.max_drawdown_pct.toFixed(2)} %`}
            hint={formatMoney(data.metrics.max_drawdown)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="surface-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumen de actividad</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Operaciones totales" value={String(stats.totalTrades)} />
              <Row label="Compras" value={String(stats.buys)} />
              <Row label="Ventas" value={String(stats.sells)} />
              <Row label="Volumen simulado" value={formatMoney(stats.volume)} />
              <Row label="Mejor operación" value={stats.bestTrade === null ? "—" : formatMoney(stats.bestTrade)} />
              <Row label="Peor operación" value={stats.worstTrade === null ? "—" : formatMoney(stats.worstTrade)} />
            </dl>
          </div>

          <div className="surface-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resultado por activo</p>
            {stats.byAsset.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BarChart3 className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aún no hay operaciones cerradas.</p>
              </div>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                {stats.byAsset.map((a) => (
                  <div key={a.asset} className="flex items-center justify-between">
                    <dt>{a.asset}</dt>
                    <dd className={`num ${a.realizedPnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatMoney(a.realizedPnl)} · {a.trades} ops
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
