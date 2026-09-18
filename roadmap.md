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
- [ ] Pendiente usuario: completar la verificación de la cuenta de cobros para crear las claves reales
- [ ] Pendiente usuario: dominio de correo para el email de bienvenida
