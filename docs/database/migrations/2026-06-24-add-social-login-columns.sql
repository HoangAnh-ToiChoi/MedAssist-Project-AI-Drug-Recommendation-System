-- Migration: Add Social Login identity columns (Google, Facebook, Apple ID)
-- Date: 2026-06-24

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;
