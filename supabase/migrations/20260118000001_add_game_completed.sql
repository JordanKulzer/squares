-- Add game_completed column to persist game completion status
-- This allows the app to show correct status even when API no longer returns data for old games

ALTER TABLE "public"."squares" ADD COLUMN IF NOT EXISTS "game_completed" boolean DEFAULT false;
