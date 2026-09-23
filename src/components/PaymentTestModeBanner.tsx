const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="surface-card border-destructive/50 p-4 text-sm">
        <p className="font-medium text-destructive">Pagos no disponibles</p>
        <p className="text-muted-foreground">
          Los cobros todavía no están activos en esta versión de la app.
        </p>
      </div>
    );
  }

  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="surface-card border-warning/50 p-4 text-sm">
        <p className="font-medium">Modo de pruebas</p>
        <p className="text-muted-foreground">
          Estás en la vista previa: los pagos no son reales. Usa la tarjeta 4242 4242 4242 4242, una
          fecha futura y CVC 123.
        </p>
      </div>
    );
  }

  return null;
}
