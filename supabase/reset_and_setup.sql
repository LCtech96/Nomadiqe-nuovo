-- ============================================
-- NOMADIQE - RESET E SETUP COMPLETO DATABASE
-- ============================================
-- Questa query elimina TUTTO e ricrea lo schema da zero
-- ATTENZIONE: Questo eliminerà tutti i dati esistenti!
-- ============================================

-- STEP 1: Elimina tutti i trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- STEP 2: Elimina tutte le funzioni
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- STEP 3: Elimina tutte le policies RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Bookings are viewable by traveler and host" ON public.bookings;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;

-- STEP 4: Disabilita RLS su tutte le tabelle
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.points_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.manager_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaborations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collaboration_offers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creator_niches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 5: Elimina tutte le tabelle (in ordine inverso rispetto alle foreign keys)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.daily_checkins CASCADE;
DROP TABLE IF EXISTS public.points_history CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.service_requests CASCADE;
DROP TABLE IF EXISTS public.manager_services CASCADE;
DROP TABLE IF EXISTS public.collaborations CASCADE;
DROP TABLE IF EXISTS public.collaboration_offers CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.property_availability CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.creator_niches CASCADE;
DROP TABLE IF EXISTS public.social_accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- STEP 6: Elimina tutti i tipi ENUM
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS collaboration_type CASCADE;
DROP TYPE IF EXISTS property_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================
-- STEP 7: RICREA TUTTO LO SCHEMA
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('traveler', 'host', 'creator', 'manager');

-- Property Types Enum
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'b&b', 'hotel', 'villa', 'other');

-- Collaboration Types Enum
CREATE TYPE collaboration_type AS ENUM ('free_stay', 'discounted_stay', 'paid_collaboration');

-- Service Types Enum
CREATE TYPE service_type AS ENUM (
  'cleaning', 'property_management', 'photography', 'videography',
  'social_media', 'maintenance', 'concierge', 'cooking', 'driver', 'translation'
);

-- Booking Status Enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role user_role,
  bio TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Media Accounts (for Creators)
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube'
  username TEXT NOT NULL,
  follower_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  verified BOOLEAN DEFAULT FALSE,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Creator Niches
CREATE TABLE public.creator_niches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  niche TEXT NOT NULL, -- 'travel', 'lifestyle', 'food', 'adventure', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties (Host listings)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  property_type property_type NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_per_night DECIMAL(10, 2) NOT NULL,
  max_guests INTEGER NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  amenities TEXT[], -- Array of amenities
  images TEXT[], -- Array of image URLs
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Availability
CREATE TABLE public.property_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  price_override DECIMAL(10, 2),
  UNIQUE(property_id, date)
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  traveler_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status booking_status DEFAULT 'pending',
  commission_percentage DECIMAL(5, 2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Host Collaboration Offers
CREATE TABLE public.collaboration_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  collaboration_type collaboration_type NOT NULL,
  min_followers INTEGER,
  discount_percentage DECIMAL(5, 2), -- For discounted_stay
  payment_amount DECIMAL(10, 2), -- For paid_collaboration
  preferred_niches TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborations (Host-Creator partnerships)
CREATE TABLE public.collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.collaboration_offers(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  collaboration_type collaboration_type NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  start_date DATE,
  end_date DATE,
  deliverables TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manager Services
CREATE TABLE public.manager_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10, 2),
  price_per_service DECIMAL(10, 2),
  availability_type TEXT, -- 'flexible', 'seasonal', 'full-time'
  operating_cities TEXT[],
  operating_countries TEXT[],
  skills TEXT[],
  portfolio_images TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Requests (Host requests Manager services)
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.manager_services(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  description TEXT,
  requested_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'completed'
  price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  images TEXT[],
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Likes
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follows (User follows)
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Points History
CREATE TABLE public.points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'sign_up', 'onboarding', 'booking', 'post', 'check_in', 'review'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Check-ins
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  points_earned INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, check_in_date)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID, -- Can reference various tables
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_properties_host ON public.properties(host_id);
CREATE INDEX idx_properties_location ON public.properties(latitude, longitude);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_bookings_traveler ON public.bookings(traveler_id);
CREATE INDEX idx_bookings_property ON public.bookings(property_id);
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_location ON public.posts(latitude, longitude);
CREATE INDEX idx_collaborations_host ON public.collaborations(host_id);
CREATE INDEX idx_collaborations_creator ON public.collaborations(creator_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_services ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Hosts can manage own properties" ON public.properties
  FOR ALL USING (auth.uid() = host_id);

CREATE POLICY "Bookings are viewable by traveler and host" ON public.bookings
  FOR SELECT USING (auth.uid() = traveler_id OR auth.uid() IN (SELECT host_id FROM public.properties WHERE id = property_id));

CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, points)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    100 -- Sign up bonus points
  );
  
  -- Add points history
  INSERT INTO public.points_history (user_id, points, action_type, description)
  VALUES (NEW.id, 100, 'sign_up', 'Registrazione completata');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMPLETATO!
-- ============================================
-- Il database è stato resettato e ricreato completamente.
-- Ora puoi creare nuovi utenti e il profilo verrà creato automaticamente.
-- ============================================

