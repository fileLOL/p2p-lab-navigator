# Plan: dejar los pagos con Stripe listos (live + activación de suscripciones)

## Contexto
- Bizum queda descartado: no admite suscripciones con renovación automática y el proveedor integrado (Stripe) no lo soporta. Los planes siguen cobrándose con tarjeta.
- La cuenta de Stripe está conectada y el formulario de activación enviado, pero **Stripe todavía está verificando la cuenta**, así que las claves live aún no se pueden crear. Es un paso que depende de Stripe, no del código.
- Además, la confirmación automática del pago (webhook) no está creando la suscripción tras una compra de prueba, y hay que corregirlo.

## Pasos

### 1. Resolver la verificación de Stripe (acción del usuario)
- El usuario revisa el panel de Stripe y completa lo que falte (datos de la empresa, verificación de identidad, cuenta bancaria).
- Cuando Stripe termine la verificación, se crean las claves live desde la pestaña Pagos de Lovable.

### 2. Corregir la confirmación automática de pagos (código)
- Revisar qué eventos tiene suscritos el webhook registrado en Stripe.
- Si los nombres de eventos no coinciden con los de Stripe (`customer.subscription.created/updated/deleted`), re-registrar el webhook con los eventos correctos.
- Añadir también la escucha de `checkout.session.completed` como respaldo, para que la suscripción se active aunque el primer evento llegue antes de que exista el cliente.

### 3. Verificación de extremo a extremo
- Compra de prueba completa con tarjeta 4242 4242 4242 4242 y comprobación de que la suscripción aparece activa en la pantalla Planes.
- Probar cancelación (mantiene el plan hasta fin de periodo) y cambio Mensual ↔ Anual (aplicado en la renovación).

### 4. Activar live (cuando Stripe lo permita)
- Crear las claves live, publicar la app y hacer una compra real de bajo importe o dejarlo listo para el primer cliente.

## Detalles técnicos
- Webhook: `src/routes/api/public/payments/webhook.ts` (URLs registradas con `?env=sandbox|live`).
- Cliente Stripe por gateway: `src/lib/stripe.server.ts` (no tocar el proxy).
- Las suscripciones se reflejan en la tabla `subscriptions` y el plan del usuario se sincroniza por trigger.
