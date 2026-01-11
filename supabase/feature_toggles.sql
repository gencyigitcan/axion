-- Add features jsonb column to tenants for feature toggles
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"classes": true, "members": true, "nutrition": true, "calendar": true, "reports": true}';
