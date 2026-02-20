import React, { useCallback, useRef, useState } from "react";
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
import { useTheme, Chip, Menu } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonLoader from "../components/SkeletonLoader";
import UserAvatar from "../components/UserAvatar";
import { RootStackParamList, ACTIVE_LEAGUES } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";

const formatGameDate = (deadlineStr: string) => {
  const d = new Date(deadlineStr);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const hour = d.getHours();
  const min = d.getMinutes();
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = min < 10 ? `0${min}` : min;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} at ${h}:${m} ${ampm}`;
};

type SortOption = "kickoff" | "most_filled" | "least_filled";

const SORT_LABELS: Record<SortOption, string> = {
  kickoff: "Kickoff Time",
  most_filled: "Most Filled",
  least_filled: "Least Filled",
};

// Returns the number of filled slots (blocks for block_mode, squares otherwise)
const getFilledCount = (item: any): number => {
  const selectionCount = item.selections?.length || 0;
  return item.block_mode ? Math.floor(selectionCount / 4) : selectionCount;
};

const sortGames = (games: any[], sort: SortOption) => {
  const sorted = [...games];
  switch (sort) {
    case "kickoff":
      return sorted.sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      );
    case "most_filled":
      return sorted.sort((a, b) => {
        const pctA = getFilledCount(a) / (a.max_selection || 100);
        const pctB = getFilledCount(b) / (b.max_selection || 100);
        return pctB - pctA;
      });
    case "least_filled":
      return sorted.sort((a, b) => {
        const pctA = getFilledCount(a) / (a.max_selection || 100);
        const pctB = getFilledCount(b) / (b.max_selection || 100);
        return pctA - pctB;
      });
  }
};

const BrowsePublicSquaresScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();

  const [publicGames, setPublicGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("kickoff");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  const translateYAnims = useRef<Animated.Value[]>([]).current;
  const opacityAnims = useRef<Animated.Value[]>([]).current;

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const fetchPublicSquares = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    let query = supabase
      .from("squares")
      .select(
        "id, title, deadline, price_per_square, league, players, player_ids, game_completed, created_by, max_selection, team1_full_name, team2_full_name, block_mode, selections",
      )
      .eq("is_public", true)
      .eq("game_completed", false)
      .gte("deadline", new Date().toISOString())
      .order("deadline", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching public squares:", error);
      setPublicGames([]);
      return;
    }

    const squares = data || [];

    // Fetch creator usernames and win counts
    const creatorIds = [...new Set(squares.map((s: any) => s.created_by).filter(Boolean))];
    let usernameMap: Record<string, string> = {};
    let winsMap: Record<string, number> = {};

    let profileColorMap: Record<string, string | null> = {};
    let profileIconMap: Record<string, string | null> = {};

    if (creatorIds.length > 0) {
      const [{ data: usersData }, { data: statsData }] = await Promise.all([
        supabase.from("users").select("id, username, profile_color, profile_icon").in("id", creatorIds),
        supabase.from("leaderboard_stats").select("user_id, quarters_won").in("user_id", creatorIds),
      ]);
      usernameMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.username]));
      profileColorMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.profile_color || null]));
      profileIconMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.profile_icon || null]));
      winsMap = Object.fromEntries((statsData || []).map((s: any) => [s.user_id, s.quarters_won || 0]));
    }

    const games = squares.map((s: any) => ({
      ...s,
      creator_username: usernameMap[s.created_by] || "Unknown",
      creator_wins: winsMap[s.created_by] || 0,
      creator_profile_color: profileColorMap[s.created_by] || null,
      creator_profile_icon: profileIconMap[s.created_by] || null,
    }));

    setPublicGames(games);

    translateYAnims.length = 0;
    opacityAnims.length = 0;

    games.forEach((_, index) => {
      translateYAnims[index] = new Animated.Value(30);
      opacityAnims[index] = new Animated.Value(0);
    });

    Animated.stagger(
      80,
      games.map((_, index) =>
        Animated.parallel([
          Animated.timing(translateYAnims[index], {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnims[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ),
    ).start();
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPublicSquares().finally(() => setLoading(false));
    }, [selectedFilter]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPublicSquares();
    setRefreshing(false);
  };

  const getPlayerCount = (item: any) => getFilledCount(item);
  const getMaxPlayers = (item: any) => item.max_selection || 100;
  const getFillPercent = (item: any) =>
    Math.round((getPlayerCount(item) / getMaxPlayers(item)) * 100);
  const featuredGame =
    publicGames.find((g) => g.is_featured || g._isFeatured) || null;

  const nonFeatured = publicGames.filter((g) => g.id !== featuredGame?.id);

  // Per-league game lists for "All Squares" view (includes Custom)
  const leagueSections = [...ACTIVE_LEAGUES, "Custom"].map((league) => ({
    league,
    games: sortGames(
      nonFeatured.filter((g) => g.league === league),
      sortBy,
    ).slice(0, 2),
  })).filter((s) => s.games.length > 0);

  // Build display lists based on filter
  const getDisplayData = () => {
    if (selectedFilter === "all") {
      return {
        showFeatured: true,
        leagueSections,
        remaining: [] as any[],
      };
    }
    // League filter
    const leagueGames = sortGames(
      nonFeatured.filter((g) => g.league === selectedFilter),
      sortBy,
    );
    return {
      showFeatured: featuredGame?.league === selectedFilter,
      leagueSections: [] as typeof leagueSections,
      remaining: leagueGames,
    };
  };

  const display = getDisplayData();

  const navigateToGame = (item: any) => {
    const alreadyJoined = item.player_ids?.includes(userId);
    if (alreadyJoined) {
      navigation.navigate("SquareScreen", {
        gridId: item.id,
        inputTitle: item.title,
        username: "",
        deadline: item.deadline,
        eventId: "",
        disableAnimation: true,
        pricePerSquare: item.price_per_square || 0,
        league: item.league || "NFL",
      });
    } else {
      navigation.navigate("JoinSquareScreen", {
        sessionId: item.id,
      });
    }
  };


  const CreatorRow = ({
    username,
    wins,
    profileColor,
    profileIcon,
  }: {
    username: string;
    wins: number;
    profileColor?: string | null;
    profileIcon?: string | null;
  }) => (
    <View style={styles.creatorRow}>
      <UserAvatar
        username={username}
        profileColor={profileColor}
        profileIcon={profileIcon}
        size={28}
      />
      <Text
        style={[styles.creatorName, { color: theme.colors.onSurfaceVariant }]}
      >
        {username || "Anonymous"}
      </Text>
      <MaterialIcons name="star" size={14} color="#FFC107" />
      <Text
        style={[styles.creatorWins, { color: theme.colors.onSurfaceVariant }]}
      >
        {wins} wins
      </Text>
    </View>
  );

  const FillBar = ({ item }: { item: any }) => {
    const count = getPlayerCount(item);
    const max = getMaxPlayers(item);
    const pct = getFillPercent(item);
    const unit = item.block_mode ? "blocks" : "squares";
    return (
      <View style={styles.fillBarContainer}>
        <View style={styles.fillBarRow}>
          <Text
            style={[styles.fillCount, { color: theme.colors.onSurfaceVariant }]}
          >
            {count} / {max} {unit}
          </Text>
          <Text
            style={[
              styles.fillPercent,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {pct}%
          </Text>
        </View>
        <View
          style={[
            styles.fillBar,
            { backgroundColor: theme.dark ? "#333" : "#e0e0e0" },
          ]}
        >
          <View
            style={[
              styles.fillBarProgress,
              {
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const StatsRow = ({ item }: { item: any }) => (
    <View style={styles.statsRow}>
      <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
        10x10
      </Text>
      <Text style={[styles.statDot, { color: theme.colors.onSurfaceVariant }]}>
        •
      </Text>
      <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
        {item.block_mode ? "2x2 Blocks" : "Individual"}
      </Text>
      <Text style={[styles.statDot, { color: theme.colors.onSurfaceVariant }]}>
        •
      </Text>
      <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
        {item.price_per_square ? `$${item.price_per_square}/square` : "Free"}
      </Text>
    </View>
  );

  const renderFeaturedCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.featuredCard,
        {
          backgroundColor: theme.dark ? "#1a2a1a" : "#F0FFF0",
          borderColor: "#4CAF50",
        },
      ]}
      onPress={() => navigateToGame(item)}
      activeOpacity={0.8}
    >
      <View style={styles.featuredBadge}>
        <MaterialIcons name="star" size={12} color="#fff" />
        <Text style={styles.featuredBadgeText}>FEATURED</Text>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.featuredTitle, { color: theme.colors.onBackground }]}
      >
        {item.team1_full_name} @ {item.team2_full_name}
      </Text>
      <Text
        style={[styles.featuredDate, { color: theme.colors.onSurfaceVariant }]}
      >
        {formatGameDate(item.deadline)}
      </Text>
      <FillBar item={item} />
      <StatsRow item={item} />
      <CreatorRow
        username={item.creator_username || "Unknown"}
        wins={item.creator_wins || 0}
      />
      {item.player_ids?.includes(userId) && (
        <View style={styles.joinedBadge}>
          <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
          <Text style={styles.joinedText}>Joined</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderGameCard = (item: any, index: number) => (
    <Animated.View
      key={item.id}
      style={{
        opacity: opacityAnims[index] || new Animated.Value(1),
        transform: [
          {
            translateY: translateYAnims[index] || new Animated.Value(0),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.gameCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark
              ? "rgba(94, 96, 206, 0.3)"
              : "rgba(94, 96, 206, 0.15)",
          },
        ]}
        onPress={() => navigateToGame(item)}
        activeOpacity={0.8}
      >
        <Text
          numberOfLines={1}
          style={[styles.cardTitle, { color: theme.colors.onBackground }]}
        >
          {item.team1_full_name} @ {item.team2_full_name}
        </Text>
        <Text
          style={[styles.cardDate, { color: theme.colors.onSurfaceVariant }]}
        >
          {formatGameDate(item.deadline)}
        </Text>
        <FillBar item={item} />
        <StatsRow item={item} />
        <CreatorRow
          username={item.creator_username || "Unknown"}
          wins={item.creator_wins || 0}
          profileColor={item.creator_profile_color}
          profileIcon={item.creator_profile_icon}
        />
        {item.player_ids?.includes(userId) && (
          <View style={styles.joinedBadge}>
            <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
            <Text style={styles.joinedText}>Joined</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        {/* Filter Chips + Sort */}
        <View style={styles.chipRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            alwaysBounceVertical={false}
            contentContainerStyle={styles.filterRow}
          >
            <Menu
              key={menuKey}
              visible={sortMenuVisible}
              onDismiss={() => setSortMenuVisible(false)}
              anchorPosition="bottom"
              anchor={
                <Chip
                  icon="sort"
                  onPress={() => {
                    setMenuKey((k) => k + 1);
                    setSortMenuVisible(true);
                  }}
                  style={styles.filterChip}
                  compact
                >
                  {SORT_LABELS[sortBy]}
                </Chip>
              }
              contentStyle={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                paddingVertical: 4,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{
                  fontSize: 13,
                  fontFamily: "Rubik_500Medium",
                  color: theme.colors.onSurfaceVariant,
                  letterSpacing: 0.5,
                }}>
                  Sort by
                </Text>
              </View>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <Menu.Item
                  key={key}
                  onPress={() => {
                    setSortBy(key);
                    setSortMenuVisible(false);
                  }}
                  title={SORT_LABELS[key]}
                  titleStyle={{
                    fontFamily: "Rubik_400Regular",
                    fontSize: 14,
                    color: sortBy === key ? theme.colors.primary : theme.colors.onSurface,
                    fontWeight: sortBy === key ? "700" : "400",
                  }}
                />
              ))}
            </Menu>
            {[
              { key: "all", label: "All Squares" },
              ...ACTIVE_LEAGUES.map((l) => ({ key: l, label: l })),
              { key: "Custom", label: "Custom" },
            ].map((filter) => (
              <Chip
                key={filter.key}
                selected={selectedFilter === filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                style={[
                  styles.filterChip,
                  selectedFilter === filter.key && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                textStyle={
                  selectedFilter === filter.key ? { color: "#fff" } : undefined
                }
                compact
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        {loading ? (
          <SkeletonLoader variant="browseScreen" />
        ) : (
          <ScrollView
            style={{ paddingHorizontal: 12 }}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Square of the Week */}
            {featuredGame && display.showFeatured && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Square of the Week
                  </Text>
                  <MaterialIcons
                    name="emoji-events"
                    size={20}
                    color="#FFC107"
                  />
                </View>
                {renderFeaturedCard(featuredGame)}
              </View>
            )}

            {/* Per-league sections (All Squares view) */}
            {display.leagueSections.map((section) => (
              <View key={section.league} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    {section.league}
                  </Text>
                  <Text
                    style={[styles.seeAll, { color: theme.colors.primary }]}
                    onPress={() => setSelectedFilter(section.league)}
                  >
                    See all
                  </Text>
                </View>
                {section.games.map((item) => {
                  const globalIdx = publicGames.indexOf(item);
                  return renderGameCard(item, globalIdx);
                })}
              </View>
            ))}

            {/* Remaining games (league filter views) */}
            {display.remaining.length > 0 && (
              <View style={styles.section}>
                {selectedFilter !== "all" && (
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onBackground, marginBottom: 10 },
                    ]}
                  >
                    {selectedFilter} Games
                  </Text>
                )}
                {display.remaining.map((item) => {
                  const globalIdx = publicGames.indexOf(item);
                  return renderGameCard(item, globalIdx);
                })}
              </View>
            )}

            {/* Empty state */}
            {publicGames.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
                <MaterialIcons name="grid-off" size={56} color={theme.colors.onSurfaceVariant} />
                <Text style={{ fontSize: 18, fontFamily: "Rubik_600SemiBold", color: theme.colors.onBackground, marginTop: 16, textAlign: "center" }}>
                  No public squares yet
                </Text>
                <Text style={{ fontSize: 14, fontFamily: "Rubik_400Regular", color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: "center" }}>
                  Be the first to create a public session!
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() =>
            navigation.navigate("CreateSquareScreen", { isPublic: true })
          }
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default BrowsePublicSquaresScreen;

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    marginRight: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
  featuredCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 10,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 4,
  },
  featuredDate: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginBottom: 12,
  },
  gameCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginBottom: 12,
  },
  fillBarContainer: {
    marginBottom: 10,
  },
  fillBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fillCount: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  fillPercent: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
  },
  fillBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fillBarProgress: {
    height: "100%",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  statDot: {
    fontSize: 13,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorInitial: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  creatorName: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  creatorWins: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  joinedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    fontFamily: "Rubik_500Medium",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
