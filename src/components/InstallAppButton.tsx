import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton({
  variant = "default",
}: {
  variant?: "default" | "outline" | "secondary";
}) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="text-sm text-muted-foreground">La app ya está instalada en este dispositivo.</p>
    );
  }

  const handleClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setShowHelp(true);
  };

  return (
    <>
      <Button variant={variant} onClick={handleClick}>
        <Download className="size-4" /> Instalar app
      </Button>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar P2P Lab</DialogTitle>
            <DialogDescription>
              Tu navegador no permite la instalación automática. Puedes añadirla manualmente:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">iPhone / iPad (Safari):</strong> pulsa Compartir y
              luego «Añadir a pantalla de inicio».
            </li>
            <li>
              <strong className="text-foreground">Android (Chrome):</strong> menú de tres puntos y
              «Instalar aplicación» o «Añadir a pantalla de inicio».
            </li>
            <li>
              <strong className="text-foreground">Escritorio:</strong> icono de instalación en la
              barra de direcciones.
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
