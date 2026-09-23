import { Link } from "@tanstack/react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openProviderUrl, rememberProviderLeaveDismissed } from "@/lib/providerLeaving";

const REMINDERS = [
  "Opera siempre dentro de la plataforma P2P y con el depósito en garantía (escrow) activo.",
  "No pagues fuera de la plataforma ni te vayas a contactos externos (WhatsApp, Telegram...).",
  "No liberes la cripto hasta ver el ingreso en tu propia cuenta, no en una captura.",
  "Verifica que el titular del pago coincide con la cuenta verificada de la contraparte.",
];

export function ProviderLeaveDialog({
  open,
  onOpenChange,
  url,
  providerName = "el proveedor",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  providerName?: string;
}) {
  const [never, setNever] = useState(false);

  const confirm = () => {
    if (never) rememberProviderLeaveDismissed();
    onOpenChange(false);
    openProviderUrl(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            Antes de operar en {providerName}
          </DialogTitle>
          <DialogDescription>
            Recordatorio rápido antes de salir de P2P Lab. No custodianos fondos ni ejecutamos
            operaciones: lo harás tú, en tu cuenta del proveedor.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {REMINDERS.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/guia"
          className="text-sm text-primary hover:underline"
          onClick={() => onOpenChange(false)}
        >
          Revisar la Guía de seguridad completa
        </Link>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={never} onCheckedChange={(v) => setNever(v === true)} />
          <span>No volver a mostrarlo en este dispositivo</span>
        </label>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirm}>
            Ir a {providerName} <ExternalLink className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
