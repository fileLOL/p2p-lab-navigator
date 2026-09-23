import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { RealTradeDialog, type RealTradeTarget } from "@/components/RealTradeDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteRealTrade, listRealTrades, listTrades } from "@/lib/api.functions";
import { formatMoney, formatQty } from "@/lib/accounting";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/operaciones")({
  head: () => ({
    meta: [
      { title: "Operaciones — P2P Lab" },
      {
        name: "description",
        content:
          "Histórico de tus compras y ventas: simuladas con capital virtual y reales ejecutadas fuera de P2P Lab.",
      },
      { property: "og:title", content: "Operaciones — P2P Lab" },
      { property: "og:description", content: "Histórico de tus operaciones simuladas y reales." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TradesPage,
});

function TradesPage() {
  return (
    <AppShell title="Operaciones" subtitle="Histórico de tus simulaciones y operaciones reales">
      <Tabs defaultValue="simuladas">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="simuladas">Simuladas</TabsTrigger>
            <TabsTrigger value="reales">Reales</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="simuladas">
          <PaperTradesSection />
        </TabsContent>
        <TabsContent value="reales">
          <RealTradesSection />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function PaperTradesSection() {
  const [page, setPage] = useState(0);
  const fn = useServerFn(listTrades);
  const { data, isLoading } = useQuery({
    queryKey: ["trades", page],
    queryFn: () => fn({ data: { page, pageSize: PAGE_SIZE } }),
  });

  if (isLoading) return <Spinner />;
  if (!data || data.trades.length === 0) {
    return (
      <EmptyHistory
        icon={<History className="size-6 text-muted-foreground" />}
        title="Todavía no hay operaciones simuladas"
        description="Cuando simules una compra o una venta aparecerá aquí."
      />
    );
  }
  return (
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
                <td className="p-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                <td className="p-3">
                  <SideBadge side={t.side} />
                </td>
                <td className="p-3 font-medium">{t.asset}</td>
                <td className="num p-3">{formatQty(t.quantity)}</td>
                <td className="num p-3">{formatMoney(t.price, "EUR", t.price < 10 ? 4 : 2)}</td>
                <td className="num p-3">{formatMoney(t.total, "EUR")}</td>
                <td
                  className={`num p-3 ${t.realized_pnl > 0 ? "text-success" : t.realized_pnl < 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {t.side === "sell" ? formatMoney(t.realized_pnl, "EUR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

function RealTradesSection() {
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<RealTradeTarget | null>(null);
  const listFn = useServerFn(listRealTrades);
  const deleteFn = useServerFn(deleteRealTrade);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["real-trades", page],
    queryFn: () => listFn({ data: { page, pageSize: PAGE_SIZE } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Operación real eliminada.");
      void refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openManual = () => {
    setTarget({ asset: "BTC", fiat: "EUR", side: "buy", price: 0 });
    setDialogOpen(true);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Registra compras y ventas que has ejecutado fuera de P2P Lab, con el proveedor.
        </p>
        <Button size="sm" onClick={openManual}>
          <Plus className="size-4" /> Registrar operación real
        </Button>
      </div>

      {!data || data.trades.length === 0 ? (
        <EmptyHistory
          icon={<History className="size-6 text-muted-foreground" />}
          title="Todavía no hay operaciones reales registradas"
          description="Pulsa «Registrar operación real» o guárdala desde una oportunidad con la opción «Registrar ejecutada»."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/trading-real">Ver cómo operar en el proveedor</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="surface-card overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Activo</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Contraparte</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {data.trades.map((t) => (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 text-muted-foreground">{formatDate(t.executed_at)}</td>
                    <td className="p-3">
                      <SideBadge side={t.side} />
                    </td>
                    <td className="p-3 font-medium">{t.asset}</td>
                    <td className="num p-3">{formatQty(t.quantity)}</td>
                    <td className="num p-3">
                      {formatMoney(t.price, t.fiat, t.price < 10 ? 4 : 2)}
                    </td>
                    <td className="num p-3">{formatMoney(t.total, t.fiat)}</td>
                    <td className="p-3 text-muted-foreground">{t.provider ?? "—"}</td>
                    <td className="max-w-[160px] truncate p-3 text-muted-foreground">
                      {t.counterparty ?? "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => del.mutate(t.id)}
                        disabled={del.isPending}
                        title="Eliminar"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={page}
            total={data.total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}

      <RealTradeDialog
        target={target}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setPage(0);
          void refetch();
        }}
      />
    </div>
  );
}

function SideBadge({ side }: { side: "buy" | "sell" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        side === "buy" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
      }`}
    >
      {side === "buy" ? "Compra" : "Venta"}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyHistory({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function PaginationControls({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        {total} operaciones en total · página {page + 1}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={(page + 1) * pageSize >= total}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
