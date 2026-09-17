# Cambiar los pagos de Paddle a Stripe

Mismos planes y mismo comportamiento que ahora, pero cobrando con Stripe (integración incluida en Lovable, sin necesidad de tu propia cuenta ni claves).

## Lo que no cambia

- Premium Mensual (5 €/mes) y Premium Anual (50 €/año).
- Al pagar: el plan se activa al instante y la cuota diaria sube sola.
- Al cancelar: mantienes el acceso hasta el final del periodo pagado.
- Cambio Mensual ↔ Anual: se aplica en la próxima renovación, sin cargos parciales.
- Paper trading, cartera, historial y estadísticas siguen igual.

## Lo que sí cambia

- Los productos se recrean desde cero en Stripe.
- Las suscripciones activas no se trasladan (hoy no hay ninguna real, solo pruebas).
- Las páginas legales dejan de nombrar a Paddle como vendedor: el vendedor pasa a ser Fundación P2P y se actualizan las secciones de pago y reembolsos.

## Paso previo que debes hacer tú

Yo no puedo desconectar el proveedor actual. En el panel de Pagos, abre el menú de tres puntos arriba a la derecha y elige "Disconnect Paddle". Cuando esté hecho, sigo con el resto.

<presentation-actions>
<presentation-open-payments>Abrir panel de pagos</presentation-open-payments>
</presentation-actions>

## Pasos

1. Tú desconectas el proveedor actual desde el panel de Pagos.
2. Activo los pagos con Stripe y creo el producto "P2P Lab Premium" con los dos precios (5 €/mes y 50 €/año).
3. Sustituyo la integración de pago del lado cliente y servidor por la de Stripe, manteniendo la misma pantalla de Planes.
4. Actualizo el aviso de modo de pruebas y los textos legales de pago/reembolso.
5. Compruebo en el navegador el alta, el pago de prueba, la activación del plan, la cancelación y el cambio de plan.

## Detalles técnicos

- `enable_stripe_payments` (integración gestionada por Lovable), no BYOK.
- Se eliminan: `src/lib/paddle.ts`, `src/lib/paddle.server.ts`, `src/hooks/usePaddleCheckout.ts`, la ruta `src/routes/api/public/payments/webhook.ts` de Paddle y el paquete `@paddle/paddle-node-sdk`.
- Se reescribe `src/lib/payments.functions.ts` con server functions para Stripe: crear sesión de checkout, leer suscripción, cancelar al final del periodo (`cancel_at_period_end`), cambiar de plan en la renovación y abrir el portal de facturación.
- Nuevo webhook en `src/routes/api/public/payments/webhook.ts` con verificación de firma de Stripe, escuchando alta, actualización y baja de suscripción.
- La tabla `subscriptions` se mantiene; se renombran las columnas de identificadores del proveedor mediante migración y se conserva el trigger `sync_plan_from_subscription` que fija `profiles.plan` a free/monthly/yearly.
- `src/routes/_authenticated/planes.tsx` conserva su interfaz; solo cambian las funciones que invoca.
