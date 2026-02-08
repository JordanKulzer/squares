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

type SortOption = "kickoff" | "newest" | "most_filled" | "least_filled";

const SORT_LABELS: Record<SortOption, string> = {
  kickoff: "Kickoff Time",
  newest: "Newest",
  most_filled: "Most Filled",
  least_filled: "Least Filled",
};

const sortGames = (games: any[], sort: SortOption) => {
  const sorted = [...games];
  switch (sort) {
    case "kickoff":
      return sorted.sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      );
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at || b.deadline).getTime() -
          new Date(a.created_at || a.deadline).getTime(),
      );
    case "most_filled":
      return sorted.sort((a, b) => {
        const pctA = (a.player_ids?.length || 0) / (a.max_selection || 100);
        const pctB = (b.player_ids?.length || 0) / (b.max_selection || 100);
        return pctB - pctA;
      });
    case "least_filled":
      return sorted.sort((a, b) => {
        const pctA = (a.player_ids?.length || 0) / (a.max_selection || 100);
        const pctB = (b.player_ids?.length || 0) / (b.max_selection || 100);
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

  const now = Date.now();
  const SAMPLE_GAMES = [
    {
      id: "sample-1",
      title: "Super Bowl Squares 2026",
      team1_full_name: "Kansas City Chiefs",
      team2_full_name: "Philadelphia Eagles",
      deadline: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      league: "NFL",
      player_ids: Array(72).fill("x"),
      max_selection: 100,
      price_per_square: 0,
      game_completed: false,
      created_by: "sample",
      _isSample: true,
      _isFeatured: true,
      creator_username: "SquaresHQ",
      creator_wins: 12,
    },
    {
      id: "sample-2",
      title: "Championship Showdown",
      team1_full_name: "Alabama Crimson Tide",
      team2_full_name: "Georgia Bulldogs",
      deadline: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      league: "NCAAF",
      player_ids: Array(88).fill("x"),
      max_selection: 100,
      price_per_square: 0,
      game_completed: false,
      created_by: "sample",
      _isSample: true,
      _isFeatured: false,
      creator_username: "GridMaster",
      creator_wins: 5,
    },
    {
      id: "sample-3",
      title: "Sunday Night Squares",
      team1_full_name: "Dallas Cowboys",
      team2_full_name: "San Francisco 49ers",
      deadline: new Date(now + 5 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      league: "NFL",
      player_ids: Array(42).fill("x"),
      max_selection: 100,
      price_per_square: 0,
      game_completed: false,
      created_by: "sample",
      _isSample: true,
      _isFeatured: false,
      creator_username: "NFLFanatic",
      creator_wins: 3,
    },
  ];

  const fetchPublicSquares = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    let query = supabase
      .from("squares")
      .select(
        "id, title, deadline, price_per_square, league, players, player_ids, game_completed, created_by, max_selection, team1_full_name, team2_full_name, created_at",
      )
      .eq("is_public", true)
      .eq("game_completed", false)
      .gte("deadline", new Date().toISOString())
      .order("deadline", { ascending: true });

    if (
      selectedFilter !== "all" &&
      selectedFilter !== "almost_full" &&
      selectedFilter !== "new"
    ) {
      query = query.eq("league", selectedFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Public squares query unavailable, using sample data");
    }

    const games = !error && data && data.length > 0 ? data : SAMPLE_GAMES;
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

  const getPlayerCount = (item: any) => item.player_ids?.length || 0;
  const getMaxPlayers = (item: any) => item.max_selection || 100;
  const getFillPercent = (item: any) =>
    Math.round((getPlayerCount(item) / getMaxPlayers(item)) * 100);
  const isAlmostFull = (item: any) => getFillPercent(item) >= 75;
  const isNewlyAdded = (item: any) => {
    const created = new Date(item.created_at || item.deadline).getTime();
    return Date.now() - created < 48 * 60 * 60 * 1000; // within 48 hours
  };

  const featuredGame =
    publicGames.find((g) => g.is_featured || g._isFeatured) || null;

  const nonFeatured = publicGames.filter((g) => g.id !== featuredGame?.id);

  const almostFullGames = sortGames(
    nonFeatured.filter((g) => isAlmostFull(g)),
    sortBy,
  );
  const newlyAddedGames = sortGames(
    nonFeatured.filter((g) => isNewlyAdded(g)),
    sortBy,
  );
  // Per-league game lists for "All Squares" view
  const leagueSections = ACTIVE_LEAGUES.map((league) => ({
    league,
    games: sortGames(
      nonFeatured.filter((g) => g.league === league),
      sortBy,
    ).slice(0, 2),
  })).filter((s) => s.games.length > 0);

  // Build display lists based on filter
  const getDisplayData = () => {
    if (selectedFilter === "almost_full") {
      return {
        showFeatured: false,
        almost: almostFullGames,
        leagueSections: [] as typeof leagueSections,
        remaining: [] as any[],
      };
    }
    if (selectedFilter === "new") {
      return {
        showFeatured: false,
        almost: [] as any[],
        leagueSections: [] as typeof leagueSections,
        remaining: newlyAddedGames,
      };
    }
    if (selectedFilter === "all") {
      return {
        showFeatured: true,
        almost: almostFullGames.slice(0, 2),
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
      almost: almostFullGames.filter((g) => g.league === selectedFilter),
      leagueSections: [] as typeof leagueSections,
      remaining: leagueGames.filter(
        (g) => !almostFullGames.find((af: any) => af.id === g.id),
      ),
    };
  };

  const display = getDisplayData();

  const navigateToGame = (item: any) => {
    if (item._isSample) {
      navigation.navigate("JoinSquareScreen", {
        sessionId: item.id,
      });
      return;
    }
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
  }: {
    username: string;
    wins: number;
  }) => (
    <View style={styles.creatorRow}>
      <View
        style={[
          styles.creatorAvatar,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text style={styles.creatorInitial}>
          {(username || "?")[0].toUpperCase()}
        </Text>
      </View>
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
    return (
      <View style={styles.fillBarContainer}>
        <View style={styles.fillBarRow}>
          <Text
            style={[styles.fillCount, { color: theme.colors.onSurfaceVariant }]}
          >
            {count} / {max} squares
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
        Max 5 squares
      </Text>
      <Text style={[styles.statDot, { color: theme.colors.onSurfaceVariant }]}>
        •
      </Text>
      <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
        {item.price_per_square ? `$${item.price_per_square}` : "Free"}
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

  const renderAlmostFullCard = (item: any, index: number) => (
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
          styles.almostFullCard,
          {
            backgroundColor: theme.dark ? "#2a2510" : "#FFF8E7",
            borderColor: theme.dark ? "#5a4a20" : "#FFE0A0",
          },
        ]}
        onPress={() => navigateToGame(item)}
        activeOpacity={0.8}
      >
        <View style={styles.almostFullBadge}>
          <Text style={styles.almostFullBadgeText}>
            {getFillPercent(item)}% FULL
          </Text>
        </View>
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
              { key: "almost_full", label: "Almost Full" },
              { key: "new", label: "Newly Created" },
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
          <SkeletonLoader variant="homeScreen" />
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

            {/* Almost Full */}
            {display.almost.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onBackground },
                    ]}
                  >
                    Almost Full
                  </Text>
                  {selectedFilter === "all" && almostFullGames.length > 2 && (
                    <Text
                      style={[styles.seeAll, { color: theme.colors.primary }]}
                      onPress={() => setSelectedFilter("almost_full")}
                    >
                      See all
                    </Text>
                  )}
                </View>
                {display.almost.map((item) => {
                  const globalIdx = publicGames.indexOf(item);
                  return renderAlmostFullCard(item, globalIdx);
                })}
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

            {/* Remaining games (league/new/almost_full filter views) */}
            {display.remaining.length > 0 && (
              <View style={styles.section}>
                {selectedFilter === "new" && (
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.colors.onBackground,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    Newly Created
                  </Text>
                )}
                {selectedFilter !== "all" &&
                  selectedFilter !== "new" &&
                  selectedFilter !== "almost_full" && (
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color: theme.colors.onBackground,
                          marginBottom: 10,
                        },
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
  almostFullCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  almostFullBadge: {
    backgroundColor: "#F59E0B",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  almostFullBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.5,
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
