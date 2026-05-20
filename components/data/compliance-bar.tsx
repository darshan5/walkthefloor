import { cn } from "@/lib/utils";

type ComplianceBarProps = {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md";
};

function getComplianceColor(percent: number): string {
  if (percent >= 75) return "bg-green-500";
  if (percent >= 50) return "bg-amber-500";
  if (percent >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function ComplianceBar({ value, max = 100, label, showPercent = true, size = "md" }: ComplianceBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>}
      <div className={cn("flex-1 rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2.5")}>
        <div
          className={cn("rounded-full transition-all", getComplianceColor(percent), size === "sm" ? "h-1.5" : "h-2.5")}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showPercent && (
        <span className={cn("shrink-0 tabular-nums", size === "sm" ? "text-xs" : "text-sm", "font-medium")}>
          {percent}%
        </span>
      )}
    </div>
  );
}
