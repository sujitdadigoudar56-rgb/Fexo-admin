"use client";

import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { ActiveBadge } from "@/components/ui/data";

type FAQ = { id: number; question: string; answer: string; display_order: number; is_active: boolean } & Record<string, unknown>;

const config: ResourceConfig<FAQ> = {
  path: "faqs",
  title: "FAQs",
  description: "Questions shown on the storefront's FAQ page.",
  singular: "FAQ",
  searchPlaceholder: "Search questions…",
  rowLabel: (f) => f.question,
  ordering: "display_order",
  columns: [
    {
      label: "Question",
      render: (f) => (
        <div className="max-w-xl">
          <p className="font-semibold">{f.question}</p>
          <p className="line-clamp-1 text-xs text-ink-500">{f.answer}</p>
        </div>
      ),
    },
    { label: "Order", render: (f) => f.display_order, className: "text-right tabular-nums" },
    { label: "Status", render: (f) => <ActiveBadge active={f.is_active} /> },
  ],
  defaults: { display_order: 0, is_active: true },
  fields: [
    { name: "question", label: "Question", type: "text", required: true, wide: true },
    { name: "answer", label: "Answer", type: "textarea", required: true, rows: 6 },
    { name: "display_order", label: "Display order", type: "number" },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function FaqsPage() {
  return <ResourceManager config={config} />;
}
