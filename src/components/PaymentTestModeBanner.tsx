import { isTestMode } from "@/lib/payments";

export function PaymentTestModeBanner() {
  if (!isTestMode()) return null;

  return (
    <div className="surface-card border-warning/50 p-4 text-sm">
      <p className="font-medium">Modo de pruebas</p>
      <p className="text-muted-foreground">
        Estás en la vista previa: los pagos no son reales. Usa una cuenta de pruebas de PayPal para
        completar la compra. Nada se cobra de verdad.
      </p>
    </div>
  );
}
