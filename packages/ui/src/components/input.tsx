import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, compact, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "font-display text-label uppercase",
              hasError ? "text-semantic-error" : "text-text-muted"
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "bg-bg-elevated border rounded-sm px-4 py-2 font-display text-body text-text-primary",
            "outline-none transition-all",
            compact ? "h-8" : "h-10",
            hasError
              ? "border-semantic-error shadow-[0_0_0_3px_rgba(212,128,122,0.15)]"
              : "border-bg-elevated focus:border-accent focus:shadow-[0_0_0_3px_rgba(245,110,15,0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <span className={cn(
            "font-display text-caption",
            hasError ? "text-semantic-error" : "text-text-muted"
          )}>
            {error || hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
