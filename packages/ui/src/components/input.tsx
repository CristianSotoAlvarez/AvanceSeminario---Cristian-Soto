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
    const idInput = id || label?.toLowerCase().replace(/\s+/g, "-");
    const tieneError = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={idInput}
            className={cn(
              "font-display text-label uppercase",
              tieneError ? "text-semantic-error" : "text-text-muted"
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={idInput}
          className={cn(
            "bg-bg-surface border rounded-sm px-4 py-2 font-display text-body text-text-primary",
            "outline-none transition-all",
            compact ? "h-8" : "h-10",
            tieneError
              ? "border-semantic-error shadow-[0_0_0_3px_rgba(212,128,122,0.15)]"
              : "border-bg-elevated focus:border-accent focus:shadow-[0_0_0_3px_rgba(30,64,175,0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {(error || hint) && (
          <span className={cn(
            "font-display text-caption",
            tieneError ? "text-semantic-error" : "text-text-muted"
          )}>
            {error || hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
