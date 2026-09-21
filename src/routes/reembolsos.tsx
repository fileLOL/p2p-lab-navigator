import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/reembolsos")({
  head: () => ({
    meta: [
      { title: "Política de Reembolsos — P2P Lab" },
      {
        name: "description",
        content:
          "Política de reembolsos de P2P Lab: garantía de devolución de 30 días gestionada a través de PayPal, nuestro proveedor de pagos,.",
      },
      { property: "og:title", content: "Política de Reembolsos — P2P Lab" },
      {
        property: "og:description",
        content:
          "Cómo solicitar un reembolso de tu suscripción a P2P Lab: garantía de 30 días desde la sección de planes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReembolsosPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function ReembolsosPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-lg font-bold">
            P2P Lab
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Política de Reembolsos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 17 de septiembre de 2026
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-6 p-6">
            <Section title="Garantía de devolución de 30 días">
              <p>
                En P2P Lab ofrecemos una garantía de devolución de 30 días. Si no estás satisfecho
                con tu compra, puedes solicitar el reembolso íntegro dentro de los 30 días
                posteriores a la fecha de tu pedido.
              </p>
            </Section>

            <Section title="Cómo solicitar un reembolso">
              <p>
                Los reembolsos los gestiona PayPal, nuestro proveedor de pagos,. Para solicitar un
                reembolso:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  abre el portal de facturación desde la sección de planes (botón «Gestionar
                  suscripción») e indica el correo con el que compraste, o
                </li>
                <li>contacta con nuestro equipo de soporte y gestionaremos la solicitud.</li>
              </ul>
              <p>
                Tramitamos los reembolsos dentro de los 30 días posteriores al cobro y el
                abono llega al mismo método de pago que usaste al comprar.
              </p>
            </Section>

            <Section title="Cancelaciones">
              <p>
                Cancelar tu suscripción no es lo mismo que pedir un reembolso: al cancelar, dejas
                de renovar y mantienes el acceso hasta el final del periodo ya pagado. Puedes
                cancelar desde la sección de planes o desde el portal de facturación.
              </p>
            </Section>
          </CardContent>
        </Card>
        <p className="mt-6 text-sm text-muted-foreground">
          Ver también:{" "}
          <Link to="/terminos" className="underline">
            Términos y Condiciones
          </Link>{" "}
          ·{" "}
          <Link to="/privacidad" className="underline">
            Política de Privacidad
          </Link>
        </p>
      </main>
    </div>
  );
}
