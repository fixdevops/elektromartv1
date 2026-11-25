import type {
  Address,
  AppNotification,
  Category,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  Product,
  ProductVariant,
  Review,
  ReviewAuthor,
  Voucher,
  WishlistItem,
} from '@/types/database'

type Row = Record<string, unknown>

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

export function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? data.filter(isRow) : []
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

function strArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' && value.trim()) return value.split(',').map(item => item.trim()).filter(Boolean)
  return []
}

function record(value: unknown): Record<string, string> {
  if (!isRow(value)) return {}
  const out: Record<string, string> = {}
  Object.entries(value).forEach(([key, val]) => {
    if (typeof val === 'string') out[key] = val
    else if (typeof val === 'number' || typeof val === 'boolean') out[key] = String(val)
  })
  return out
}

function variantsFrom(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRow).flatMap(item => {
    const name = str(item.name)
    if (!name) return []
    return [{ name, options: strArray(item.options) }]
  })
}

export function normalizeCategory(value: unknown): Category {
  const row: Row = isRow(value) ? value : {}
  return {
    id: str(row.id),
    name: str(row.name, 'Kategori'),
    slug: str(row.slug),
    description: typeof row.description === 'string' ? row.description : null,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    created_at: str(row.created_at),
  }
}

export function normalizeProduct(value: unknown): Product {
  const row: Row = isRow(value) ? value : {}
  return {
    id: str(row.id),
    category_id: typeof row.category_id === 'string' ? row.category_id : null,
    name: str(row.name, 'Produk'),
    slug: str(row.slug, str(row.id)),
    description: typeof row.description === 'string' ? row.description : null,
    price: num(row.price),
    original_price: row.original_price == null ? null : num(row.original_price),
    stock: Math.max(0, Math.round(num(row.stock))),
    images: strArray(row.images),
    specifications: record(row.specifications),
    brand: typeof row.brand === 'string' ? row.brand : null,
    sku: typeof row.sku === 'string' ? row.sku : null,
    is_featured: bool(row.is_featured),
    is_active: row.is_active == null ? true : bool(row.is_active),
    rating: num(row.rating),
    review_count: Math.max(0, Math.round(num(row.review_count))),
    sold_count: Math.max(0, Math.round(num(row.sold_count))),
    variants: variantsFrom(row.variants),
    location: str(row.location, 'Jakarta Pusat'),
    seller_name: str(row.seller_name, 'ElektroMart Official'),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    category: isRow(row.category) ? normalizeCategory(row.category) : undefined,
  }
}

export function productsFrom(data: unknown): Product[] {
  return asRows(data).map(normalizeProduct)
}

export function normalizeOrder(value: unknown): Order {
  const row: Row = isRow(value) ? value : {}
  const rawStatus = str(row.status, 'pending') as OrderStatus
  const status = ORDER_STATUSES.includes(rawStatus) ? rawStatus : 'pending'
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    status,
    total_amount: num(row.total_amount),
    shipping_name: str(row.shipping_name),
    shipping_phone: str(row.shipping_phone),
    shipping_address: str(row.shipping_address),
    shipping_city: str(row.shipping_city),
    shipping_postal: typeof row.shipping_postal === 'string' ? row.shipping_postal : null,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : null,
    payment_proof: typeof row.payment_proof === 'string' ? row.payment_proof : null,
    notes: typeof row.notes === 'string' ? row.notes : null,
    shipping_fee: num(row.shipping_fee),
    discount_amount: num(row.discount_amount),
    voucher_code: typeof row.voucher_code === 'string' ? row.voucher_code : null,
    courier: typeof row.courier === 'string' ? row.courier : null,
    tracking_number: typeof row.tracking_number === 'string' ? row.tracking_number : null,
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    order_items: Array.isArray(row.order_items) ? row.order_items.map(normalizeOrderItem) : undefined,
    order_status_history: Array.isArray(row.order_status_history)
      ? row.order_status_history.map(normalizeOrderStatusEvent)
      : undefined,
  }
}

export function ordersFrom(data: unknown): Order[] {
  return asRows(data).map(normalizeOrder)
}

