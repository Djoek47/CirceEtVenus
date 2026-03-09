-- Add onboarding_completed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Update existing users to have completed onboarding (optional - remove if you want existing users to see onboarding)
-- UPDATE profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL;
