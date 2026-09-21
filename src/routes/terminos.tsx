import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — P2P Lab" },
      {
        name: "description",
        content:
          "Términos y condiciones de uso de P2P Lab, herramienta educativa de análisis y simulación de operaciones P2P.",
      },
      { property: "og:title", content: "Términos y Condiciones — P2P Lab" },
      {
        property: "og:description",
        content:
          "Condiciones de uso de P2P Lab: contratación, uso aceptable, planes y pagos procesados de forma segura por nuestro proveedor de pagos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminosPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TerminosPage() {
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
        <h1 className="font-display text-3xl font-bold">Términos y Condiciones</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 20 de septiembre de 2026
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-6 p-6">
            <Section title="1. Partes y aceptación">
              <p>
                Estos términos regulan el uso de P2P Lab («el servicio»), ofrecido por Fundación
                P2P, con domicilio en Realengracht 196, 1013AV, Ámsterdam, Países Bajos («el
                vendedor», «nosotros»), que opera bajo la marca comercial P2P Lab. Al registrarte o
                usar el servicio, contratas con el vendedor y aceptas estos términos. Si no estás de
                acuerdo, no uses el servicio.
              </p>
              <p>
                Declaras tener la edad legal para contratar o, si actúas para una organización,
                autoridad para vincularla.
              </p>
            </Section>

            <Section title="2. Descripción del servicio">
              <p>
                P2P Lab es una herramienta de análisis de diferenciales de precios en mercados P2P
                de criptomonedas, de simulación de operaciones (paper trading) con capital virtual,
                y un terminal desde el que puedes lanzar operaciones sobre tu propia cuenta de un
                exchange (actualmente Binance) conectándola con tus claves API. No es un exchange,
                no custodia fondos, no ejecuta operaciones por cuenta propia ni en tu nombre de
                forma discrecional, y no ofrece asesoramiento financiero, de inversión, legal ni
                fiscal.
              </p>
              <p>
                Los datos de mercado proceden de fuentes públicas (etiquetadas como REALES) o de
                demostración (etiquetadas como DEMO). Los diferenciales mostrados no representan
                beneficio garantizado ni real.
              </p>
            </Section>

            <Section title="2 bis. Trading real con tu cuenta de exchange">
              <p>
                Si conectas tu cuenta de un exchange mediante claves API, las operaciones se
                ejecutan siempre en tu propia cuenta, con tus fondos y bajo tu exclusiva
                responsabilidad. P2P Lab actúa únicamente como software que transmite las órdenes
                que tú confirmas expresamente; nunca custodia tus fondos ni puede retirarlos (las
                claves deben crearse sin permiso de retirada).
              </p>
              <p>
                Tus claves se almacenan cifradas y solo se usan para ejecutar lo que tú confirmas.
                Puedes desconectar el exchange en cualquier momento, lo que elimina las claves de
                nuestros sistemas. Las pérdidas derivadas de tus operaciones, de errores de
                configuración de tus claves o de fallos del exchange son responsabilidad tuya.
              </p>
            </Section>

            <Section title="3. Cuenta y credenciales">
              <p>
                Debes mantener la confidencialidad de tus credenciales y eres responsable de la
                actividad realizada bajo tu cuenta. Debes proporcionar información veraz y
                mantenerla actualizada.
              </p>
            </Section>

            <Section title="4. Uso aceptable">
              <p>No debes usar el servicio para:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>actividades ilegales, fraude o spam;</li>
                <li>infringir derechos de propiedad intelectual o industrial;</li>
                <li>
                  interferir en la seguridad del servicio (malware, sondeos, scraping masivo,
                  intentos de acceso no autorizado);
                </li>
                <li>eludir límites técnicos o de cuota del servicio.</li>
              </ul>
            </Section>

            <Section title="5. Propiedad intelectual">
              <p>
                El vendedor conserva la titularidad del servicio y de su propiedad intelectual
                (software, documentación, marca). Te concedemos una licencia limitada, no exclusiva
                y no transferible para usar el servicio conforme a tu plan. No puedes aplicar
                ingeniería inversa, revender ni redistribuir el servicio.
              </p>
            </Section>

            <Section title="6. Disponibilidad del servicio">
              <p>
                No garantizamos que el servicio esté libre de interrupciones o errores. Los datos de
                terceros pueden retrasarse, fallar o ser inexactos.
              </p>
            </Section>

            <Section title="7. Pagos y suscripciones">
              <p>
                Los pagos se procesan de forma segura a través de nuestro proveedor de pagos,
                nuestro proveedor de pagos,, que gestiona el cobro, la facturación, los impuestos y
                las devoluciones; no almacenamos los datos de tu tarjeta.
              </p>
              <p>
                Las suscripciones se renuevan automáticamente (mensual o anual según el plan) y
                puedes cancelarlas en cualquier momento desde la sección de planes o desde el portal
                de facturación; al cancelar, mantienes el acceso hasta el final del periodo pagado.
                Los cambios entre el plan Mensual y el Anual se aplican en tu próxima renovación,
                sin cargos ni reembolsos parciales en el periodo en curso.
              </p>
            </Section>

            <Section title="8. Suspensión y terminación">
              <p>
                Podemos suspender o terminar tu acceso ante incumplimiento grave, impago, riesgo de
                seguridad o fraude, o infracciones repetidas o graves de la política de uso
                aceptable. Puedes eliminar tu cuenta en cualquier momento desde la sección de
                seguridad; tus datos personales y de simulación se eliminarán conforme a la Política
                de Privacidad.
              </p>
            </Section>

            <Section title="9. Garantías y responsabilidad">
              <p>
                El servicio se ofrece «tal cual». En la máxima medida permitida por la ley,
                rechazamos toda garantía implícita de comerciabilidad e idoneidad para un fin
                particular. No seremos responsables de daños indirectos, consecuentes o especiales
                (pérdida de beneficios, datos o fondo de comercio). Nuestra responsabilidad total se
                limita a las cantidades que hayas pagado en los 12 meses anteriores, salvo en los
                casos en que la ley excluya esta limitación (fraude, muerte o lesiones personales).
              </p>
            </Section>

            <Section title="10. Legislación aplicable">
              <p>
                Estos términos se rigen por la legislación de los Países Bajos, con sometimiento a
                los juzgados y tribunales que correspondan conforme a derecho.
              </p>
            </Section>
          </CardContent>
        </Card>
        <p className="mt-6 text-sm text-muted-foreground">
          Ver también:{" "}
          <Link to="/privacidad" className="underline">
            Política de Privacidad
          </Link>{" "}
          ·{" "}
          <Link to="/reembolsos" className="underline">
            Política de Reembolsos
          </Link>
        </p>
      </main>
    </div>
  );
}
