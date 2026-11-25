export function saveButton(isEdit: boolean): string {
  return isEdit ? 'Simpan Perubahan' : 'Tambah Produk'
}

export const adminStatusLabel: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
}
