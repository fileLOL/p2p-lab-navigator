import { Link } from "@tanstack/react-router";
import { Infinity as InfinityIcon, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PLANS, type PlanId } from "@/lib/config";
import type { QuotaState } from "@/lib/api.functions";

export function QuotaCard({ quota }: { quota: QuotaState }) {
  const plan = PLANS[(quota.plan ?? "free") as PlanId];
  const unlimited = quota.limit < 0;
  const pct = unlimited ? 100 : quota.limit > 0 ? ((quota.limit - quota.used) / quota.limit) * 100 : 0;

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cuota de búsquedas</p>
          <p className="num mt-1 flex items-center gap-2 text-xl font-semibold">
            {unlimited ? (
              <>
                <InfinityIcon className="size-5" /> Ilimitadas
              </>
            ) : (
              `${Math.max(quota.remaining, 0)} / ${quota.limit}`
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Plan {plan.name} · se reinicia cada día (UTC)</p>
        </div>
        <Search className="size-5 text-muted-foreground" />
      </div>
      {!unlimited ? <Progress value={pct} className="mt-3" /> : null}
      {!unlimited && quota.remaining <= 0 ? (
        <div className="mt-3 rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">Has alcanzado el límite de búsquedas de tu plan.</p>
          <p className="mt-1 text-muted-foreground">
            Actualiza a Premium para continuar explorando oportunidades. El paper trading sigue disponible.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/planes">Ver planes</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
