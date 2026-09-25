// Types mirror the API contract in openspec/changes/microservices-platform/design.md section 4.

export interface Category {
  slug: string;
  name: string;
  tagline: string;
  product_count: number;
}

export interface Need {
  slug: string;
  name: string;
  image_url: string;
  product_count: number;
}

export interface ProductRef {
  slug: string;
  name: string;
}

export interface Product {
  ref: string;
  slug: string;
  name: string;
  category: { slug: string; name: string };
  need: { slug: string; name: string } | null;
  type: string | null;
  format: string;
  presentation: string;
  invima: string | null;
  benefits: string[];
  description: string;
  advisor_tags: string[];
  image_url: string;
  price: number | null;
  is_viral: boolean;
  is_trending: boolean;
  is_active: boolean;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

export type AvailabilityStatus = "available" | "low" | "out";

export interface Availability {
  ref: string;
  status: AvailabilityStatus;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  description: string;
}

export interface BusinessContacts {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  hours: string | null;
  instagram: string | null;
  facebook: string | null;
}

export interface BusinessService {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface BusinessMedia {
  id: number;
  kind: "hero" | "need" | "gallery";
  title: string;
  url: string;
  alt: string;
}

export interface Business {
  profile: BusinessProfile;
  contacts: BusinessContacts;
  services: BusinessService[];
  media: BusinessMedia[];
}

export type CartSource = "catalog" | "advisor";

export interface CartItem {
  ref: string;
  slug: string;
  name: string;
  image_url: string;
  price: number | null;
  quantity: number;
  line_total: number;
  source: CartSource;
}

export interface Cart {
  token: string;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  has_unpriced: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  ref: string;
  slug: string;
  name: string;
  image_url: string;
  unit_price: number | null;
  quantity: number;
  line_total: number;
  source: CartSource;
}

export interface OrderHistoryEntry {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  at: string;
}

export interface Order {
  id: number;
  code: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  notes: string | null;
  items: OrderItem[];
  total: number;
  has_unpriced: boolean;
  created_at: string;
  updated_at: string;
  history: OrderHistoryEntry[];
}

export interface CheckoutResponse {
  order: Order;
  whatsapp_url: string | null;
}

export interface AdvisorRecommendation {
  ref: string;
  slug: string;
  name: string;
  reason: string;
  image_url: string;
  price: number | null;
}

export interface AdvisorChatResponse {
  reply: string;
  recommendations: AdvisorRecommendation[];
  model: string;
}

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface HealthResponse {
  status: string;
  services: Record<string, { status: string; latency_ms: number }>;
}

// --- Admin types ---

export interface DashboardMetrics {
  range_days: number;
  orders_total: number;
  orders_in_range: number;
  by_status: Record<OrderStatus, number>;
  revenue: number;
  avg_order_value: number;
  units_sold: number;
  cancellation_rate: number;
  advisor_share: number;
  daily: { date: string; orders: number; revenue: number }[];
  top_products: { ref: string; name: string; units: number; revenue: number }[];
}

export interface InventorySummary {
  tracked: number;
  untracked: number;
  low: number;
  out: number;
}

export interface AdvisorStats {
  conversations: number;
  recommendations: number;
  top_recommended: { ref: string; name: string; count: number }[];
}

export interface CatalogSummary {
  products: number;
  active: number;
  unpriced: number;
}

export interface AdminDashboard {
  orders: DashboardMetrics | null;
  inventory: InventorySummary | null;
  advisor: AdvisorStats | null;
  catalog: CatalogSummary | null;
  messages: { new: number } | null;
  errors?: Record<string, string>;
}

export interface AdminOrderListItem {
  id: number;
  code: string;
  status: OrderStatus;
  customer_name: string;
  customer_city: string;
  created_at: string;
  items: { quantity: number }[];
  total: number;
}

export interface StockRow {
  ref: string;
  quantity: number | null;
  low_stock_threshold: number;
  status: AvailabilityStatus | "untracked";
  tracked: boolean;
  updated_at: string;
  name?: string;
  image_url?: string;
}

// Admin product rows share the Product shape; admin lists may include inactive products.
export type AdminProductRow = Product;

export interface ContactMessage {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: "new" | "read" | "archived";
  created_at: string;
}

export interface OrderNotification {
  id: number;
  order_code: string | null;
  recipient: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  created_at: string;
}

export interface NotificationStatus {
  sms_configured: boolean;
  order_sms_to: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
}
