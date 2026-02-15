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