export function normalizeOrderItem(value: unknown): OrderItem {
  const row: Row = isRow(value) ? value : {}
  const quantity = Math.max(1, Math.round(num(row.quantity, 1)))
  const unitPrice = num(row.unit_price)
  return {
    id: str(row.id),
    order_id: str(row.order_id),
    product_id: str(row.product_id),
    quantity,
    unit_price: unitPrice,
    subtotal: row.subtotal == null ? quantity * unitPrice : num(row.subtotal),
    created_at: str(row.created_at),
    product: isRow(row.product) ? normalizeProduct(row.product) : undefined,
  }
}

export function orderItemsFrom(data: unknown): OrderItem[] {
  return asRows(data).map(normalizeOrderItem)
}

export function normalizeOrderStatusEvent(value: unknown): OrderStatusEvent {
  const row: Row = isRow(value) ? value : {}
  const rawStatus = str(row.status, 'pending') as OrderStatus
  return {
    id: str(row.id),
    order_id: str(row.order_id),
    status: ORDER_STATUSES.includes(rawStatus) ? rawStatus : 'pending',
    note: typeof row.note === 'string' ? row.note : null,
    created_at: str(row.created_at),
  }
}

export function statusEventsFrom(data: unknown): OrderStatusEvent[] {
  return asRows(data).map(normalizeOrderStatusEvent)
}

export function normalizeVoucher(value: unknown): Voucher {
  const row: Row = isRow(value) ? value : {}
  const type = str(row.discount_type, 'fixed') === 'percent' ? 'percent' : 'fixed'
  return {
    code: str(row.code).toUpperCase(),
    description: str(row.description),
    discount_type: type,
    value: num(row.value),
    min_spend: num(row.min_spend),
    max_discount: row.max_discount == null ? null : num(row.max_discount),
    expires_at: str(row.expires_at),
    is_active: row.is_active == null ? true : bool(row.is_active),
    usage_limit: row.usage_limit == null ? null : Math.max(0, Math.round(num(row.usage_limit))),
    used_count: Math.max(0, Math.round(num(row.used_count))),
  }
}

export function vouchersFrom(data: unknown): Voucher[] {
  return asRows(data).map(normalizeVoucher)
}

export function normalizeAddress(value: unknown): Address {
  const row: Row = isRow(value) ? value : {}
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    label: str(row.label, 'Alamat'),
    receiver_name: str(row.receiver_name),
    phone: str(row.phone),
    address: str(row.address),
    city: str(row.city),
    postal_code: str(row.postal_code),
    is_default: bool(row.is_default),
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  }
}

export function addressesFrom(data: unknown): Address[] {
  return asRows(data).map(normalizeAddress)
}

export function normalizeNotification(value: unknown): AppNotification {
  const row: Row = isRow(value) ? value : {}
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    title: str(row.title, 'Notifikasi'),
    body: str(row.body),
    type: str(row.type, 'order'),
    data: isRow(row.data) ? row.data : {},
    is_read: bool(row.is_read),
    created_at: str(row.created_at),
  }
}

export function notificationsFrom(data: unknown): AppNotification[] {
  return asRows(data).map(normalizeNotification)
}

export function normalizeWishlist(value: unknown): WishlistItem {
  const row: Row = isRow(value) ? value : {}
  return {
    id: str(row.id),
    user_id: str(row.user_id),
    product_id: str(row.product_id),
    created_at: str(row.created_at),
    product: isRow(row.product) ? normalizeProduct(row.product) : undefined,
  }
}

export function wishlistsFrom(data: unknown): WishlistItem[] {
  return asRows(data).map(normalizeWishlist)
}

export function normalizeReview(value: unknown): Review {
  const row: Row = isRow(value) ? value : {}
  const authorRow = isRow(row.author) ? row.author : null
  const author: ReviewAuthor | undefined = authorRow
    ? {
        id: str(authorRow.id),
        full_name: typeof authorRow.full_name === 'string' ? authorRow.full_name : null,
        avatar_url: typeof authorRow.avatar_url === 'string' ? authorRow.avatar_url : null,
      }
    : undefined
  return {
    id: str(row.id),
    product_id: str(row.product_id),
    user_id: str(row.user_id),
    rating: Math.min(5, Math.max(1, Math.round(num(row.rating, 5)))),
    comment: typeof row.comment === 'string' ? row.comment : null,
    created_at: str(row.created_at),
    author,
  }
}

export function reviewsFrom(data: unknown): Review[] {
  return asRows(data).map(normalizeReview)
}
