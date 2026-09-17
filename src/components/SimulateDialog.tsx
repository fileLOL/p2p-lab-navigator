import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, formatQty, quoteBuy, quoteSell } from "@/lib/accounting";
import { SPREAD_DISCLAIMER } from "@/lib/config";
import { paperBuy, paperSell } from "@/lib/api.functions";
import { useInvalidateOverview } from "@/hooks/useOverview";

export interface SimulationTarget {
  asset: string;
  fiat: string;
  side: "buy" | "sell";
  price: number;
  opportunityId?: string | null;
  providerName?: string;
  availableQuantity?: number;
  availableCash?: number;
}

export function SimulateDialog({
  target,
  open,
  onOpenChange,
}: {
  target: SimulationTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [feePct, setFeePct] = useState("0");
  const invalidate = useInvalidateOverview();
  const buyFn = useServerFn(paperBuy);
  const sellFn = useServerFn(paperSell);

  const fees = Number(feePct) || 0;
  const amountNumber = Number(amount) || 0;

  const buyQuote = target
    ? quoteBuy({ price: target.price, amountFiat: amountNumber, feePct: fees })
    : null;
  const sellQuote = target
    ? quoteSell({ price: target.price, quantity: amountNumber, feePct: fees })
    : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      if (target.side === "buy") {
        if (!buyQuote || buyQuote.quantity <= 0) throw new Error("Introduce un importe válido.");
        await buyFn({
          data: {
            asset: target.asset,
            price: target.price,
            quantity: buyQuote.quantity,
            fees: buyQuote.fees,
            opportunityId: target.opportunityId ?? null,
          },
        });
      } else {
        if (!sellQuote || amountNumber <= 0) throw new Error("Introduce una cantidad válida.");
        await sellFn({
          data: {
            asset: target.asset,
            price: target.price,
            quantity: amountNumber,
            fees: sellQuote.fees,
            opportunityId: target.opportunityId ?? null,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(
        target?.side === "buy" ? "Compra simulada registrada." : "Venta simulada registrada.",
      );
      invalidate();
      setAmount("");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!target) return null;

  const isBuy = target.side === "buy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Simular {isBuy ? "compra" : "venta"} de {target.asset}
          </DialogTitle>
          <DialogDescription>
            Operación con capital virtual. No se ejecuta nada real
            {target.providerName ? ` en ${target.providerName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Activo</p>
              <p className="font-medium">{target.asset}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="num font-medium">
                {formatMoney(target.price, target.fiat, target.price < 10 ? 4 : 2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-amount">
              {isBuy ? `Importe a invertir (${target.fiat})` : `Cantidad de ${target.asset}`}
            </Label>
            <Input
              id="sim-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isBuy ? "20" : "0.0001"}
            />
            {isBuy && target.availableCash !== undefined ? (
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() =>
                  setAmount(String(Math.floor((target.availableCash ?? 0) * 100) / 100))
                }
              >
                Usar todo el efectivo disponible ({formatMoney(target.availableCash, target.fiat)})
              </button>
            ) : null}
            {!isBuy && target.availableQuantity !== undefined ? (
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setAmount(String(target.availableQuantity))}
              >
                Vender toda la posición ({formatQty(target.availableQuantity)})
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sim-fee">Comisión estimada (%)</Label>
            <Input
              id="sim-fee"
              inputMode="decimal"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
            />
          </div>

          <div className="rounded-md border border-border p-3 text-sm">
            <p className="mb-1 font-medium">Resultado estimado</p>
            {isBuy ? (
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  Cantidad recibida:{" "}
                  <span className="num text-foreground">
                    {formatQty(buyQuote?.quantity ?? 0)} {target.asset}
                  </span>
                </li>
                <li>
                  Comisiones:{" "}
                  <span className="num text-foreground">
                    {formatMoney(buyQuote?.fees ?? 0, target.fiat)}
                  </span>
                </li>
                <li>
                  Coste total:{" "}
                  <span className="num text-foreground">
                    {formatMoney(buyQuote?.totalCost ?? 0, target.fiat)}
                  </span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  Importe bruto:{" "}
                  <span className="num text-foreground">
                    {formatMoney(sellQuote?.gross ?? 0, target.fiat)}
                  </span>
                </li>
                <li>
                  Comisiones:{" "}
                  <span className="num text-foreground">
                    {formatMoney(sellQuote?.fees ?? 0, target.fiat)}
                  </span>
                </li>
                <li>
                  Recibirás:{" "}
                  <span className="num text-foreground">
                    {formatMoney(sellQuote?.net ?? 0, target.fiat)}
                  </span>
                </li>
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{SPREAD_DISCLAIMER}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || amountNumber <= 0}
          >
            {mutation.isPending ? "Registrando..." : "Confirmar simulación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
