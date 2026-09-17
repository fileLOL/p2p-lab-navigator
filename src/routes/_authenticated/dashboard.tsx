import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MetricCard, toneOf } from "@/components/MetricCard";
import { QuotaCard } from "@/components/QuotaCard";
import { Button } from "@/components/ui/button";
import { useOverview } from "@/hooks/useOverview";
import { formatMoney, formatPct, computeTradeStats } from "@/lib/accounting";
import { SIMULATION_DISCLAIMER } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — P2P Lab" },
      { name: "description", content: "Resumen de tu cartera virtual: patrimonio, beneficio, ROI y cuota de búsquedas." },
      { property: "og:title", content: "Dashboard — P2P Lab" },
      { property: "og:description", content: "Resumen de tu cartera virtual en P2P Lab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, error, refetch } = useOverview();

  return (
    <AppShell title="Dashboard" subtitle="Tu simulación en un vistazo">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Patrimonio total" value={formatMoney(data.metrics.equity)} hint="Efectivo + posiciones" />
            <MetricCard label="Efectivo disponible" value={formatMoney(data.metrics.cash)} />
            <MetricCard label="Capital invertido" value={formatMoney(data.metrics.invested_cost)} hint="Coste de posiciones abiertas" />
            <MetricCard label="Valor de cartera" value={formatMoney(data.metrics.positions_value)} />
            <MetricCard
              label="Beneficio realizado"
              value={formatMoney(data.metrics.realized_pnl)}
              tone={toneOf(data.metrics.realized_pnl)}
            />
            <MetricCard
              label="Beneficio no realizado"
              value={formatMoney(data.metrics.unrealized_pnl)}
              tone={toneOf(data.metrics.unrealized_pnl)}
            />
            <MetricCard
              label="Beneficio total"
              value={formatMoney(data.metrics.total_pnl)}
              tone={toneOf(data.metrics.total_pnl)}
            />
            <MetricCard
              label="ROI"
              value={formatPct(data.metrics.roi_pct)}
              tone={toneOf(data.metrics.roi_pct)}
              hint={`Capital inicial ${formatMoney(data.metrics.initial_capital)}`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <QuotaCard quota={data.quota} />
            <TradeSummary trades={data.trades} drawdown={data.metrics.max_drawdown} drawdownPct={data.metrics.max_drawdown_pct} />
            <div className="surface-card flex flex-col justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Siguiente paso</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Busca oportunidades P2P, compáralas y simula una operación con tu capital virtual.
                </p>
              </div>
              <Button asChild className="mt-4">
                <Link to="/oportunidades">Buscar oportunidades</Link>
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{SIMULATION_DISCLAIMER}</p>
        </div>
      ) : null}
    </AppShell>
  );
}

function TradeSummary({
  trades,
  drawdown,
  drawdownPct,
}: {
  trades: { side: "buy" | "sell"; realized_pnl: number; total: number; asset: string }[];
  drawdown: number;
  drawdownPct: number;
}) {
  const stats = computeTradeStats(
    trades.map((t) => ({ side: t.side, realizedPnl: t.realized_pnl, total: t.total, asset: t.asset })),
  );

  return (
    <div className="surface-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actividad</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Operaciones" value={String(stats.totalTrades)} />
        <Row label="Ganadoras" value={String(stats.wins)} />
        <Row label="Perdedoras" value={String(stats.losses)} />
        <Row label="Drawdown máximo" value={`${formatMoney(drawdown)} (${drawdownPct.toFixed(2)} %)`} />
      </dl>
    </div>
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

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 p-8 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="font-medium">No hemos podido cargar tus datos</p>
      <p className="text-sm text-muted-foreground">Comprueba tu conexión e inténtalo de nuevo.</p>
      <Button onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
