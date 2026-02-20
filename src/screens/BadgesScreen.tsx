import React, { useCallback, useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonLoader from "../components/SkeletonLoader";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../components/ToastConfig";

type BadgeDefinition = {
  type: string;
  name: string;
  description: string;
  icon: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  progressKey?: "wins" | "games" | "sweeps" | "credits";
  progressTarget?: number;
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { type: "first_public_win", name: "First Win", description: "Win a quarter in a public game", icon: "🏆", rarity: "Common", progressKey: "wins", progressTarget: 1 },
  { type: "5_wins", name: "5 Wins", description: "Win 5 quarters in public games", icon: "⭐", rarity: "Common", progressKey: "wins", progressTarget: 5 },
  { type: "10_public_wins", name: "10 Wins", description: "Win 10 quarters in public games", icon: "🎯", rarity: "Rare", progressKey: "wins", progressTarget: 10 },
  { type: "25_public_wins", name: "25 Wins", description: "Win 25 quarters in public games", icon: "💎", rarity: "Epic", progressKey: "wins", progressTarget: 25 },
  { type: "50_public_wins", name: "50 Wins", description: "Win 50 quarters in public games", icon: "👑", rarity: "Legendary", progressKey: "wins", progressTarget: 50 },
  { type: "100_public_wins", name: "Century", description: "Win 100 quarters in public games", icon: "💯", rarity: "Legendary", progressKey: "wins", progressTarget: 100 },
  { type: "sweep", name: "Four Quarter Sweep", description: "Win all 4 quarters in a single game", icon: "🧹", rarity: "Epic", progressKey: "sweeps", progressTarget: 1 },
  { type: "double_sweep", name: "Double Sweep", description: "Get 2 sweeps in public games", icon: "✨", rarity: "Legendary", progressKey: "sweeps", progressTarget: 2 },
  { type: "5_sweeps", name: "Sweep Master", description: "Get 5 sweeps in public games", icon: "🌟", rarity: "Legendary", progressKey: "sweeps", progressTarget: 5 },
  { type: "hot_streak", name: "Hot Streak", description: "Win quarters in 3 consecutive games", icon: "🔥", rarity: "Rare" },
  { type: "first_public_game", name: "Welcome!", description: "Join your first public game", icon: "👋", rarity: "Common", progressKey: "games", progressTarget: 1 },
  { type: "first_public_create", name: "Game Maker", description: "Create your first public game", icon: "🛠️", rarity: "Common" },
  { type: "3_games", name: "Getting Started", description: "Play 3 public games", icon: "🎲", rarity: "Common", progressKey: "games", progressTarget: 3 },
  { type: "social_butterfly", name: "Social Butterfly", description: "Join 10 public games", icon: "🦋", rarity: "Rare", progressKey: "games", progressTarget: 10 },
  { type: "20_games", name: "Regular", description: "Play 20 public games", icon: "📅", rarity: "Rare", progressKey: "games", progressTarget: 20 },
  { type: "50_games", name: "Veteran", description: "Play 50 public games", icon: "🏅", rarity: "Epic", progressKey: "games", progressTarget: 50 },
  { type: "creator", name: "Game Creator", description: "Create 5 public games", icon: "🎮", rarity: "Rare" },
  { type: "early_bird", name: "Early Bird", description: "Be the first to join a public game", icon: "🐦", rarity: "Common" },
  { type: "full_house", name: "Full House", description: "Fill a public game to max capacity", icon: "🏠", rarity: "Rare" },
  { type: "multi_league", name: "Multi-Sport", description: "Win in 2 different leagues", icon: "🌍", rarity: "Rare" },
  { type: "credit_earner", name: "Credit Earner", description: "Earn your first free square credit", icon: "💰", rarity: "Common", progressKey: "credits", progressTarget: 1 },
  { type: "featured_winner", name: "Featured Winner", description: "Win a quarter in the Square of the Week", icon: "🏅", rarity: "Epic" },
];

type FilterType = "all" | "earned" | "locked";

const RARITY_COLORS: Record<string, string> = {
  Common: "#4CAF50",
  Rare: "#2196F3",
  Epic: "#9C27B0",
  Legendary: "#FF9800",
};

const BadgesScreen = () => {
  const theme = useTheme();

  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({});
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  // Progress stats for locked badges
  const [stats, setStats] = useState({ wins: 0, games: 0, sweeps: 0, credits: 0 });

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const fetchBadges = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch badges
    const { data, error } = await supabase
      .from("badges")
      .select("badge_type, earned_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching badges:", error);
      return;
    }

    const types = (data || []).map((b) => b.badge_type);
    setEarnedBadges(types);

    const dates: Record<string, string> = {};
    (data || []).forEach((b) => {
      const d = new Date(b.earned_at);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays === 0) dates[b.badge_type] = "today";
      else if (diffDays === 1) dates[b.badge_type] = "yesterday";
      else if (diffDays < 7) dates[b.badge_type] = `${diffDays} days ago`;
      else dates[b.badge_type] = d.toLocaleDateString();
    });
    setEarnedDates(dates);

    // Fetch active badge from user profile
    const { data: profile } = await supabase
      .from("users")
      .select("active_badge")
      .eq("id", user.id)
      .maybeSingle();
    setActiveBadge(profile?.active_badge || null);

    // Fetch progress stats
    const { data: lbData } = await supabase
      .from("leaderboard_stats")
      .select("quarters_won")
      .eq("user_id", user.id)
      .maybeSingle();

    const { count: gameCount } = await supabase
      .from("squares")
      .select("id", { count: "exact", head: true })
      .contains("player_ids", [user.id]);

    // Count sweeps: games where user won all 4 quarters
    const { data: gamesWithWinners } = await supabase
      .from("squares")
      .select("quarter_winners, players")
      .contains("player_ids", [user.id])
      .not("quarter_winners", "is", null);

    let sweepCount = 0;
    (gamesWithWinners || []).forEach((game) => {
      if (!game.quarter_winners || !Array.isArray(game.quarter_winners)) return;
      const playerEntry = game.players?.find((p: any) => p.userId === user.id);
      if (!playerEntry) return;
      const userWins = game.quarter_winners.filter(
        (qw: any) => qw.username?.trim() === playerEntry.username?.trim() && qw.username !== "No Winner"
      );
      if (userWins.length >= 4) sweepCount++;
    });

    // Credits earned
    const { count: creditCount } = await supabase
      .from("square_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      wins: lbData?.quarters_won || 0,
      games: gameCount || 0,
      sweeps: sweepCount,
      credits: creditCount || 0,
    });
  };

  const toggleActiveBadge = async (badgeType: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const newValue = activeBadge === badgeType ? null : badgeType;
    setActiveBadge(newValue);

    const { error } = await supabase
      .from("users")
      .update({ active_badge: newValue })
      .eq("id", user.id);

    if (error) {
      setActiveBadge(activeBadge); // revert
      Toast.show({ type: "error", text1: "Failed to update badge" });
    } else {
      Toast.show({
        type: "success",
        text1: newValue ? "Badge activated!" : "Badge removed",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBadges().finally(() => setLoading(false));
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBadges();
    setRefreshing(false);
  };

  const earnedCount = earnedBadges.length;
  const totalCount = BADGE_DEFINITIONS.length;
  const lockedCount = totalCount - earnedCount;

  // Recently earned (badges earned in last 7 days)
  const recentlyEarned = BADGE_DEFINITIONS.filter((b) => {
    if (!earnedBadges.includes(b.type)) return false;
    const dateStr = earnedDates[b.type];
    return dateStr === "today" || dateStr === "yesterday" || dateStr?.includes("days ago");
  });

  const RARITY_ORDER: Record<string, number> = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

  const sortBadges = (badges: BadgeDefinition[]) =>
    [...badges].sort((a, b) => {
      const aEarned = earnedBadges.includes(a.type) ? 0 : 1;
      const bEarned = earnedBadges.includes(b.type) ? 0 : 1;
      if (aEarned !== bEarned) return aEarned - bEarned;
      return (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0);
    });

  const filteredBadges = sortBadges(
    filter === "earned"
      ? BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.type))
      : filter === "locked"
        ? BADGE_DEFINITIONS.filter((b) => !earnedBadges.includes(b.type))
        : BADGE_DEFINITIONS
  );

  const getProgress = (badge: BadgeDefinition): { current: number; target: number } | null => {
    if (!badge.progressKey || !badge.progressTarget) return null;
    return { current: Math.min(stats[badge.progressKey], badge.progressTarget), target: badge.progressTarget };
  };

  const renderBadgeCard = (badge: BadgeDefinition, isEarned: boolean) => {
    const isActive = activeBadge === badge.type;
    const progress = !isEarned ? getProgress(badge) : null;

    return (
      <TouchableOpacity
        key={badge.type}
        activeOpacity={isEarned ? 0.7 : 1}
        onPress={() => isEarned && toggleActiveBadge(badge.type)}
        style={[
          styles.badgeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isActive
              ? theme.colors.primary
              : isEarned
                ? RARITY_COLORS[badge.rarity]
                : theme.dark ? "#333" : "#ddd",
            borderWidth: isActive ? 2.5 : 1.5,
          },
        ]}
      >
        {/* Active indicator */}
        {isActive && (
          <View style={[styles.activeChip, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="check" size={10} color="#fff" />
            <Text style={styles.activeChipText}>ACTIVE</Text>
          </View>
        )}

        {/* Badge icon with lock overlay for locked */}
        <View style={{ position: "relative", marginBottom: 8 }}>
          <Text style={[styles.badgeIcon, !isEarned && { opacity: 0.25 }]}>
            {badge.icon}
          </Text>
          {!isEarned && (
            <View style={styles.lockOverlay}>
              <MaterialIcons name="lock" size={20} color={theme.dark ? "#aaa" : "#888"} />
            </View>
          )}
        </View>

        <Text
          style={[styles.badgeName, { color: theme.colors.onBackground }]}
          numberOfLines={1}
        >
          {badge.name}
        </Text>
        <Text
          style={[styles.badgeDesc, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={2}
        >
          {badge.description}
        </Text>

        {/* Progress bar for locked badges */}
        {!isEarned && progress && (
          <View style={{ width: "100%", marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontFamily: "Rubik_500Medium", color: theme.colors.onSurfaceVariant, textAlign: "center", marginBottom: 3 }}>
              {progress.current}/{progress.target}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: theme.dark ? "#333" : "#e0e0e0" }]}>
              <View
                style={{
                  height: "100%",
                  width: `${Math.min((progress.current / progress.target) * 100, 100)}%`,
                  backgroundColor: RARITY_COLORS[badge.rarity],
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        )}

        <View
          style={[
            styles.rarityBadge,
            { backgroundColor: RARITY_COLORS[badge.rarity] + "20" },
          ]}
        >
          <Text
            style={[styles.rarityText, { color: RARITY_COLORS[badge.rarity] }]}
          >
            {badge.rarity}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Progress Header */}
        <LinearGradient
          colors={[theme.colors.primary, "#7c7ee6"]}
          style={styles.progressHeader}
        >
          <Text style={styles.progressLabel}>Badges Collected</Text>
          <Text style={styles.progressValue}>
            {earnedCount} / {totalCount}
          </Text>
          <Text style={styles.progressSubtext}>
            {earnedCount < totalCount
              ? "Tap an earned badge to set it as your avatar"
              : "You've collected them all!"}
          </Text>
        </LinearGradient>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(
            [
              { key: "all", label: "All" },
              { key: "earned", label: `Earned (${earnedCount})` },
              { key: "locked", label: `Locked (${lockedCount})` },
            ] as const
          ).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                filter === f.key && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      filter === f.key
                        ? "#fff"
                        : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <SkeletonLoader variant="badgeGrid" />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* All Badges */}
            <View style={styles.badgeGrid}>
              {filteredBadges.map((badge) => {
                const isEarned = earnedBadges.includes(badge.type);
                return renderBadgeCard(badge, isEarned);
              })}
            </View>
          </ScrollView>
        )}
      </View>
      <Toast config={getToastConfig(theme.dark)} />
    </LinearGradient>
  );
};

export default BadgesScreen;

const styles = StyleSheet.create({
  progressHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  progressValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    fontFamily: "SoraBold",
    marginVertical: 4,
  },
  progressSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 24,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
  },
  newCount: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  badgeCard: {
    width: "47%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 4,
    position: "relative",
  },
  badgeIcon: {
    fontSize: 36,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  activeChip: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  activeChipText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
  },
  badgeDate: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 6,
  },
});
