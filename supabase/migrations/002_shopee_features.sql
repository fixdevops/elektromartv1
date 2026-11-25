-- ============================================================
-- ElektroMart — Fitur "Shopee-like" (migration 002)
-- Idempotent: aman dijalankan berulang kali setelah 001_initial.sql.
-- ============================================================

-- ─── Helper admin ───────────────────────────────────────────
-- SECURITY DEFINER + search_path eksplisit: menghindari rekursi RLS
-- ketika policy memanggil is_admin() pada tabel profiles itu sendiri.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT TRUE FROM public.profiles WHERE id = auth.uid() AND role = 'admin'),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Cek peran admin tanpa memicu RLS rekursif pada profiles.';

-- ─── Kolom baru ─────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sold_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variants     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location     text    NOT NULL DEFAULT 'Jakarta Pusat',
  ADD COLUMN IF NOT EXISTS seller_name  text    NOT NULL DEFAULT 'ElektroMart Official';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_fee    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_code    text,
  ADD COLUMN IF NOT EXISTS courier         text,
  ADD COLUMN IF NOT EXISTS tracking_number text;

-- ─── Tabel baru ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlists (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS wishlists_product_idx ON public.wishlists(product_id);

CREATE TABLE IF NOT EXISTS public.addresses (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        text,
  receiver_name text,
  phone        text,
  address      text,
  city         text,
  postal_code  text,
  is_default   boolean NOT NULL DEFAULT FALSE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_idx ON public.addresses(user_id);

CREATE TABLE IF NOT EXISTS public.vouchers (
  code         text PRIMARY KEY,
  description  text,
  discount_type text NOT NULL CHECK (discount_type IN ('fixed','percent')),
  value        numeric(12,2) NOT NULL CHECK (value > 0),
  min_spend    numeric(12,2) NOT NULL DEFAULT 0,
  max_discount numeric(12,2),
  expires_at   timestamptz,
  is_active    boolean NOT NULL DEFAULT TRUE,
  usage_limit  integer CHECK (usage_limit IS NULL OR usage_limit >= 0),
  used_count   integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  type       text NOT NULL DEFAULT 'order',
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status     text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON public.order_status_history(order_id, created_at);

-- ============================================================
-- RPC: place_order
-- Semua harga, diskon, dan stok dihitung ulang di server.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_order(
  p_items           jsonb,
  p_shipping_name   text,
  p_shipping_phone  text,
  p_shipping_address text,
  p_shipping_city   text,
  p_shipping_postal text DEFAULT NULL,
  p_notes           text DEFAULT NULL,
  p_payment_method  text DEFAULT 'manual',
  p_payment_proof   text DEFAULT NULL,
  p_courier         text DEFAULT NULL,
  p_shipping_fee    numeric DEFAULT 0,
  p_voucher_code    text DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $place_order$
DECLARE
  v_user_id   uuid := auth.uid();
  v_order_id  uuid;
  v_subtotal  numeric(12,2) := 0;
  v_discount  numeric(12,2) := 0;
  v_fee       numeric(12,2) := 0;
  v_total     numeric(12,2) := 0;
  v_priced    jsonb := '[]'::jsonb;
  v_purchased uuid[] := ARRAY[]::uuid[];
  v_voucher   public.vouchers%ROWTYPE;
  v_code      text;
  v_rec       record;
  v_product_id uuid;
  v_price     numeric(12,2);
  v_stock     integer;
  v_pname     text;
  v_active    boolean;
BEGIN
  -- Validasi dasar
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL THEN
    RAISE EXCEPTION 'Keranjang belanja kosong';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Format item keranjang tidak valid';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang belanja kosong';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) AS e WHERE jsonb_typeof(e) <> 'object') THEN
    RAISE EXCEPTION 'Format item keranjang tidak valid';
  END IF;
  IF p_shipping_name IS NULL OR btrim(p_shipping_name) = '' THEN
    RAISE EXCEPTION 'Nama penerima wajib diisi';
  END IF;
  IF p_shipping_phone IS NULL OR btrim(p_shipping_phone) = '' THEN
    RAISE EXCEPTION 'Nomor telepon wajib diisi';
  END IF;
  IF p_shipping_address IS NULL OR btrim(p_shipping_address) = '' THEN
    RAISE EXCEPTION 'Alamat pengiriman wajib diisi';
  END IF;
  IF p_shipping_city IS NULL OR btrim(p_shipping_city) = '' THEN
    RAISE EXCEPTION 'Kota pengiriman wajib diisi';
  END IF;

  v_fee := round(COALESCE(p_shipping_fee, 0), 2);
  IF v_fee < 0 THEN
    RAISE EXCEPTION 'Biaya pengiriman tidak valid';
  END IF;

  -- Agregasi item (duplikat product_id digabung) lalu kunci baris produk satu per satu
  FOR v_rec IN
    SELECT s.product_key, SUM(s.qty)::integer AS quantity
    FROM (
      SELECT COALESCE(e->>'product_id', e->>'productId', e->>'id') AS product_key,
             CASE
               WHEN COALESCE(e->>'quantity', e->>'qty', '1') ~ '^[0-9]+$'
                 THEN (COALESCE(e->>'quantity', e->>'qty', '1'))::integer
               ELSE 0
             END AS qty
      FROM jsonb_array_elements(p_items) AS e
    ) AS s
    GROUP BY s.product_key
    ORDER BY s.product_key
  LOOP
    IF v_rec.product_key IS NULL
       OR v_rec.product_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'product_id tidak valid';
    END IF;
    IF v_rec.quantity IS NULL OR v_rec.quantity <= 0 THEN
      RAISE EXCEPTION 'Jumlah barang tidak valid';
    END IF;
    v_product_id := v_rec.product_key::uuid;

    -- FOR UPDATE mencegah oversell saat banyak checkout bersamaan
    SELECT p.price, p.stock, p.name, p.is_active
      INTO v_price, v_stock, v_pname, v_active
      FROM public.products p
     WHERE p.id = v_product_id
     FOR UPDATE;
    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Produk tidak tersedia';
    END IF;
    IF v_stock < v_rec.quantity THEN
      RAISE EXCEPTION 'Stok % hanya tersisa %', v_pname, v_stock;
    END IF;

    UPDATE public.products
       SET stock = stock - v_rec.quantity
     WHERE id = v_product_id;

    -- Harga diambil dari DB, bukan dari payload client
    v_subtotal := v_subtotal + round(v_price * v_rec.quantity, 2);
    v_priced := v_priced || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'quantity', v_rec.quantity,
      'unit_price', v_price
    ));
    v_purchased := v_purchased || v_product_id;
  END LOOP;

  -- Validasi voucher (kunci baris voucher agar used_count aman)
  IF p_voucher_code IS NOT NULL AND btrim(p_voucher_code) <> '' THEN
    v_code := upper(btrim(p_voucher_code));
    SELECT v.* INTO v_voucher FROM public.vouchers v WHERE v.code = v_code FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kode voucher tidak ditemukan';
    END IF;
    IF v_voucher.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'Voucher tidak aktif';
    END IF;
    IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at <= now() THEN
      RAISE EXCEPTION 'Voucher sudah kedaluwarsa';
    END IF;
    IF v_subtotal < v_voucher.min_spend THEN
      RAISE EXCEPTION 'Belanja minimal Rp% untuk voucher ini', v_voucher.min_spend;
    END IF;
    IF v_voucher.usage_limit IS NOT NULL AND v_voucher.used_count >= v_voucher.usage_limit THEN
      RAISE EXCEPTION 'Kuota voucher sudah habis';
    END IF;

    IF v_voucher.discount_type = 'percent' THEN
      v_discount := round(
        least(v_subtotal * v_voucher.value / 100,
              COALESCE(v_voucher.max_discount, v_subtotal)), 2);
    ELSE
      v_discount := round(least(v_voucher.value, v_subtotal), 2);
    END IF;

    -- Diskon client hanya jadi cross-check; angka akhir tetap dihitung di server.
    IF p_discount_amount IS NOT NULL AND p_discount_amount <> 0
       AND abs(p_discount_amount - v_discount) > 0.01 THEN
      RAISE EXCEPTION 'Nominal diskon tidak sesuai dengan voucher';
    END IF;

    UPDATE public.vouchers SET used_count = used_count + 1 WHERE code = v_code;
  ELSE
    IF COALESCE(p_discount_amount, 0) <> 0 THEN
      RAISE EXCEPTION 'Diskon memerlukan kode voucher yang valid';
    END IF;
    v_code := NULL;
  END IF;

  v_total := round(greatest(v_subtotal - v_discount + v_fee, 0), 2);

  -- Insert order utama
  INSERT INTO public.orders (
    user_id, status, total_amount,
    shipping_name, shipping_phone, shipping_address, shipping_city, shipping_postal,
    notes, payment_method, payment_proof,
    shipping_fee, discount_amount, voucher_code, courier
  ) VALUES (
    v_user_id, 'pending', v_total,
    btrim(p_shipping_name), btrim(p_shipping_phone), btrim(p_shipping_address),
    btrim(p_shipping_city), NULLIF(btrim(p_shipping_postal), ''),
    NULLIF(btrim(p_notes), ''), COALESCE(NULLIF(btrim(p_payment_method), ''), 'manual'),
    NULLIF(btrim(p_payment_proof), ''),
    v_fee, v_discount, v_code, NULLIF(btrim(p_courier), '')
  ) RETURNING id INTO v_order_id;

  -- Insert order_items (subtotal kolom generated, tidak diisi manual)
  FOR v_rec IN
    SELECT (x->>'product_id')::uuid AS product_id,
           (x->>'quantity')::integer AS quantity,
           (x->>'unit_price')::numeric(12,2) AS unit_price
    FROM jsonb_array_elements(v_priced) AS x
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_rec.product_id, v_rec.quantity, v_rec.unit_price);
  END LOOP;

  -- Riwayat status awal + notifikasi
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_order_id, 'pending', 'Pesanan dibuat, menunggu pembayaran');

  INSERT INTO public.notifications (user_id, title, body, type, data)
  VALUES (
    v_user_id,
    'Pesanan berhasil dibuat',
    'Pesanan ' || left(v_order_id::text, 8) || ' menunggu pembayaran.',
    'order',
    jsonb_build_object('order_id', v_order_id, 'status', 'pending')
  );

  -- Bersihkan cart untuk produk yang dibeli saja
  DELETE FROM public.cart_items
   WHERE user_id = v_user_id
     AND product_id = ANY (v_purchased);

  RETURN v_order_id;
