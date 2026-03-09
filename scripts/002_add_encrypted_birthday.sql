-- Add encrypted birthday and passphrase hash to profiles
-- The birthday is encrypted client-side before storage
-- Only the user with their passphrase can decrypt it

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS encrypted_birthday TEXT,
ADD COLUMN IF NOT EXISTS birthday_passphrase_hash TEXT,
ADD COLUMN IF NOT EXISTS has_birthday_set BOOLEAN DEFAULT FALSE;

-- Add timezone if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Comment explaining the security model
COMMENT ON COLUMN public.profiles.encrypted_birthday IS 
'Client-side AES-256-GCM encrypted birthday. Cannot be decrypted by server or database admins.';

COMMENT ON COLUMN public.profiles.birthday_passphrase_hash IS 
'SHA-256 hash of user passphrase for verification. Does not reveal the passphrase.';
