import { Link, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  Shield,
  Wallet,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/oportunidades", label: "Oportunidades", icon: Search },
  { to: "/cartera", label: "Cartera", icon: Wallet },
  { to: "/operaciones", label: "Operaciones", icon: LineChart },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { to: "/planes", label: "Planes", icon: CreditCard },
  { to: "/seguridad", label: "Seguridad", icon: Shield },
] as const;

const MOBILE_NAV = NAV.slice(0, 4);

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    await router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 lg:flex">
          <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
            <img
              src="/icons/icon-192.png"
              alt="P2P Lab"
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
            <span className="font-display text-lg font-semibold">P2P Lab</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-sidebar-border pt-3">
            <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{user?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" /> Cerrar sesión
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-semibold lg:text-2xl">{title}</h1>
                {subtitle ? (
                  <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <Button variant="outline" size="sm" className="lg:hidden" onClick={handleSignOut}>
                <LogOut className="size-4" />
                <span className="sr-only">Cerrar sesión</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground",
            )}
            activeProps={{ className: "text-primary font-medium" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted-foreground"
            >
              <Menu className="size-5" />
              Más
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4 pb-6">
              {NAV.slice(4).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void handleSignOut();
                }}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}
