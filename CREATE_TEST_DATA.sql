-- Script SQL per creare dati di test
-- Esegui questo script nel Supabase SQL Editor
-- Database: umodgqcplvwmhfagihhu.supabase.co

-- ============================================
-- 1. VERIFICA CONNESSIONE DATABASE
-- ============================================
-- Verifica che le tabelle esistano
SELECT 
  'profiles' as table_name, 
  COUNT(*) as record_count 
FROM public.profiles
UNION ALL
SELECT 
  'posts' as table_name, 
  COUNT(*) as record_count 
FROM public.posts
UNION ALL
SELECT 
  'properties' as table_name, 
  COUNT(*) as record_count 
FROM public.properties
UNION ALL
SELECT 
  'social_accounts' as table_name, 
  COUNT(*) as record_count 
FROM public.social_accounts;

-- ============================================
-- 2. CREA POST PER UTENTI ESISTENTI
-- ============================================
-- Questo script crea post per gli utenti esistenti nel database
-- Non crea nuovi utenti (devono essere creati tramite registrazione)

-- Inserisci post per i primi 5 creator esistenti
INSERT INTO public.posts (author_id, content, images, created_at)
SELECT 
  p.id,
  'Questo è un post di test per ' || COALESCE(p.full_name, p.username, 'Creator') || '! 🎉',
  ARRAY['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
  NOW() - (random() * interval '30 days')
FROM public.profiles p
WHERE p.role = 'creator'
  AND NOT EXISTS (SELECT 1 FROM public.posts WHERE author_id = p.id)
LIMIT 5
ON CONFLICT DO NOTHING;

-- Inserisci post per i primi 3 host esistenti
INSERT INTO public.posts (author_id, content, images, created_at)
SELECT 
  p.id,
  'Nuova struttura disponibile! ' || COALESCE(p.full_name, p.username, 'Host') || ' ha aggiunto una nuova proprietà.',
  ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
  NOW() - (random() * interval '20 days')
FROM public.profiles p
WHERE p.role = 'host'
  AND NOT EXISTS (SELECT 1 FROM public.posts WHERE author_id = p.id)
LIMIT 3
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CREA PROPRIETÀ PER HOST ESISTENTI
-- ============================================
-- Inserisci proprietà per i primi 3 host esistenti
INSERT INTO public.properties (
  owner_id,
  name,
  description,
  property_type,
  address,
  city,
  country,
  latitude,
  longitude,
  price_per_night,
  max_guests,
  bedrooms,
  bathrooms,
  amenities,
  images,
  is_active,
  created_at
)
SELECT 
  p.id,
  'Villa ' || COALESCE(p.full_name, p.username, 'Host') || ' - ' || cities.city,
  'Bellissima villa con vista panoramica, perfetta per una vacanza indimenticabile.',
  CASE (random() * 5)::int
    WHEN 0 THEN 'apartment'
    WHEN 1 THEN 'house'
    WHEN 2 THEN 'villa'
    WHEN 3 THEN 'b&b'
    ELSE 'hotel'
  END::property_type,
  'Via ' || cities.street || ', ' || cities.city,
  cities.city,
  cities.country,
  cities.lat,
  cities.lon,
  (50 + random() * 200)::decimal(10,2),
  (2 + (random() * 8)::int),
  (1 + (random() * 4)::int),
  (1 + (random() * 3)::int),
  ARRAY['WiFi', 'Aria condizionata', 'Cucina', 'Parcheggio', 'TV'],
  ARRAY[
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800'
  ],
  true,
  NOW() - (random() * interval '60 days')
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('Roma', 'Italia', 'Via del Corso', 41.9028, 12.4964),
    ('Milano', 'Italia', 'Via Brera', 45.4642, 9.1900),
    ('Firenze', 'Italia', 'Via dei Calzaiuoli', 43.7696, 11.2558),
    ('Venezia', 'Italia', 'Calle Larga', 45.4408, 12.3155),
    ('Napoli', 'Italia', 'Via Toledo', 40.8518, 14.2681),
    ('Parigi', 'Francia', 'Rue de Rivoli', 48.8566, 2.3522),
    ('Londra', 'Regno Unito', 'Oxford Street', 51.5074, -0.1278),
    ('Barcellona', 'Spagna', 'Las Ramblas', 41.3851, 2.1734)
) AS cities(city, country, street, lat, lon)
  WHERE p.role = 'host'
  AND NOT EXISTS (SELECT 1 FROM public.properties WHERE owner_id = p.id)
LIMIT 3
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. CREA SOCIAL ACCOUNTS PER CREATOR ESISTENTI
-- ============================================
-- Inserisci account social per i primi 5 creator esistenti
INSERT INTO public.social_accounts (
  user_id,
  platform,
  username,
  follower_count,
  engagement_rate,
  verified,
  created_at
)
SELECT 
  p.id,
  platforms.platform,
  '@' || COALESCE(p.username, 'creator' || p.id::text),
  (1000 + (random() * 99000)::int),
  (2.5 + random() * 7.5)::decimal(5,2),
  (random() > 0.7), -- 30% verified
  NOW() - (random() * interval '180 days')
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('instagram'),
    ('youtube'),
    ('tiktok')
) AS platforms(platform)
WHERE p.role = 'creator'
  AND p.id NOT IN (SELECT DISTINCT user_id FROM public.social_accounts WHERE user_id IS NOT NULL)
LIMIT 5
ON CONFLICT (user_id, platform) DO NOTHING;

-- ============================================
-- 5. VERIFICA DATI INSERITI
-- ============================================
-- Conta i record inseriti
SELECT 
  'Posts creati' as tipo,
  COUNT(*) as totale
FROM public.posts
WHERE created_at > NOW() - interval '1 hour'
UNION ALL
SELECT 
  'Proprietà create' as tipo,
  COUNT(*) as totale
FROM public.properties
WHERE created_at > NOW() - interval '1 hour'
UNION ALL
SELECT 
  'Account social creati' as tipo,
  COUNT(*) as totale
FROM public.social_accounts
WHERE created_at > NOW() - interval '1 hour';

-- Mostra i creator con account social
SELECT 
  p.username,
  p.full_name,
  COUNT(sa.id) as social_accounts_count,
  SUM(sa.follower_count) as total_followers
FROM public.profiles p
LEFT JOIN public.social_accounts sa ON p.id = sa.user_id
WHERE p.role = 'creator'
GROUP BY p.id, p.username, p.full_name
ORDER BY total_followers DESC NULLS LAST
LIMIT 10;

-- Mostra gli host con proprietà
SELECT 
  p.username,
  p.full_name,
  COUNT(pr.id) as properties_count
FROM public.profiles p
LEFT JOIN public.properties pr ON p.id = pr.owner_id
WHERE p.role = 'host'
GROUP BY p.id, p.username, p.full_name
ORDER BY properties_count DESC NULLS LAST
LIMIT 10;

