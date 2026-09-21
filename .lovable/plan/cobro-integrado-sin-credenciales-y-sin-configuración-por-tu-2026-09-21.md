# Cobro integrado: sin credenciales y sin configuración por tu parte

## Qué se hace

Vuelvo al método de cobro integrado en la plataforma (pago con tarjeta en una ventana dentro de la app). Es el único que no te pide pegar ninguna clave ni credencial: las gestiona la plataforma por ti y el dinero va a tu cuenta de cobros, que ya está conectada.

Retiro el trabajo con PayPal, que sí exigiría copiar dos credenciales de una cuenta PayPal Business.

## Lo único que no puedo evitar (y no es configuración)

Tu cuenta de cobros está en verificación por el proveedor: es un requisito legal para recibir dinero real, igual con cualquier método. No hay nada que tú tengas que configurar en la app; cuando el proveedor apruebe la cuenta, el cobro real se activa solo y el dinero te llega. Mientras tanto, la vista previa cobra en modo pruebas con la tarjeta 4242 4242 4242 4242.

## Cómo quedará

- En Planes: botón "Suscribirme por 5 €" / "por 50 €" que abre la ventana de pago dentro de la app.
- Al pagar, el plan se activa solo en segundos ("Confirmando tu pago…").
- Cancelar: mantienes el acceso hasta el final del periodo pagado.
- Cambio Mensual ↔ Anual: se aplica en la renovación.
- Pago fallido: se mantiene el acceso con aviso para actualizar la tarjeta.
- Borrar la cuenta cancela el cobro al instante.
- Las compras de prueba nunca dan ventajas en el sitio publicado.

Se conserva lo nuevo que ya funciona y no depende del proveedor: los enlaces directos a cada oferta real y la página pública "Guía de uso".

## Detalles técnicos

- Restaurar `src/lib/stripe.server.ts` y `src/lib/stripe.ts` (cliente vía gateway gestionado, sin claves en el código) y `src/components/StripeCheckoutDialog.tsx` (checkout embebido).
- Reescribir `src/lib/payments.functions.ts` sobre el proveedor integrado: `createCheckoutSession`, `getSubscription`, `cancelSubscription`, `changeSubscriptionPlan` (proration none, ventajas en la renovación), `getBillingPortalUrl`.
- `src/routes/api/public/payments/webhook.ts`: volver al receptor con verificación de firma y los eventos `customer.subscription.created/updated/deleted`, `checkout.session.completed` y `invoice.paid/payment_failed`, manteniendo `payment_events` (antiduplicados) y `last_event_at` (orden).
- `src/lib/api.functions.ts`: cancelación al borrar la cuenta contra el proveedor integrado; `entitlementEnvironment` desde el token publicable (`pk_test_` → pruebas, `pk_live_` → real).
- `src/routes/_authenticated/planes.tsx` y `PaymentTestModeBanner`: textos y flujo de checkout embebido.
- Eliminar `src/lib/paypal.server.ts`, `src/lib/payments.ts` y las referencias a PayPal en las páginas legales (vuelven a "nuestro proveedor de pagos").
- Base de datos: no hace falta migrar; las columnas `provider_subscription_id` / `provider_customer_id` sirven igual, con `provider = 'stripe'`.
- Verificación: typecheck, lint, tests y prueba de extremo a extremo con la tarjeta de pruebas.
