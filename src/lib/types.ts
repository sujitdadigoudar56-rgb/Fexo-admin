// Shapes returned by the backend's /api/admin/ endpoints
// (backend/dashboard/serializers.py).

export type StaffUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_superuser: boolean;
};

export type ProductStatus = "draft" | "published" | "archived";

export type ProductImage = {
  id: number;
  product: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
  display_order: number;
};

export type ProductVariant = {
  id: number;
  product: number;
  size: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
};

export type ProductListItem = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: number;
  category_name: string;
  price: number;
  compare_at_price: number | null;
  status: ProductStatus;
  total_stock: number;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  image: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = Omit<ProductListItem, "image"> & {
  collections: number[];
  short_description: string;
  description: string;
  fabric_details: string;
  size_guide: string;
  gst_percent: number;
  color: string;
  available_sizes: string;
  meta_title: string;
  meta_description: string;
  images: ProductImage[];
  variants: ProductVariant[];
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  parent_name: string | null;
  is_active: boolean;
  display_order: number;
  meta_title: string;
  meta_description: string;
  product_count: number;
  created_at: string;
};

export type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string;
  banner_image: string | null;
  is_limited_drop: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  product_count: number;
  created_at: string;
};

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "razorpay" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderCustomer = { id: number; username: string; email: string; full_name: string };

export type Address = {
  id: number;
  address_type: "billing" | "shipping";
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

export type OrderListItem = {
  id: number;
  order_number: string;
  customer: OrderCustomer;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  /** Online order not paid yet — not a real sale until paid. */
  awaiting_payment: boolean;
  grand_total: number;
  item_count: number | null;
  created_at: string;
};

export type OrderItem = {
  id: number;
  product: number | null;
  product_slug: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  size: string;
  line_total: number;
};

export type Order = Omit<OrderListItem, "item_count"> & {
  billing_address: Address | null;
  shipping_address: Address | null;
  subtotal: number;
  gst_amount: number;
  shipping_cost: number;
  discount_amount: number;
  coupon_code: string | null;
  notes: string;
  items: OrderItem[];
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_refund_id: string;
  paid_at: string | null;
  is_finalized: boolean;
  updated_at: string;
};

export type Customer = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  order_count: number;
  total_spent: number;
};

export type CustomerDetail = Customer & {
  addresses: Address[];
  orders: { order_number: string; status: OrderStatus; grand_total: number; created_at: string }[];
};

export type Review = {
  id: number;
  product: number;
  product_name: string;
  user: number;
  user_name: string;
  rating: number;
  title: string;
  comment: string;
  is_approved: boolean;
  created_at: string;
};

export type DashboardStats = {
  days: number;
  kpis: {
    revenue: number;
    revenue_change: number | null;
    orders: number;
    orders_change: number | null;
    avg_order_value: number;
    new_customers: number;
    new_customers_change: number | null;
    total_customers: number;
    total_products: number;
    published_products: number;
    pending_orders: number;
    unread_messages: number;
    pending_reviews: number;
    awaiting_payment: number;
  };
  sales: { date: string; revenue: number; orders: number }[];
  status_breakdown: { status: OrderStatus; label: string; count: number }[];
  top_products: { product_id: number | null; product_name: string; units: number; revenue: number }[];
  recent_orders: OrderListItem[];
  low_stock: {
    product_id: number;
    product_name: string;
    sku: string;
    size: string;
    stock_quantity: number;
    low_stock_threshold: number;
  }[];
};
