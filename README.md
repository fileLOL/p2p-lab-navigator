# P2P Lab Navigator

# P2P LAB  (UN MVP FUNCIONAL DES DE ZERO)

Crea des de zero una aplicació web/PWA anomenada **P2P Lab**.

IMPORTANT:
No vull un prototip visual ni una demo amb dades falses estàtiques. Vull un **MVP funcional**, amb arquitectura preparada per créixer, autenticació, base de dades, paper trading, sistema d'oportunitats P2P, plans Free/Premium i dades persistents.

L'objectiu del MVP és permetre a un usuari:

1. descobrir oportunitats P2P de criptomonedes,
2. comparar-les i analitzar-les,
3. simular operacions amb capital virtual,
4. veure el resultat de les seves inversions simulades,
5. consultar el seu historial i estadístiques,
6. i, quan una oportunitat sigui real, poder continuar cap al proveïdor/mercat corresponent per executar-la realment.

NO custodiar diners reals.
NO executar operacions reals des de P2P Lab en aquest MVP.
NO prometre rendibilitats.
NO presentar simulacions com a resultats reals.

---

# 1. CONCEPTE DEL PRODUCTE

P2P Lab és una plataforma d'anàlisi d'oportunitats P2P de criptomonedes.

No limitar l'app a Bitcoin.

Ha de ser conceptualment compatible amb:

* Bitcoin (BTC)
* Ethereum (ETH)
* USDT
* USDC
* i altres criptomonedes que ofereixin les fonts P2P.

L'arquitectura ha de permetre afegir nous actius sense modificar el sistema central.

Flux principal:

BUSCAR OPORTUNITATS
↓
OFERTES / DEMANDES P2P
↓
COMPARAR
↓
ANALITZAR
↓
SIMULAR OPERACIÓ
↓
VEURE RESULTAT
↓
OPCIONALMENT CONTINUAR CAP AL PROVEÏDOR REAL

---

# 2. STACK

Utilitza una arquitectura moderna i simple.

Preferència:

* React
* TypeScript
* Vite / TanStack Start si és apropiat
* Tailwind
* shadcn/ui
* Supabase
* PostgreSQL
* Supabase Auth
* RLS
* PWA

Evita dependències innecessàries.

L'aplicació ha de funcionar correctament en:

* desktop
* tablet
* mòbil

Mobile-first.

---

# 3. AUTENTICACIÓ

Implementa:

* registre
* login
* logout
* recuperar contrasenya
* perfil
* eliminar compte

Cada usuari només pot accedir a les seves dades.

Utilitza Supabase Auth.

Implementa RLS correctament.

No confiïs només en filtres del frontend per protegir dades.

---

# 4. ESTRUCTURA PRINCIPAL DE L'APP

Després de login:

## Dashboard

Mostrar:

* capital inicial
* efectiu disponible
* capital invertit
* valor de cartera
* patrimoni total
* benefici realitzat
* benefici no realitzat
* benefici total
* ROI
* drawdown
* nombre d'operacions
* operacions guanyadores
* operacions perdedores

També:

### Quota de cerques

Mostrar:

FREE:

5 cerques/dia

MONTHLY:

50 cerques/dia

YEARLY:

il·limitades

Les cerques són cerques d'oportunitats.

Una cerca retorna fins a 10 oportunitats.

Les operacions simulades NO consumeixen quota.

---

# 5. MARKETPLACE / OPORTUNITATS

Crear una secció:

## Oportunitats

Permetre:

* comprar crypto
* vendre crypto

Filtres:

* actiu
* moneda fiat
* país/mercat si està disponible
* mètode de pagament
* import
* plataforma
* preu
* marge
* tipus d'operació

Exemple:

COMPRAR BTC

Preu:
98.250 €

Mercat:
Binance P2P

Mètode:
Transferència bancària

Import:
50–500 €

Preu de referència:
97.900 €

Diferència:
+0,36 %

---

# 6. NORMALITZACIÓ DE FONTS

