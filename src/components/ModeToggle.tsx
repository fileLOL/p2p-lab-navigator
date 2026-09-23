import { cn } from "@/lib/utils";

export type TradeMode = "sim" | "real";

export function ModeToggle({
  value,
  onChange,
}: {
  value: TradeMode;
  onChange: (mode: TradeMode) => void;
}) {
  const options: { id: TradeMode; label: string }[] = [
    { id: "sim", label: "Simulación" },
    { id: "real", label: "Real" },
  ];
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-border bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === o.id
              ? o.id === "real"
                ? "bg-success text-success-foreground shadow-sm"
                : "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
