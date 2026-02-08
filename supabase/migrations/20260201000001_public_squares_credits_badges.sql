-- ============================================================
-- Migration: Public Squares, Square Credits, Badges, Leaderboard Stats
-- ============================================================

-- 1. Add public square columns to squares table
ALTER TABLE "public"."squares"
  ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "max_players" INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN DEFAULT false;

-- 2. Update RLS on squares: allow any authenticated user to read public squares
CREATE POLICY "Authenticated users can read public squares"
  ON "public"."squares"
  FOR SELECT
  USING (is_public = true AND auth.role() = 'authenticated');

-- 3. Allow any authenticated user to join (update) public squares
CREATE POLICY "Authenticated users can join public squares"
  ON "public"."squares"
  FOR UPDATE
  USING (is_public = true AND auth.role() = 'authenticated');

-- ============================================================
-- Square Credits
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."square_credits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "earned_from_square_id" UUID REFERENCES "public"."squares"(id) ON DELETE SET NULL,
  "used_on_square_id" UUID REFERENCES "public"."squares"(id) ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "used_at" TIMESTAMPTZ
);

CREATE INDEX idx_square_credits_user ON "public"."square_credits" (user_id);
CREATE INDEX idx_square_credits_unused ON "public"."square_credits" (user_id) WHERE used_at IS NULL;

ALTER TABLE "public"."square_credits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON "public"."square_credits" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON "public"."square_credits" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON "public"."square_credits" FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Badges
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."badges" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "badge_type" TEXT NOT NULL,
  "earned_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_badges_user ON "public"."badges" (user_id);
CREATE INDEX idx_badges_type ON "public"."badges" (badge_type);

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges"
  ON "public"."badges" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges"
  ON "public"."badges" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow anyone to view badges (for leaderboard/profile viewing)
CREATE POLICY "Authenticated users can view all badges"
  ON "public"."badges" FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- Leaderboard Stats (cached/materialized for performance)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."leaderboard_stats" (
  "user_id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT,
  "public_games_played" INTEGER DEFAULT 0,
  "public_quarters_won" INTEGER DEFAULT 0,
  "public_sweeps" INTEGER DEFAULT 0,
  "credits_earned" INTEGER DEFAULT 0,
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE "public"."leaderboard_stats" ENABLE ROW LEVEL SECURITY;

-- Leaderboard is publicly readable by any authenticated user
CREATE POLICY "Authenticated users can view leaderboard"
  ON "public"."leaderboard_stats" FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can upsert own leaderboard stats"
  ON "public"."leaderboard_stats" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard stats"
  ON "public"."leaderboard_stats" FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."square_credits" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."badges" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON "public"."leaderboard_stats" TO authenticated;
