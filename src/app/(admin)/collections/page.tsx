"use client";

import type { Collection } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ActiveBadge, Badge, Thumb } from "@/components/ui/data";
import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";

const config: ResourceConfig<Collection & Record<string, unknown>> = {
  path: "collections",
  title: "Collections",
  description: "Curated drops and seasonal edits. Assign products to collections from the product editor.",
  singular: "Collection",
  searchPlaceholder: "Search collections…",
  rowLabel: (c) => c.name,
  filters: [
    { name: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Hidden" }] },
    { name: "is_limited_drop", label: "Type", options: [{ value: "true", label: "Limited drop" }, { value: "false", label: "Standard" }] },
  ],
  columns: [
    {
      label: "Collection",
      render: (c) => (
        <div className="flex items-center gap-3">
          <Thumb src={c.banner_image} alt={c.name} />
          <div>
            <p className="font-semibold">{c.name}</p>
            <p className="text-xs text-ink-500">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    { label: "Type", render: (c) => (c.is_limited_drop ? <Badge tone="gold">Limited drop</Badge> : <span className="text-ink-500">Standard</span>) },
    {
      label: "Runs",
      render: (c) =>
        c.start_date || c.end_date ? (
          <span className="text-ink-700">
            {formatDate(c.start_date)} – {formatDate(c.end_date)}
          </span>
        ) : (
          <span className="text-ink-500">Always</span>
        ),
    },
    { label: "Products", render: (c) => c.product_count, className: "text-right tabular-nums" },
    { label: "Status", render: (c) => <ActiveBadge active={c.is_active} /> },
  ],
  defaults: { is_active: true, is_limited_drop: false },
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", hint: "Leave blank to generate from the name." },
    { name: "description", label: "Description", type: "textarea", rows: 3 },
    { name: "banner_image", label: "Banner image", type: "image" },
    { name: "start_date", label: "Starts", type: "datetime" },
    { name: "end_date", label: "Ends", type: "datetime" },
    { name: "is_limited_drop", label: "Limited drop", type: "switch" },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function CollectionsPage() {
  return <ResourceManager config={config} />;
}
