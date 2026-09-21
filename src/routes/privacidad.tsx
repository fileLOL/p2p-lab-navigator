import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad — P2P Lab" },
      {
        name: "description",
        content:
          "Política de privacidad de P2P Lab: qué datos recogemos, para qué los usamos, con quién los compartimos y cuáles son tus derechos.",
      },
      { property: "og:title", content: "Política de Privacidad — P2P Lab" },
      {
        property: "og:description",
        content:
          "Cómo P2P Lab trata tus datos personales: finalidades, base legal, destinatarios, conservación y derechos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacidadPage() {
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
        <h1 className="font-display text-3xl font-bold">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 17 de septiembre de 2026
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-6 p-6">
            <Section title="1. Responsable del tratamiento">
              <p>
                El responsable del tratamiento de tus datos personales es Fundación P2P, con
                domicilio en Realengracht 196, 1013AV, Ámsterdam, Países Bajos, que opera bajo la
                marca comercial P2P Lab («el responsable», «nosotros»). Actuamos como responsable de
                los datos recogidos a través del servicio.
              </p>
            </Section>

            <Section title="2. Datos que recogemos y finalidades">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Cuenta:</strong> nombre y correo electrónico, para crear y gestionar tu
                  cuenta (ejecución del contrato).
                </li>
                <li>
                  <strong>Uso del servicio:</strong> búsquedas realizadas, simulaciones de
                  operaciones y configuración, para prestar el servicio y aplicar las cuotas de tu
                  plan (ejecución del contrato).
                </li>
                <li>
                  <strong>Registro de actividad:</strong> inicios de sesión, búsquedas, compras y
                  ventas simuladas, cambios de plan y bajas de cuenta, por seguridad y prevención
                  del fraude (interés legítimo).
                </li>
                <li>
                  <strong>Datos técnicos:</strong> dirección IP, identificadores de dispositivo y
                  telemetría básica, para seguridad y mejora del producto (interés legítimo).
                </li>
                <li>
                  <strong>Atención al cliente:</strong> mensajes que nos envíes, para responder a
                  tus solicitudes (interés legítimo).
                </li>
              </ul>
              <p>
                Los datos de pago los recoge y trata directamente PayPal, nuestro proveedor de
                pagos,, que gestiona el cobro y la facturación; no almacenamos los datos de tu
                tarjeta.
              </p>
            </Section>

            <Section title="3. Base legal">
              <p>
                Tratamos tus datos sobre la base de la ejecución del contrato, nuestro interés
                legítimo (seguridad, prevención del fraude, mejora del producto), tu consentimiento
                cuando lo solicitemos y el cumplimiento de obligaciones legales.
              </p>
            </Section>

            <Section title="4. Con quién compartimos los datos">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Proveedores de servicios y encargados del tratamiento (alojamiento, analítica,
                  herramientas de soporte).
                </li>
                <li>
                  Nuestro proveedor de pagos, para la venta del producto, gestión de suscripciones,
                  cobros, cumplimiento fiscal y facturación.
                </li>
                <li>Asesores profesionales (legales, contables) cuando sea necesario.</li>
                <li>Autoridades cuando la ley lo exija.</li>
              </ul>
            </Section>

            <Section title="5. Conservación">
              <p>
                Conservamos tus datos mientras mantengas tu cuenta y, después, durante los plazos
                exigidos por ley. Cuando ya no sean necesarios, los eliminamos o anonimizamos. Para
                hacer cumplir las cuotas del plan gratuito conservamos, tras la baja de la cuenta,
                un registro pseudonimizado (huella criptográfica del correo) del uso del día, que no
                permite recuperar tu cuenta ni tus datos.
              </p>
            </Section>

            <Section title="6. Transferencias internacionales">
              <p>
                Algunos proveedores pueden tratar datos fuera de la UE/EEE. En esos casos aplicamos
                garantías adecuadas, como cláusulas contractuales tipo o decisiones de adecuación.
              </p>
            </Section>

            <Section title="7. Tus derechos">
              <p>
                Puedes ejercer los derechos de acceso, rectificación, supresión, limitación,
                portabilidad y oposición, así como retirar el consentimiento, escribiéndonos a
                través del servicio. Responderemos en el plazo de un mes. También tienes derecho a
                reclamar ante la autoridad de control (en los Países Bajos, la Autoriteit
                Persoonsgegevens, o la autoridad de tu país de residencia).
              </p>
            </Section>

            <Section title="8. Seguridad">
              <p>
                Aplicamos medidas técnicas y organizativas apropiadas, incluidos cifrado en
                tránsito, controles de acceso y aislamiento de datos por usuario.
              </p>
            </Section>

            <Section title="9. Cookies">
              <p>
                Utilizamos cookies y almacenamiento local estrictamente necesarios para la sesión y
                las preferencias de la aplicación. No usamos cookies de marketing. Puedes gestionar
                o eliminar estas cookies desde la configuración de tu navegador; si las bloqueas, es
                posible que el acceso a tu cuenta no funcione.
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
          <Link to="/reembolsos" className="underline">
            Política de Reembolsos
          </Link>
        </p>
      </main>
    </div>
  );
}
