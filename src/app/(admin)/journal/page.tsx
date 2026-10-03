"use client";

import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { ActiveBadge, Thumb } from "@/components/ui/data";
import { formatDate } from "@/lib/format";

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author_name: string;
  is_published: boolean;
  created_at: string;
} & Record<string, unknown>;

const config: ResourceConfig<Post> = {
  path: "journal",
  title: "Journal",
  description: "Editorial posts for the storefront's journal.",
  singular: "Post",
  searchPlaceholder: "Search posts…",
  rowLabel: (p) => p.title,
  filters: [
    { name: "is_published", label: "Status", options: [{ value: "true", label: "Published" }, { value: "false", label: "Draft" }] },
  ],
  columns: [
    {
      label: "Post",
      render: (p) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.cover_image} alt={p.title} className="h-10 w-14" />
          <div>
            <p className="font-semibold">{p.title}</p>
            <p className="text-xs text-ink-500">/{p.slug}</p>
          </div>
        </div>
      ),
    },
    { label: "Author", render: (p) => p.author_name },
    { label: "Created", render: (p) => formatDate(p.created_at) },
    { label: "Status", render: (p) => <ActiveBadge active={p.is_published} on="Published" off="Draft" /> },
  ],
  defaults: { author_name: "FEXO Editorial", is_published: true },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", hint: "Leave blank to generate from the title." },
    { name: "author_name", label: "Author", type: "text" },
    { name: "excerpt", label: "Excerpt", type: "text", wide: true },
    { name: "content", label: "Content", type: "textarea", required: true, rows: 10 },
    { name: "cover_image", label: "Cover image", type: "image" },
    { name: "is_published", label: "Published", type: "switch" },
  ],
};

export default function JournalPage() {
  return <ResourceManager config={config} />;
}
