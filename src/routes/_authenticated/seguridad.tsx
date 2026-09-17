import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { InstallAppButton } from "@/components/InstallAppButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOverview } from "@/hooks/useOverview";
import { deleteAccount, getAuditLog, updateProfile } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/seguridad")({
  head: () => ({
    meta: [
      { title: "Perfil y seguridad — P2P Lab" },
      {
        name: "description",
        content:
          "Gestiona tu perfil, revisa la actividad de tu cuenta y elimina tus datos cuando quieras.",
      },
      { property: "og:title", content: "Perfil y seguridad — P2P Lab" },
      {
        property: "og:description",
        content: "Perfil, actividad y eliminación de cuenta en P2P Lab.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { data, refetch } = useOverview();
  const { user } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const updateFn = useServerFn(updateProfile);
  const auditFn = useServerFn(getAuditLog);

  const displayName = name ?? data?.profile?.display_name ?? "";

  const audit = useQuery({ queryKey: ["audit"], queryFn: () => auditFn() });

  const saveProfile = useMutation({
    mutationFn: () => updateFn({ data: { displayName } }),
    onSuccess: () => {
      toast.success("Perfil actualizado.");
      void refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Perfil y seguridad" subtitle="Tu cuenta, tu actividad y tus datos">
      <div className="space-y-5">
        <section className="surface-card p-4">
          <h2 className="font-display text-base font-semibold">Perfil</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Correo</Label>
              <Input id="profile-email" value={user?.email ?? ""} disabled />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            Guardar cambios
          </Button>
        </section>

        <section className="surface-card p-4">
          <h2 className="font-display text-base font-semibold">Contraseña</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Te enviaremos un correo con un enlace para definir una contraseña nueva.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={async () => {
              if (!user?.email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) toast.error(error.message);
              else toast.success("Correo enviado.");
            }}
          >
            Enviar enlace de cambio de contraseña
          </Button>
        </section>

        <section className="surface-card p-4">
          <h2 className="font-display text-base font-semibold">Instalar la aplicación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Añade P2P Lab a tu pantalla de inicio para abrirla como una app.
          </p>
          <div className="mt-3">
            <InstallAppButton />
          </div>
        </section>

        <section className="surface-card p-4">
          <h2 className="font-display text-base font-semibold">Actividad reciente</h2>
          {audit.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Cargando actividad...</p>
          ) : !audit.data || audit.data.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No hay actividad registrada todavía.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {audit.data.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
                >
                  <span>{actionLabel(entry.action)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <DeleteAccountSection />
      </div>
    </AppShell>
  );
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    login: "Inicio de sesión",
    search: "Búsqueda de oportunidades",
    paper_buy: "Compra simulada",
    paper_sell: "Venta simulada",
    plan_change: "Cambio de plan",
    profile_update: "Actualización de perfil",
    account_deletion: "Eliminación de cuenta",
  };
  return map[action] ?? action;
}

function DeleteAccountSection() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState("");
  const navigate = useNavigate();
  const fn = useServerFn(deleteAccount);

  const mutation = useMutation({
    mutationFn: () => fn({ data: { confirmation: confirmText } }),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Tu cuenta y todos tus datos se han eliminado.");
      void navigate({ to: "/" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-destructive" />
        <div>
          <h2 className="font-display text-base font-semibold">Eliminar cuenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se borran de forma permanente tu perfil, tu cartera virtual, tus operaciones y tu
            historial. No se puede deshacer. Las búsquedas que ya has gastado hoy quedan asociadas a
            tu correo: si te registras de nuevo con el mismo correo, la cuota del día no se
            reinicia.
          </p>
        </div>
      </div>
      <Button variant="destructive" className="mt-4" onClick={() => setStep(1)}>
        Eliminar mi cuenta
      </Button>

      <Dialog open={step === 1} onOpenChange={(o) => setStep(o ? 1 : 0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Seguro que quieres eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Perderás tu capital virtual, tus posiciones abiertas y todo tu histórico de
              operaciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(0)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setStep(2)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={step === 2} onOpenChange={(o) => setStep(o ? 2 : 0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmación final</DialogTitle>
            <DialogDescription>Escribe ELIMINAR en mayúsculas para confirmar.</DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(0)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "ELIMINAR" || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Eliminando..." : "Eliminar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