Crear una arquitectura de connectors/fuentes P2P.

Una font ha de poder proporcionar:

* provider
* asset
* fiat
* side
* price
* amount_min
* amount_max
* payment_method
* location
* seller/buyer identifier si és públic i segur
* timestamp
* source_url

Crear una interfície comuna.

Exemples de fonts que l'arquitectura ha de poder suportar:

* Binance P2P
* Bybit
* OKX
* Hodl Hodl
* Peach
* altres fonts futures

IMPORTANT:

No inventar dades.

Si una API/font no està disponible o requereix credencials, crear l'adapter/interface i deixar clar l'estat.

El sistema ha de diferenciar:

REAL DATA
vs
DEMO DATA

No barrejar-les silenciosament.

---

# 7. OPPORTUNITY ENGINE

Crear un motor que normalitzi i compari oportunitats.

Per cada oportunitat calcular quan sigui possible:

* preu
* preu de referència
* spread
* percentatge de diferència
* import mínim
* import màxim
* mètode de pagament
* plataforma
* timestamp

No prometre que el spread equival al benefici real.

Mostrar un avís:

"El diferencial mostrat no és necessàriament el benefici final. Les comissions, liquiditat, límits, temps i altres costos poden modificar el resultat."

Ordenació inicial:

* millor diferencial
* millor adequació a l'import de l'usuari
* actualitat de l'oferta

No implementar un "guany garantit".

---

# 8. SISTEMA DE CERQUES

Cada vegada que l'usuari prem:

BUSCAR OPORTUNITATS

aquesta acció consumeix UNA cerca.

Una cerca retorna màxim:

10 oportunitats.

FREE:

5 cerques/dia.

MONTHLY:

50 cerques/dia.

YEARLY:

il·limitades.

Les cerques han de comptabilitzar-se de forma segura al backend/database.

No confiar en un contador del frontend.

El reset diari ha de ser robust.

Preferiblement utilitzar data UTC o una política temporal clarament definida.

Quan s'arriba al límit:

Mostrar una pantalla/modal clara:

"Has alcanzado el límite de búsquedas de tu plan."

Mostrar:

"Actualiza a Premium para continuar explorando oportunidades."

No bloquejar:

* cartera
* historial
* paper trading
* vendes
* compres simulades
* estadístiques

Les operacions simulades són il·limitades.

---

# 9. PLANS

Crear tres plans:

## FREE

5 €/? NO.

FREE és gratuït.

Inclou:

* 5 cerques/dia
* 10 oportunitats per cerca
* paper trading il·limitat
* cartera virtual
* historial
* estadístiques bàsiques

## PREMIUM MONTHLY

5 €/mes.

Inclou:

* 50 cerques/dia
* 10 oportunitats per cerca
* paper trading il·limitat
* estadístiques avançades

## PREMIUM YEARLY

50 €/any.

Inclou:

* cerques il·limitades
* 10 oportunitats per cerca
* paper trading il·limitat
* estadístiques avançades

IMPORTANT:

Per al MVP, el pagament pot ser SIMULAT.

Crear l'arquitectura perquè posteriorment es pugui integrar Stripe o un altre sistema de pagament.

No simular un pagament real com si hagués estat cobrat.

Guardar clarament l'estat:

* free
* monthly
* yearly

---

# 10. PAPER TRADING

Aquesta és una funcionalitat central.

Cada usuari ha de tenir una cartera virtual.

Capital inicial:

UTILITZAR UN ÚNIC VALOR DEFINIT AL SISTEMA.

No crear defaults diferents en fitxers diferents.

Per al MVP utilitzar:

20 € de capital inicial.

Aquest valor ha d'existir en una única font de veritat.

L'usuari pot:

* comprar
* vendre

criptomonedes simuladament.

No limitar el nombre d'operacions.

---

# 11. COMPTABILITAT DEL PAPER TRADING

Separar estrictament:

## Capital inicial

Capital amb què comença la simulació.

## Efectiu disponible

