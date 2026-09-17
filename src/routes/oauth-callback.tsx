import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { OAUTH_REDIRECT_KEY } from "@/components/GoogleSignInButton";

export const Route = createFileRoute("/oauth-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accediendo a P2P Lab" },
      { name: "description", content: "Completando el acceso a P2P Lab." },
      { property: "og:title", content: "Accediendo a P2P Lab" },
      { property: "og:description", content: "Completando el acceso a P2P Lab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthCallback,
});

function safePath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const go = (to: string) => {
      if (!active) return;
      let saved: string | null = null;
      try {
        saved = window.sessionStorage.getItem(OAUTH_REDIRECT_KEY);
        window.sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
      } catch {
        saved = null;
      }
      void navigate({ to: to === "auth" ? "/auth" : safePath(saved), replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go("session");
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go("session");
    });

    const timeout = window.setTimeout(() => go("auth"), 8000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Completando el acceso...</p>
    </div>
  );
}
