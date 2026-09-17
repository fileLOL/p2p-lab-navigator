import { useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export const OAUTH_REDIRECT_KEY = "p2plab:oauth-redirect";

export function GoogleSignInButton({ redirectTo }: { redirectTo: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      window.sessionStorage.setItem(OAUTH_REDIRECT_KEY, redirectTo);
    } catch {
      // sessionStorage puede no estar disponible; el destino por defecto sigue funcionando
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/oauth-callback`,
    });
    if (result.error) {
      setLoading(false);
      toast.error("No se ha podido iniciar sesión con Google.");
      return;
    }
    if (result.redirected) return;
    window.location.assign("/oauth-callback");
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      <GoogleMark />
      {loading ? "Conectando..." : "Continuar con Google"}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.28a12 12 0 0 0 0 10.72l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.16 15.23 0 12 0A12 12 0 0 0 1.28 6.64l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}
