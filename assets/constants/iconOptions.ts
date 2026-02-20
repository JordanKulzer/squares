export interface IconOption {
  name: string;
  label: string;
  isPremium: boolean;
}

export const iconOptions: IconOption[] = [
  // All icons are premium - users need to upgrade to use custom icons
  // Sports icons
  { name: "sports-football", label: "Football", isPremium: true },
  { name: "sports-basketball", label: "Basketball", isPremium: true },
  { name: "sports-soccer", label: "Soccer", isPremium: true },
  { name: "sports-baseball", label: "Baseball", isPremium: true },
  { name: "sports-tennis", label: "Tennis", isPremium: true },
  { name: "sports-hockey", label: "Hockey", isPremium: true },
  { name: "sports-golf", label: "Golf", isPremium: true },

  // Common symbols
  { name: "person", label: "Person", isPremium: true },
  { name: "star", label: "Star", isPremium: true },
  { name: "favorite", label: "Heart", isPremium: true },

  // Achievement symbols
  { name: "emoji-events", label: "Trophy", isPremium: true },
  { name: "bolt", label: "Bolt", isPremium: true },
  { name: "local-fire-department", label: "Fire", isPremium: true },
  { name: "diamond", label: "Diamond", isPremium: true },
  { name: "rocket-launch", label: "Rocket", isPremium: true },
  { name: "auto-awesome", label: "Sparkle", isPremium: true },

  // Animals
  { name: "pets", label: "Paw", isPremium: true },
  { name: "cruelty-free", label: "Bunny", isPremium: true },

  // Emojis/faces
  { name: "sentiment-very-satisfied", label: "Happy", isPremium: true },
  { name: "mood", label: "Smile", isPremium: true },
  { name: "psychology", label: "Brain", isPremium: true },

  // Misc fun icons
  { name: "casino", label: "Dice", isPremium: true },
  { name: "military-tech", label: "Medal", isPremium: true },
  { name: "workspace-premium", label: "Crown", isPremium: true },
  { name: "whatshot", label: "Hot", isPremium: true },
  { name: "thumb-up", label: "Thumbs Up", isPremium: true },
  { name: "celebration", label: "Party", isPremium: true },
  { name: "nightlife", label: "Nightlife", isPremium: true },

  // 2 more icons for even rows (30 total)
  { name: "flag", label: "Flag", isPremium: true },
  { name: "shield", label: "Shield", isPremium: true },
];

export const getFreeIcons = (): IconOption[] =>
  iconOptions.filter((icon) => !icon.isPremium);

export const getPremiumIcons = (): IconOption[] =>
  iconOptions.filter((icon) => icon.isPremium);

export const getAvailableIcons = (isPremium: boolean): IconOption[] =>
  isPremium ? iconOptions : getFreeIcons();

// Badge type → emoji mapping (must match BadgesScreen definitions)
export const BADGE_EMOJI_MAP: Record<string, { emoji: string; label: string }> = {
  first_public_win: { emoji: "🏆", label: "First Win" },
  "5_wins": { emoji: "⭐", label: "5 Wins" },
  "10_public_wins": { emoji: "🎯", label: "10 Wins" },
  "25_public_wins": { emoji: "💎", label: "25 Wins" },
  "50_public_wins": { emoji: "👑", label: "50 Wins" },
  sweep: { emoji: "🧹", label: "Sweep" },
  hot_streak: { emoji: "🔥", label: "Hot Streak" },
  first_public_game: { emoji: "👋", label: "Welcome" },
  social_butterfly: { emoji: "🦋", label: "Social" },
  creator: { emoji: "🎮", label: "Creator" },
  early_bird: { emoji: "🐦", label: "Early Bird" },
  full_house: { emoji: "🏠", label: "Full House" },
  "100_public_wins": { emoji: "💯", label: "Century" },
  double_sweep: { emoji: "✨", label: "Double Sweep" },
  "5_sweeps": { emoji: "🌟", label: "Sweep Master" },
  "3_games": { emoji: "🎲", label: "Getting Started" },
  "20_games": { emoji: "📅", label: "Regular" },
  "50_games": { emoji: "🏅", label: "Veteran" },
  multi_league: { emoji: "🌍", label: "Multi-Sport" },
  credit_earner: { emoji: "💰", label: "Credit Earner" },
  featured_winner: { emoji: "🏅", label: "Featured" },
  first_public_create: { emoji: "🛠️", label: "Game Maker" },
};

// Helper to check if a displayValue is a badge emoji
export const isBadgeEmoji = (displayValue: string): boolean =>
  displayValue.startsWith("emoji:");

// Extract the emoji character from a badge displayValue
export const getBadgeEmoji = (displayValue: string): string =>
  displayValue.replace("emoji:", "");
