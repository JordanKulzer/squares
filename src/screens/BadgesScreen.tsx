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

type BadgeDefinition = {
  type: string;
  name: string;
  description: string;
  icon: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "first_public_win",
    name: "First Public Win",
    description: "Win a quarter in a public game",
    icon: "🏆",
    rarity: "Common",
  },
  {
    type: "5_wins",
    name: "5 Wins",
    description: "Win 5 quarters in public games",
    icon: "⭐",
    rarity: "Common",
  },
  {
    type: "10_public_wins",
    name: "10 Wins",
    description: "Win 10 quarters in public games",
    icon: "🎯",
    rarity: "Rare",
  },
  {
    type: "25_public_wins",
    name: "25 Wins",
    description: "Win 25 quarters in public games",
    icon: "💎",
    rarity: "Epic",
  },
  {
    type: "50_public_wins",
    name: "50 Wins",
    description: "Win 50 quarters in public games",
    icon: "👑",
    rarity: "Legendary",
  },
  {
    type: "sweep",
    name: "Four Quarter Sweep",
    description: "Win all 4 quarters in a single game",
    icon: "🧹",
    rarity: "Epic",
  },
  {
    type: "hot_streak",
    name: "Hot Streak",
    description: "Win quarters in 3 consecutive games",
    icon: "🔥",
    rarity: "Rare",
  },
  {
    type: "first_public_game",
    name: "Welcome!",
    description: "Join your first public game",
    icon: "👋",
    rarity: "Common",
  },
  {
    type: "social_butterfly",
    name: "Social Butterfly",
    description: "Join 10 public games",
    icon: "🦋",
    rarity: "Rare",
  },
  {
    type: "creator",
    name: "Game Creator",
    description: "Create 5 public games",
    icon: "🎮",
    rarity: "Rare",
  },
  {
    type: "early_bird",
    name: "Early Bird",
    description: "Be the first to join a public game",
    icon: "🐦",
    rarity: "Common",
  },
  {
    type: "full_house",
    name: "Full House",
    description: "Fill a public game to max capacity",
    icon: "🏠",
    rarity: "Rare",
  },
  {
    type: "100_public_wins",
    name: "Century",
    description: "Win 100 quarters in public games",
    icon: "💯",
    rarity: "Legendary",
  },
  {
    type: "double_sweep",
    name: "Double Sweep",
    description: "Get 2 sweeps in public games",
    icon: "✨",
    rarity: "Legendary",
  },
  {
    type: "5_sweeps",
    name: "Sweep Master",
    description: "Get 5 sweeps in public games",
    icon: "🌟",
    rarity: "Legendary",
  },
  {
    type: "3_games",
    name: "Getting Started",
    description: "Play 3 public games",
    icon: "🎲",
    rarity: "Common",
  },
  {
    type: "20_games",
    name: "Regular",
    description: "Play 20 public games",
    icon: "📅",
    rarity: "Rare",
  },
  {
    type: "50_games",
    name: "Veteran",
    description: "Play 50 public games",
    icon: "🏅",
    rarity: "Epic",
  },
  {
    type: "multi_league",
    name: "Multi-Sport",
    description: "Win in 2 different leagues",
    icon: "🌍",
    rarity: "Rare",
  },
  {
    type: "credit_earner",
    name: "Credit Earner",
    description: "Earn your first free square credit",
    icon: "💰",
    rarity: "Common",
  },
  {
    type: "featured_winner",
    name: "Featured Winner",
    description: "Win a quarter in the Square of the Week",
    icon: "🏅",
    rarity: "Epic",
  },
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const fetchBadges = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

  const filteredBadges =
    filter === "earned"
      ? BADGE_DEFINITIONS.filter((b) => earnedBadges.includes(b.type))
      : filter === "locked"
        ? BADGE_DEFINITIONS.filter((b) => !earnedBadges.includes(b.type))
        : BADGE_DEFINITIONS;

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
              ? "Keep playing to unlock more!"
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
          <SkeletonLoader variant="homeScreen" />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Recently Earned */}
            {filter === "all" && recentlyEarned.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Recently Earned
                  </Text>
                  <Text style={[styles.newCount, { color: theme.colors.primary }]}>
                    {recentlyEarned.length} new
                  </Text>
                </View>
                <View style={styles.badgeGrid}>
                  {recentlyEarned.map((badge) => (
                    <View
                      key={badge.type}
                      style={[
                        styles.badgeCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text style={styles.badgeIcon}>{badge.icon}</Text>
                      <Text
                        style={[
                          styles.badgeName,
                          { color: theme.colors.onBackground },
                        ]}
                        numberOfLines={1}
                      >
                        {badge.name}
                      </Text>
                      <Text
                        style={[
                          styles.badgeDesc,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={2}
                      >
                        {badge.description}
                      </Text>
                      <View
                        style={[
                          styles.rarityBadge,
                          { backgroundColor: RARITY_COLORS[badge.rarity] + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rarityText,
                            { color: RARITY_COLORS[badge.rarity] },
                          ]}
                        >
                          {badge.rarity}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.badgeDate,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {earnedDates[badge.type]}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* All Badges */}
            <View style={styles.badgeGrid}>
              {filteredBadges.map((badge) => {
                const isEarned = earnedBadges.includes(badge.type);
                return (
                  <View
                    key={badge.type}
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isEarned
                          ? theme.colors.primary
                          : theme.dark
                            ? "#333"
                            : "#ddd",
                        opacity: isEarned ? 1 : 0.6,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.badgeIcon, !isEarned && { opacity: 0.4 }]}
                    >
                      {badge.icon}
                    </Text>
                    <Text
                      style={[
                        styles.badgeName,
                        { color: theme.colors.onBackground },
                      ]}
                      numberOfLines={1}
                    >
                      {badge.name}
                    </Text>
                    <Text
                      style={[
                        styles.badgeDesc,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={2}
                    >
                      {isEarned ? badge.description : "Complete challenges to unlock"}
                    </Text>
                    <View
                      style={[
                        styles.rarityBadge,
                        {
                          backgroundColor:
                            RARITY_COLORS[badge.rarity] + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rarityText,
                          { color: RARITY_COLORS[badge.rarity] },
                        ]}
                      >
                        {badge.rarity}
                      </Text>
                    </View>
                    {isEarned && earnedDates[badge.type] && (
                      <Text
                        style={[
                          styles.badgeDate,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {earnedDates[badge.type]}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
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
    borderWidth: 1.5,
    alignItems: "center",
    marginBottom: 4,
  },
  badgeIcon: {
    fontSize: 36,
    marginBottom: 8,
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
