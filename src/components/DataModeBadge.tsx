import { Badge } from "@/components/ui/badge";

export function DataModeBadge({ mode }: { mode: "real" | "demo" }) {
  if (mode === "real") {
    return (
      <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
        DATOS REALES
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning-foreground">
      DATOS DEMO
    </Badge>
  );
}
