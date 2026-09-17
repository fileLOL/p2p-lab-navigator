const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-medium">Pagos no disponibles</p>
        <p className="mt-1 text-muted-foreground">
          Los pagos reales todavía no están activados en esta versión publicada.
        </p>
      </div>
    );
  }

  if (!clientToken.startsWith("pk_test_")) return null;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
      <p className="font-medium">Modo de pruebas</p>
      <p className="mt-1 text-muted-foreground">
        En la vista previa los pagos son de prueba: no se realiza ningún cargo real. Usa la tarjeta
        de prueba 4242 4242 4242 4242 con cualquier fecha futura y CVC 123.
      </p>
    </div>
  );
}
