-- ============================================
-- FIX: Properties RLS Policy for INSERT operations
-- ============================================
-- This migration fixes the RLS policy to allow INSERT operations
-- Run this in your Supabase SQL Editor to fix the issue
-- ============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;

-- Recreate the policy with both USING and WITH CHECK clauses
CREATE POLICY "Hosts can manage own properties" ON public.properties
  FOR ALL 
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- ============================================
-- EXPLANATION
-- ============================================
-- The previous policy only had USING clause, which works for:
-- - SELECT: Check existing rows
-- - UPDATE: Check existing rows before updating
-- - DELETE: Check existing rows before deleting
--
-- However, INSERT operations require WITH CHECK clause to validate
-- the new row being inserted. Without it, all INSERTs will fail with:
-- "new row violates row-level security policy"
-- ============================================




