import React, { useCallback, useEffect, useRef, useState } from "react";
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
import UserAvatar from "../components/UserAvatar";
import { supabase } from "../lib/supabase";

type TabType = "weekly" | "all-time";

type LeaderboardEntry = {
  user_id: string;
  username: string;
  quarters_won: number;
  active_badge: string | null;
};

const LeaderboardScreen = () => {
  const theme = useTheme();

  const [tab, setTab] = useState<TabType>("weekly");

  // Cached data — never cleared between fetches
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStats, setUserStats] = useState<LeaderboardEntry | null>(null);
  const [weekEndTime, setWeekEndTime] = useState("");

  // Loading state: only true on the very first fetch (no cached data yet)
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Request guard: only the most recent fetch may apply its result
  const fetchIdRef = useRef(0);
  // Prevents re-fetching on every focus once data is loaded
  const hasFetchedOnce = useRef(false);

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

  const fetchLeaderboard = async (isBackground: boolean) => {
    const myFetchId = ++fetchIdRef.current;
    console.log(`[Leaderboard] fetch start id=${myFetchId} background=${isBackground}`);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log(`[Leaderboard] fetch ${myFetchId} — no user, skipping`);
        return;
      }

      const { data: rawData, error } = await supabase
        .from("leaderboard_stats")
        .select("user_id, quarters_won, users!inner(username, active_badge)")
        .order("quarters_won", { ascending: false })
        .limit(50);

      if (error) {
        console.error(`[Leaderboard] fetch ${myFetchId} error:`, error);
        // Keep existing cached data — do not clear on error
        return;
      }

      if (myFetchId !== fetchIdRef.current) {
        console.log(`[Leaderboard] fetch ${myFetchId} ignored — stale (current=${fetchIdRef.current})`);
        return;
      }

      const data: LeaderboardEntry[] = (rawData || []).map((row: any) => ({
        user_id: row.user_id,
        quarters_won: row.quarters_won,
        username: row.users?.username || "Unknown",
        active_badge: row.users?.active_badge || null,
      }));

      console.log(`[Leaderboard] fetch ${myFetchId} applied — ${data.length} entries`);

      setLeaderboard(data);
      setUserId(user.id);

      // Find user's rank
      const idx = data.findIndex((e) => e.user_id === user.id);
      if (idx >= 0) {
        setUserRank(idx + 1);
        setUserStats(data[idx]);
      } else {
        // User not in top 50 — fetch their individual stats
        const { data: myRaw } = await supabase
          .from("leaderboard_stats")
          .select("user_id, quarters_won, users!inner(username, active_badge)")
          .eq("user_id", user.id)
          .maybeSingle();

        // Guard again after the second async call
        if (myFetchId !== fetchIdRef.current) {
          console.log(`[Leaderboard] fetch ${myFetchId} ignored after user stats (stale)`);
          return;
        }

        if (myRaw) {
          const myStats: LeaderboardEntry = {
            user_id: (myRaw as any).user_id,
            quarters_won: (myRaw as any).quarters_won,
            username: (myRaw as any).users?.username || "Unknown",
            active_badge: (myRaw as any).users?.active_badge || null,
          };
          setUserStats(myStats);
          const { count } = await supabase
            .from("leaderboard_stats")
            .select("user_id", { count: "exact", head: true })
            .gt("quarters_won", myStats.quarters_won);

          if (myFetchId !== fetchIdRef.current) return;
          setUserRank((count || 0) + 1);
        } else {
          setUserStats(null);
          setUserRank(null);
        }
      }

      setDataLoaded(true);
    } catch (err) {
      console.error(`[Leaderboard] fetch ${myFetchId} threw:`, err);
      // Do not clear cached data on unexpected error
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!hasFetchedOnce.current) {
        // First entry — fetch and show skeleton until data arrives
        hasFetchedOnce.current = true;
        fetchLeaderboard(false);
      } else {
        // Subsequent focus — refresh silently in background, keep existing data visible
        console.log("[Leaderboard] re-focused — background refresh");
        fetchLeaderboard(true);
      }
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard(true);
    setRefreshing(false);
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
        <View style={[styles.segmentedControl, { backgroundColor: theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }]}>
          {(["weekly", "all-time"] as const).map((key) => {
            const isActive = tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.segment,
                  { backgroundColor: isActive ? theme.colors.primary : "transparent" },
                ]}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive ? "#fff" : theme.colors.onSurfaceVariant,
                      opacity: isActive ? 1 : 0.65,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {key === "weekly" ? "Weekly" : "All-Time"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!dataLoaded ? (
          <View style={{ flex: 1 }}>
            <SkeletonLoader variant={tab === "weekly" ? "leaderboardWeeklyScreen" : "leaderboardScreen"} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 10, paddingTop: 4 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Week Timer — only for weekly tab */}
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
            {tab === "weekly" && (
              <View
                style={[
                  styles.yourStatsCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: userStats ? theme.colors.primary : (theme.dark ? "#333" : "#ddd"),
                    borderWidth: userStats ? 1.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.yourStatsLabel, { color: userStats ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>
                  Your Week
                </Text>
                {userStats ? (
                  <View style={styles.yourStatsRow}>
                    <View style={styles.yourStat}>
                      <Text style={[styles.yourStatValue, { color: theme.colors.onBackground }]}>
                        {userStats.quarters_won}
                      </Text>
                      <Text style={[styles.yourStatLabel, { color: theme.colors.onSurfaceVariant }]}>
                        WINS
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
                ) : (
                  <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
                    Play public games this week to see your stats here.
                  </Text>
                )}
              </View>
            )}

            {/* Leaderboard list */}
            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="leaderboard"
                  size={40}
                  color={theme.colors.onSurfaceVariant}
                  style={{ opacity: 0.4 }}
                />
                <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
                  No data yet
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
                  Win quarters in public games to appear on the leaderboard.
                </Text>
              </View>
            ) : (
              <>
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
                          <UserAvatar
                            username={entry.username}
                            activeBadge={entry.active_badge}
                            size={isFirst ? 64 : 56}
                            backgroundColor={getAvatarColor(rank)}
                          />
                          <Text
                            style={[styles.podiumName, { color: theme.colors.onBackground }]}
                            numberOfLines={1}
                          >
                            {entry.username}
                          </Text>
                          <Text style={[styles.podiumWins, { color: theme.colors.primary }]}>
                            {entry.quarters_won}
                          </Text>
                          <Text style={[styles.podiumWinsLabel, { color: theme.colors.onSurfaceVariant }]}>
                            wins
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Rest of leaderboard */}
                {rest.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                    {tab === "weekly" ? "TOP PLAYERS THIS WEEK" : "ALL-TIME TOP PLAYERS"}
                  </Text>
                )}
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
                      <Text style={[styles.rankText, { color: theme.colors.onSurfaceVariant }]}>
                        {rank}
                      </Text>
                      <UserAvatar
                        username={entry.username}
                        activeBadge={entry.active_badge}
                        size={36}
                        backgroundColor={theme.dark ? "#555" : "#ccc"}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text
                            style={[styles.rowName, { color: theme.colors.onBackground }]}
                            numberOfLines={1}
                          >
                            {entry.username}
                          </Text>
                          {isMe && (
                            <View style={[styles.youBadge, { backgroundColor: theme.colors.primary }]}>
                              <Text style={styles.youBadgeText}>YOU</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.rowWins, { color: theme.colors.onBackground }]}>
                        {entry.quarters_won}
                      </Text>
                      <Text style={[styles.rowWinsLabel, { color: theme.colors.onSurfaceVariant }]}>
                        wins
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    minHeight: 38,
  },
  segmentText: {
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
    gap: 20,
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
    fontSize: 14,
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
