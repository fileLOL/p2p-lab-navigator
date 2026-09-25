# Roadmap

- [x] Activar pagos con Stripe y recrear el producto Premium (mensual/anual)
- [x] Sustituir integración de pago cliente/servidor por Stripe (checkout embebido)
- [x] Webhook de Stripe y migración de columnas de `subscriptions`
- [x] Reparar activación automática (respaldo `checkout.session.completed`)
- [x] Actualizar textos legales (vendedor Fundación P2P, reembolsos)
- [x] Cancelar la suscripción al eliminar la cuenta (inmediata, sin devolución)
- [x] Separar plan de pruebas (`sandbox_plan`) del plan real (`plan`)
- [x] Cambio mensual↔anual: ventajas solo en la renovación (`pending_price_id`)
- [x] Aviso de pago fallido (`past_due`) manteniendo el acceso
- [x] Evitar avisos duplicados o desordenados del proveedor (`payment_events`, `last_event_at`)
- [x] Confirmación visible tras pagar ("Confirmando tu pago…")
- [x] Usar la clave real aportada por el titular para los cobros en el sitio publicado
- [ ] Pendiente usuario: Stripe debe activar los métodos de pago de la cuenta real (verificación en curso)
- [ ] Pendiente usuario: dominio de correo para el email de bienvenida
- [x] Sección "Trading real" con Binance Spot: conexión con claves API cifradas (AES-256-GCM), saldos reales, órdenes a mercado con doble confirmación, historial, desconexión. Términos actualizados (sin custodia).

## 2026-09-21 — Vuelta al cobro integrado con tarjeta
- [x] Restaurados cliente de pagos, checkout embebido, receptor de avisos y pantalla de Planes
- [x] Eliminado PayPal del código y de las páginas legales
- [x] Probado en vista previa: la ventana de pago abre en modo pruebas
- [ ] Pendiente del usuario: verificación de la cuenta de cobros para activar los cobros reales

## 2026-09-25 — Retirada completa de OKX
- [x] Eliminado el adaptador de OKX del código; Binance P2P es la única fuente real activa
- [x] Verificada la base de datos: no quedan ofertas de OKX guardadas
- [x] Compilación correcta