Capital virtual disponible per executar noves operacions.

## Capital invertit

Valor/cost de les posicions obertes segons la metodologia definida.

## Posicions

Actius que l'usuari té actualment.

## Valor de cartera

Valor actual de les posicions.

## Equity / patrimoni

Efectiu + valor actual de les posicions.

## Benefici realitzat

Benefici o pèrdua de posicions tancades.

## Benefici no realitzat

Benefici o pèrdua de posicions obertes.

## Benefici total

Benefici realitzat + benefici no realitzat.

## ROI

Rendiment respecte al capital inicial.

## Drawdown

Caiguda màxima del patrimoni respecte al màxim anterior.

Aquests conceptes NO s'han de barrejar.

---

# 12. EXEMPLE COMPTABLE

Capital inicial:

20 €

Abans de comprar:

Efectiu: 20 €
Posicions: 0 €
Equity: 20 €

Compra simulada:

20 €

Després:

Efectiu: 0 €
Posició: 20 €
Equity: valor actual de la posició

Si la posició passa a valer 21 €:

Efectiu: 0 €
Valor cartera: 21 €
Equity: 21 €
Benefici no realitzat: +1 €

Quan es ven per 21 €:

Efectiu: 21 €
Posicions: 0 €
Benefici realitzat: +1 €
Equity: 21 €

Tots aquests càlculs han de ser coherents.

---

# 13. OPERACIONS

Crear historial de trades.

Cada operació ha de guardar com a mínim:

* user_id
* asset
* side
* quantity
* price
* total
* fees si n'hi ha
* timestamp
* opportunity_id si prové d'una oportunitat
* status

Separar:

OPEN
CLOSED

No calcular beneficis només des del frontend.

Els càlculs importants han de provenir d'una font fiable del backend/database.

---

# 14. ESTADÍSTIQUES

Mostrar:

* total trades
* guanyadores
* perdedores
* win rate
* benefici total
* ROI
* millor operació
* pitjor operació
* drawdown màxim

Sempre deixar clar que són resultats SIMULATS.

---

# 15. SIMULAR UNA OPORTUNITAT

Cada oportunitat ha de tenir una acció:

"SIMULAR"

En prémer:

mostrar un formulari amb:

* actiu
* preu
* import
* quantitat
* comissions
* resultat estimat

L'usuari confirma.

Crear l'operació paper corresponent.

Una operació simulada vinculada a una oportunitat ha de conservar la relació:

opportunity → paper trade

Això permetrà posteriorment analitzar quines oportunitats han estat més interessants.

---

# 16. INVERSIÓ REAL

Crear una segona capa separada del paper trading.

NO implementar custòdia.

NO guardar claus privades.

NO guardar seed phrases.

NO executar transaccions reals en aquest MVP.

Quan una oportunitat sigui real, mostrar:

"Continuar al proveïdor"

amb la URL de la font quan estigui disponible.

El flux serà:

Oportunitat
↓
Analitzar
↓
Simular
↓
"Veure oportunitat real"
↓
Proveïdor extern

La cartera virtual i qualsevol futura cartera real han de ser models completament separats.

No barrejar mai:

virtual_cash
amb
real_cash.

---

# 17. UI

Disseny modern, professional i clar.

No fer una UI excessivament carregada.

Estil:

* fintech
* crypto
* dashboard professional
* fons clar/neutre
* targetes netes
* números fàcils de llegir
* responsive

Navegació principal:

Dashboard
Oportunitats
Cartera
Operacions
Estadístiques
Plans
Seguretat

---

# 18. MOBILE

La major part dels usuaris poden utilitzar mòbil.

Per tant:

* responsive real
* botons grans
* taules adaptades
* cards per oportunitats
* bottom navigation si millora UX
* formularis fàcils d'utilitzar

---

# 19. PWA

Implementar:

* manifest
* service worker
* icons
* install prompt quan el navegador ho permeti
* fallback amb instruccions quan no hi hagi beforeinstallprompt

El botó:

"Instalar app"

