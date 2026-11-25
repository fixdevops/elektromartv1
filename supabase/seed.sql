-- ============================================================
-- ElektroMart Seed Data
-- ============================================================

-- Categories
INSERT INTO categories (id, name, slug, description, image_url) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Smartphones',   'smartphones',   'Latest flagship and mid-range phones',   'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'),
  ('22222222-2222-2222-2222-222222222222', 'Laptops',       'laptops',       'Ultrabooks, gaming, and workstations',   'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'),
  ('33333333-3333-3333-3333-333333333333', 'Audio',         'audio',         'Headphones, earbuds, and speakers',      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'),
  ('44444444-4444-4444-4444-444444444444', 'Smart Watches', 'smart-watches', 'Fitness trackers and smartwatches',      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'),
  ('55555555-5555-5555-5555-555555555555', 'Accessories',   'accessories',   'Cables, cases, chargers, and more',      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400');

-- Products (20 items)
INSERT INTO products (name, slug, category_id, description, price, original_price, stock, images, brand, sku, is_featured, rating, review_count, specifications) VALUES
  ('Samsung Galaxy S24 Ultra','samsung-s24-ultra','11111111-1111-1111-1111-111111111111',
   'Flagship with 200MP camera, titanium frame, built-in S Pen.',
   19999000, 22999000, 50,
   ARRAY['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600'],
   'Samsung','SKU-SM-S24U',TRUE,4.8,124,
   '{"display":"6.8\" QHD+","ram":"12GB","storage":"256GB","battery":"5000mAh","os":"Android 14"}'::jsonb),

  ('iPhone 15 Pro Max','iphone-15-pro-max','11111111-1111-1111-1111-111111111111',
   'A17 Pro chip, titanium design, ProRes video recording.',
   23499000, 24999000, 35,
   ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600'],
   'Apple','SKU-AP-15PM',TRUE,4.9,210,
   '{"display":"6.7\" Super Retina XDR","ram":"8GB","storage":"256GB","battery":"4422mAh","os":"iOS 17"}'::jsonb),

  ('Google Pixel 8 Pro','google-pixel-8-pro','11111111-1111-1111-1111-111111111111',
   'Google Tensor G3, 50MP triple camera, 7 years of updates.',
   13999000, 15999000, 40,
   ARRAY['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600'],
   'Google','SKU-GP-8P',FALSE,4.6,87,
   '{"display":"6.7\" LTPO OLED","ram":"12GB","storage":"128GB","battery":"5050mAh","os":"Android 14"}'::jsonb),

  ('OnePlus 12','oneplus-12','11111111-1111-1111-1111-111111111111',
   'Snapdragon 8 Gen 3, 100W fast charging, Hasselblad tuned camera.',
   10999000, 12999000, 60,
   ARRAY['https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600'],
   'OnePlus','SKU-OP-12',FALSE,4.5,63,
   '{"display":"6.82\" AMOLED","ram":"16GB","storage":"256GB","battery":"5400mAh","os":"Android 14"}'::jsonb),

  ('Xiaomi 14 Pro','xiaomi-14-pro','11111111-1111-1111-1111-111111111111',
   'Leica professional optics, Snapdragon 8 Gen 3, HyperOS.',
   12999000, 14999000, 45,
   ARRAY['https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=600'],
   'Xiaomi','SKU-XM-14P',FALSE,4.4,55,
   '{"display":"6.73\" AMOLED","ram":"12GB","storage":"256GB","battery":"4880mAh","os":"Android 14"}'::jsonb),

  ('MacBook Pro 14 M3 Pro','macbook-pro-14-m3','22222222-2222-2222-2222-222222222222',
   'Apple M3 Pro chip, Liquid Retina XDR display, 22h battery.',
   29999000, 32999000, 20,
   ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600'],
   'Apple','SKU-AP-MBP14',TRUE,4.9,178,
   '{"cpu":"M3 Pro 11-core","ram":"18GB","storage":"512GB SSD","display":"14.2\" XDR","battery":"22h"}'::jsonb),

  ('ASUS ROG Zephyrus G14','asus-rog-g14','22222222-2222-2222-2222-222222222222',
   'AMD Ryzen 9, RTX 4090, AniMe Matrix lid display.',
   27999000, 31999000, 15,
   ARRAY['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600'],
   'ASUS','SKU-AS-ROG-G14',TRUE,4.7,92,
   '{"cpu":"Ryzen 9 7940HS","gpu":"RTX 4090","ram":"32GB","storage":"1TB SSD","display":"14\" 165Hz"}'::jsonb),

  ('Dell XPS 15 OLED','dell-xps-15-oled','22222222-2222-2222-2222-222222222222',
   'Intel Core i9, 3.5K OLED touch display, CNC aluminum.',
   25999000, 28999000, 18,
   ARRAY['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600'],
   'Dell','SKU-DL-XPS15',FALSE,4.6,71,
   '{"cpu":"Core i9-13900H","ram":"32GB","storage":"1TB SSD","display":"15.6\" OLED 3.5K","battery":"13h"}'::jsonb),

  ('Lenovo ThinkPad X1 Carbon','lenovo-x1-carbon','22222222-2222-2222-2222-222222222222',
   'Ultra-light business laptop, military-grade durability, 4G LTE.',
   21999000, 24999000, 25,
   ARRAY['https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600'],
   'Lenovo','SKU-LN-X1C',FALSE,4.5,48,
   '{"cpu":"Core i7-1365U","ram":"16GB","storage":"512GB SSD","display":"14\" IPS","weight":"1.12kg"}'::jsonb),

  ('Sony WH-1000XM5','sony-wh-1000xm5','33333333-3333-3333-3333-333333333333',
   'Industry-leading ANC, 30h battery, crystal-clear call quality.',
   5499000, 6499000, 80,
   ARRAY['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600'],
   'Sony','SKU-SN-WH5',TRUE,4.8,305,
   '{"type":"Over-ear","anc":"Yes","battery":"30h","driver":"30mm","bluetooth":"5.2"}'::jsonb),

  ('Apple AirPods Pro 2nd Gen','airpods-pro-2','33333333-3333-3333-3333-333333333333',
   'H2 chip, adaptive transparency, precision finding, USB-C case.',
   4299000, 4999000, 100,
   ARRAY['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600'],
   'Apple','SKU-AP-APP2',TRUE,4.9,412,
   '{"type":"In-ear","anc":"Adaptive","battery":"6h+30h","chip":"H2","case":"USB-C MagSafe"}'::jsonb),

  ('Samsung Galaxy Buds3 Pro','galaxy-buds3-pro','33333333-3333-3333-3333-333333333333',
   'Blade design, 360 audio, intelligent ANC, 37h total battery.',
   3299000, 3999000, 70,
   ARRAY['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600'],
   'Samsung','SKU-SM-GB3P',FALSE,4.4,156,
   '{"type":"In-ear","anc":"Intelligent","battery":"6h+31h","driver":"Custom 2-way","bluetooth":"5.4"}'::jsonb),

  ('JBL Charge 5','jbl-charge-5','33333333-3333-3333-3333-333333333333',
   'IP67 waterproof Bluetooth speaker, 20h playtime, power bank.',
   2199000, 2699000, 90,
   ARRAY['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600'],
   'JBL','SKU-JBL-CH5',FALSE,4.6,233,
   '{"type":"Portable speaker","waterproof":"IP67","battery":"20h","power_bank":"Yes","bluetooth":"5.1"}'::jsonb),

  ('Apple Watch Series 9','apple-watch-s9','44444444-4444-4444-4444-444444444444',
   'S9 chip, double tap gesture, carbon-neutral, always-on display.',
   7499000, 8499000, 55,
   ARRAY['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'],
   'Apple','SKU-AP-AWS9',TRUE,4.8,287,
   '{"display":"1.9\" LTPO OLED","chip":"S9 SiP","health":"ECG,SpO2,Temp","gps":"Yes","water":"50m"}'::jsonb),

  ('Samsung Galaxy Watch 6 Classic','galaxy-watch6-classic','44444444-4444-4444-4444-444444444444',
   'Rotating bezel, BioActive sensor, Wear OS 4, sleep coaching.',
   5299000, 5999000, 45,
   ARRAY['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600'],
   'Samsung','SKU-SM-GW6C',FALSE,4.5,119,
   '{"display":"1.47\" Super AMOLED","bezel":"Rotating","health":"BioActive","battery":"300mAh","os":"Wear OS 4"}'::jsonb),

  ('Garmin Fenix 7 Solar','garmin-fenix7-solar','44444444-4444-4444-4444-444444444444',
   'Solar charging, multi-band GPS, 22-day battery, rugged sports watch.',
   9999000, 11999000, 30,
   ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
   'Garmin','SKU-GR-F7S',FALSE,4.7,88,
   '{"battery":"22 days","gps":"Multi-band GNSS","display":"1.3\" MIP","solar":"Yes","water":"10ATM"}'::jsonb),

  ('Anker 65W GaN Charger','anker-65w-gan','55555555-5555-5555-5555-555555555555',
   'Compact 3-port (2x USB-C + USB-A) GaN charger, folds flat.',
   549000, 699000, 200,
   ARRAY['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600'],
   'Anker','SKU-AN-65GAN',FALSE,4.6,445,
   '{"power":"65W","ports":"2x USB-C + 1x USB-A","technology":"GaN","foldable":"Yes","compact":"Yes"}'::jsonb),

  ('Baseus 20000mAh Power Bank','baseus-20000-pb','55555555-5555-5555-5555-555555555555',
   '65W two-way fast charge, LCD display, charges laptop and phone simultaneously.',
   899000, 1099000, 150,
   ARRAY['https://images.unsplash.com/photo-1609592806596-b65d1a2e3495?w=600'],
   'Baseus','SKU-BS-PB20K',FALSE,4.5,198,
   '{"capacity":"20000mAh","input":"65W USB-C","output":"65W USB-C + 22.5W USB-A","display":"LCD"}'::jsonb),

  ('Spigen Ultra Hybrid iPhone 15 Case','spigen-iphone15-case','55555555-5555-5555-5555-555555555555',
   'Military-grade drop protection, crystal-clear back, raised bezels.',
   249000, 349000, 300,
   ARRAY['https://images.unsplash.com/photo-1541480551145-2370a440d585?w=600'],
   'Spigen','SKU-SP-UH-IP15',FALSE,4.4,312,
   '{"compatible":"iPhone 15 series","protection":"MIL-STD-810G","material":"TPU+PC","wireless":"Compatible"}'::jsonb),

  ('Ugreen USB-C Hub 10-in-1','ugreen-usbc-hub-10','55555555-5555-5555-5555-555555555555',
   '4K HDMI, 100W PD, SD/microSD, 3x USB-A, USB-C data, Ethernet.',
   799000, 999000, 120,
   ARRAY['https://images.unsplash.com/photo-1625948515291-7b71e516bc91?w=600'],
   'Ugreen','SKU-UG-HUB10',FALSE,4.7,267,
   '{"ports":"10","hdmi":"4K@60Hz","power_delivery":"100W","ethernet":"Gigabit","card_reader":"SD+microSD"}'::jsonb);
