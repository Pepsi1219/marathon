import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  accent?: boolean;
}

export function StatTile({ icon: Icon, label, value, unit, sublabel, accent }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
      <span
        className={`flex size-8 items-center justify-center rounded-lg ${
          accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-xl font-bold tabular-nums leading-none">{value}</span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground/70">{sublabel}</p>}
      </div>
    </div>
  );
}
