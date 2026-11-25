/**
 * Tema terang ala Shopee. React Native tidak mendukung CSS gradient secara
 * native tanpa dependency tambahan, jadi header memakai warna oranye solid.
 */
export const COLORS = {
  primary: '#ee4d2d',
  primaryDark: '#d73211',
  primaryLight: '#fff2ee',
  primaryBorder: '#ffd9cf',

  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceAlt: '#fafafa',
  border: '#e5e7eb',
  borderLight: '#f0f0f0',

  text: '#222222',
  textSecondary: '#757575',
  muted: '#9e9e9e',
  white: '#ffffff',

  success: '#16a34a',
  successLight: '#e8f8ee',
  warning: '#f59e0b',
  warningLight: '#fff7e6',
  danger: '#e02f2f',
  dangerLight: '#fff0f0',
  info: '#0284c7',
  infoLight: '#e9f6fd',

  overlay: 'rgba(0,0,0,0.5)',
  backdrop: 'rgba(0,0,0,0.75)',
} as const

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const

export const SHADOW = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
} as const

/** Ubah #rrggbb menjadi rgba(...) untuk badge transparan. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
