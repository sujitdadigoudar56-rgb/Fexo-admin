const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN");

export const formatMoney = (value: number | string | null | undefined, exact = false) =>
  (exact ? inrExact : inr).format(Number(value ?? 0));

export const formatNumber = (value: number | null | undefined) => num.format(Number(value ?? 0));

export const formatCompactMoney = (value: number) => {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return `₹${Math.round(value)}`;
};

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** ISO string -> value for <input type="datetime-local">. */
export function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string (or null when empty). */
export function fromLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
