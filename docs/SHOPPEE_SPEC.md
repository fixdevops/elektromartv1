# ElektroMart — Spesifikasi "Shopee-like" (shared contract)

## Target schema tambahan (migration `002_shopee_features.sql`)

Bersifat **idempotent** (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`), aman dijalankan setelah `001_initial.sql`.

### Kolom baru
- `products.sold_count integer NOT NULL DEFAULT 0`
- `products.variants jsonb NOT NULL DEFAULT '[]'::jsonb` — `[{ "name": "Warna", "options": ["Titanium","Hitam"] }]`
- `products.location text NOT NULL DEFAULT 'Jakarta Pusat'`
- `products.seller_name text NOT NULL DEFAULT 'ElektroMart Official'`
- `orders.shipping_fee numeric(12,2) NOT NULL DEFAULT 0`
- `orders.discount_amount numeric(12,2) NOT NULL DEFAULT 0`
- `orders.voucher_code text`
- `orders.courier text`
- `orders.tracking_number text`

### Tabel baru
- `wishlists(id uuid pk, user_id uuid fk auth.users, product_id uuid fk products, created_at, UNIQUE(user_id, product_id))`
- `addresses(id uuid pk, user_id uuid fk auth.users, label text, receiver_name text, phone text, address text, city text, postal_code text, is_default bool default false, created_at)`
- `vouchers(code text pk, description text, discount_type text check in ('fixed','percent'), value numeric, min_spend numeric default 0, max_discount numeric, expires_at timestamptz, is_active bool default true, usage_limit int, used_count int default 0, created_at)`
- `notifications(id uuid pk, user_id uuid fk auth.users, title text, body text, type text default 'order', data jsonb default '{}', is_read bool default false, created_at)`
- `order_status_history(id uuid pk, order_id uuid fk orders, status text, note text, created_at)`

### Function / RPC
- `public.is_admin()` — SECURITY DEFINER, STABLE, boolean, cek `profiles.role = 'admin'`.
- `public.place_order(p_items jsonb, p_shipping_name text, p_shipping_phone text, p_shipping_address text, p_shipping_city text, p_shipping_postal text, p_notes text, p_payment_method text, p_payment_proof text, p_courier text, p_shipping_fee numeric, p_voucher_code text, p_discount_amount numeric) RETURNS uuid`
  - `auth.uid()` wajib; items tidak boleh kosong.
  - Hitung `unit_price` **dari tabel products** (jangan percaya client), cek stok, kurangi stok, insert order + order_items, hapus cart_items untuk product yang dibeli, insert history `pending`, insert notification, kembalikan order id.
  - Validasi voucher (aktif, belum expired, min_spend, usage_limit) dan `used_count+1`.
- `public.cancel_order(p_order_id uuid)` — hanya pemilik, status `pending`/`paid`, kembalikan stok **sekali**, history `cancelled` dengan catatan pembeli.
- `public.mark_order_paid(p_order_id uuid, p_payment_proof text)` — pemilik pesanan `pending`; simpan bukti, set status `paid`, history + notification. Dipakai web dan mobile.
- `public.update_order_status(p_order_id uuid, p_status text, p_note text, p_tracking_number text)` — hanya admin; update order + history + notification ke pemilik. Status `cancelled` bersifat final dan menolak perubahan berikutnya; stok hanya dikembalikan saat transisi pertama ke `cancelled`.
- Trigger `reviews_sync_product_rating` menjaga `products.rating` dan `products.review_count` setelah insert/update/delete ulasan.
- View `public.review_authors` (security definer) berisi `id, full_name, avatar_url` untuk menggantikan join langsung ke `profiles` (RLS profiles hanya allow own row).

### Storage
- Bucket `payment-proofs` (public read, authenticated insert/update).

### RLS
Semua tabel baru: ENABLE RLS. `wishlists/addresses/notifications` = own rows; `vouchers` = public read; `order_status_history` = own order / admin. Admin policy memakai `is_admin()`.

### Seed tambahan (`seed_shopee.sql`)
- Update 20 produk: `sold_count`, `variants`, `location`, `seller_name`.
- Voucher: `HEMAT10` (10%, max 50rb, min 100rb), `ONGKIR25` (fixed 25rb, min 200rb), `ELEKTRO50K` (fixed 50rb, min 500rb).

## Kontrak kode website (`website/`)

`src/types/database.ts` (dimiliki agent utama) menambah:
```ts
interface ProductVariant { name: string; options: string[] }
interface Voucher { code: string; description: string; discount_type: 'fixed'|'percent'; value: number; min_spend: number; max_discount: number|null; expires_at: string; is_active: boolean }
interface WishlistItem { id: string; user_id: string; product_id: string; created_at: string; product?: Product }
interface AppNotification { id: string; user_id: string; title: string; body: string; type: string; data: Record<string, unknown>; is_read: boolean; created_at: string }
interface Address { id: string; user_id: string; label: string; receiver_name: string; phone: string; address: string; city: string; postal_code: string; is_default: boolean }
interface OrderStatusEvent { id: string; order_id: string; status: OrderStatus; note: string|null; created_at: string }
```
`Product` tambah: `sold_count`, `variants`, `location`, `seller_name`.
`Order` tambah: `shipping_fee`, `discount_amount`, `voucher_code`, `courier`, `tracking_number`, `order_status_history?`.

`src/stores/cartStore.ts` (dimiliki agent utama) API:
```ts
items, selectedIds, isLoading,
addItem(product, qty?), removeItem(id), updateQuantity(id, qty),
clearCart(), clearItems(ids), loadCart(userId?), mergeGuestCart(userId),
toggleSelect(id), selectAll(value: boolean), buyNow(product, qty),
consumeCheckoutItems(), totalItems(), totalPrice(), selectedItems(), selectedTotal()
```
`buyNow` mengganti keranjang lokal-beta dengan 1 item (tanpa hapus DB), `consumeCheckoutItems()` dipanggil checkout setelah sukses untuk menyinkron ulang dari DB.

`src/lib/commerce.ts`: `computeShipping(subtotal)`, `computeVoucherDiscount(voucher, subtotal)`, `STATUS_LABELS`, `formatDateID`.

Semua halaman memakai bahasa Indonesia, tema terang Shopee (putih/#f5f5f5, oranye #ee4d2d), tidak ada `text-white` di atas kartu putih.

## Kontrak mobile (`mobile/`)
- Entry `App.tsx` (main di package.json), hapus plugin expo-router, buat asset PNG sederhana.
- Tema seragam Shopee: header gradasi oranye, kartu putih, teks gelap, bottom tab putih dengan aktiv oranye.
- Navigasi: `Products` menerima `{ q?, category?: string }`; `Notifications`, `Wishlist`, `OrderDetail`, `Admin`, `Search` ditambahkan. Semua tombol memiliki aksi nyata.
- Checkout memakai RPC `place_order` yang sama dengan website (dari spec ini), plus voucher & bukti bayar (input URL bila image picker tidak tersedia).
- Gunakan `formatRupiah` dan helper yang sama.
