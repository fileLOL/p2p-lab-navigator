import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guia")({
  head: () => ({
    meta: [
      { title: "Guía: de la teoría a la práctica — P2P Lab" },
      {
        name: "description",
        content:
          "Aprende qué es el P2P, cómo leer una oportunidad, qué es el depósito en garantía y cómo pasar de la simulación a tu primera operación real con seguridad.",
      },
      { property: "og:title", content: "Guía: de la teoría a la práctica — P2P Lab" },
      {
        property: "og:description",
        content:
          "Del saldo simulado a la primera operación real: oportunidades, diferencial, escrow y seguridad en el P2P.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

const P2P_STEPS = [
  "Un anunciante publica una oferta: compra o vende cripto a un precio, con un método de pago y unos límites de importe.",
  "Tú aceptas la oferta dentro de la plataforma. La cripto del vendedor queda bloqueada en un depósito en garantía (escrow).",
  "Pagas al anunciante por el método acordado (transferencia, Bizum, etc.) y marcas el pago como realizado.",
  "El vendedor confirma que ha recibido el dinero y la plataforma libera la cripto del escrow a tu cuenta.",
  "Si hay un problema, abres una disputa y el equipo de la plataforma revisa las pruebas antes de liberar los fondos.",
];

const OPPORTUNITY_FIELDS = [
  {
    title: "Precio y diferencial",
    body: "El precio es lo que pagas por unidad. El diferencial es la distancia respecto al precio de referencia del mercado. Un diferencial alto no es beneficio garantizado: no incluye comisiones, impuestos, tiempos ni el riesgo de que la contraparte falle.",
  },
  {
    title: "Importe y límites",
    body: "Cada anuncio tiene un mínimo y un máximo. La adecuación te dice si tu importe entra cómodamente en ese rango: operar justo en el límite suele dar peor experiencia.",
  },
  {
    title: "Método de pago",
    body: "No todos los métodos son iguales: los reversibles (algunas tarjetas o servicios) son los favoritos para estafas de contracargo. Prefiere métodos con justificante claro y titular a tu nombre.",
  },
  {
    title: "Actualidad",
    body: "Los precios P2P se mueven rápido. Un anuncio con horas de antigüedad puede estar ya fuera de mercado; prioriza los más recientes.",
  },
  {
    title: "La contraparte",
    body: "Mira número de operaciones, tasa de finalización y antigüedad de la cuenta. Un buen precio con una contraparte sin historial es una mala oportunidad.",
  },
];

const SCAMS = [
  {
    title: "Pago revertido",
    body: "Te pagan con un método reversible y, tras recibir la cripto, cancelan el pago. Defensa: métodos no reversibles y comprobar que el titular del pago coincide con la cuenta verificada.",
  },
  {
    title: "Comprobante falso",
    body: "El comprador envía una captura editada como «prueba de pago». Defensa: nunca liberes hasta ver el ingreso en tu propia cuenta, no en una captura.",
  },
  {
    title: "Presión para salir de la plataforma",
    body: "«Mejor hablamos por WhatsApp y te hago un 2 % más». Fuera de la plataforma no hay escrow ni disputa: es el principio de casi todas las estafas.",
  },
  {
    title: "Triangulación",
    body: "Un tercero paga desde una cuenta que no es tuya ni del anunciante, a menudo con dinero de otra víctima. Defensa: solo acepta pagos desde cuentas cuyo titular coincida con la identidad verificada.",
  },
];

const SAFETY_RULES = [
  "Opera siempre dentro de la plataforma y con el depósito en garantía activo.",
  "No liberes la cripto hasta ver el dinero en tu cuenta, no en una captura.",
  "Verifica que el titular del pago coincide con la cuenta verificada de la contraparte.",
  "Desconfía de precios demasiado buenos y de quien tenga prisa.",
  "Guarda capturas y justificantes de cada operación por si hay disputa.",
  "Empieza con importes pequeños hasta dominar el proceso.",
];

function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold lg:text-4xl">
          De la teoría a la práctica
        </h1>
        <p className="mt-3 text-muted-foreground">
          Todo lo que necesitas para pasar de simular operaciones con capital virtual a completar tu
          primera operación P2P real con seguridad.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Qué es el P2P y cómo funciona</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            En un mercado P2P (persona a persona) compras y vendes cripto directamente con otra
            persona, no con un exchange. La plataforma solo pone el tablón de anuncios y el depósito
            en garantía que protege a ambas partes.
          </p>
          <ol className="mt-5 space-y-3">
            {P2P_STEPS.map((step, i) => (
              <li key={i} className="surface-card flex gap-3 p-4 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Cómo leer una oportunidad</h2>
          <div className="mt-5 space-y-4">
            {OPPORTUNITY_FIELDS.map((field) => (
              <div key={field.title} className="surface-card p-5">
                <h3 className="font-medium">{field.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{field.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Depósito en garantía y comisiones</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            El escrow es la pieza que hace posible el P2P: la cripto queda bloqueada por la
            plataforma hasta que el pago se confirma. Nunca aceptes operar sin él. Ten en cuenta que
            entre el precio del anuncio y tu resultado real hay comisiones de la plataforma,
            comisiones de red al mover la cripto y, según tu país, impuestos sobre la ganancia. Por
            eso el diferencial que ves en la app es una señal de partida, no tu beneficio.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Sobre impuestos: en muchos países cada intercambio de cripto es un hecho imponible.
            Lleva registro de cada operación (la app ya lo hace por ti en Operaciones) y consulta a
            un asesor fiscal antes de operar con importes relevantes.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Practica antes con el simulador</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Al registrarte recibes 25.000 € de capital virtual. Úsalos para aprender sin riesgo:
            busca oportunidades, simula compras y ventas, y observa en Estadísticas cómo evolucionan
            tu P&L, tu ROI y tu ratio de aciertos. Cuando seas capaz de explicar por qué una
            oportunidad es buena y tu historial simulado sea consistente, estarás listo para el
            salto.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Para el salto real: elige una plataforma P2P conocida, verifica tu identidad, empieza
            con un importe pequeño que puedas permitirte perder y aplica las reglas de seguridad de
            abajo al pie de la letra.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Estafas habituales</h2>
          <div className="mt-5 space-y-4">
            {SCAMS.map((scam) => (
              <div key={scam.title} className="surface-card border-destructive/30 p-5">
                <h3 className="font-medium">{scam.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{scam.body}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-8 font-display text-lg font-semibold">Reglas de oro</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {SAFETY_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <p className="mt-12 rounded-lg border border-border p-4 text-xs text-muted-foreground">
          P2P Lab es una herramienta educativa y de simulación: no custodia fondos ni ejecuta
          operaciones. Nada de lo aquí escrito es asesoramiento financiero ni una recomendación de
          inversión. Operar con criptomonedas conlleva riesgo de pérdida.
        </p>

        <nav className="mt-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/terminos" className="hover:text-foreground">
            Términos y Condiciones
          </Link>
          <Link to="/privacidad" className="hover:text-foreground">
            Política de Privacidad
          </Link>
          <Link to="/reembolsos" className="hover:text-foreground">
            Política de Reembolsos
          </Link>
        </nav>
      </div>
    </div>
  );
}
