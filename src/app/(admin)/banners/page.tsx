"use client";

import { ResourceManager, type ResourceConfig } from "@/components/resource-manager";
import { ActiveBadge, Badge, Thumb } from "@/components/ui/data";

type Banner = {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  video: string | null;
  link_url: string;
  is_active: boolean;
  display_order: number;
} & Record<string, unknown>;

const config: ResourceConfig<Banner> = {
  path: "banners",
  title: "Banners",
  description: "Homepage hero slides. A video takes priority over the image when both are set.",
  singular: "Banner",
  searchPlaceholder: "Search banners…",
  rowLabel: (b) => b.title,
  ordering: "display_order",
  columns: [
    {
      label: "Banner",
      render: (b) => (
        <div className="flex items-center gap-3">
          <Thumb src={b.image} alt={b.title} className="h-10 w-16" />
          <div>
            <p className="font-semibold">{b.title}</p>
            {b.subtitle && <p className="max-w-xs truncate text-xs text-ink-500">{b.subtitle}</p>}
          </div>
        </div>
      ),
    },
    {
      label: "Media",
      render: (b) => (b.video ? <Badge tone="info">Video</Badge> : b.image ? <Badge>Image</Badge> : <span className="text-ink-500">—</span>),
    },
    { label: "Link", render: (b) => (b.link_url ? <span className="text-ink-700">{b.link_url}</span> : <span className="text-ink-500">—</span>) },
    { label: "Order", render: (b) => b.display_order, className: "text-right tabular-nums" },
    { label: "Status", render: (b) => <ActiveBadge active={b.is_active} /> },
  ],
  defaults: { is_active: true, display_order: 0 },
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "subtitle", label: "Subtitle", type: "text" },
    { name: "link_url", label: "Link URL", type: "text", placeholder: "/shop/collection/winter", hint: "Where the banner's button points." },
    { name: "display_order", label: "Display order", type: "number" },
    { name: "image", label: "Image", type: "image" },
    { name: "video", label: "Video", type: "video" },
    { name: "is_active", label: "Active", type: "switch" },
  ],
};

export default function BannersPage() {
  return <ResourceManager config={config} />;
}
