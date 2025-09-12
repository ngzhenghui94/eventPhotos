-- Full schema reset migration for eventPhotos
-- Drops all tables and recreates them based on the latest schema

DROP TABLE IF EXISTS event_timelines CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  plan_name VARCHAR(50),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  category VARCHAR(32) NOT NULL DEFAULT 'General',
  event_code VARCHAR(50) NOT NULL UNIQUE,
  access_code VARCHAR(50) NOT NULL UNIQUE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  allow_guest_uploads BOOLEAN NOT NULL DEFAULT TRUE,
  require_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  event_id INTEGER NOT NULL REFERENCES events(id),
  uploaded_by INTEGER REFERENCES users(id),
  guest_name VARCHAR(100),
  guest_email VARCHAR(255),
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  detail TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT now(),
  ip_address VARCHAR(45)
);

CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  invited_at TIMESTAMP NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE event_timelines (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  time TIMESTAMP NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_timelines_event_id ON event_timelines(event_id);
CREATE INDEX idx_event_timelines_time ON event_timelines(time);
