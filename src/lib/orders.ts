// Orders: shared types and the labels shown to customers and admins.

export type OrderStatus = "new" | "processing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "invoice" | "card";

export type OrderItem = {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  image: string;
  unit_price: number;   // normal price per unit
  price: number;        // price per unit after the customer discount
  qty: number;
  line_total: number;   // price * qty
  in_stock: boolean;
};

export type OrderCustomer = {
  name: string; email: string; telefon: string; foretag: string;
  orgnr: string; adress: string; postnummer: string; ort: string;
};

export type Order = {
  id: string;
  order_number: number;
  user_id: string | null;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  reference: string | null;
  message: string | null;
  admin_note: string | null;
  stripe_session_id: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; customerText: string }> = {
  new:        { label: "Ny",           customerText: "Mottagen" },
  processing: { label: "Behandlas",    customerText: "Behandlas" },
  ready:      { label: "Klar",         customerText: "Klar för hämtning eller leverans" },
  completed:  { label: "Slutförd",     customerText: "Slutförd" },
  cancelled:  { label: "Avbruten",     customerText: "Avbruten" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  unpaid:   "Obetald",
  pending:  "Väntar på betalning",
  paid:     "Betald",
  failed:   "Betalningen avbröts",
  refunded: "Återbetald",
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  invoice: "Faktura",
  card:    "Kort / Klarna",
};

export const MAX_ORDER_LINES = 100;
export const MAX_LINE_QTY = 999;
