-- 0007_add_category_to_events.sql
-- Migration: Add 'category' column to 'events' table

ALTER TABLE events ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'General';
