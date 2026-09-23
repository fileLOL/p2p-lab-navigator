import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clipboard, ExternalLink, Loader2, SearchX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DataModeBadge } from "@/components/DataModeBadge";
import { ProviderLeaveDialog } from "@/components/ProviderLeaveDialog";
import { QuotaCard } from "@/components/QuotaCard";
import { RealTradeDialog, type RealTradeTarget } from "@/components/RealTradeDialog";
import { SimulateDialog, type SimulationTarget } from "@/components/SimulateDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOverview } from "@/hooks/useOverview";
import { searchOpportunities, type OpportunityDTO, type QuotaState } from "@/lib/api.functions";
import { formatMoney, formatPct } from "@/lib/accounting";
import { ASSETS, FIATS, PAYMENT_METHODS, SPREAD_DISCLAIMER } from "@/lib/config";
import { isProviderLeaveDismissed, openProviderUrl } from "@/lib/providerLeaving";

export const Route = createFileRoute("/_authenticated/oportunidades")({
  head: () => ({
    meta: [
      { title: "Oportunidades P2P — P2P Lab" },
      {
        name: "description",
        content:
          "Busca y compara ofertas y demandas P2P de criptomonedas por activo, moneda, importe y método de pago.",
      },
      { property: "og:title", content: "Oportunidades P2P — P2P Lab" },
      { property: "og:description", content: "Busca y compara ofertas P2P de criptomonedas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const { data: overview, refetch: refetchOverview } = useOverview();
  const searchFn = useServerFn(searchOpportunities);

  const [asset, setAsset] = useState<string>("BTC");
  const [fiat, setFiat] = useState<string>("EUR");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [onlyReal, setOnlyReal] = useState(false);

  const [results, setResults] = useState<OpportunityDTO[] | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [sourceStatus, setSourceStatus] = useState<
    { name: string; status: string; message?: string | undefined }[]
  >([]);
  const [target, setTarget] = useState<SimulationTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [realTarget, setRealTarget] = useState<RealTradeTarget | null>(null);
  const [realDialogOpen, setRealDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leaveUrl, setLeaveUrl] = useState<string | null>(null);
  const [leaveProvider, setLeaveProvider] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      searchFn({
        data: {
          asset,
          fiat,
          side,
          amount: amount ? Number(amount) : null,
          paymentMethod: paymentMethod === "all" ? null : paymentMethod,
          location: null,
          allowDemo: !onlyReal,
        },
      }),
    onSuccess: (result) => {
      setQuota(result.quota);
      setSourceStatus(result.sourceStatus);
      void refetchOverview();
      if (!result.allowed) {
        setResults([]);
        toast.error("Has alcanzado el límite de búsquedas de tu plan.");
        return;
      }
      setResults(result.opportunities);
      if (result.opportunities.length === 0)
        toast.info("No hemos encontrado oportunidades con estos filtros.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentQuota = quota ?? overview?.quota ?? null;
  const cash = overview?.metrics.cash ?? 0;
  const position = overview?.positions.find((p) => p.asset === asset);

  const openSimulation = (opportunity: OpportunityDTO) => {
    setTarget({
      asset: opportunity.asset,
      fiat: opportunity.fiat,
      side: opportunity.side,
      price: opportunity.price,
      opportunityId: opportunity.id,
      providerName: opportunity.provider_name,
      availableCash: cash,
      availableQuantity:
        overview?.positions.find((p) => p.asset === opportunity.asset)?.quantity ?? 0,
    });
    setDialogOpen(true);
  };

  const openRealRegister = (opportunity: OpportunityDTO) => {
    setRealTarget({
      asset: opportunity.asset,
      fiat: opportunity.fiat,
      side: opportunity.side,
      price: opportunity.price,
      opportunityId: opportunity.id,
      providerName: opportunity.provider_name,
      counterparty: opportunity.counterparty,
      amountMin: opportunity.amount_min,
      amountMax: opportunity.amount_max,
    });
    setRealDialogOpen(true);
  };

  const copyOpportunity = async (opportunity: OpportunityDTO) => {
    const digits = opportunity.price < 10 ? 4 : 2;
    const summary = [
      opportunity.counterparty ? `Contraparte: ${opportunity.counterparty}` : null,
      `${opportunity.side === "buy" ? "Comprar" : "Vender"} ${opportunity.asset} a ${formatMoney(opportunity.price, opportunity.fiat, digits)}`,
      opportunity.payment_method ? `Método: ${opportunity.payment_method}` : null,
      opportunity.source_url ? `Enlace: ${opportunity.source_url}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedId(opportunity.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("No se pudo copiar la oferta.");
    }
  };

  const openProvider = (opportunity: OpportunityDTO) => {
    if (!opportunity.source_url) return;
    if (isProviderLeaveDismissed()) {
      openProviderUrl(opportunity.source_url);
      return;
    }
    setLeaveProvider(opportunity.provider_name);
    setLeaveUrl(opportunity.source_url);
  };

  return (
    <AppShell title="Oportunidades" subtitle="Busca, compara y simula operaciones P2P">
      <div className="space-y-5">
        {currentQuota ? <QuotaCard quota={currentQuota} /> : null}

        <div className="surface-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Operación">
              <Select value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Comprar crypto</SelectItem>
                  <SelectItem value="sell">Vender crypto</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Activo">
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
            </Field>
            <Field label="Moneda">
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
            </Field>
            <Field label="Importe">
              <Input
                inputMode="decimal"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Método de pago">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquiera</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Button
            className="mt-4 w-full sm:w-auto"
            size="lg"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Buscar oportunidades
          </Button>
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={onlyReal} onCheckedChange={(v) => setOnlyReal(v === true)} />
            <span>
              Solo ofertas reales <span className="text-xs">(oculta las de demostración)</span>
            </span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Cada búsqueda consume una unidad de tu cuota y devuelve hasta 10 oportunidades. Las
            simulaciones son ilimitadas.
          </p>
        </div>

        {sourceStatus.length > 0 ? (
          <div className="surface-card p-4 text-sm">
            <p className="font-medium">Estado de las fuentes</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {sourceStatus.map((s) => (
                <li key={s.name}>
                  <span className="text-foreground">{s.name}</span>: {statusLabel(s.status)}
                  {s.message ? ` — ${s.message}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {results === null ? (
          <EmptyState
            title="Aún no has buscado"
            description="Elige los filtros y pulsa «Buscar oportunidades» para ver ofertas P2P."
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="Sin oportunidades"
            description={
              currentQuota && currentQuota.limit >= 0 && currentQuota.remaining <= 0
                ? "Has agotado tu cuota diaria. Tu cartera y tus operaciones siguen disponibles."
                : "Prueba con otro activo, importe o método de pago."
            }
            action={
              currentQuota && currentQuota.limit >= 0 && currentQuota.remaining <= 0 ? (
                <Button asChild>
                  <Link to="/planes">Actualizar a Premium</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {results.map((o) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                copied={copiedId === o.id}
                onSimulate={() => openSimulation(o)}
                onRegister={() => openRealRegister(o)}
                onCopy={() => copyOpportunity(o)}
                onOpenProvider={() => openProvider(o)}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">{SPREAD_DISCLAIMER}</p>
        {position ? (
          <p className="text-xs text-muted-foreground">
            Posición actual en {asset}: {position.quantity} unidades.
          </p>
        ) : null}
      </div>

      <SimulateDialog target={target} open={dialogOpen} onOpenChange={setDialogOpen} />
      <RealTradeDialog target={realTarget} open={realDialogOpen} onOpenChange={setRealDialogOpen} />
      <ProviderLeaveDialog
        open={leaveUrl !== null}
        onOpenChange={(open) => {
          if (!open) setLeaveUrl(null);
        }}
        url={leaveUrl ?? ""}
        providerName={leaveProvider ?? "el proveedor"}
      />
    </AppShell>
  );
}

function statusLabel(status: string) {
  if (status === "available") return "disponible";
  if (status === "requires_credentials") return "requiere credenciales";
  return "no disponible";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  copied,
  onSimulate,
  onRegister,
  onCopy,
  onOpenProvider,
}: {
  opportunity: OpportunityDTO;
  copied: boolean;
  onSimulate: () => void;
  onRegister: () => void;
  onCopy: () => void;
  onOpenProvider: () => void;
}) {
  const digits = opportunity.price < 10 ? 4 : 2;
  return (
    <article className="surface-card flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {opportunity.side === "buy" ? "Comprar" : "Vender"} {opportunity.asset}
          </p>
          <p className="num text-2xl font-semibold">
            {formatMoney(opportunity.price, opportunity.fiat, digits)}
          </p>
          <p className="text-sm text-muted-foreground">{opportunity.provider_name}</p>
        </div>
        <DataModeBadge mode={opportunity.data_mode} />
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Detail label="Método" value={opportunity.payment_method ?? "—"} />
        <Detail
          label="Importe"
          value={
            opportunity.amount_min || opportunity.amount_max
              ? `${opportunity.amount_min ?? 0} – ${opportunity.amount_max ?? "∞"} ${opportunity.fiat}`
              : "—"
          }
        />
        <Detail
          label="Precio de referencia"
          value={
            opportunity.reference_price
              ? formatMoney(opportunity.reference_price, opportunity.fiat, digits)
              : "—"
          }
        />
        <Detail
          label="Diferencia"
          value={opportunity.spread_pct === null ? "—" : formatPct(opportunity.spread_pct)}
          tone={
            opportunity.spread_pct === null
              ? undefined
              : opportunity.spread_pct >= 0
                ? "positive"
                : "negative"
          }
        />
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button onClick={onSimulate} className="flex-1 sm:flex-none">
          Simular
        </Button>
        {opportunity.data_mode === "real" ? (
          <>
            <Button variant="outline" onClick={onCopy} className="flex-1 sm:flex-none">
              {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
              {copied ? "Copiada" : "Copiar oferta"}
            </Button>
            <Button variant="outline" onClick={onRegister} className="flex-1 sm:flex-none">
              Registrar ejecutada
            </Button>
            {opportunity.source_url ? (
              <Button variant="outline" onClick={onOpenProvider} className="flex-1 sm:flex-none">
                Ir a Binance <ExternalLink className="size-4" />
              </Button>
            ) : null}
          </>
        ) : (
          <span className="self-center text-xs text-muted-foreground">
            Oportunidad demo: no hay proveedor real.
          </span>
        )}
      </div>
    </article>
  );
}

function Detail({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`num text-sm ${tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
