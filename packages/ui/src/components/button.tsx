import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-display uppercase tracking-wide transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-bg-primary hover:bg-accent-hover",
        outline: "bg-transparent text-accent border border-accent hover:bg-accent/5",
        secondary: "bg-bg-elevated text-text-primary border border-bg-elevated hover:bg-bg-elevated/80",
        danger: "bg-semantic-error text-bg-primary hover:brightness-110",
        success: "bg-semantic-success text-bg-primary hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-[11px] tracking-[0.5px] gap-1 rounded-sm",
        "sm-emphasis": "h-9 px-3 text-[11px] tracking-[0.5px] gap-1 rounded-sm",
        md: "h-10 px-4 text-[12px] tracking-[0.8px] gap-2 rounded-sm",
        "md-emphasis": "h-12 px-4 text-[12px] tracking-[0.8px] gap-2 rounded-sm",
        lg: "h-[52px] px-6 text-[14px] tracking-[1px] gap-2 rounded-sm",
        "lg-emphasis": "h-14 px-6 text-[14px] tracking-[1px] gap-2 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