END;
$place_order$;

COMMENT ON FUNCTION public.place_order(jsonb, text, text, text, text, text, text, text, text, text, numeric, text, numeric)
  IS 'Buat pesanan dengan validasi harga/stok/voucher di server; mengembalikan order id.';

-- ============================================================
-- RPC: cancel_order (pemilik saja, status pending/paid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $cancel_order$
DECLARE
  v_uid   uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_item  record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu' USING ERRCODE = '42501';
  END IF;

  SELECT o.* INTO v_order FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan';
  END IF;
  IF v_order.user_id <> v_uid THEN
    RAISE EXCEPTION 'Anda tidak diizinkan membatalkan pesanan ini' USING ERRCODE = '42501';
  END IF;
  IF v_order.status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Pesanan tidak dapat dibatalkan pada status saat ini';
  END IF;

  -- Kembalikan stok (urutan product_id deterministic + lock)
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
      FROM public.order_items oi
     WHERE oi.order_id = p_order_id
     ORDER BY oi.product_id
  LOOP
    PERFORM 1 FROM public.products p WHERE p.id = v_item.product_id FOR UPDATE;
    UPDATE public.products
       SET stock = stock + v_item.quantity
     WHERE id = v_item.product_id;
  END LOOP;

  UPDATE public.orders
     SET status = 'cancelled', updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (p_order_id, 'cancelled', 'Pesanan dibatalkan oleh pembeli');

  INSERT INTO public.notifications (user_id, title, body, type, data)
  VALUES (
    v_uid,
    'Pesanan dibatalkan',
    'Pesanan ' || left(p_order_id::text, 8) || ' telah dibatalkan.',
    'order',
    jsonb_build_object('order_id', p_order_id, 'status', 'cancelled')
  );
END;
$cancel_order$;

COMMENT ON FUNCTION public.cancel_order(uuid) IS 'Pembeli membatalkan pesanan pending/paid dan stok dikembalikan.';

-- ============================================================
-- RPC: mark_order_paid (pembeli mengirim bukti transfer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  p_order_id      uuid,
  p_payment_proof text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $mark_paid$
DECLARE
  v_uid   uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu' USING ERRCODE = '42501';
  END IF;
  IF p_payment_proof IS NULL OR btrim(p_payment_proof) = '' THEN
    RAISE EXCEPTION 'Bukti pembayaran belum diunggah';
  END IF;

  SELECT o.* INTO v_order FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.user_id <> v_uid THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan' USING ERRCODE = '42501';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Pesanan ini sudah tidak menunggu pembayaran';
  END IF;
  IF COALESCE(v_order.payment_method, '') = 'cod' THEN
    RAISE EXCEPTION 'Pesanan COD tidak memerlukan bukti transfer';
  END IF;

  UPDATE public.orders
     SET status = 'paid', payment_proof = p_payment_proof, updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (p_order_id, 'paid', 'Bukti pembayaran diterima, menunggu verifikasi admin');

  INSERT INTO public.notifications (user_id, title, body, type, data)
  VALUES (
    v_uid,
    'Pembayaran diterima',
    'Bukti transfer pesanan ' || left(p_order_id::text, 8) || ' sedang diverifikasi.',
    'order',
    jsonb_build_object('order_id', p_order_id, 'status', 'paid')
  );
END;
$mark_paid$;

COMMENT ON FUNCTION public.mark_order_paid(uuid, text) IS 'Pembeli mengirim bukti transfer; status berubah jadi paid.';

-- ============================================================
-- RPC: update_order_status (admin saja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id        uuid,
  p_status          text,
  p_note            text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $update_order_status$
DECLARE
  v_status text := lower(btrim(p_status));
  v_order  public.orders%ROWTYPE;
  v_item   record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengubah status pesanan' USING ERRCODE = '42501';
  END IF;
  IF v_status NOT IN ('pending','paid','processing','shipped','delivered','cancelled') THEN
    RAISE EXCEPTION 'Status pesanan tidak valid';
  END IF;

  SELECT o.* INTO v_order FROM public.orders o WHERE o.id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan';
  END IF;

  -- Status cancelled bersifat final: stok sudah dikembalikan sekali oleh
  -- cancel_order/update_order_status, jadi tidak boleh diubah lagi.
  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Pesanan yang sudah dibatalkan tidak dapat diubah';
  END IF;

  UPDATE public.orders
     SET status = v_status,
         tracking_number = COALESCE(NULLIF(btrim(p_tracking_number), ''), v_order.tracking_number),
         updated_at = now()
   WHERE id = p_order_id;

  -- Jika admin membatalkan, stok juga dikembalikan (sekali saja)
  IF v_status = 'cancelled' AND v_order.status <> 'cancelled' THEN
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
        FROM public.order_items oi
       WHERE oi.order_id = p_order_id
       ORDER BY oi.product_id
    LOOP
      PERFORM 1 FROM public.products p WHERE p.id = v_item.product_id FOR UPDATE;
      UPDATE public.products
         SET stock = stock + v_item.quantity
       WHERE id = v_item.product_id;
    END LOOP;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (p_order_id, v_status, NULLIF(btrim(p_note), ''));

  INSERT INTO public.notifications (user_id, title, body, type, data)
  VALUES (
    v_order.user_id,
    'Status pesanan diperbarui',
    'Pesanan ' || left(p_order_id::text, 8) || ' sekarang berstatus ' || v_status || '.',
    'order',
    jsonb_build_object('order_id', p_order_id, 'status', v_status)
  );
END;
$update_order_status$;

COMMENT ON FUNCTION public.update_order_status(uuid, text, text, text)
  IS 'Admin mengubah status pesanan, menulis riwayat, dan memberi notifikasi ke pemilik.';

-- ============================================================
-- View penulis review (SECURITY DEFINER secara default di Postgres)
-- ============================================================
CREATE OR REPLACE VIEW public.review_authors AS
  SELECT p.id, p.full_name, p.avatar_url
    FROM public.profiles p;

-- Pastikan view memakai hak pencipta (bukan invoker) pada PG 15+.
DO $view_opts$
BEGIN
  IF current_setting('server_version_num')::integer >= 150000 THEN
    EXECUTE 'ALTER VIEW public.review_authors SET (security_invoker = false)';
  END IF;
END
$view_opts$;

GRANT SELECT ON public.review_authors TO anon, authenticated, service_role;

-- ============================================================
-- Storage: bucket bukti pembayaran
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DO $bucket_opts$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'storage' AND table_name = 'buckets'
       AND column_name = 'file_size_limit'
  ) THEN
    UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'payment-proofs';
  END IF;
END
$bucket_opts$;

DROP POLICY IF EXISTS "Public can read payment proofs" ON storage.objects;
CREATE POLICY "Public can read payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Authenticated can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated can upload payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own payment proofs" ON storage.objects;
CREATE POLICY "Users can update own payment proofs" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner::text = auth.uid()::text)
  WITH CHECK (bucket_id = 'payment-proofs' AND owner::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own payment proofs" ON storage.objects;
CREATE POLICY "Users can delete own payment proofs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner::text = auth.uid()::text);

-- ============================================================
-- RLS: upgrade policy lama 001 ke is_admin() (hindari rekursi)
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
CREATE POLICY "Admin can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage all orders" ON public.orders;
CREATE POLICY "Admin can manage all orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage order items" ON public.order_items;
CREATE POLICY "Admin can manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete reviews" ON public.reviews;
CREATE POLICY "Admin can delete reviews" ON public.reviews
  FOR DELETE TO authenticated USING (public.is_admin());

-- RLS tabel baru
ALTER TABLE public.wishlists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlists" ON public.wishlists;
CREATE POLICY "Users manage own wishlists" ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read vouchers" ON public.vouchers;
CREATE POLICY "Public can read vouchers" ON public.vouchers
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin can manage vouchers" ON public.vouchers;
CREATE POLICY "Admin can manage vouchers" ON public.vouchers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notifications: hanya baca/tandai sudah dibaca; insert dilakukan RPC SECURITY DEFINER
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own order history" ON public.order_status_history;
CREATE POLICY "Users can view own order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin can manage order history" ON public.order_status_history;
CREATE POLICY "Admin can manage order history" ON public.order_status_history
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT ON public.vouchers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists, public.addresses TO authenticated, service_role;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated, service_role;
GRANT SELECT ON public.order_status_history TO authenticated, service_role;
GRANT ALL ON public.wishlists, public.addresses, public.vouchers,
            public.notifications, public.order_status_history TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text, text, text, text, text, text, text, text, text, numeric, text, numeric)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, text, text)
  TO authenticated, service_role;

-- ============================================================
-- Ulasan: jaga rating & jumlah ulasan produk tetap akurat
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $sync_product_rating$
DECLARE
  v_product_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  UPDATE public.products p
     SET rating = COALESCE((
           SELECT round(avg(r.rating)::numeric, 2)
             FROM public.reviews r
            WHERE r.product_id = v_product_id
         ), 0),
         review_count = (
           SELECT count(*)::int
             FROM public.reviews r
            WHERE r.product_id = v_product_id
         )
   WHERE p.id = v_product_id;
  RETURN COALESCE(NEW, OLD);
END;
$sync_product_rating$;

DROP TRIGGER IF EXISTS reviews_sync_product_rating ON public.reviews;
CREATE TRIGGER reviews_sync_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_rating();

-- Backfill data yang sudah ada sebelum trigger dipasang.
UPDATE public.products p
   SET rating = COALESCE((
         SELECT round(avg(r.rating)::numeric, 2)
           FROM public.reviews r
          WHERE r.product_id = p.id
       ), 0),
       review_count = (
         SELECT count(*)::int
           FROM public.reviews r
          WHERE r.product_id = p.id
       );

-- ============================================================
-- Realtime: badge notifikasi langsung update di navbar
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============================================================
-- Selesai
-- ============================================================
