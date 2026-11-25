# ElektroMart 🛒⚡

Toko elektronik full-stack bergaya **Shopee Indonesia** — website Next.js + mobile app React Native (Expo), terhubung ke Supabase.

---

## 📁 Struktur Proyek

```
elektromart/
├── website/                         → Next.js 14 (Web)
├── mobile/                          → React Native + Expo (APK)
├── supabase/
│   ├── migrations/001_initial.sql    → Schema dasar + RLS
│   ├── migrations/002_shopee_features.sql → Fitur lengkap + RPC
│   ├── seed.sql                      → 5 kategori + 20 produk
│   └── seed_shopee.sql               → varian, stok terjual, voucher
├── docs/SHOPPEE_SPEC.md              → Spesifikasi fitur & schema
└── README.md
```

---

## 🚀 Setup Supabase (wajib, sekali saja)

1. Buat project di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, jalankan berurutan:
   1. `supabase/migrations/001_initial.sql`
   2. `supabase/migrations/002_shopee_features.sql`
   3. `supabase/seed.sql`
   4. `supabase/seed_shopee.sql`
3. Project Settings → API → salin **Project URL** dan **anon/public key**
4. Isi ke file env:

```bash
# website/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> Anon key **aman** dipakai di browser/aplikasi. Jangan pernah menaruh **service_role key** di sini.

---

## 💻 Website (Next.js)

```bash
cd website
npm install
npm run dev      # http://127.0.0.1:3000
npm run build    # production build
```

> Tampilan sudah diuji responsif di lebar **390 px (HP)**, **768 px (tablet)**, dan **1440 px (desktop)** tanpa horizontal scroll. Beranda, produk, keranjang, checkout, akun, wishlist, notifikasi, tabel admin, dan halaman info menyesuaikan layar. Halaman masuk/daftar sengaja ditampilkan tanpa navbar/footer agar tidak dobel di HP.

### Deploy ke Vercel

1. Import repo GitHub `fixdevops/elektromartv1` di Vercel.
2. Set **Root Directory = `website`** (Next.js tidak ada di root repo).
3. Framework: **Next.js**, build command `npm run build`.
4. Di **Project Settings → Environment Variables**, isi **hanya**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
   > Jangan memasukkan `EXPO_PUBLIC_*` ke Vercel. Variable itu hanya dipakai `mobile/.env` / build EAS. Next.js hanya mengekspos variable berprefiks `NEXT_PUBLIC_` ke browser.
5. Setelah env berubah, lakukan **Redeploy** (nilai `NEXT_PUBLIC_*` di-inline saat build).
6. Di Supabase → **Authentication → URL Configuration**, tambahkan:
   ```text
   Site URL:       https://<nama-app>.vercel.app
   Redirect URLs:  https://<nama-app>.vercel.app/**
                   exp://127.0.0.1:8081/**
                   elektromart://**
   ```

Web di Vercel dan aplikasi di HP tetap **sinkron** karena keduanya memanggil Supabase project yang sama (bukan saling memanggil). Jadi perubahan status pesanan dari admin web langsung muncul di HP lewat realtime, dan sebaliknya. Jika Supabase project diganti, update env di **dua tempat** lalu deploy ulang web dan build ulang APK.

### Halaman
| URL | Keterangan |
|-----|-----------|
| `/` | Beranda: carousel, kategori, flash sale countdown, produk unggulan |
| `/products` | Pencarian, filter kategori/harga/brand/rating, sorting, pagination |
| `/products/[slug]` | Detail produk: galeri, varian, ulasan, toko, produk serupa |
| `/cart` | Keranjang + pilih item + voucher + kurir |
| `/checkout` | Alamat tersimpan, kurir, metode bayar, bukti transfer, RPC aman |
| `/account` | Riwayat pesanan, timeline status, resi, pembatalan, ulasan |
| `/wishlist` | Daftar produk favorit |
| `/notifications` | Notifikasi pesanan |
| `/auth/login`, `/auth/register` | Autentikasi Supabase |
| `/admin` | Dashboard admin |
| `/admin/products` | Kelola produk (tambah/edit/hapus/aktif) |
| `/admin/orders` | Kelola pesanan + update status & nomor resi |
| `/admin/users` | Kelola role pengguna |
| `/admin/vouchers` | Kelola voucher |

---

## 📱 Mobile (React Native + Expo)

```bash
cd mobile
npm install
npx expo start
# Scan QR dengan Expo Go, atau tekan 'a' untuk emulator Android
```

### Menjalankan di HP Android lewat kabel data

1. Pasang **Expo Go yang sesuai SDK 51** di HP. Versi terbaru dari Play Store (SDK 58) akan menampilkan error *"Project is incompatible with this version of Expo Go"*. Kalau sudah terlanjur, jalankan `mobile/INSTALL_EXPO_GO_SDK51.bat` (script mengunduh Expo Go 2.31.x lewat `expo-go` CLI, uninstall versi lama, lalu memasang yang cocok).
2. Aktifkan **Developer Options** → **USB debugging**.
3. Colokkan kabel data, pilih mode **File transfer / MTP**, lalu izinkan akses USB di layar HP.
4. Klik 2x file `mobile/HUBUNGKAN_HP.bat`. Skrip ini otomatis mengecek versi Expo Go; kalau tidak cocok ia akan menjalankan installer di atas.

Skrip itu akan menyalakan Metro (kalau belum jalan), mendeteksi port `8081`/`8082`, meneruskan port tersebut lewat `adb reverse`, lalu membuka aplikasi di Expo Go. Server juga bisa dijalankan manual dengan:

```bash
cd mobile
npx expo start --localhost --port 8081
```

> Pastikan HP dan komputer terhubung kabel saat memakai mode `--localhost`. Kalau ingin tanpa kabel, pakai `npx expo start --tunnel` dan scan QR dari HP.

> Konfigurasi Android SDK sudah diperbaiki: `ANDROID_HOME` dan `ANDROID_SDK_ROOT` sekarang disetel ke `D:\` karena `adb.exe` ada di `D:\platform-tools\adb.exe`. Tanpa ini, tombol `a` di Expo CLI error *"The system cannot find the path specified"*. Tutup dan buka lagi terminal setelah mengubah environment variable.

Fitur: beranda + carousel & flash sale, produk + filter & load more, detail + galeri/varian/ulasan, keranjang + voucher, checkout + bukti bayar, pesanan + tracking, wishlist, notifikasi realtime, profil/alamat, dan panel admin (pesanan, produk, voucher, role pengguna).

---

## 🔐 Menjadikan Akun Admin

Daftar seperti biasa, lalu jalankan di SQL Editor Supabase:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = 'UUID_USER_KAMU';
```

