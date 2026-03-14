-- Add planUpdatedAt column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP;
