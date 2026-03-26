import { type HTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { getBadgeStyles, type SemanticColorKey } from "../utils/colors";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color: SemanticColorKey;
}

export function Badge({ color, className, style, children, ...props }: BadgeProps) {
  const badgeStyles = getBadgeStyles(color);

  return (
    <span
      className={cn(
        "inline-block rounded-sm px-2.5 py-0.5 font-data text-badge font-semibold border",
        className
      )}
      style={{ ...badgeStyles, ...style }}
      {...props}
    >
      {children}
    </span>
  );
}
