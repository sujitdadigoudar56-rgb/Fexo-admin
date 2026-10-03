"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Inbox, Loader2, Search, Upload, X } from "lucide-react";
import { cn, titleCase } from "@/lib/format";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-md border border-cream-300 bg-white", className)}>{children}</section>;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-cream-300 px-5 py-4", className)}>
      <div>
        <h2 className="font-display text-lg leading-tight text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="font-display text-3xl leading-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-cream-200 text-ink-700",
  success: "bg-success-50 text-success-500",
  warning: "bg-warning-50 text-warning-500",
  danger: "bg-danger-50 text-danger-500",
  info: "bg-info-50 text-info-500",
  primary: "bg-primary-50 text-primary-600",
  gold: "bg-gold-50 text-gold-600",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const statusTones: Record<string, Tone> = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
  published: "success",
  draft: "neutral",
  archived: "warning",
};

/** Order / product status pill — always text + dot, never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTones[status] ?? "neutral"} dot>
      {titleCase(status)}
    </Badge>
  );
}

export function ActiveBadge({ active, on = "Active", off = "Hidden" }: { active: boolean; on?: string; off?: string }) {
  return (
    <Badge tone={active ? "success" : "neutral"} dot>
      {active ? on : off}
    </Badge>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto scroll-thin", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-cream-300 bg-cream-50 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-ink-500 uppercase", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("border-b border-cream-200 px-4 py-3 align-middle text-ink-900", className)}>
      {children}
    </td>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-primary-600", className)} aria-label="Loading" />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500">
      <Spinner /> {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-cream-200 text-ink-500">
        {icon ?? <Inbox className="size-5" />}
      </span>
      <p className="font-display text-lg text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="m-5 flex items-center justify-between gap-4 rounded-sm border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-500">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(count, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm text-ink-500">
      <span>
        Showing <span className="font-medium text-ink-900">{from}</span>–<span className="font-medium text-ink-900">{to}</span> of{" "}
        <span className="font-medium text-ink-900">{count}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex size-8 items-center justify-center rounded-sm border border-cream-300 bg-white text-ink-700 hover:bg-cream-100 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 text-ink-700">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="inline-flex size-8 items-center justify-center rounded-sm border border-cream-300 bg-white text-ink-700 hover:bg-cream-100 disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Search box that reports its value after the user pauses typing. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Follow external resets of `value` (e.g. a cleared filter).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-sm border border-cream-300 bg-white pr-3 pl-9 text-sm placeholder:text-ink-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-600/20 focus:outline-none"
      />
    </div>
  );
}

export function Thumb({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-cream-300 bg-cream-100", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <ImageOff className="size-4 text-ink-300" aria-hidden />
      )}
    </span>
  );
}

/** Image picker that previews either the current URL or a newly chosen file.
 *  value: File (new upload) | string (existing URL) | null (none / cleared). */
export function ImageInput({
  value,
  onChange,
  accept = "image/*",
  label = "Upload image",
}: {
  value: File | string | null;
  onChange: (value: File | null) => void;
  accept?: string;
  label?: string;
}) {
  const objectUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);
  const preview = objectUrl ?? (typeof value === "string" ? value : null);

  const isVideo = accept.startsWith("video");

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-dashed border-cream-400 bg-cream-50">
        {preview ? (
          isVideo ? (
            <video src={preview} className="size-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          )
        ) : (
          <ImageOff className="size-5 text-ink-300" aria-hidden />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-cream-300 bg-white px-3 text-[13px] font-semibold text-ink-900 hover:bg-cream-100">
          <Upload className="size-4" />
          {preview ? "Replace" : label}
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChange(file);
              e.target.value = "";
            }}
          />
        </label>
        {value instanceof File && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-danger-500">
            <X className="size-3" /> Discard new file
          </button>
        )}
        <span className="text-xs text-ink-500">{value instanceof File ? value.name : "JPG, PNG or WebP"}</span>
      </div>
    </div>
  );
}
