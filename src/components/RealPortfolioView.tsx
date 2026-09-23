import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";
import { useState } from "react";

import { MetricCard, toneOf } from "@/components/MetricCard";
import { RealTradeDialog, type RealTradeTarget } from "@/components/RealTradeDialog";
import { Button } from "@/components/ui/button";
import { useRealOverview } from "@/hooks/useRealOverview";
import { formatMoney, formatPct, formatQty } from "@/lib/accounting";

export function RealPortfolioView() {
  const { data, isLoading, error } = useRealOverview();
  const qc = useQueryClient();
  const [target, setTarget] = useState<RealTradeTarget | null>(null);
  const [open, setOpen] = useState(false);

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const open_ = data.positions.filter((p) => p.quantity > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Coste invertido" value={formatMoney(data.metrics.invested_cost)} />
        <MetricCard
          label="Valor de mercado"
          value={formatMoney(data.metrics.positions_value)}
          hint={data.metrics.missing_prices ? "Algún precio no disponible" : "Precio CoinGecko"}
        />
        <MetricCard
          label="Beneficio total"
          value={formatMoney(data.metrics.total_pnl)}
          tone={toneOf(data.metrics.total_pnl)}
          hint={`Realizado ${formatMoney(data.metrics.realized_pnl)} · No realizado ${formatMoney(data.metrics.unrealized_pnl)}`}
        />
      </div>

      {open_.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <p className="font-medium">No tienes posiciones reales registradas</p>
          <p className="text-sm text-muted-foreground">
            Busca en modo Real, opera en Binance y registra la operación para seguirla aquí.
          </p>
          <Button asChild className="mt-2">
            <Link to="/oportunidades" search={{ modo: "real" }}>
              Buscar ofertas reales
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {open_.map((p) => {
            const cost = p.quantity * p.avg_cost;
            const pnl = p.unrealized_pnl;
            const d = (v: number) => (v < 10 ? 4 : 2);
            return (
              <article key={`${p.asset}-${p.fiat}`} className="surface-card p-4">
                <header className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold">
                    {p.asset} <span className="text-xs text-muted-foreground">{p.fiat}</span>
                  </p>
                  {pnl === null ? (
                    <p className="text-xs text-muted-foreground">Precio no disponible</p>
                  ) : (
                    <p className={`num text-sm ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatMoney(pnl, p.fiat)} ({formatPct(cost > 0 ? (pnl / cost) * 100 : 0)})
                    </p>
                  )}
                </header>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <Item label="Cantidad" value={formatQty(p.quantity)} />
                  <Item label="Coste medio" value={formatMoney(p.avg_cost, p.fiat, d(p.avg_cost))} />
                  <Item
                    label="Precio actual"
                    value={p.price === null ? "—" : formatMoney(p.price, p.fiat, d(p.price))}
                  />
                  <Item label="Realizado" value={formatMoney(p.realized_pnl, p.fiat)} />
                </dl>
                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => {
                    setTarget({
                      asset: p.asset,
                      fiat: p.fiat,
                      side: "sell",
                      price: p.price ?? p.avg_cost,
                      availableQuantity: p.quantity,
                    });
                    setOpen(true);
                  }}
                >
                  Registrar venta real
                </Button>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Operaciones ejecutadas por ti con terceros. P2P Lab no custodia fondos: solo lleva el
        seguimiento.
      </p>
      <RealTradeDialog
        target={target}
        open={open}
        onOpenChange={setOpen}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["real-overview"] })}
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
