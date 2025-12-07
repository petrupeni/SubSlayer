-- SubSlayer Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    renewal_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expiring_soon')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
    ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
    ON public.subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
    ON public.subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- Smart Cancel Feature Columns (Run separately if table exists)
-- =============================================

-- Add cancellation_url for redirect-based cancellation
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS cancellation_url TEXT;

-- Add can_cancel_via_api for API-based cancellation
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS can_cancel_via_api BOOLEAN DEFAULT false;

-- Add website_url for linking to service website
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS website_url TEXT;
