import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-bg-elevated rounded-sm animate-skeleton-pulse",
        className
      )}
      {...props}
    />
  );
}
