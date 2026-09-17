import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useInvalidateOverview, useOverview } from "@/hooks/useOverview";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { changePlan } from "@/lib/api.functions";
import { PLANS, type PlanId } from "@/lib/config";
import { getPaddleEnvironment } from "@/lib/paddle";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getBillingPortalUrl,
  getSubscription,
} from "@/lib/payments.functions";

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

const PRICE_IDS: Record<Exclude<PlanId, "free">, string> = {
  monthly: "p2plab_premium_monthly",
  yearly: "p2plab_premium_yearly",
};

function PlansPage() {
  const { data } = useOverview();
  const { user } = useAuth();
  const invalidate = useInvalidateOverview();
  const environment = getPaddleEnvironment();

  const downgrade = useServerFn(changePlan);
  const cancelFn = useServerFn(cancelSubscription);
  const switchFn = useServerFn(changeSubscriptionPlan);
  const subscriptionFn = useServerFn(getSubscription);
  const portalFn = useServerFn(getBillingPortalUrl);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  const current = (data?.profile?.plan ?? "free") as PlanId;

  const subscription = useQuery({
    queryKey: ["subscription", environment],
    queryFn: () => subscriptionFn({ data: { environment } }),
    staleTime: 15_000,
  });

  const hasActiveSubscription = Boolean(
    subscription.data && subscription.data.status !== "canceled",
  );
  const pendingCancel = Boolean(subscription.data?.cancel_at_period_end);

  const cancelMutation = useMutation({
    mutationFn: () => cancelFn({ data: { environment } }),
    onSuccess: (result) => {
      const end = result.current_period_end
        ? new Date(result.current_period_end).toLocaleDateString("es-ES")
        : null;
      toast.success(
        end
          ? `Suscripción cancelada. Mantienes tu plan hasta el ${end}.`
          : "Suscripción cancelada al final del periodo pagado.",
      );
      invalidate();
      void subscription.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const downgradeMutation = useMutation({
    mutationFn: () => downgrade({ data: { plan: "free" } }),
    onSuccess: () => {
      toast.success("Has vuelto al plan Gratis.");
      invalidate();
      void subscription.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const switchMutation = useMutation({
    mutationFn: (priceId: string) => switchFn({ data: { environment, priceId } }),
    onSuccess: () => {
      toast.success("Cambio programado: se aplicará en tu próxima renovación.");
      void subscription.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const portalMutation = useMutation({
    mutationFn: () => portalFn({ data: { environment } }),
    onSuccess: (result) => window.open(result.url, "_blank", "noopener,noreferrer"),
    onError: (error: Error) => toast.error(error.message),
  });

  const buy = async (plan: Exclude<PlanId, "free">) => {
    if (!user) return;
    try {
      await openCheckout({
        priceId: PRICE_IDS[plan],
        userId: user.id,
        ...(user.email ? { customerEmail: user.email } : {}),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se ha podido abrir el pago.");
    }
  };

  const hasSubscription = Boolean(subscription.data);

  return (
    <AppShell title="Planes" subtitle="Amplía tu cuota diaria de búsquedas">
      <div className="space-y-5">
        <PaymentTestModeBanner />

        {hasSubscription && (
          <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">Suscripción activa</p>
              <p className="text-muted-foreground">
                Estado: {subscription.data?.status}
                {subscription.data?.current_period_end
                  ? ` · Renovación: ${new Date(subscription.data.current_period_end).toLocaleDateString("es-ES")}`
                  : ""}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={portalMutation.isPending}
              onClick={() => portalMutation.mutate()}
            >
              Gestionar suscripción
            </Button>
          </div>
        )}

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
                {id === "free" ? (
                  <Button
                    className="mt-5 w-full"
                    variant="outline"
                    disabled={isCurrent || cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate()}
                  >
                    {isCurrent ? "Plan actual" : "Volver a gratis"}
                  </Button>
                ) : (
                  <Button
                    className="mt-5 w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || checkoutLoading}
                    onClick={() => void buy(id)}
                  >
                    {isCurrent ? "Plan actual" : `Suscribirme por ${plan.price}`}
                  </Button>
                )}
              </article>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          El pago se procesa de forma segura por nuestro proveedor, que actúa como vendedor
          autorizado y emite la factura. Puedes cancelar cuando quieras desde «Gestionar
          suscripción»; mantendrás el plan hasta el final del periodo pagado.
        </p>
        <p className="text-xs text-muted-foreground">
          El paper trading, la cartera, el historial y las estadísticas están disponibles en todos
          los planes, también cuando agotas la cuota de búsquedas.
        </p>
      </div>
    </AppShell>
  );
}
