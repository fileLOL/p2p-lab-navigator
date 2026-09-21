import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, KeyRound, Loader2, PlugZap, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSETS, FIATS } from "@/lib/config";
import { formatMoney } from "@/lib/accounting";
import {
  connectExchange,
  disconnectExchange,
  getExchangeConnection,
  getRealBalances,
  getRealPrice,
  listRealOrders,
  placeRealOrder,
} from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/trading-real")({
  head: () => ({
    meta: [
      { title: "Trading real — P2P Lab" },
      {
        name: "description",
        content: "Opera con criptomonedas reales desde P2P Lab usando tu propia cuenta de Binance.",
      },
      { property: "og:title", content: "Trading real — P2P Lab" },
      {
        property: "og:description",
        content: "Opera con criptomonedas reales desde P2P Lab usando tu propia cuenta de Binance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TradingRealPage,
});

function TradingRealPage() {
  const queryClient = useQueryClient();
  const connectionFn = useServerFn(getExchangeConnection);
  const connectionQuery = useQuery({
    queryKey: ["exchange-connection"],
    queryFn: () => connectionFn(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["exchange-connection"] });
    void queryClient.invalidateQueries({ queryKey: ["real-balances"] });
    void queryClient.invalidateQueries({ queryKey: ["real-orders"] });
  };

  return (
    <AppShell
      title="Trading real"
      subtitle="Opera con dinero real desde tu propia cuenta de Binance"
    >
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          Esto no es una simulación: las órdenes se ejecutan con dinero real en tu cuenta de
          Binance. P2P Lab no custodia fondos ni garantiza resultados; tú eres el único responsable
          de tus operaciones.
        </p>
      </div>

      {connectionQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : connectionQuery.data?.connected ? (
        <ConnectedView
          apiKeyPreview={connectionQuery.data.apiKeyPreview ?? ""}
          onChanged={invalidate}
        />
      ) : (
        <ConnectForm onConnected={invalidate} />
      )}
    </AppShell>
  );
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const connectFn = useServerFn(connectExchange);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const mutation = useMutation({
    mutationFn: () => connectFn({ data: { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() } }),
    onSuccess: () => {
      toast.success("Cuenta de Binance conectada.");
      setApiKey("");
      setApiSecret("");
      onConnected();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se ha podido conectar."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Conectar Binance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>En Binance, ve a «Gestión de API» y crea una clave nueva.</li>
          <li>
            Activa solo los permisos de <strong>lectura y trading spot</strong>. Nunca actives
            retiradas.
          </li>
          <li>Si puedes, restringe la clave por IP.</li>
          <li>
            Pega aquí la clave y el secreto; los guardamos cifrados y nunca salen del servidor.
          </li>
        </ol>
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            placeholder="Pega tu API Key"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="api-secret">API Secret</Label>
          <Input
            id="api-secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            autoComplete="off"
            placeholder="Pega tu API Secret"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !apiKey.trim() || !apiSecret.trim()}
          className="w-full"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlugZap className="size-4" />
          )}
          Validar y conectar
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectedView({
  apiKeyPreview,
  onChanged,
}: {
  apiKeyPreview: string;
  onChanged: () => void;
}) {
  const balancesFn = useServerFn(getRealBalances);
  const ordersFn = useServerFn(listRealOrders);
  const disconnectFn = useServerFn(disconnectExchange);

  const balancesQuery = useQuery({
    queryKey: ["real-balances"],
    queryFn: () => balancesFn(),
    retry: false,
  });
  const ordersQuery = useQuery({
    queryKey: ["real-orders"],
    queryFn: () => ordersFn(),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => {
      toast.success("Binance desconectado. Tus claves se han eliminado.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se ha podido desconectar."),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            Binance conectado · clave <span className="font-mono">{apiKeyPreview}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void balancesQuery.refetch();
                void ordersQuery.refetch();
              }}
            >
              <RefreshCw className="size-4" /> Actualizar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <Unplug className="size-4" /> Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo real</CardTitle>
        </CardHeader>
        <CardContent>
          {balancesQuery.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : balancesQuery.isError ? (
            <p className="text-sm text-destructive">
              {balancesQuery.error instanceof Error
                ? balancesQuery.error.message
                : "No se ha podido leer el saldo."}
            </p>
          ) : (balancesQuery.data?.balances.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Tu cuenta de Binance no tiene saldo.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {balancesQuery.data?.balances.map((b) => (
                <li key={b.asset} className="flex items-center justify-between py-2">
                  <span className="font-medium">{b.asset}</span>
                  <span className="font-mono">
                    {b.free.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                    {b.locked > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({b.locked.toLocaleString("es-ES", { maximumFractionDigits: 8 })} en
                        órdenes)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <OrderForm onChanged={onChanged} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Órdenes reales</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (ordersQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no has ejecutado órdenes reales.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {ordersQuery.data?.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <span
                      className={
                        o.side === "BUY"
                          ? "font-medium text-emerald-600"
                          : "font-medium text-red-600"
                      }
                    >
                      {o.side === "BUY" ? "Compra" : "Venta"}
                    </span>{" "}
                    <span className="font-mono">{o.symbol}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("es-ES")}
                    </span>
                  </div>
                  <div className="text-right">
                    {o.status === "failed" ? (
                      <span className="text-xs text-destructive">{o.error ?? "Fallida"}</span>
                    ) : (
                      <span className="font-mono">
                        {o.quantity.toLocaleString("es-ES", { maximumFractionDigits: 8 })}
                        {o.quote_quantity != null &&
                          ` · ${formatMoney(o.quote_quantity, o.symbol.slice(-3) === "EUR" ? "EUR" : "USD")}`}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderForm({ onChanged }: { onChanged: () => void }) {
  const priceFn = useServerFn(getRealPrice);
  const placeFn = useServerFn(placeRealOrder);

  const [asset, setAsset] = useState<string>(ASSETS[0]);
  const [fiat, setFiat] = useState<string>(FIATS[0]);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const priceQuery = useQuery({
    queryKey: ["real-price", asset, fiat],
    queryFn: () => priceFn({ data: { asset, fiat } }),
    staleTime: 15_000,
  });

  const qty = Number(quantity);
  const estimated = priceQuery.data?.price != null && qty > 0 ? qty * priceQuery.data.price : null;

  const mutation = useMutation({
    mutationFn: () =>
      placeFn({
        data: { asset, fiat, side, quantity: qty, confirmation: confirmation.trim() },
      }),
    onSuccess: (r) => {
      toast.success(`Orden ejecutada (${r.status}).`);
      setQuantity("");
      setConfirmation("");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se ha podido ejecutar."),
  });

  const ready =
    qty > 0 && confirmation.trim() === "CONFIRMAR" && !mutation.isPending && estimated != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nueva orden real (a mercado)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Activo</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSETS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={fiat} onValueChange={setFiat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Operación</Label>
            <Select value={side} onValueChange={(v) => setSide(v as "BUY" | "SELL")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Comprar</SelectItem>
                <SelectItem value="SELL">Vender</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="real-qty">Cantidad de {asset}</Label>
            <Input
              id="real-qty"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.001"
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          {estimated != null ? (
            <p>
              Valor estimado: <strong>{formatMoney(estimated, fiat as "EUR" | "USD")}</strong> (
              {qty} {asset} × {priceQuery.data?.price?.toLocaleString("es-ES")} {fiat})
            </p>
          ) : (
            <p className="text-muted-foreground">
              {priceQuery.data?.price == null && !priceQuery.isLoading
                ? "Este par no existe en Binance spot."
                : "Introduce una cantidad para ver el valor estimado."}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="real-confirm">
            Escribe <span className="font-mono font-semibold">CONFIRMAR</span> para ejecutar la
            orden con dinero real
          </Label>
          <Input
            id="real-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            placeholder="CONFIRMAR"
          />
        </div>

        <Button
          variant={side === "BUY" ? "default" : "destructive"}
          className="w-full"
          disabled={!ready}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {side === "BUY" ? "Comprar" : "Vender"} {qty > 0 ? `${qty} ${asset}` : asset} con dinero
          real
        </Button>
      </CardContent>
    </Card>
  );
}
