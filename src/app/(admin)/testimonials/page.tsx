"use client";

import { Star } from "lucide-react";
import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { ActiveBadge } from "@/components/ui/data";

type Testimonial = {
  id: number;
  author_name: string;
  author_title: string;
  quote: string;
  rating: number;
  is_active: boolean;
} & Record<string, unknown>;

const config: ResourceConfig<Testimonial> = {
  path: "testimonials",
  title: "Testimonials",
  description: "Customer quotes shown on the homepage.",
  singular: "Testimonial",
  searchPlaceholder: "Search testimonials…",
  rowLabel: (t) => t.author_name,
  columns: [
    {
      label: "Author",
      render: (t) => (
        <div>
          <p className="font-semibold">{t.author_name}</p>
          {t.author_title && <p className="text-xs text-ink-500">{t.author_title}</p>}
        </div>
      ),
    },
    { label: "Quote", render: (t) => <p className="line-clamp-2 max-w-md text-ink-700">“{t.quote}”</p> },
    {
      label: "Rating",
      render: (t) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Star className="size-3.5 fill-gold-400 text-gold-400" aria-hidden /> {t.rating}/5
        </span>
      ),
    },
    { label: "Status", render: (t) => <ActiveBadge active={t.is_active} /> },
  ],
  defaults: { rating: 5, is_active: true },
  fields: [
    { name: "author_name", label: "Author name", type: "text", required: true },
    { name: "author_title", label: "Author title", type: "text", placeholder: "e.g. Stylist, Mumbai" },
    { name: "quote", label: "Quote", type: "textarea", required: true },
    {
      name: "rating",
      label: "Rating",
      type: "select",
      required: true,
      options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? "s" : ""}` })),
    },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function TestimonialsPage() {
  return <ResourceManager config={config} />;
}
