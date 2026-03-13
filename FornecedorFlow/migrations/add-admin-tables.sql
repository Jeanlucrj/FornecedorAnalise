-- Migration: Add Admin Tables and Activity Logs
-- Created: 2026-03-08

-- Add admin fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  admin_id VARCHAR REFERENCES admins(id),
  action VARCHAR NOT NULL,
  resource VARCHAR,
  resource_id VARCHAR,
  details JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS IDX_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS IDX_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS IDX_activity_logs_created_at ON activity_logs(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admins IS 'Stores administrator credentials for the admin panel';
COMMENT ON TABLE activity_logs IS 'Tracks all user and admin activities for auditing purposes';
COMMENT ON COLUMN users.is_admin IS 'Flag to identify if a regular user has admin privileges';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of the user''s last login';
