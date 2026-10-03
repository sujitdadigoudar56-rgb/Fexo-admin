"use client";

import { useMemo } from "react";
import { useOptions } from "@/lib/hooks";
import type { Category } from "@/lib/types";
import { ActiveBadge, Thumb } from "@/components/ui/data";
import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";

export default function CategoriesPage() {
  const all = useOptions<Category>("/categories/");

  const config = useMemo<ResourceConfig<Category & Record<string, unknown>>>(
    () => ({
      path: "categories",
      title: "Categories",
      description: "The storefront's shop taxonomy. Products belong to exactly one category.",
      singular: "Category",
      searchPlaceholder: "Search categories…",
      rowLabel: (c) => c.name,
      filters: [
        { name: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Hidden" }] },
      ],
      columns: [
        {
          label: "Category",
          render: (c) => (
            <div className="flex items-center gap-3">
              <Thumb src={c.image} alt={c.name} />
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-ink-500">/{c.slug}</p>
              </div>
            </div>
          ),
        },
        { label: "Parent", render: (c) => c.parent_name ?? <span className="text-ink-500">—</span> },
        { label: "Products", render: (c) => c.product_count, className: "text-right tabular-nums" },
        { label: "Order", render: (c) => c.display_order, className: "text-right tabular-nums" },
        { label: "Status", render: (c) => <ActiveBadge active={c.is_active} /> },
      ],
      defaults: { is_active: true, display_order: 0, parent: null },
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "slug", label: "Slug", type: "text", hint: "Leave blank to generate from the name." },
        {
          name: "parent",
          label: "Parent category",
          type: "select",
          nullable: true,
          options: all.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: "display_order", label: "Display order", type: "number", hint: "Lower numbers show first." },
        { name: "description", label: "Description", type: "textarea", rows: 3 },
        { name: "image", label: "Image", type: "image" },
        { name: "meta_title", label: "SEO title", type: "text" },
        { name: "meta_description", label: "SEO description", type: "text" },
        { name: "is_active", label: "Active", type: "switch", hint: "Hidden categories don't appear on the storefront." },
      ],
    }),
    [all],
  );

  return <ResourceManager config={config} />;
}
