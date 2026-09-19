# Nova secció "Trading real" amb claus API de Binance

## Objectiu
Afegir una secció on l'usuari connecti el seu propi compte de Binance amb claus API (només lectura + trading, sense retirades) i pugui llançar compres i vendes reals des de l'app. La simulació amb 25.000 € virtuals es manté intacta i separada.

## Què veurà l'usuari
1. **Nova secció "Trading real"** al menú (escriptori i mòbil), amb etiqueta "REAL" clara.
2. **Pantalla de connexió**: enganxar API Key + Secret de Binance, amb instruccions pas a pas ("crea la clau a Binance, activa només Spot/Lectura+Trading, mai retirades, restringeix per IP si pots"). Avisos de risc i que l'app no custodia fons.
3. **Un cop connectat**: saldo real del compte (llegit de Binance), i formulari de compra/venda amb actiu, quantitat i previsualització de l'ordre abans de confirmar. Doble confirmació per ordres reals.
4. **Historial d'ordres reals** executades des de l'app.
5. Botó per **desconnectar** (esborra les claus de la base de dades).
6. Tot en castellà, dades reals sempre etiquetades, cap dada inventada: si Binance falla, es mostra l'error.

## Implementació tècnica
1. **Base de dades** (migració):
   - Taula `exchange_keys` (user_id, exchange='binance', api_key, api_secret_encrypted, created_at). RLS: cada usuari només la seva fila. La clau secreta es guarda **xifrada AES-256-GCM**; la clau de xifrat viu en un secret del projecte (`generate_secret`), mai al codi.
   - Taula `real_orders` (user_id, exchange, symbol, side, quantity, price, order_id de Binance, status, created_at). RLS per usuari.
   - Grants i polítiques segons l'estàndard del projecte.
2. **Backend** (`src/lib/binance.server.ts` + funcions a `src/lib/trading.functions.ts`, tot server-side):
   - Signatura HMAC-SHA256 de peticions a l'API Spot de Binance (`/api/v3/account`, `/api/v3/order` amb `test` primer si cal).
   - `connectExchange` (valida les claus consultant el saldo abans de desar-les), `disconnectExchange`, `getRealBalances`, `placeRealOrder` (validació de quantitats/símbols, doble verificació), `listRealOrders`.
   - Les claus mai surten del servidor ni arriben al navegador.
3. **Frontend**: ruta `_authenticated/trading-real.tsx` + entrada a `AppShell` (escriptori i menú "Más" del mòbil). Distinció visual clara respecte a la simulació.
4. **Legals**: actualitzar `terminos.tsx` — la Fundación P2P no custodia fons ni executa per compte propi; l'usuari opera al seu compte i n'és l'únic responsable.
5. **Verificació**: typecheck, tests, i prova manual del flux de connexió (sense ordre real si no hi ha claus de prova; la validació d'errors es comprova amb claus invàlides).

## Límits i coses que NO fa aquest pla
- Només Binance Spot (l'exchange que ja fem servir per dades). Altres exchanges, després.
- Sense límits de risc avançats (stop-loss automàtic, etc.) — es poden afegir després.
- **Abans de publicar-ho a usuaris reals**, confirma amb el teu assessor legal el text dels Térmens (marc MiCA). L'app ho deixarà escrit, però la validació legal és teva.
