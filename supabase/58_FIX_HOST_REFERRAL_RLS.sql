-- ============================================
-- FIX RLS POLICIES PER HOST REFERRAL SYSTEM
-- ============================================
-- Questo script corregge le policies RLS che causano errori di permessi

-- 1. RIMUOVI LE POLICY ESISTENTI
-- ============================================
DROP POLICY IF EXISTS "Users can view referrals for their email" ON public.host_referrals;
DROP POLICY IF EXISTS "Hosts can view their own referrals" ON public.host_referrals;
DROP POLICY IF EXISTS "Hosts can view their own referral codes" ON public.host_referral_codes;

-- 2. RICREA LE POLICY CORRETTE
-- ============================================

-- Policy: Gli host possono vedere solo i propri codici referral
CREATE POLICY "Hosts can view their own referral codes"
  ON public.host_referral_codes FOR SELECT
  USING (auth.uid() = host_id);

-- Policy: Gli host possono vedere solo i propri referral
-- IMPORTANTE: Rimosso il riferimento a auth.users che causava l'errore
CREATE POLICY "Hosts can view their own referrals"
  ON public.host_referrals FOR SELECT
  USING (auth.uid() = host_id);

-- Policy: Gli utenti invitati possono vedere i propri referral
-- Usa solo public.profiles, non auth.users
CREATE POLICY "Users can view referrals for their email"
  ON public.host_referrals FOR SELECT
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- 3. AGGIUNGI POLICY PER UPDATE (per i trigger)
-- ============================================
DROP POLICY IF EXISTS "System can update referrals" ON public.host_referrals;
CREATE POLICY "System can update referrals"
  ON public.host_referrals FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- 4. VERIFICA PERMESSI
-- ============================================
-- Assicurati che le funzioni abbiano i permessi corretti
GRANT UPDATE ON public.host_referrals TO authenticated;
GRANT UPDATE ON public.host_referrals TO service_role;

-- ============================================
-- FINE SCRIPT
-- ============================================
