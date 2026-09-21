import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/guia")({
  head: () => ({
    meta: [
      { title: "Guía de uso — P2P Lab" },
      {
        name: "description",
        content:
          "Cómo usar P2P Lab paso a paso: buscar oportunidades P2P, simular operaciones con capital virtual y entender el diferencial antes de operar.",
      },
      { property: "og:title", content: "Guía de uso — P2P Lab" },
      {
        property: "og:description",
        content:
          "Aprende a buscar oportunidades P2P, simular operaciones y leer el diferencial con P2P Lab.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    title: "1. Crea tu cuenta",
    body: "Regístrate con tu correo o con Google. Al entrar recibes 25.000 € de capital virtual para practicar sin arriesgar dinero real.",
  },
  {
    title: "2. Busca oportunidades",
    body: "En Oportunidades eliges el activo (BTC, ETH, USDT…), la moneda, el método de pago y el importe. Cada búsqueda devuelve hasta 10 anuncios ordenados por diferencial, adecuación a tu importe y actualidad.",
  },
  {
    title: "3. Lee bien el diferencial",
    body: "El diferencial es la distancia entre el precio del anuncio y el precio de referencia del mercado. No es un beneficio garantizado: no incluye comisiones, impuestos, tiempos de espera ni el riesgo de que la contraparte no complete la operación.",
  },
  {
    title: "4. Simula la operación",
    body: "Desde una oportunidad puedes simular la compra con tu capital virtual. La cartera, el historial y las estadísticas se actualizan solos: P&L realizado y no realizado, ROI, drawdown y ratio de aciertos.",
  },
  {
    title: "5. Ve al proveedor cuando lo tengas claro",
    body: "Si decides operar de verdad, el botón del anuncio te lleva directamente a la ficha en la plataforma original, con tus filtros aplicados. P2P Lab no custodia fondos ni interviene en la operación.",
  },
  {
    title: "6. Amplía tu cuota si la necesitas",
    body: "El plan Gratis incluye 5 búsquedas al día, el Mensual 50 y el Anual ilimitadas. La cartera, el historial y las estadísticas siguen disponibles aunque agotes la cuota.",
  },
];

const FAQ = [
  {
    q: "¿P2P Lab guarda mi dinero?",
    a: "No. La plataforma es una herramienta de análisis y simulación. Nunca recibimos, custodiamos ni movemos tus fondos.",
  },
  {
    q: "¿Los datos son reales?",
    a: "Los anuncios provienen de fuentes reales y se etiquetan como tales. Cuando una fuente no responde y se muestran datos de demostración, aparecen siempre marcados como DEMO.",
  },
  {
    q: "¿Cuándo se reinicia mi cuota diaria?",
    a: "Cada día a las 00:00 UTC. La cuota se cuenta por persona, así que borrar y recrear la cuenta no la reinicia.",
  },
  {
    q: "¿Puedo cancelar la suscripción?",
    a: "Sí, cuando quieras desde Planes. Mantienes el acceso hasta el final del periodo ya pagado.",
  },
];

function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold lg:text-4xl">Guía de uso</h1>
        <p className="mt-3 text-muted-foreground">
          Cómo sacar partido a P2P Lab en seis pasos, desde la primera búsqueda hasta la decisión de
          operar.
        </p>

        <div className="mt-10 space-y-6">
          {STEPS.map((step) => (
            <section key={step.title} className="surface-card p-5">
              <h2 className="font-display text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">Preguntas frecuentes</h2>
        <div className="mt-5 space-y-5">
          {FAQ.map((item) => (
            <div key={item.q}>
              <h3 className="font-medium">{item.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 rounded-lg border border-border p-4 text-xs text-muted-foreground">
          P2P Lab es una herramienta educativa y de simulación. No es asesoramiento financiero ni
          una recomendación de inversión. Operar con criptomonedas conlleva riesgo de pérdida.
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
