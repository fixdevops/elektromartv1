export type UserRole = 'customer' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  address: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  created_at: string
}

export interface ProductVariant {
  name: string
  options: string[]
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price: number
  original_price: number | null
  stock: number
  images: string[]
  specifications: Record<string, string>
  brand: string | null
  sku: string | null
  is_featured: boolean
  is_active: boolean
  rating: number
  review_count: number
  sold_count: number
  variants: ProductVariant[]
  location: string
  seller_name: string
  created_at: string
  updated_at: string
  category?: Category
  reviews?: Review[]
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
  product?: Product
}

export interface Voucher {
  code: string
  description: string
  discount_type: 'fixed' | 'percent'
  value: number
  min_spend: number
  max_discount: number | null
  expires_at: string
  is_active: boolean
  usage_limit: number | null
  used_count: number
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  total_amount: number
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  shipping_city: string
  shipping_postal: string | null
  payment_method: string | null
  payment_proof: string | null
  notes: string | null
  shipping_fee: number
  discount_amount: number
  voucher_code: string | null
  courier: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  order_status_history?: OrderStatusEvent[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  product?: Product
}

export interface OrderStatusEvent {
  id: string
  order_id: string
  status: OrderStatus
  note: string | null
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  created_at: string
  profile?: Pick<Profile, 'full_name' | 'avatar_url'>
}

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product?: Product
}

export interface AppNotification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  data: { order_id?: string; url?: string }
  is_read: boolean
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  receiver_name: string
  phone: string
  address: string
  city: string
  postal_code: string
  is_default: boolean
  created_at: string
}

export interface GuestCartItem {
  product_id: string
  quantity: number
  product: Product
  variant?: string
}