Atau dari `/admin/users` ketika sudah ada satu akun admin.

### Akun demo yang sudah terpasang di project Supabase

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@elektromart.co` | `Admin12345!` |
| Pembeli | `customer@elektromart.co` | `Customer12345!` |

Akun ini dibuat langsung di Supabase Auth (sudah terverifikasi) dan siap dipakai untuk mencoba alur checkout, unggah bukti bayar, dan update status dari `/admin/orders`.

> Sudah ada satu pesanan contoh berstatus **Selesai** dengan resi `JNE1234567890` dan ulasan pembeli untuk memverifikasi alur ujung ke ujung. Jika ingin data kosong, hapus baris tersebut lewat Table Editor Supabase (tabel `orders`).

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Website | Next.js 14 App Router, Tailwind CSS, Framer Motion, Zustand, React Hook Form |
| Mobile | React Native, Expo SDK 51, React Navigation |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage + RPC) |
| Tema | Shopee orange `#ee4d2d`, light mode, Bahasa Indonesia |

---

## ✨ Fitur Utama

- ✅ Auth (login, register, protected routes, role admin)
- ✅ Browse produk + pencarian + filter + sorting + pagination
- ✅ Flash sale dengan countdown, harga diskon, stok terjual
- ✅ Keranjang tersinkron Supabase + pilih item + wishlist
- ✅ Voucher (nominal & persentase) + beberapa pilihan kurir
- ✅ Checkout atomik via RPC: harga dihitung server, stok dikunci, resi & notifikasi
- ✅ Upload bukti pembayaran ke Supabase Storage
- ✅ Riwayat pesanan + timeline status + pembatalan + ulasan
- ✅ Dashboard admin: produk, pesanan, pengguna, voucher
- ✅ Notifikasi realtime (badge navbar langsung update via Supabase Realtime)
- ✅ Mobile app dengan fitur setara website
# elektromartv1 
