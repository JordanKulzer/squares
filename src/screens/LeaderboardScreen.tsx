import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme, Chip } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonLoader from "../components/SkeletonLoader";
import { supabase } from "../lib/supabase";

type TabType = "weekly" | "all-time";

type LeaderboardEntry = {
  user_id: string;
  username: string;
  public_quarters_won: number;
  public_games_played: number;
  public_sweeps: number;
};

const LeaderboardScreen = () => {
  const theme = useTheme();

  const [tab, setTab] = useState<TabType>("weekly");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<LeaderboardEntry | null>(null);
  const [weekEndTime, setWeekEndTime] = useState("");

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  // Calculate time until end of week (Sunday midnight)
  useEffect(() => {
    const updateWeekEnd = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);

      const diff = endOfWeek.getTime() - now.getTime();
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      setWeekEndTime(`${days}d ${hours}h ${mins}m`);
    };

    updateWeekEnd();
    const interval = setInterval(updateWeekEnd, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data, error } = await supabase
      .from("leaderboard_stats")
      .select("user_id, username, public_quarters_won, public_games_played, public_sweeps")
      .order("public_quarters_won", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return;
    }

    setLeaderboard(data || []);

    // Find user's rank
    const idx = (data || []).findIndex((e) => e.user_id === user.id);
    if (idx >= 0) {
      setUserRank(idx + 1);
      setUserStats(data![idx]);
    } else {
      // User not in top 50, fetch their stats
      const { data: myStats } = await supabase
        .from("leaderboard_stats")
        .select("user_id, username, public_quarters_won, public_games_played, public_sweeps")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myStats) {
        setUserStats(myStats);
        // Count how many are above them
        const { count } = await supabase
          .from("leaderboard_stats")
          .select("user_id", { count: "exact", head: true })
          .gt("public_quarters_won", myStats.public_quarters_won);
        setUserRank((count || 0) + 1);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLeaderboard().finally(() => setLoading(false));
    }, [tab]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(/[_\s]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return undefined;
  };

  const getAvatarColor = (rank: number) => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#C0C0C0";
    if (rank === 3) return "#CD7F32";
    return theme.dark ? "#555" : "#ccc";
  };

  // Top 3 podium
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              tab === "weekly" && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setTab("weekly")}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === "weekly" ? "#fff" : theme.colors.onSurfaceVariant },
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              tab === "all-time" && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setTab("all-time")}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === "all-time" ? "#fff" : theme.colors.onSurfaceVariant },
              ]}
            >
              All-Time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Week Timer */}
        {tab === "weekly" && (
          <View
            style={[
              styles.timerCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.dark ? "#333" : "#ddd" },
            ]}
          >
            <Text style={[styles.timerLabel, { color: theme.colors.onSurfaceVariant }]}>
              WEEK ENDS IN
            </Text>
            <Text style={[styles.timerValue, { color: theme.colors.onBackground }]}>
              {weekEndTime}
            </Text>
          </View>
        )}

        {/* User Stats Card */}
        {userStats && (
          <View
            style={[
              styles.yourStatsCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text style={[styles.yourStatsLabel, { color: theme.colors.primary }]}>
              Your Week
            </Text>
            <View style={styles.yourStatsRow}>
              <View style={styles.yourStat}>
                <Text style={[styles.yourStatValue, { color: theme.colors.onBackground }]}>
                  {userStats.public_quarters_won}
                </Text>
                <Text style={[styles.yourStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                  WINS
                </Text>
              </View>
              <View style={styles.yourStat}>
                <Text style={[styles.yourStatValue, { color: theme.colors.onBackground }]}>
                  {userStats.public_games_played}
                </Text>
                <Text style={[styles.yourStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                  SQUARES
                </Text>
              </View>
              <View style={styles.yourStat}>
                <Text style={[styles.yourStatValue, { color: theme.colors.onBackground }]}>
                  #{userRank || "-"}
                </Text>
                <Text style={[styles.yourStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                  RANK
                </Text>
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <SkeletonLoader variant="homeScreen" />
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="leaderboard"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No leaderboard data yet.
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Play public games to appear here!
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <View style={styles.podium}>
                {[1, 0, 2].map((i) => {
                  const entry = top3[i];
                  const rank = i + 1;
                  const isFirst = rank === 1;
                  return (
                    <View
                      key={entry.user_id}
                      style={[styles.podiumItem, isFirst && styles.podiumFirst]}
                    >
                      <View
                        style={[
                          styles.podiumAvatar,
                          {
                            backgroundColor: getAvatarColor(rank),
                            width: isFirst ? 64 : 48,
                            height: isFirst ? 64 : 48,
                            borderRadius: isFirst ? 32 : 24,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.podiumAvatarText,
                            { fontSize: isFirst ? 22 : 16 },
                          ]}
                        >
                          {getInitials(entry.username)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.podiumName,
                          { color: theme.colors.onBackground },
                        ]}
                        numberOfLines={1}
                      >
                        {entry.username}
                      </Text>
                      <Text style={[styles.podiumWins, { color: theme.colors.primary }]}>
                        {entry.public_quarters_won}
                      </Text>
                      <Text
                        style={[
                          styles.podiumWinsLabel,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        wins
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Rest of leaderboard */}
            <Text
              style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
            >
              TOP PLAYERS THIS WEEK
            </Text>
            {rest.map((entry, index) => {
              const rank = index + 4;
              const isMe = entry.user_id === userId;
              return (
                <View
                  key={entry.user_id}
                  style={[
                    styles.leaderboardRow,
                    {
                      backgroundColor: isMe
                        ? theme.colors.primaryContainer
                        : theme.colors.surface,
                      borderColor: isMe
                        ? theme.colors.primary
                        : theme.dark
                          ? "#333"
                          : "#eee",
                    },
                  ]}
                >
                  <Text
                    style={[styles.rankText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {rank}
                  </Text>
                  <View
                    style={[
                      styles.rowAvatar,
                      { backgroundColor: theme.dark ? "#555" : "#ccc" },
                    ]}
                  >
                    <Text style={styles.rowAvatarText}>
                      {getInitials(entry.username)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={[styles.rowName, { color: theme.colors.onBackground }]}
                        numberOfLines={1}
                      >
                        {entry.username}
                      </Text>
                      {isMe && (
                        <View
                          style={[
                            styles.youBadge,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        >
                          <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.rowWins, { color: theme.colors.onBackground }]}>
                    {entry.public_quarters_won}
                  </Text>
                  <Text
                    style={[
                      styles.rowWinsLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    wins
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 24,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
  },
  timerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: "Rubik_600SemiBold",
  },
  timerValue: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "SoraBold",
    marginTop: 4,
  },
  yourStatsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  yourStatsLabel: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 12,
  },
  yourStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  yourStat: {
    alignItems: "center",
  },
  yourStatValue: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  yourStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: "Rubik_500Medium",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    fontFamily: "Rubik_500Medium",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  podiumItem: {
    alignItems: "center",
    flex: 1,
  },
  podiumFirst: {
    marginBottom: 16,
  },
  podiumAvatar: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  podiumAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  podiumName: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  podiumWins: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SoraBold",
    marginTop: 4,
  },
  podiumWinsLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 10,
    marginLeft: 4,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
    width: 24,
    textAlign: "center",
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rowAvatarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
  },
  rowWins: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  rowWinsLabel: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginLeft: -4,
  },
});
