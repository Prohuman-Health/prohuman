-- Make arnabbhowmik019@gmail.com an admin
-- Run this against the ProHuman PostgreSQL database

-- First, show current state
SELECT id, email, role, is_active, created_at
FROM staff
WHERE email = 'arnabbhowmik019@gmail.com';

-- Update to admin role and ensure active
UPDATE staff
SET
    role = 'admin',
    is_active = true,
    updated_at = NOW()
WHERE email = 'arnabbhowmik019@gmail.com';

-- Confirm
SELECT id, email, role, is_active
FROM staff
WHERE email = 'arnabbhowmik019@gmail.com';
