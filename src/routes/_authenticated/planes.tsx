import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useInvalidateOverview, useOverview } from "@/hooks/useOverview";
import { changePlan } from "@/lib/api.functions";
import { PLANS, type PlanId } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/planes")({
  head: () => ({
    meta: [
      { title: "Planes y cuota — P2P Lab" },
      {
        name: "description",
        content:
          "Compara los planes Gratis, Mensual y Anual de P2P Lab y amplía tu cuota diaria de búsquedas.",
      },
      { property: "og:title", content: "Planes y cuota — P2P Lab" },
      { property: "og:description", content: "Planes de P2P Lab con más búsquedas diarias." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansPage,
});

const ORDER: PlanId[] = ["free", "monthly", "yearly"];

function PlansPage() {
  const { data } = useOverview();
  const invalidate = useInvalidateOverview();
  const fn = useServerFn(changePlan);
  const current = (data?.profile?.plan ?? "free") as PlanId;

  const mutation = useMutation({
    mutationFn: (plan: PlanId) => fn({ data: { plan } }),
    onSuccess: (_result, plan) => {
      toast.success(`Plan ${PLANS[plan].name} activado (pago simulado).`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Planes" subtitle="Amplía tu cuota diaria de búsquedas">
      <div className="space-y-5">
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium">Pagos simulados</p>
          <p className="mt-1 text-muted-foreground">
            Todavía no hay cobros reales. Al cambiar de plan activas la cuota correspondiente en
            modo demostración; no se realiza ningún cargo ni se solicitan datos de pago.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = current === id;
            return (
              <article
                key={id}
                className={`surface-card flex flex-col p-5 ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                <p className="font-display text-lg font-semibold">{plan.name}</p>
                <p className="num mt-1 text-3xl font-semibold">
                  {plan.price}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {plan.priceDetail}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.dailySearches < 0
                    ? "Búsquedas ilimitadas"
                    : `${plan.dailySearches} búsquedas al día`}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={isCurrent ? "outline" : id === "free" ? "outline" : "default"}
                  disabled={isCurrent || mutation.isPending}
                  onClick={() => mutation.mutate(id)}
                >
                  {isCurrent
                    ? "Plan actual"
                    : id === "free"
                      ? "Volver a gratis"
                      : "Activar (simulado)"}
                </Button>
              </article>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          El paper trading, la cartera, el historial y las estadísticas están disponibles en todos
          los planes, también cuando agotas la cuota de búsquedas.
        </p>
      </div>
    </AppShell>
  );
}
