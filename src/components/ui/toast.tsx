"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cn } from "@/lib/format";

type Toast = { id: number; kind: "success" | "error"; message: string };

const ToastContext = createContext<{
  success: (message: string) => void;
  error: (message: string) => void;
} | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (kind: Toast["kind"], message: string) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (m: string) => push("success", m),
      error: (m: string) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <li
            key={t.id}
            className={cn(
              "animate-fade-in pointer-events-auto flex items-start gap-3 rounded-md border bg-white p-4 text-sm shadow-lg",
              t.kind === "success" ? "border-success-500/30" : "border-danger-500/30",
            )}
          >
            {t.kind === "success" ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-500" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger-500" aria-hidden />
            )}
            <span className="flex-1 text-ink-900">{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-ink-500 hover:text-ink-900">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
