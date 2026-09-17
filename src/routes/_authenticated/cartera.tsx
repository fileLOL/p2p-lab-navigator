import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { MetricCard, toneOf } from "@/components/MetricCard";
import { SimulateDialog, type SimulationTarget } from "@/components/SimulateDialog";
import { Button } from "@/components/ui/button";
import { useOverview } from "@/hooks/useOverview";
import { formatMoney, formatPct, formatQty } from "@/lib/accounting";
import { SIMULATION_DISCLAIMER } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/cartera")({
  head: () => ({
    meta: [
      { title: "Cartera virtual — P2P Lab" },
      {
        name: "description",
        content: "Consulta tus posiciones abiertas, su coste medio y su beneficio no realizado.",
      },
      { property: "og:title", content: "Cartera virtual — P2P Lab" },
      { property: "og:description", content: "Posiciones abiertas de tu cartera simulada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data, isLoading } = useOverview();
  const [target, setTarget] = useState<SimulationTarget | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <AppShell title="Cartera" subtitle="Tus posiciones abiertas">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Efectivo" value={formatMoney(data.metrics.cash)} />
            <MetricCard
              label="Valor de posiciones"
              value={formatMoney(data.metrics.positions_value)}
            />
            <MetricCard
              label="Beneficio no realizado"
              value={formatMoney(data.metrics.unrealized_pnl)}
              tone={toneOf(data.metrics.unrealized_pnl)}
            />
          </div>

          {data.positions.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
              <Wallet className="size-6 text-muted-foreground" />
              <p className="font-medium">Tu cartera está vacía</p>
              <p className="text-sm text-muted-foreground">
                Simula una compra desde Oportunidades para abrir tu primera posición.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.positions.map((p) => {
                const value = p.value;
                const cost = p.quantity * p.avg_cost;
                const pnl = p.unrealized_pnl;
                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                return (
                  <article key={p.asset} className="surface-card p-4">
                    <header className="flex items-center justify-between">
                      <p className="font-display text-lg font-semibold">{p.asset}</p>
                      <p
                        className={`num text-sm ${pnl >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {formatMoney(pnl)} ({formatPct(pnlPct)})
                      </p>
                    </header>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <Item label="Cantidad" value={formatQty(p.quantity)} />
                      <Item
                        label="Coste medio"
                        value={formatMoney(p.avg_cost, "EUR", p.avg_cost < 10 ? 4 : 2)}
                      />
                      <Item
                        label="Precio actual"
                        value={formatMoney(p.price, "EUR", p.price < 10 ? 4 : 2)}
                      />
                      <Item label="Valor" value={formatMoney(value)} />
                    </dl>
                    <Button
                      className="mt-4 w-full"
                      variant="outline"
                      onClick={() => {
                        setTarget({
                          asset: p.asset,
                          fiat: "EUR",
                          side: "sell",
                          price: p.price,
                          availableQuantity: p.quantity,
                        });
                        setOpen(true);
                      }}
                    >
                      Simular venta
                    </Button>
                  </article>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{SIMULATION_DISCLAIMER}</p>
        </div>
      ) : null}

      <SimulateDialog target={target} open={open} onOpenChange={setOpen} />
    </AppShell>
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
