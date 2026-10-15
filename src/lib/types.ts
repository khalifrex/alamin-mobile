export type Catalog = {
  types: { code: string; name: string }[];
  sizes: { code: string; price: number }[];
  colors: { hex: string; name: string }[];
  default_size: string;
  default_color: string;
  discounts: { min_qty: number; percent: number }[];
  fees: { image: number; text: number };
  fonts: string[];
  max_qty: number;
  max_upload_bytes: number;
  bank: Bank;
};

export type Bank = { name: string; account: string; holder: string };

export type Quote = { unit: number; discount: number; total: number; unit_fmt: string; total_fmt: string };

export type StatusOption = { code: string; label: string };

export type Order = {
  id: number;
  ref: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  state: string;
  notes: string | null;
  type: string;
  type_label: string;
  size: string;
  color: string;
  color_label: string;
  qty: number;
  unit_price: number;
  discount_pct: number;
  total: number;
  payment_method: 'bank' | 'pod';
  payment_status: string;
  payment_label: string;
  order_status: string;
  order_label: string;
  design_front: string | null;
  design_back: string | null;
  layers?: { front: SavedLayer[]; back: SavedLayer[] };
};

/** A layer as stored in orders.design_data (see clean_layers() in includes/functions.php). */
export type SavedLayer = {
  type: 'text' | 'image' | 'emoji';
  x: number;
  y: number;
  text?: string;
  font?: string;
  style?: string;
  color?: string;
  size?: number;
  src?: string;
  width?: number;
  height?: number;
  char?: string;
};
