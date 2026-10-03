"use client";

import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { ActiveBadge, Thumb } from "@/components/ui/data";

type Post = { id: number; image: string; link_url: string; is_active: boolean; display_order: number } & Record<string, unknown>;

const config: ResourceConfig<Post> = {
  path: "instagram-posts",
  title: "Instagram",
  description: "The Instagram grid on the homepage.",
  singular: "Post",
  searchPlaceholder: "Search…",
  rowLabel: (p) => `Post #${p.id}`,
  ordering: "display_order",
  columns: [
    {
      label: "Post",
      render: (p) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.image} alt={`Instagram post ${p.id}`} className="size-14" />
          <span className="font-semibold">#{p.id}</span>
        </div>
      ),
    },
    { label: "Link", render: (p) => (p.link_url ? <span className="text-ink-700">{p.link_url}</span> : <span className="text-ink-500">—</span>) },
    { label: "Order", render: (p) => p.display_order, className: "text-right tabular-nums" },
    { label: "Status", render: (p) => <ActiveBadge active={p.is_active} /> },
  ],
  defaults: { is_active: true, display_order: 0 },
  fields: [
    { name: "image", label: "Image", type: "image", required: true },
    { name: "link_url", label: "Link URL", type: "text", placeholder: "https://instagram.com/p/…" },
    { name: "display_order", label: "Display order", type: "number" },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function InstagramPage() {
  return <ResourceManager config={config} />;
}
