"use client";

import { useId } from "react";
import { cn } from "@/lib/format";

const control =
  "w-full rounded-sm border border-cream-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500 " +
  "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-600/20 disabled:bg-cream-100 disabled:text-ink-500";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string[] | string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-ink-900">
          {label}
          {required && <span className="ml-0.5 text-primary-600">*</span>}
        </label>
      )}
      {children}
      {message ? (
        <p className="mt-1 text-xs text-danger-500">{message}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(control, "h-10", invalid && "border-danger-500", className)} {...rest} />;
}

export function Textarea({
  className,
  invalid,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(control, "min-h-24 py-2.5 leading-relaxed", invalid && "border-danger-500", className)} {...rest} />;
}

export function Select({
  className,
  invalid,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(control, "h-10 pr-8", invalid && "border-danger-500", className)} {...rest}>
      {children}
    </select>
  );
}

/** Pill toggle for booleans (is_active, is_featured …). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-pill transition-colors disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30",
          checked ? "bg-primary-600" : "bg-cream-400",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
      {(label || description) && (
        <label htmlFor={id} className="cursor-pointer select-none">
          {label && <span className="block text-sm font-medium text-ink-900">{label}</span>}
          {description && <span className="block text-xs text-ink-500">{description}</span>}
        </label>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded-xs border-cream-300 accent-primary-600"
      />
      {label}
    </label>
  );
}
