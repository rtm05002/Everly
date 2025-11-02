-- Migration: Update bounties table to support multiple reward types
-- Run this in your Supabase SQL editor

-- Add new columns to support different reward types
ALTER TABLE public.bounties 
ADD COLUMN IF NOT EXISTS badge_name TEXT,
ADD COLUMN IF NOT EXISTS badge_icon TEXT,
ADD COLUMN IF NOT EXISTS badge_description TEXT;

-- Update reward_type to support new types
-- Note: You may need to drop and recreate constraints if they exist
ALTER TABLE public.bounties 
ALTER COLUMN reward_type TYPE TEXT;

-- Update existing data to use 'cash' instead of 'usd' for consistency
UPDATE public.bounties 
SET reward_type = 'cash' 
WHERE reward_type = 'usd';

-- Add check constraint to ensure valid reward types
ALTER TABLE public.bounties 
ADD CONSTRAINT check_reward_type 
CHECK (reward_type IN ('cash', 'points', 'badge'));

-- Add check constraint to ensure badge fields are populated when reward_type = 'badge'
ALTER TABLE public.bounties 
ADD CONSTRAINT check_badge_fields 
CHECK (
  (reward_type != 'badge') OR 
  (reward_type = 'badge' AND badge_name IS NOT NULL AND badge_icon IS NOT NULL)
);

-- Add check constraint to ensure amount is populated for cash and points
ALTER TABLE public.bounties 
ADD CONSTRAINT check_amount_fields 
CHECK (
  (reward_type IN ('cash', 'points') AND amount IS NOT NULL) OR
  (reward_type = 'badge' AND amount IS NULL)
);

-- Update RLS policies if needed (adjust based on your current policies)
-- This is a template - you may need to adjust based on your existing policies

-- Example policy for bounties (adjust as needed)
-- CREATE POLICY "Users can view bounties in their hub" ON public.bounties
-- FOR SELECT USING (
--   hub_id IN (
--     SELECT hub_id FROM public.members 
--     WHERE user_id = auth.uid()
--   )
-- );

-- CREATE POLICY "Users can create bounties in their hub" ON public.bounties
-- FOR INSERT WITH CHECK (
--   hub_id IN (
--     SELECT hub_id FROM public.members 
--     WHERE user_id = auth.uid()
--   )
-- );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bounties_reward_type ON public.bounties(reward_type);
CREATE INDEX IF NOT EXISTS idx_bounties_badge_name ON public.bounties(badge_name) WHERE badge_name IS NOT NULL;

-- Insert some sample data with different reward types
INSERT INTO public.bounties (hub_id, name, description, reward_type, amount, badge_name, badge_icon, badge_description, status, ends_at, created_at)
VALUES 
  (
    '7007b327-c7bb-40c9-8865-a48b99612a62', -- Your DEMO_HUB_ID
    'Create a welcome video',
    'Help new members get started',
    'cash',
    50.00,
    NULL,
    NULL,
    NULL,
    'active',
    '2024-02-15T23:59:59Z',
    NOW()
  ),
  (
    '7007b327-c7bb-40c9-8865-a48b99612a62',
    'Write community documentation',
    'Help improve our docs',
    'points',
    100,
    NULL,
    NULL,
    NULL,
    'active',
    '2024-02-20T23:59:59Z',
    NOW()
  ),
  (
    '7007b327-c7bb-40c9-8865-a48b99612a62',
    'Design social media templates',
    'Create reusable templates',
    'badge',
    NULL,
    'Design Master',
    '🎨',
    'Awarded for exceptional design work',
    'active',
    '2024-02-25T23:59:59Z',
    NOW()
  );