ha de funcionar correctament quan sigui possible.

Si el navegador no suporta instal·lació programàtica:

mostrar instruccions, no un error.

---

# 20. SEGURETAT

Implementar:

* Supabase Auth
* RLS
* validació server-side
* control d'accés
* no exposar secrets al frontend
* no guardar API keys de proveïdors P2P al client
* no guardar private keys
* no guardar seed phrases

Les dades de:

wallet
trades
profiles
search quota

han d'estar associades a user_id.

Un usuari no pot consultar dades d'un altre.

---

# 21. ELIMINAR COMPTE

Implementar un flux segur:

Eliminar cuenta
↓
Primera confirmació
↓
Segona confirmació
↓
Input "ELIMINAR"
↓
Confirmar

Eliminar les dades associades de l'usuari segons la política definida.

No eliminar dades d'altres usuaris.

Mostrar estat de càrrega i errors.

---

# 22. BASE DE DADES

Dissenyar una base de dades clara.

Com a mínim considerar:

profiles
plans/subscriptions
search_usage
opportunities
opportunity_sources
paper_wallets
paper_positions
paper_trades

No crear duplicacions innecessàries.

Definir:

* primary keys
* foreign keys
* indexes
* timestamps
* constraints
* RLS

Utilitzar UUID per identificadors d'usuari i registres quan sigui apropiat.

---

# 23. AUDIT LOG

Per a accions importants considerar una taula d'auditoria:

* login
* search
* paper buy
* paper sell
* plan change
* account deletion

No guardar informació sensible innecessària.

---

# 24. DADES REALS VS DEMO

El MVP ha de poder funcionar encara que una font P2P real no estigui disponible.

Per això crea una capa:

DataProvider

amb:

RealProvider
DemoProvider

Però la UI ha d'indicar clarament quan una oportunitat és:

REAL
o
DEMO.

No presentar dades demo com dades actuals reals.

---

# 25. EMPTY STATES I ERRORS

Crear bons estats per:

* sense oportunitats
* font no disponible
* error de connexió
* quota esgotada
* cartera buida
* sense operacions
* sessió expirada
* error de Supabase

No deixar pantalles buides.

---

# 26. PERFORMANCE

Evitar:

* fetches duplicats
* renders innecessaris
* queries repetides
* carregar totes les operacions quan només calen 10

Implementar paginació quan sigui necessari.

---

# 27. SEO / LANDING

Crear una landing pública abans del login.

Hero:

"P2P Lab"

Subtítol:

"Descubre oportunidades P2P de criptomonedas, analízalas y pruébalas con capital virtual."

CTA:

"Empezar gratis"

Segon CTA:

"Ver cómo funciona"

Explicar:

1. Descobreix oportunitats
2. Analitza
3. Simula
4. Aprèn
5. Continua cap al proveïdor real si vols

Explicar clarament:

"El paper trading utiliza capital virtual y no representa una inversión real."

---

# 28. PLANS A LA LANDING

Mostrar:

FREE
5 cerques/dia

PREMIUM MONTHLY
5 €/mes
50 cerques/dia

PREMIUM YEARLY
50 €/any
cerques il·limitades

Mostrar també:

"Paper trading ilimitado en todos los planes."

No utilitzar claims com:

"guanya diners garantits"
"beneficis assegurats"
"arbitratge sense risc"

---

# 29. DISCLAIMER

Incloure un avís clar:

P2P Lab és una eina d'anàlisi i simulació.

Les dades poden canviar.

Els spreads no garanteixen beneficis.

Les operacions simulades no representen rendibilitats futures.

Les operacions reals es realitzen fora de P2P Lab amb el proveïdor corresponent.

---

# 30. ARQUITECTURA PER AL FUTUR

Encara que el MVP no executi operacions reals, deixa l'arquitectura preparada per incorporar posteriorment:

* connectors addicionals
* més criptomonedes
* més fiat
* més fonts P2P
* pagaments reals
* subscripcions
* analytics
* notificacions
* integracions amb proveïdors
* eventualment execució real si legalment/tècnicament és apropiat

