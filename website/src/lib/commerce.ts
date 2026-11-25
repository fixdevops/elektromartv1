import type { OrderStatus, Voucher } from '@/types/database'

export const FREE_SHIPPING_MIN = 500_000

export const COURIERS = [
  { id: 'reguler', label: 'Reguler (2-3 hari)', fee: 25_000 },
  { id: 'instan', label: 'Instan (hari ini)', fee: 40_000 },
  { id: 'kargo', label: 'Kargo (3-5 hari)', fee: 20_000 },
] as const

export function computeShipping(subtotal: number, courier = 'reguler'): number {
  if (subtotal <= 0) return 0
  const selected = COURIERS.find(c => c.id === courier) ?? COURIERS[0]
  if (selected.id === 'reguler' && subtotal >= FREE_SHIPPING_MIN) return 0
  return selected.fee
}

export function computeVoucherDiscount(voucher: Voucher | null, subtotal: number): number {
  if (!voucher || !voucher.is_active || subtotal < voucher.min_spend) return 0
  if (new Date(voucher.expires_at).getTime() < Date.now()) return 0
  if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) return 0

  // Sama dengan `round(..., 2)` di RPC place_order agar cross-check diskon lolos.
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  if (voucher.discount_type === 'fixed') {
    return round2(Math.min(voucher.value, subtotal))
  }
  const raw = (subtotal * voucher.value) / 100
  return round2(voucher.max_discount ? Math.min(raw, voucher.max_discount) : raw)
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; badge: string; description: string }> = {
  pending: {
    label: 'Menunggu Pembayaran',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    description: 'Menunggu pembayaran dari kamu',
  },
  paid: {
    label: 'Dibayar',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Pembayaran diterima, pesanan siap diproses',
  },
  processing: {
    label: 'Diproses',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Penjual sedang menyiapkan barang',
  },
  shipped: {
    label: 'Dikirim',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Paket sedang dalam perjalanan',
  },
  delivered: {
    label: 'Selesai',
    badge: 'bg-green-50 text-green-700 border-green-200',
    description: 'Pesanan telah diterima',
  },
  cancelled: {
    label: 'Dibatalkan',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    description: 'Pesanan dibatalkan',
  },
}

export const STATUS_FLOW: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered']

export function formatDateID(value: string, withTime = false): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function orderCode(id: string): string {
  return `INV/${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}
