# Plan: cobros con PayPal, enlaces reales a las ofertas y página "Guía"

## 1. Cobros con PayPal (acceso inmediato)

Sustituimos el cobro con tarjeta de Stripe por suscripciones de PayPal, manteniendo los mismos dos planes: Premium Mensual (5 €/mes) y Premium Anual (50 €/año).

Cómo quedará para el usuario:
- En Planes, botón "Suscribirme con PayPal" que abre la ventana de PayPal sin salir de la app.
- Al aprobar el pago, el plan se activa al instante (confirmación automática de PayPal + comprobación inmediata al volver, para que no dependa de esperas).
- Cancelar: mantiene el acceso hasta el final del periodo pagado.
- Cambio Mensual ↔ Anual: PayPal no permite mover un plan en curso como Stripe, así que se cancela la suscripción actual y se crea la nueva; el cambio se aplica al terminar el periodo ya pagado (mismo comportamiento que hoy).
- Se conservan: separación pruebas/real, aviso de pago fallido, cancelación automática al borrar la cuenta y el registro antiduplicados de avisos.

Lo único que necesito de ti (una vez): crear una aplicación en tu cuenta de PayPal Business y darme sus dos credenciales (una de entorno de pruebas y otra real). Se guardan como secretos, no van al código. Sin eso PayPal no puede cobrar en tu nombre.

Stripe: dejo el código de Stripe desactivado, no lo borro, por si más adelante te aprueban la cuenta.

## 2. Enlaces reales a las ofertas

Hoy el botón "Continuar al proveedor" lleva siempre a la portada P2P de Binance. Pasará a:
- Abrir la plataforma con moneda, divisa, método de pago y compra/venta ya filtrados.
- Cuando la oferta identifique al anunciante, abrir directamente su perfil; si no, el listado filtrado.
- Antes de salir, una ventana breve recuerda las reglas de seguridad (pagar siempre dentro de la plataforma, usar el depósito en garantía, no aceptar contactos fuera) con un enlace a la Guía.

No requiere configuración tuya en ningún sitio: los datos ya vienen de la fuente de ofertas.

## 3. Nueva página "Guía"

Ruta `/guia`, accesible desde el menú (escritorio y móvil) y desde la portada pública. Contenido completo en español:
- Qué es el P2P y cómo funciona una operación paso a paso.
- Cómo leer una oportunidad en la app: precio, diferencial, importe, método de pago, adecuación y actualidad.
- Métodos de pago, depósito en garantía (escrow), comisiones y por qué el diferencial no es beneficio.
- Impuestos: idea general y recordatorio de consultar a un asesor.
- Cómo practicar con el saldo simulado de 25.000 € y cuándo dar el salto a una operación real.
- Bloque amplio de seguridad: estafas habituales (pago revertido, comprobante falso, presión por cerrar fuera de la plataforma, triangulación), cómo verificar a la contraparte y señales de alarma.
- Recordatorio de que la app es formación y análisis, no custodia fondos ni ejecuta operaciones.

## Detalles técnicos

- Nuevo `src/lib/paypal.server.ts` (OAuth de cliente, creación de planes/suscripciones, verificación de la firma del webhook) y `src/lib/paypal.ts` para el cliente.
- `src/lib/payments.functions.ts`: `createSubscription`, `getSubscription`, `cancelSubscription`, `changeSubscriptionPlan` reescritos sobre PayPal, conservando validación de plan y middleware de autenticación.
- `src/routes/api/public/payments/webhook.ts`: nuevo receptor para eventos `BILLING.SUBSCRIPTION.ACTIVATED/UPDATED/CANCELLED/SUSPENDED` y `PAYMENT.SALE.COMPLETED/DENIED`, manteniendo el registro antiduplicados en `payment_events`.
- Migración: renombrar `stripe_subscription_id`/`stripe_customer_id` a columnas neutras de proveedor y añadir `provider`; el trigger de sincronización de plan no cambia.
- `src/lib/p2p/sources.server.ts`: construir `sourceUrl` con los filtros y el identificador del anunciante cuando exista.
- Nueva ruta `src/routes/guia.tsx` (pública, con `head()` propio) y enlaces desde `AppShell` e `index.tsx`.
- Textos legales actualizados para reflejar el nuevo proveedor de pagos.
