-- Migration: Create game_invites table for database-backed invite system
-- Run this in your Supabase SQL Editor

-- Create the game_invites table
CREATE TABLE IF NOT EXISTS game_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grid_id UUID NOT NULL REFERENCES squares(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(grid_id, recipient_id) -- One invite per user per game
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_game_invites_recipient ON game_invites(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invites_grid ON game_invites(grid_id);
CREATE INDEX IF NOT EXISTS idx_game_invites_sender ON game_invites(sender_id);

-- Enable Row Level Security
ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites they sent or received
CREATE POLICY "Users can view their invites" ON game_invites
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can create invites (as sender)
CREATE POLICY "Users can send invites" ON game_invites
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Policy: Recipients can update their own invites (accept/reject)
CREATE POLICY "Recipients can respond to invites" ON game_invites
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Policy: Senders can delete their pending invites (cancel)
CREATE POLICY "Senders can cancel pending invites" ON game_invites
  FOR DELETE USING (auth.uid() = sender_id AND status = 'pending');
