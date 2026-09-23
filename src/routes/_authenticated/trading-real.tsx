import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { MetricCard, toneOf } from "@/components/MetricCard";
import { ProviderLeaveDialog } from "@/components/ProviderLeaveDialog";
import { RealTradeDialog, type RealTradeTarget } from "@/components/RealTradeDialog";
import { Button } from "@/components/ui/button";
import { listRealTrades, listTrades } from "@/lib/api.functions";
import { formatMoney, formatPct } from "@/lib/accounting";
import { useOverview } from "@/hooks/useOverview";
import { isProviderLeaveDismissed, openProviderUrl } from "@/lib/providerLeaving";

const BINANCE_P2P_URL = "https://p2p.binance.com/es/trade";

export const Route = createFileRoute("/_authenticated/trading-real")({
  head: () => ({
    meta: [
      { title: "Trading real — P2P Lab" },
      {
        name: "description",
        content:
          "Pasa de la simulación a tu primera operación P2P real: cómo buscar una oferta, comprobar la contraparte, operar en el proveedor y registrar el resultado.",
      },
      { property: "og:title", content: "Trading real — P2P Lab" },
      {
        property: "og:description",
        content: "De la simulación a la operación real P2P, paso a paso y con seguridad.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TradingRealPage,
});

type StepCtaType = {
  label: string;
  kind: "link" | "provider" | "register";
  to: "/oportunidades" | "/guia" | null;
};

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  cta: StepCtaType;
};

const STEPS: Step[] = [
  {
    icon: Search,
    title: "1. Busca una oferta real",
    body: "En Oportunidades, elige operación, activo, importe y método de pago y pulsa «Buscar». Las ofertas marcadas como «Real» vienen de Binance P2P; las de demostración no tienen proveedor real.",
    cta: { label: "Buscar ofertas reales", kind: "link", to: "/oportunidades" },
  },
  {
    icon: ShieldCheck,
    title: "2. Revisa a la contraparte",
    body: "Un buen precio con un desconocido no es una oportunidad. Mira número de operaciones, tasa de finalización y antigüedad de la cuenta antes de decidir.",
    cta: { label: "Leer cómo verificar a la contraparte", kind: "link", to: "/guia" },
  },
  {
    icon: ArrowRight,
    title: "3. Opera en el proveedor",
    body: "Ejecuta la compra o venta en tu propia cuenta de Binance P2P, siempre dentro de la plataforma y con el depósito en garantía. La app no custodia ni ejecuta por ti.",
    cta: { label: "Ir a Binance P2P", kind: "provider", to: null },
  },
  {
    icon: ClipboardList,
    title: "4. Registra la operación",
    body: "Cuando la hayas completado, anótala aquí o desde la propia oferta con «Registrar ejecutada». Aparecerá en Operaciones → Reales, separada de tus simulaciones.",
    cta: { label: "Registrar una operación real", kind: "register", to: null },
  },
];

function TradingRealPage() {
  const { data: overview } = useOverview();
  const listRealFn = useServerFn(listRealTrades);
  const listPaperFn = useServerFn(listTrades);

  const realQuery = useQuery({
    queryKey: ["real-trades-summary"],
    queryFn: () => listRealFn({ data: { page: 0, pageSize: 50 } }),
  });
  const paperQuery = useQuery({
    queryKey: ["trades", 0],
    queryFn: () => listPaperFn({ data: { page: 0, pageSize: 50 } }),
  });

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [target] = useState<RealTradeTarget>({
    asset: "BTC",
    fiat: "EUR",
    side: "buy",
    price: 0,
  });

  const openProvider = () => {
    if (isProviderLeaveDismissed()) openProviderUrl(BINANCE_P2P_URL);
    else setLeaveOpen(true);
  };

  const realTrades = realQuery.data?.trades ?? [];
  const realBuy = realTrades.filter((t) => t.side === "buy").length;
  const realSell = realTrades.filter((t) => t.side === "sell").length;
  const realVolume = realTrades.reduce((acc, t) => acc + t.total, 0);

  const paperTrades = paperQuery.data?.trades ?? [];
  const metrics = overview?.metrics;

  return (
    <AppShell
      title="Trading real"
      subtitle="De la simulación a tu primera operación P2P, sin mezclar cuentas"
    >
      <div className="space-y-6">
        <div className="surface-card flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            P2P Lab es formación y análisis:{" "}
            <strong className="text-foreground">no custodia fondos ni ejecuta operaciones</strong>.
            El trading real lo haces tú, con tus fondos, en tu cuenta de un proveedor P2P
            (actualmente Binance). La app solo registra los resultados para que lleves tu histórico.
          </p>
        </div>

        <section className="grid gap-3 lg:grid-cols-2">
          {STEPS.map((step) => (
            <article key={step.title} className="surface-card flex flex-col gap-2 p-4">
              <header className="flex items-center gap-2">
                <step.icon className="size-5 text-primary" />
                <h2 className="font-display text-base font-semibold">{step.title}</h2>
              </header>
              <p className="text-sm text-muted-foreground">{step.body}</p>
              <div className="mt-auto pt-2">
                <StepCta
                  cta={step.cta}
                  onProvider={openProvider}
                  onRegister={() => setRegisterOpen(true)}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Tus números, sin mezclar</h2>
            <Link to="/operaciones" className="text-sm text-primary hover:underline">
              Ver detalle en Operaciones →
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ColumnCard
              title="Simulación (capital virtual)"
              subtitle="Son tus operaciones ficticias, con los 25.000 € de prueba."
            >
              {overview && metrics ? (
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Capital virtual" value={formatMoney(metrics.equity)} />
                  <MetricCard
                    label="Resultado total"
                    value={formatMoney(metrics.total_pnl)}
                    tone={toneOf(metrics.total_pnl)}
                  />
                  <MetricCard
                    label="Rentabilidad"
                    value={formatPct(metrics.roi_pct)}
                    tone={toneOf(metrics.roi_pct)}
                  />
                  <MetricCard
                    label="Operaciones simuladas"
                    value={String(paperQuery.data?.total ?? paperTrades.length)}
                  />
                </div>
              ) : (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </ColumnCard>

            <ColumnCard
              title="Operaciones reales"
              subtitle="Las que has ejecutado fuera de P2P Lab y has decidido registrar."
            >
              {realQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : realQuery.data && realQuery.data.total > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard label="Operaciones reales" value={String(realQuery.data.total)} />
                    <MetricCard label="Volumen registrado" value={formatMoney(realVolume, "EUR")} />
                    <MetricCard label="Compras" value={String(realBuy)} />
                    <MetricCard label="Ventas" value={String(realSell)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Volumen calculado sobre tus últimas 50 operaciones. Consulta el detalle completo
                    en Operaciones → Reales.
                  </p>
                </>
              ) : (
                <div className="flex h-full flex-col items-start gap-2 py-4 text-sm text-muted-foreground">
                  <p>Aún no has registrado ninguna operación real.</p>
                  <Button variant="outline" onClick={() => setRegisterOpen(true)}>
                    <Plus className="size-4" /> Registrar la primera
                  </Button>
                </div>
              )}
            </ColumnCard>
          </div>
        </section>

        <p className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
          Los resultados simulados y reales se muestran siempre por separado: la cartera virtual no
          se ve afectada por tus operaciones reales, y viceversa. Nada aquí es asesoramiento
          financiero.
        </p>
      </div>

      <ProviderLeaveDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        url={BINANCE_P2P_URL}
        providerName="Binance"
      />
      <RealTradeDialog
        target={target}
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSaved={() => void realQuery.refetch()}
      />
    </AppShell>
  );
}

function StepCta({
  cta,
  onProvider,
  onRegister,
}: {
  cta: {
    label: string;
    kind: "link" | "provider" | "register";
    to: "/oportunidades" | "/guia" | null;
  };
  onProvider: () => void;
  onRegister: () => void;
}) {
  if (cta.kind === "link") {
    return (
      <Button asChild size="sm">
        <Link to={cta.to ?? "/"}>
          {cta.label} <ArrowRight className="size-4" />
        </Link>
      </Button>
    );
  }
  return (
    <Button size="sm" onClick={cta.kind === "provider" ? onProvider : onRegister}>
      {cta.label} <ArrowRight className="size-4" />
    </Button>
  );
}

function ColumnCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="size-4 text-muted-foreground" />
        <div>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