Però NO implementar aquestes funcionalitats ara si no són necessàries per al MVP.

---

# 31. CRITERIS D'ACCEPTACIÓ

No consideris el MVP acabat fins que es pugui verificar aquest flux:

NOU USUARI
↓
REGISTRE
↓
LOGIN
↓
20 € CAPITAL VIRTUAL
↓
VEURE DASHBOARD
↓
BUSCAR OPORTUNITATS
↓
APAREIXEN FINS A 10
↓
QUOTA PASSA DE 5 → 4
↓
SIMULAR COMPRA
↓
CAPITAL/EFECTIU S'ACTUALITZA
↓
VEURE POSICIÓ
↓
SIMULAR VENDA
↓
BENEFICI REALITZAT S'ACTUALITZA
↓
ROI S'ACTUALITZA
↓
REPETIR CERQUES FINS A 5
↓
QUOTA 0
↓
CTA PREMIUM
↓
EL PAPER TRADING CONTINUA FUNCIONANT
↓
CANVIAR A PREMIUM SIMULAT
↓
QUOTA ACTUALITZADA
↓
INSTALAR PWA
↓
ELIMINAR COMPTE

---

# 32. TESTS

Crear tests per a:

* càlcul de capital
* efectiu
* posicions
* P&L
* ROI
* drawdown
* compra
* venda
* quota Free
* quota Monthly
* quota Yearly
* reset de quota
* RLS
* permisos
* eliminació de compte

Especialment:

capital inicial + compres + vendes = equity coherent.

---

# 33. QUALITAT DEL CÒDIGO

Abans de donar la tasca per finalitzada:

Executa:

npm test

npm run typecheck

npm run lint

npm run build

Corregeix els errors reals.

No ocultis errors amb:

* any
* @ts-ignore
* eslint-disable general
* comentaris que desactivin validacions

No afegeixis dependències només per solucionar errors simples.

---

# 34. IMPORTANT — ORDRE DE TREBALL

No generis tot de cop sense revisar.

Fes-ho en fases:

FASE 1
Arquitectura + Supabase + Auth

FASE 2
Oportunitats + DataProvider

FASE 3
Paper trading + comptabilitat

FASE 4
Quota + plans

FASE 5
Dashboard + historial + estadístiques

FASE 6
PWA + seguretat + eliminar compte

FASE 7
Landing + UX + responsive

FASE 8
Tests + verificació final

Després de cada fase verifica que el projecte continua funcionant.

---

# 35. REGLA PRINCIPAL

No vull una app que només sembli funcional.

Vull que les dades siguin persistents i coherents.

Quan l'usuari fa:

COMPRAR

s'ha de modificar realment la seva cartera virtual.

Quan fa:

VENDRE

s'ha de calcular realment el resultat.

Quan fa:

BUSCAR

s'ha de consumir realment una cerca.

Quan arriba a:

0 cerques

s'ha d'aplicar realment el límit.

Quan canvia de pla:

el seu entitlement ha de canviar realment.

Quan elimina el compte:

les seves dades s'han d'eliminar realment.

---

# 36. RESULTAT FINAL

El resultat ha de ser un MVP funcional de P2P Lab que permeti demostrar aquesta proposta:

"Descubre oportunidades P2P de criptomonedas → analízalas → simúlalas con dinero virtual → mide tus resultados → y, si quieres, continúa hacia el proveedor real."

Prioritza:

FUNCIONALITAT
COHERÈNCIA DELS CÀLCULS
SEGURETAT
UX
SIMPLICITAT

per sobre d'afegir moltes funcionalitats.

NO implementis funcionalitats post-MVP si posen en risc la qualitat del nucli.

Abans d'acabar, fes una revisió final de tot el flux i confirma quines funcionalitats són realment funcionals i quines depenen d'un proveïdor/API extern.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79d74f0c-6d10-4c6e-88d6-6b901f0e434c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
