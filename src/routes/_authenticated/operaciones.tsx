import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { listTrades } from "@/lib/api.functions";
import { formatMoney, formatQty } from "@/lib/accounting";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/operaciones")({
  head: () => ({
    meta: [
      { title: "Operaciones simuladas — P2P Lab" },
      { name: "description", content: "Histórico completo de tus compras y ventas simuladas con capital virtual." },
      { property: "og:title", content: "Operaciones simuladas — P2P Lab" },
      { property: "og:description", content: "Histórico de tus operaciones simuladas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TradesPage,
});

function TradesPage() {
  const [page, setPage] = useState(0);
  const fn = useServerFn(listTrades);
  const { data, isLoading } = useQuery({
    queryKey: ["trades", page],
    queryFn: () => fn({ data: { page, pageSize: PAGE_SIZE } }),
  });

  return (
    <AppShell title="Operaciones" subtitle="Histórico de tus simulaciones">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.trades.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
          <History className="size-6 text-muted-foreground" />
          <p className="font-medium">Todavía no hay operaciones</p>
          <p className="text-sm text-muted-foreground">Cuando simules una compra o una venta aparecerá aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Activo</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.side === "buy" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                        }`}
                      >
                        {t.side === "buy" ? "Compra" : "Venta"}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{t.asset}</td>
                    <td className="num p-3">{formatQty(t.quantity)}</td>
                    <td className="num p-3">{formatMoney(t.price, "EUR", t.price < 10 ? 4 : 2)}</td>
                    <td className="num p-3">{formatMoney(t.total, "EUR")}</td>
                    <td className={`num p-3 ${t.realized_pnl > 0 ? "text-success" : t.realized_pnl < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {t.side === "sell" ? formatMoney(t.realized_pnl, "EUR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data.total} operaciones en total · página {page + 1}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
