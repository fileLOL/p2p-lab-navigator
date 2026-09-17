import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Acceder a P2P Lab" },
      {
        name: "description",
        content: "Crea tu cuenta gratuita de P2P Lab y empieza a simular operaciones P2P con capital virtual.",
      },
      { property: "og:title", content: "Acceder a P2P Lab" },
      { property: "og:description", content: "Registro y acceso a P2P Lab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safePath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const target = safePath(search.redirect);

  useEffect(() => {
    if (session) void navigate({ to: target });
  }, [session, navigate, target]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Link to="/" className="flex items-center gap-2">
        <img src="/icons/icon-192.png" alt="P2P Lab" width={36} height={36} className="size-9 rounded-lg" />
        <span className="font-display text-xl font-semibold">P2P Lab</span>
      </Link>

      <div className="surface-card w-full max-w-md p-5">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        P2P Lab es una herramienta de análisis y simulación. No custodiamos fondos ni ejecutamos operaciones reales.
      </p>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
      return;
    }
    toast.success("Sesión iniciada");
  };

  const handleRecover = async () => {
    if (!email) {
      toast.error("Escribe tu correo para recuperar la contraseña.");
      return;
    }
    setRecovering(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecovering(false);
    if (error) toast.error(error.message);
    else toast.success("Te hemos enviado un correo para restablecer la contraseña.");
  };

  return (
    <form onSubmit={handleLogin} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={handleRecover} disabled={recovering}>
        {recovering ? "Enviando..." : "He olvidado mi contraseña"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
      toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
      return;
    }
    toast.success("Cuenta creada. Tienes 20 € de capital virtual.");
  };

  if (checkEmail) {
    return (
      <div className="mt-6 space-y-2 text-sm">
        <p className="font-medium">Revisa tu correo</p>
        <p className="text-muted-foreground">
          Te hemos enviado un enlace de confirmación a {email}. Después podrás iniciar sesión.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nombre</Label>
        <Input id="signup-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Correo electrónico</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Contraseña</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando cuenta..." : "Empezar gratis"}
      </Button>
    </form>
  );
}
