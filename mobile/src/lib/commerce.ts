import type { OrderStatus, Voucher } from '@/types/database'

export const FREE_SHIPPING_MIN = 500_000

export const COURIERS = [
  { id: 'reguler', label: 'Reguler (2-3 hari)', fee: 25_000 },
  { id: 'instan', label: 'Instan (hari ini)', fee: 40_000 },
  { id: 'gratis', label: 'Gratis Ongkir (voucher)', fee: 0 },
] as const

export type CourierId = (typeof COURIERS)[number]['id']

export function computeShipping(subtotal: number, courier: CourierId = 'reguler'): number {
  if (subtotal <= 0 || courier === 'gratis') return 0
  if (courier === 'reguler' && subtotal >= FREE_SHIPPING_MIN) return 0
  return COURIERS.find(c => c.id === courier)?.fee ?? 25_000
}

export function computeVoucherDiscount(voucher: Voucher | null, subtotal: number): number {
  if (!voucher || !voucher.is_active || subtotal <= 0 || subtotal < voucher.min_spend) return 0
  if (new Date(voucher.expires_at).getTime() < Date.now()) return 0
  if (voucher.usage_limit != null && voucher.used_count >= voucher.usage_limit) return 0

  // Sama dengan `round(..., 2)` di RPC place_order agar cross-check diskon lolos.
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  if (voucher.discount_type === 'fixed') return round2(Math.min(voucher.value, subtotal))

  const raw = (subtotal * voucher.value) / 100
  return round2(voucher.max_discount ? Math.min(raw, voucher.max_discount) : raw)
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  paid: '#0284c7',
  processing: '#ee4d2d',
  shipped: '#06b6d4',
  delivered: '#16a34a',
  cancelled: '#9e9e9e',
}

export const STATUS_FLOW: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered']

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0
  return `Rp${new Intl.NumberFormat('id-ID').format(safe)}`
}

export function formatDateID(value: string, withTime = false): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function discountPercent(original: number | null, current: number): number {
  if (!original || original <= current) return 0
  return Math.round(((original - current) / original) * 100)
}

export function orderCode(id: string): string {
  return `INV/${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function msUntilNextMidnight(now = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (typeof error === 'string' && error.trim()) return error
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown; hint?: unknown }
    if (typeof maybe.message === 'string' && maybe.message) {
      return maybe.hint && typeof maybe.hint === 'string'
        ? `${maybe.message} (${maybe.hint})`
        : maybe.message
    }
  }
  return fallback
}
