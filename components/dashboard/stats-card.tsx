import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
};

const variantStyles = {
  default: "text-foreground",
  success: "text-green-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

const iconBgStyles = {
  default: "bg-muted",
  success: "bg-green-50",
  warning: "bg-amber-50",
  danger: "bg-red-50",
};

export function StatsCard({ title, value, subtitle, icon: Icon, trend, variant = "default", onClick }: StatsCardProps) {
  return (
    <Card
      className={cn("transition-shadow", onClick && "cursor-pointer hover:shadow-md")}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBgStyles[variant])}>
            <Icon className={cn("h-5 w-5", variantStyles[variant])} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold", variantStyles[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
              {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
