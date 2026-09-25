# Acabar les ofertes reals i comprovar els enllaços

## Què es farà

1. **Treure l'avís de Binance quan hi ha ofertes**: si Bybit (o una altra font) troba ofertes, no es mostrarà l'error 403 de Binance ni el missatge "no hi ha ofertes". L'avís només sortirà si cap font real troba res.
2. **Eliminar la pàgina de prova temporal** que vaig afegir a l'app publicada. Sense tocar res la de estructura actual, la part de sikulació no es toca
3. **Comprovar que cada enllaç porta a una oferta on es pot comprar/vendre**:
  - Binance: l'enllaç ha d'obrir la fitxa de l'anunci concret (amb el botó Comprar/Vendre). Si l'anunci no té codi, ha d'obrir el mercat ja filtrat per moneda, euros, operació i mètode de pagament.
  - Bybit: ara obre el mercat general. Es canviarà perquè obri el mercat filtrat pel costat correcte (comprar/vendre), la moneda, els euros i, si es pot, l'anunciant concret.
  - Es revisarà que "comprar" a la nostra app porti al costat "comprar" de la plataforma (i al revés), perquè Bybit fa servir aquests costats a la inversa.
4. **Prova real**: faré cerques reals de compra i de venda a l'app publicada, obriré diversos enllaços de cada font amb un navegador automàtic i comprovaré que la pàgina carrega (sense 404 ni bloquejos) i que mostra l'oferta amb el botó de comprar o vendre.
5. Tornar a publicar.

## Limitacions

- Per comprar o vendre de debò a Binance/Bybit cal tenir-hi compte i haver iniciat sessió; la comprovació confirma que la pàgina i el botó hi són, no que es completi una compra.
- Un anunci pot desaparèixer entre la cerca i el clic si l'anunciant l'esgota.

## Detalls tècnics

- `api.functions.ts`: agregar missatges per font; només mostrar errors de fonts si el total d'ofertes reals és 0.
- `sources.server.ts`: Bybit `sourceUrl` → `https://www.bybit.com/fiat/trade/otc/?actionType={1|0}&token=USDT&fiat=EUR&paymentMethod=...` (validar format actual amb Playwright); Binance `adv?code=` validat.
- Esborrar `src/routes/api/public/p2p-probe.ts`.
- Actualitzar enllaços ja guardats a la base de dades amb el format nou.