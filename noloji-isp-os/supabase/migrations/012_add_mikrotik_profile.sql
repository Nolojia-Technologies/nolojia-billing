-- Add mikrotik_profile column to customers table
-- This stores the profile name from MikroTik for imported customers

ALTER TABLE customers ADD COLUMN IF NOT EXISTS mikrotik_profile VARCHAR(100);

COMMENT ON COLUMN customers.mikrotik_profile IS 'Profile name from MikroTik (hotspot user profile or PPPoE profile)';
