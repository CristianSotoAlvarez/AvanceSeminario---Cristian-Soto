import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-bg-surface border border-bg-elevated rounded-md p-4",
        className
      )}
      {...props}
    />
  );
}

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  valueColor?: string;
  trend?: { value: string; positive: boolean };
}

export function KpiCard({ label, value, valueColor, trend, className, ...props }: KpiCardProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <span className="font-display text-label uppercase text-text-muted">
        {label}
      </span>
      <span
        className="font-data text-kpi-lg mt-1"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </span>
      {trend && (
        <span className={cn(
          "font-data text-data mt-1.5",
          trend.positive ? "text-semantic-success" : "text-semantic-error"
        )}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </span>
      )}
    </Card>
  );
}
