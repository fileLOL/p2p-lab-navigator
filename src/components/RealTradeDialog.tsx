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
import { formatMoney, formatQty } from "@/lib/accounting";
import { createRealTrade } from "@/lib/api.functions";

export interface RealTradeTarget {
  asset: string;
  fiat: string;
  side: "buy" | "sell";
  price: number;
  opportunityId?: string | null;
  providerName?: string;
  counterparty?: string | null;
  amountMin?: number | null;
  amountMax?: number | null;
}

export function RealTradeDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: RealTradeTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [feePct, setFeePct] = useState("0");
  const [provider, setProvider] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [executedAt, setExecutedAt] = useState("");
  const createFn = useServerFn(createRealTrade);

  const reset = () => {
    setAmount("");
    setPrice("");
    setFeePct("0");
    setProvider("");
    setCounterparty("");
    setExecutedAt("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const priceNumber = Number(price) || 0;
      if (priceNumber <= 0) throw new Error("Introduce un precio válido.");
      const fees = (Number(feePct) || 0) / 100;
      let quantity = Number(amount) || 0;
      if (target.side === "buy") {
        if (quantity <= 0) throw new Error("Introduce un importe a invertir válido.");
        quantity = quantity / priceNumber;
      } else if (quantity <= 0) {
        throw new Error("Introduce una cantidad válida.");
      }
      await createFn({
        data: {
          asset: target.asset,
          fiat: target.fiat,
          side: target.side,
          quantity,
          price: priceNumber,
          fees: quantity * priceNumber * fees,
          provider: provider.trim() || target.providerName || null,
          counterparty: counterparty.trim() || target.counterparty || null,
          opportunityId: target.opportunityId ?? null,
          executedAt: executedAt ? new Date(executedAt).toISOString() : null,
        },
      });
    },
    onSuccess: () => {
      toast.success(target?.side === "buy" ? "Compra real registrada." : "Venta real registrada.");
      onSaved?.();
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!target) return null;

  const isBuy = target.side === "buy";
  const priceNumber = Number(price) || target.price;
  const quantity = isBuy ? (Number(amount) || 0) / (priceNumber || 1) : Number(amount) || 0;
  const fees = ((Number(feePct) || 0) / 100) * priceNumber * quantity;
  const total = priceNumber * quantity + fees;
  const swapCaption = price.trim() === "" ? "Precio de la oportunidad" : "Importe del campo precio";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Registrar {isBuy ? "compra" : "venta"} real de {target.asset}
          </DialogTitle>
          <DialogDescription>
            Operación ejecutada fuera de P2P Lab con el proveedor. No afecta a tu capital virtual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Proveedor</p>
              <p className="font-medium">{target.providerName ?? "—"}</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Contraparte</p>
              <p className="truncate font-medium">{target.counterparty ?? "—"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rt-amount">
              {isBuy ? `Importe pagado (${target.fiat})` : `Cantidad vendida (${target.asset})`}
            </Label>
            <Input
              id="rt-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isBuy ? "100" : "0.001"}
            />
            {target.amountMin || target.amountMax ? (
              <p className="text-xs text-muted-foreground">
                Rango del anuncio: {target.amountMin ?? 0} – {target.amountMax ?? "∞"} {target.fiat}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rt-price">Precio ({target.fiat})</Label>
            <Input
              id="rt-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={String(target.price)}
            />
            <p className="text-xs text-muted-foreground">{swapCaption}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rt-fee">Comisión (%)</Label>
              <Input
                id="rt-fee"
                inputMode="decimal"
                value={feePct}
                onChange={(e) => setFeePct(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-date">Fecha de ejecución</Label>
              <Input
                id="rt-date"
                type="datetime-local"
                value={executedAt}
                onChange={(e) => setExecutedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rt-provider">Proveedor registrado</Label>
              <Input
                id="rt-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={target.providerName ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-party">Contraparte registrada</Label>
              <Input
                id="rt-party"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder={target.counterparty ?? ""}
              />
            </div>
          </div>

          <div className="rounded-md border border-border p-3 text-sm">
            <p className="mb-1 font-medium">Total estimado</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                Cantidad:{" "}
                <span className="num text-foreground">
                  {formatQty(quantity)} {target.asset}
                </span>
              </li>
              <li>
                Comisiones:{" "}
                <span className="num text-foreground">{formatMoney(fees, target.fiat)}</span>
              </li>
              <li>
                Total:{" "}
                <span className="num text-foreground">{formatMoney(total, target.fiat)}</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (Number(amount) || 0) <= 0}
          >
            {mutation.isPending ? "Registrando..." : "Confirmar registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
