import { Link, createFileRoute } from "@tanstack/react-router";
import { BarChart3, Check, Globe2, LineChart, ShieldCheck, Wallet } from "lucide-react";

import { InstallAppButton } from "@/components/InstallAppButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { GENERAL_DISCLAIMER, PLANS, SIMULATION_DISCLAIMER } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "P2P Lab — Analiza oportunidades P2P y practica sin riesgo" },
      {
        name: "description",
        content:
          "Compara ofertas P2P de criptomonedas de varias plataformas y practica con 25.000 € de capital virtual. Sin custodia de fondos y sin riesgo.",
      },
      {
        property: "og:title",
        content: "P2P Lab — Analiza oportunidades P2P y practica sin riesgo",
      },
      {
        property: "og:description",
        content: "Compara ofertas P2P de criptomonedas y practica con capital virtual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session } = useAuth();
  const ctaTo = session ? "/dashboard" : "/auth";
  const ctaLabel = session ? "Ir a mi panel" : "Empezar gratis";

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-lg"
          />
          <span className="font-display text-lg font-semibold">P2P Lab</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="gradient-hero">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
              P2P Lab
            </h1>
            <p className="hero-muted mt-4 max-w-2xl text-lg">
              Analiza oportunidades de compra y venta P2P de criptomonedas en varias plataformas y
              practica con capital virtual antes de arriesgar dinero real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={ctaTo}>{ctaLabel}</Link>
              </Button>
              <Button asChild size="lg" variant="hero">
                <a href="#como-funciona">Ver cómo funciona</a>
              </Button>
            </div>
            <p className="hero-muted mt-6 max-w-xl text-sm">{SIMULATION_DISCLAIMER}</p>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold">Cómo funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step
              icon={<Globe2 className="size-5 text-primary" />}
              title="1. Busca oportunidades"
              text="Filtra por activo, moneda, importe y método de pago. Traemos ofertas reales de plataformas P2P y las comparamos con un precio de referencia."
            />
            <Step
              icon={<Wallet className="size-5 text-primary" />}
              title="2. Simula la operación"
              text="Compra o vende con tu capital virtual de 25.000 €. Tu efectivo, tus posiciones y tu patrimonio se actualizan al instante."
            />
            <Step
              icon={<BarChart3 className="size-5 text-primary" />}
              title="3. Mide tus resultados"
              text="Sigue tu beneficio realizado y no realizado, tu ROI, tu ratio de acierto y tu drawdown máximo."
            />
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-3">
            <Feature
              icon={<LineChart className="size-5 text-accent" />}
              title="Datos reales, claramente etiquetados"
              text="Cada oportunidad indica si procede de una fuente real o de datos de demostración. Nunca inventamos precios."
            />
            <Feature
              icon={<ShieldCheck className="size-5 text-accent" />}
              title="Sin custodia ni claves"
              text="No guardamos fondos, claves privadas ni frases de recuperación. Si quieres operar de verdad, te enviamos a la plataforma original."
            />
            <Feature
              icon={<Check className="size-5 text-accent" />}
              title="Aprende sin riesgo"
              text="El diferencial entre ofertas no es beneficio garantizado: comisiones, tiempos y disponibilidad cambian el resultado."
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-2xl font-semibold">Planes</h2>
          <p className="mt-2 text-muted-foreground">
            El paper trading es ilimitado en todos los planes. Lo que cambia es tu cuota diaria de
            búsquedas.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(["free", "monthly", "yearly"] as const).map((id) => {
              const plan = PLANS[id];
              return (
                <article key={id} className="surface-card flex flex-col p-5">
                  <p className="font-display text-lg font-semibold">{plan.name}</p>
                  <p className="num mt-1 text-3xl font-semibold">
                    {plan.price}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {plan.priceDetail}
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-5 w-full"
                    variant={id === "monthly" ? "default" : "outline"}
                  >
                    <Link to={ctaTo}>{id === "free" ? "Empezar gratis" : "Probar este plan"}</Link>
                  </Button>
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Los planes de pago se contratan con pago seguro y se pueden cancelar cuando quieras. El
            paper trading siempre usa capital virtual.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="surface-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Llévate P2P Lab en el móvil</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Instálala en tu pantalla de inicio y consulta tu cartera en cualquier momento.
              </p>
            </div>
            <InstallAppButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-xs text-muted-foreground">
          <p>{GENERAL_DISCLAIMER}</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/terminos" className="underline-offset-2 hover:text-foreground hover:underline">
              Términos y Condiciones
            </Link>
            <Link to="/privacidad" className="underline-offset-2 hover:text-foreground hover:underline">
              Política de Privacidad
            </Link>
            <Link to="/reembolsos" className="underline-offset-2 hover:text-foreground hover:underline">
              Política de Reembolsos
            </Link>
          </nav>
          <p>
            © {new Date().getFullYear()} P2P Lab. Herramienta educativa de análisis y simulación.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="surface-card p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </article>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10">{icon}</div>
      <h3 className="mt-3 font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
