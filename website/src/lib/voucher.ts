import type { Voucher } from '@/types/database'

const KEY = 'em_voucher'

export function getAppliedVoucher(): Voucher | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Voucher) : null
  } catch {
    return null
  }
}

export function setAppliedVoucher(voucher: Voucher | null): void {
  if (typeof window === 'undefined') return
  if (voucher) sessionStorage.setItem(KEY, JSON.stringify(voucher))
  else sessionStorage.removeItem(KEY)
}
