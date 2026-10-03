"use client";

import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { Badge } from "@/components/ui/data";
import { formatDate, formatMoney } from "@/lib/format";

type Coupon = {
  id: number;
  code: string;
  discount_type: "percent" | "flat";
  discount_value: number;
  minimum_order_value: number;
  max_uses: number;
  times_used: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  is_valid: boolean;
  created_at: string;
} & Record<string, unknown>;

const config: ResourceConfig<Coupon> = {
  path: "coupons",
  title: "Coupons",
  description: "Discount codes customers can apply at checkout.",
  singular: "Coupon",
  searchPlaceholder: "Search codes…",
  rowLabel: (c) => c.code,
  filters: [
    { name: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Disabled" }] },
    { name: "discount_type", label: "Type", options: [{ value: "percent", label: "Percentage" }, { value: "flat", label: "Flat amount" }] },
  ],
  columns: [
    { label: "Code", render: (c) => <span className="rounded-xs bg-cream-200 px-2 py-1 font-mono text-xs font-semibold">{c.code}</span> },
    {
      label: "Discount",
      render: (c) => (c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatMoney(c.discount_value)} off`),
    },
    { label: "Min. order", render: (c) => (c.minimum_order_value ? formatMoney(c.minimum_order_value) : "—") },
    { label: "Used", render: (c) => `${c.times_used}${c.max_uses ? ` / ${c.max_uses}` : ""}`, className: "tabular-nums" },
    { label: "Valid until", render: (c) => (c.valid_until ? formatDate(c.valid_until) : <span className="text-ink-500">No expiry</span>) },
    {
      label: "Status",
      render: (c) =>
        c.is_valid ? (
          <Badge tone="success" dot>
            Live
          </Badge>
        ) : c.is_active ? (
          <Badge tone="warning" dot>
            Not redeemable
          </Badge>
        ) : (
          <Badge dot>Disabled</Badge>
        ),
    },
  ],
  defaults: { discount_type: "percent", minimum_order_value: 0, max_uses: 0, is_active: true },
  fields: [
    { name: "code", label: "Code", type: "text", required: true, hint: "Saved in upper case, e.g. WELCOME10." },
    {
      name: "discount_type",
      label: "Discount type",
      type: "select",
      required: true,
      options: [
        { value: "percent", label: "Percentage" },
        { value: "flat", label: "Flat amount (₹)" },
      ],
    },
    { name: "discount_value", label: "Discount value", type: "number", required: true, step: "0.01" },
    { name: "minimum_order_value", label: "Minimum order value (₹)", type: "number", step: "0.01" },
    { name: "max_uses", label: "Max uses", type: "number", hint: "0 = unlimited" },
    { name: "valid_from", label: "Valid from", type: "datetime" },
    { name: "valid_until", label: "Valid until", type: "datetime" },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function CouponsPage() {
  return <ResourceManager config={config} />;
}
