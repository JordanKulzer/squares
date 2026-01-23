-- Add friends table for social features with MySpace-style Top 4 rankings
-- Friends can see their ranking position on each other's lists

CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  ranking INTEGER CHECK (ranking IS NULL OR (ranking >= 1 AND ranking <= 4)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_ranking ON friends(ranking) WHERE ranking IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships (sent or received)
CREATE POLICY "Users can view own friendships" ON friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sent friendships (rankings) or accept received ones
CREATE POLICY "Users can update own friendships" ON friends
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their own friendships (unfriend or cancel request)
CREATE POLICY "Users can delete own friendships" ON friends
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Add comment for documentation
COMMENT ON TABLE friends IS 'Stores friend relationships with optional Top 4 rankings (MySpace style)';
COMMENT ON COLUMN friends.ranking IS 'Top 4 friend ranking (1-4), null if not ranked';
COMMENT ON COLUMN friends.status IS 'pending = request sent, accepted = mutual friends, blocked = user blocked';
