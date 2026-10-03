import {
  BadgePercent,
  BookOpen,
  Camera,
  CircleHelp,
  FolderTree,
  Images,
  Layers,
  LayoutDashboard,
  Mail,
  MessageSquareQuote,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Users,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "pending_orders" | "pending_reviews" | "unread_messages" };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingBag, badge: "pending_orders" },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/coupons", label: "Coupons", icon: BadgePercent },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/collections", label: "Collections", icon: Layers },
      { href: "/reviews", label: "Reviews", icon: Star, badge: "pending_reviews" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/banners", label: "Banners", icon: Images },
      { href: "/journal", label: "Journal", icon: BookOpen },
      { href: "/testimonials", label: "Testimonials", icon: MessageSquareQuote },
      { href: "/instagram", label: "Instagram", icon: Camera },
      { href: "/faqs", label: "FAQs", icon: CircleHelp },
    ],
  },
  {
    label: "Inbox",
    items: [
      { href: "/messages", label: "Messages", icon: Mail, badge: "unread_messages" },
      { href: "/subscribers", label: "Subscribers", icon: Newspaper },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Site settings", icon: Settings }],
  },
];
