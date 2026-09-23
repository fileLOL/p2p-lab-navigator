# Buscar en modo Simulación o Real, y seguimiento real completo

## Qué verá el usuario
1. **Selector al buscar** en Oportunidades: "Simulación" / "Real".
   - **Simulación**: igual que ahora (capital virtual de 25.000 €, se admiten datos demo).
   - **Real**: solo ofertas reales (Binance P2P). La fuente demo queda excluida. Etiqueta "REAL" bien visible.
2. **Cada oferta en modo Real** muestra un flujo guiado para operar con terceros:
   - "Ir a Binance" (abre el anuncio exacto, con el aviso de salida que ya existe).
   - "Copiar oferta" (precio, contraparte, método, importe).
   - "Registrar operación" con precio, importe, comisión, contraparte y fecha ya rellenados desde la oferta.
3. **Seguimiento real igual que la simulación**:
   - **Cartera real**: posiciones por activo, coste medio, valor actual al precio de mercado y ganancia/pérdida (realizada y no realizada), calculadas con el mismo sistema contable que la simulación.
   - **Historial real** en Operaciones (ya existe) con resultado de cada venta.
   - **Estadísticas reales**: mejor/peor operación, resultado por activo.
   - En Cartera, Operaciones y Estadísticas, un conmutador "Simulación / Real" para ver cada cosa por separado; nunca se mezclan.
4. Al vender en modo Real, se avisa si registras vender más de lo que tienes registrado.
5. Todo en castellano, sin datos inventados. La app no custodia dinero ni ejecuta órdenes: tú operas en Binance y aquí llevas el seguimiento.

## Detalles técnicos
- `oportunidades.tsx`: estado `mode: "sim" | "real"` (se recuerda en la URL como parámetro de búsqueda). En Real, `allowDemo: false` y los botones de la tarjeta priorizan Registrar/Ir a Binance; en Simulación, "Simular" como ahora.
- `api.functions.ts`: nueva función `getRealOverview` que lee `real_trades` del usuario (RLS) y, reutilizando `accounting.ts` (coste medio, P&L realizado) y los precios de referencia de `prices.server.ts`, devuelve posiciones, métricas y P&L por operación. `createRealTrade` valida la cantidad disponible al vender (aviso, no bloqueo, porque puede haber saldo anterior a la app).
- `cartera.tsx`, `estadisticas.tsx`, `operaciones.tsx`: pestañas Simulación/Real; la vista Real usa `getRealOverview`.
- Tests: casos contables de operaciones reales (compra, venta parcial, comisiones).
- Sin cambios de base de datos: la tabla `real_trades` ya existe con RLS.
