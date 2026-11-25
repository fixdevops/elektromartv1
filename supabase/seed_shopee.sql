-- ============================================================
-- ElektroMart — Seed tambahan fitur Shopee-like
-- Idempotent: UPDATE produk by slug + INSERT voucher ON CONFLICT DO NOTHING.
-- ============================================================

-- Data e-commerce tambahan untuk 20 produk dari seed.sql
UPDATE public.products AS p
SET sold_count  = v.sold_count,
    variants    = v.variants::jsonb,
    location    = v.location,
    seller_name = v.seller_name
FROM (VALUES
  ('samsung-s24-ultra', 1240,
   '[{"name":"Warna","options":["Titanium Gray","Titanium Black"]},{"name":"Storage","options":["256GB","512GB"]}]'::jsonb,
   'Jakarta Pusat', 'Samsung Official Store'),

  ('iphone-15-pro-max', 2180,
   '[{"name":"Warna","options":["Natural Titanium","Black Titanium"]},{"name":"Storage","options":["256GB","512GB"]}]'::jsonb,
   'Jakarta Selatan', 'Apple Authorized Reseller'),

  ('google-pixel-8-pro', 870,
   '[{"name":"Warna","options":["Obsidian","Porcelain"]},{"name":"Storage","options":["128GB","256GB"]}]'::jsonb,
   'Jakarta Barat', 'Google Store Indonesia'),

  ('oneplus-12', 630,
   '[{"name":"Warna","options":["Flowy Emerald","Silky Black"]},{"name":"Storage","options":["256GB","512GB"]}]'::jsonb,
   'Jakarta Timur', 'OnePlus Official Store'),

  ('xiaomi-14-pro', 550,
   '[{"name":"Warna","options":["Black","White"]},{"name":"Storage","options":["256GB","512GB"]}]'::jsonb,
   'Tangerang', 'Xiaomi Official Store'),

  ('macbook-pro-14-m3', 1780,
   '[{"name":"Warna","options":["Space Gray","Silver"]},{"name":"Storage","options":["512GB SSD","1TB SSD"]},{"name":"RAM","options":["18GB","36GB"]}]'::jsonb,
   'Jakarta Selatan', 'Apple Authorized Reseller'),

  ('asus-rog-g14', 920,
   '[{"name":"Warna","options":["Eclipse Gray","Moonlight White"]},{"name":"RAM","options":["32GB","64GB"]}]'::jsonb,
   'Bandung', 'ASUS Official Store'),

  ('dell-xps-15-oled', 710,
   '[{"name":"Warna","options":["Platinum Silver","Skyline"]},{"name":"RAM","options":["16GB","32GB"]}]'::jsonb,
   'Jakarta Pusat', 'Dell Official Store'),

  ('lenovo-x1-carbon', 480,
   '[{"name":"Warna","options":["Carbon Black"]},{"name":"Storage","options":["512GB SSD","1TB SSD"]}]'::jsonb,
   'Jakarta Utara', 'Lenovo Official Store'),

  ('sony-wh-1000xm5', 3050,
   '[{"name":"Warna","options":["Black","Silver"]}]'::jsonb,
   'Jakarta Selatan', 'Sony Official Store'),

  ('airpods-pro-2', 4120,
   '[{"name":"Warna","options":["White"]},{"name":"Tipe","options":["USB-C","MagSafe"]}]'::jsonb,
   'Jakarta Pusat', 'Apple Authorized Reseller'),

  ('galaxy-buds3-pro', 1560,
   '[{"name":"Warna","options":["White","Black"]}]'::jsonb,
   'Jakarta Barat', 'Samsung Official Store'),

  ('jbl-charge-5', 2330,
   '[{"name":"Warna","options":["Black","Blue","Red"]}]'::jsonb,
   'Jakarta Timur', 'JBL Official Store'),

  ('apple-watch-s9', 2870,
   '[{"name":"Warna","options":["Midnight","Starlight"]},{"name":"Ukuran","options":["41mm","45mm"]}]'::jsonb,
   'Jakarta Selatan', 'Apple Authorized Reseller'),

  ('galaxy-watch6-classic', 1190,
   '[{"name":"Warna","options":["Black","Silver"]},{"name":"Ukuran","options":["43mm","47mm"]}]'::jsonb,
   'Jakarta Pusat', 'Samsung Official Store'),

  ('garmin-fenix7-solar', 880,
   '[{"name":"Warna","options":["Black","Silver"]},{"name":"Ukuran","options":["47mm","51mm"]}]'::jsonb,
   'Bandung', 'Garmin Official Store'),

  ('anker-65w-gan', 4450,
   '[{"name":"Warna","options":["Black","White"]}]'::jsonb,
   'Tangerang', 'Anker Official Store'),

  ('baseus-20000-pb', 1980,
   '[{"name":"Warna","options":["Black"]},{"name":"Kapasitas","options":["20000mAh"]}]'::jsonb,
   'Bekasi', 'Baseus Official Store'),

  ('spigen-iphone15-case', 3120,
   '[{"name":"Warna","options":["Clear","Black"]},{"name":"Model","options":["iPhone 15","iPhone 15 Pro"]}]'::jsonb,
   'Depok', 'Spigen Official Store'),

  ('ugreen-usbc-hub-10', 2670,
   '[{"name":"Warna","options":["Space Gray"]}]'::jsonb,
   'Surabaya', 'Ugreen Official Store')
) AS v(slug, sold_count, variants, location, seller_name)
WHERE p.slug = v.slug;

-- Voucher sesuai spesifikasi (berlaku 1 tahun sejak seed dijalankan)
INSERT INTO public.vouchers
  (code, description, discount_type, value, min_spend, max_discount,
   expires_at, is_active, usage_limit, used_count)
VALUES
  ('HEMAT10',
   'Diskon 10% maksimal Rp50.000 untuk belanja minimal Rp100.000',
   'percent', 10, 100000, 50000,
   now() + interval '1 year', TRUE, 1000, 0),

  ('ONGKIR25',
   'Diskon Rp25.000 untuk belanja minimal Rp200.000',
   'fixed', 25000, 200000, NULL,
   now() + interval '1 year', TRUE, 500, 0),

  ('ELEKTRO50K',
   'Diskon Rp50.000 untuk belanja minimal Rp500.000',
   'fixed', 50000, 500000, NULL,
   now() + interval '1 year', TRUE, 250, 0)
ON CONFLICT (code) DO NOTHING;
