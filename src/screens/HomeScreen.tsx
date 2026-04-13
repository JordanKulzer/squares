import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
} from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  FlatList,
  Dimensions,
} from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  IconButton,
  useTheme,
  Portal,
  Modal,
  Button,
} from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import JoinSessionModal from "../components/JoinSessionModal";
import ScalePressable from "../components/ScalePressable";
import { getPendingRequests } from "../lib/friends";
import { getInviteCount } from "../lib/gameInvites";
import colors from "../../assets/constants/colorOptions";
import { RootStackParamList } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  cancelDeadlineNotifications,
  sendPlayerLeftNotification,
  sendSquareDeletedNotification,
} from "../utils/notifications";
import { API_BASE_URL } from "../utils/apiConfig";
import { leagueMap } from "../utils/types";
import { deriveGameStatus, syncStaleGames } from "../utils/gameStatus";
// import AdBanner from "../components/AdBanner";
// import PendingInvitesSection from "../components/PendingInvitesSection";

const HomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const translateYAnims = useRef<Animated.Value[]>([]).current;
  const opacityAnims = useRef<Animated.Value[]>([]).current;
  const insets = useSafeAreaInsets();

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const [userGames, setUserGames] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [hasNotifications, setHasNotifications] = useState(false);
  const [selectionCounts, setSelectionCounts] = useState<
    Record<string, number>
  >({});
  const [now, setNow] = useState(new Date());
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Prevents concurrent stale-game syncs and rapid re-fires on quick focus
  // events. staleSyncInProgress blocks overlapping runs; lastSyncCompletedAt
  // adds a 20-second cooldown so a fast sync (all games recently checked,
  // returns immediately) can't fire again on the very next focus.
  const staleSyncInProgress = useRef(false);
  const lastSyncCompletedAtRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 20 * 1000;
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    item: any;
    isOwner: boolean;
  }>({ visible: false, item: null, isOwner: false });
  const [featuredGames, setFeaturedGames] = useState<any[]>([]);
  const carouselRef = useRef<FlatList>(null);
  const PAGE_WIDTH = Dimensions.get("window").width;
  // Animated scroll offset — drives dots and card scale without setState lag
  const scrollX = useRef(new Animated.Value(0)).current;

  // Single loading gate: true until ALL critical fetches complete on first visit.
  // Never resets to true on re-focus — background refreshes update data silently.
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Tracks how many of the 3 parallel first-load fetches have finished.
  // When all 3 are done, flip isInitialLoading to false exactly once.
  const pendingFirstLoads = useRef(3);
  const markOneFetchDone = () => {
    pendingFirstLoads.current -= 1;
    if (pendingFirstLoads.current <= 0) {
      setIsInitialLoading(false);
    }
  };

  // Prevent re-triggering skeleton on subsequent focus events
  const hasFetchedOnce = useRef(false);
  const featuredFetchIdRef = useRef(0);

  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchUserSquares = async (isBackground: boolean) => {
        console.log(`[home/groupC] fetch start background=${isBackground}`);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from("squares")
          .select(
            "id, title, deadline, price_per_square, event_id, league, players, selections, player_ids, game_completed, created_by, team1, team2, team1_full_name, team2_full_name, max_selection, is_public, last_score_check_at",
          )
          .contains("player_ids", [user.id]);

        if (error) {
          console.error("Error fetching squares:", error);
          return;
        }

        const squaresList = data
          .map((item) => {
            const userPlayer = item.players?.find((p) => p.userId === user.id);
            return {
              id: item.id,
              ...item,
              eventId: item.event_id,
              username: userPlayer?.username || "Unknown",
            };
          })
          .sort((a, b) => {
            const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
            return db - da;
          });

        setUserGames(squaresList);

        // Background stale-game sync: for API-backed games whose deadline has
        // passed but game_completed is still false, check the score API and
        // mark them completed in DB + update local state if confirmed.
        //
        // Double guard:
        //  - staleSyncInProgress: prevents concurrent overlapping runs
        //  - lastSyncCompletedAtRef: 20s cooldown prevents re-fire on rapid
        //    focus events even when a sync completes quickly (e.g. all games
        //    were recently checked and the run returns immediately)
        const syncCooldownElapsed =
          Date.now() - lastSyncCompletedAtRef.current > SYNC_COOLDOWN_MS;
        if (!staleSyncInProgress.current && syncCooldownElapsed) {
          staleSyncInProgress.current = true;
          // Limit to the 5 most recently started eligible games so we don't
          // fan out to every stale game at once. Sort by deadline descending
          // (most recent start first — these are most likely to just have finished).
          const gamesForSync = [...squaresList]
            .filter((g) => !g.game_completed && g.event_id && g.deadline)
            .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())
            .slice(0, 5);
          syncStaleGames(gamesForSync)
            .then((completedIds) => {
              if (completedIds.length > 0) {
                setUserGames((prev) =>
                  prev.map((g) =>
                    completedIds.includes(g.id)
                      ? { ...g, game_completed: true }
                      : g,
                  ),
                );
              }
            })
            .catch((err) => {
              console.warn("[home] stale sync error:", err);
            })
            .finally(() => {
              staleSyncInProgress.current = false;
              lastSyncCompletedAtRef.current = Date.now();
            });
        } else {
          const reason = staleSyncInProgress.current
            ? "sync_in_progress"
            : `cooldown (${Math.round((Date.now() - lastSyncCompletedAtRef.current) / 1000)}s ago)`;
          console.log(`[home] stale sync skipped — ${reason}`);
        }

        const counts: Record<string, number> = {};
        squaresList.forEach((square) => {
          const squareSelections = square.selections || [];
          counts[square.id] = squareSelections.filter(
            (sel) => sel.userId === user.id,
          ).length;
        });
        setSelectionCounts(counts);
        if (!isBackground) markOneFetchDone();
        console.log("[home/groupC] ready");
      };

      if (!hasFetchedOnce.current) {
        hasFetchedOnce.current = true;
        fetchUserSquares(false);
      } else {
        console.log("[home] re-focused — background refresh");
        fetchUserSquares(true);
      }

      const checkNotifications = async () => {
        try {
          const [requests, inviteCount] = await Promise.all([
            getPendingRequests(),
            getInviteCount(),
          ]);
          setHasNotifications(requests.length > 0 || inviteCount > 0);
        } catch {
          // silently fail
        }
      };
      checkNotifications();
    }, []),
  );

  const fetchUsername = async () => {
    console.log("[home/groupA] fetch start");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching username:", error);
        return;
      }

      setUsername(data?.username || "");
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      markOneFetchDone();
      console.log("[home/groupA] ready");
    }
  };

  useEffect(() => {
    fetchUsername();
  }, []);

  const POPULAR_TEAMS = [
    "Lakers",
    "Warriors",
    "Celtics",
    "Knicks",
    "Heat",
    "Bulls",
    "Duke",
    "UNC",
    "Kansas",
    "Kentucky",
    "UConn",
  ];

  const fetchFeaturedGame = async () => {
    const myFetchId = ++featuredFetchIdRef.current;
    console.log("[home/groupB] fetch start");

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const dates = [today, tomorrow];
      const leagues = ["NBA", "NCAAB"];

      const allGames = [];

      for (const league of leagues) {
        for (const date of dates) {
          const formattedDate = date.toLocaleDateString("en-CA");
          const url = `${API_BASE_URL}/apisports/basketball/schedule?startDate=${formattedDate}&league=${league}`;

          try {
            const res = await fetch(url);
            const games = await res.json();

            if (Array.isArray(games)) {
              games.forEach((game) => {
                allGames.push({
                  ...game,
                  league,
                  startTime: new Date(game.date),
                });
              });
            }
          } catch (err) {
            console.warn(
              `Failed to fetch ${league} games for ${formattedDate}:`,
              err,
            );
          }
        }
      }

      if (myFetchId !== featuredFetchIdRef.current) return;

      // Deduplicate — same game can appear in both today and tomorrow queries
      const seen = new Set<string>();
      const uniqueGames = allGames.filter((game) => {
        const key = `${game.league}-${game.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Score and select the best game
      const scoredGames = uniqueGames
        .filter((game) => game.startTime > new Date()) // Only future games
        .map((game) => {
          const now = new Date();
          const timeDiff = game.startTime.getTime() - now.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          let score = 0;

          // NBA priority
          if (game.league === "NBA") score += 100;

          // Prefer games starting in 2-6 hours
          if (hoursDiff >= 2 && hoursDiff <= 6) score += 50;
          else if (hoursDiff > 6) score += Math.max(0, 30 - hoursDiff); // Slight preference for closer games

          // Popular teams boost
          const homeTeam = game.homeTeam || "";
          const awayTeam = game.awayTeam || "";
          if (
            POPULAR_TEAMS.some(
              (team) => homeTeam.includes(team) || awayTeam.includes(team),
            )
          ) {
            score += 20;
          }

          return { ...game, score };
        })
        .sort((a, b) => b.score - a.score);

      setFeaturedGames(scoredGames.slice(0, 3));
      markOneFetchDone();
      console.log("[home/groupB] ready");
    } catch (err) {
      console.error("Error fetching featured game:", err);
      // Mark done even on error so the skeleton doesn't block forever
      markOneFetchDone();
    }
  };

  useEffect(() => {
    fetchFeaturedGame();
  }, []);

  const formatGameCountdown = (
    startTime: Date,
  ): { text: string; isUrgent: boolean } => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();

    if (diff <= 0) return { text: "starting soon", isUrgent: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const totalMins = hours * 60 + mins;

    // Urgency logic: < 30 minutes or < 10 minutes gets emphasis
    const isUrgent = totalMins < 30;

    if (hours > 0) {
      // For times > 2 hours, show standard format
      if (hours > 2) {
        return { text: `starts in ${hours}h ${mins}m`, isUrgent: false };
      }
      // For 30m-2h range, show with slight emphasis
      return { text: `starts in ${hours}h ${mins}m`, isUrgent: true };
    } else {
      // Under 1 hour: emphasize with "starting in"
      return { text: `starting in ${mins}m`, isUrgent: true };
    }
  };

  const handleFeaturedGameTap = async (game: any) => {
    if (!game) return;

    try {
      // Fetch detailed game info like in GamePickerScreen
      const res = await fetch(
        `${API_BASE_URL}/apisports/basketball/scores?eventId=${game.id}&league=${game.league}`,
      );
      const detailedGame = await res.json();

      const awayAbbr = detailedGame.team1_abbr || game.awayTeam || "";
      const homeAbbr = detailedGame.team2_abbr || game.homeTeam || "";

      const awayFull = game.awayFullName || game.awayTeam || "";
      const homeFull = game.homeFullName || game.homeTeam || "";

      const awayAbbreviation = detailedGame.team1_abbr || "";
      const homeAbbreviation = detailedGame.team2_abbr || "";

      // Prefill title with game matchup
      const gameTitle = `${awayFull} vs ${homeFull}`;

      navigation.navigate("CreateSquareScreen", {
        team1: awayAbbr,
        team2: homeAbbr,
        team1FullName: awayFull,
        team2FullName: homeFull,
        team1Abbr: awayAbbreviation,
        team2Abbr: homeAbbreviation,
        league: leagueMap[game.league],
        deadline: game.date,
        inputTitle: gameTitle,
        username,
        selectedColor: null,
        maxSelections: "",
        eventId: game.id,
      });
    } catch (err) {
      console.error("Error fetching game details:", err);
      // Fallback to basic info
      const gameTitle = `${game.awayFullName || game.awayTeam || "Away"} vs ${game.homeFullName || game.homeTeam || "Home"}`;
      navigation.navigate("CreateSquareScreen", {
        team1: game.awayTeam || "",
        team2: game.homeTeam || "",
        team1FullName: game.awayFullName || game.awayTeam || "",
        team2FullName: game.homeFullName || game.homeTeam || "",
        team1Abbr: "",
        team2Abbr: "",
        league: leagueMap[game.league],
        deadline: game.date,
        inputTitle: gameTitle,
        username,
        selectedColor: null,
        maxSelections: "",
        eventId: game.id,
      });
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerRight: () => (
        <View style={{ marginRight: 8 }}>
          <IconButton
            icon="account-circle"
            size={24}
            onPress={() => navigation.navigate("ProfileScreen")}
            iconColor={theme.colors.onBackground}
          />
          {hasNotifications && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.error,
                borderWidth: 1.5,
                borderColor: theme.colors.surface,
              }}
            />
          )}
        </View>
      ),
    });
  }, [navigation, theme, hasNotifications]);

  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  const formatCountdown = (
    deadlineLike?: string | Date,
    gameCompleted?: boolean,
    league?: string | null,
    eventId?: string | null,
  ) => {
    if (!deadlineLike) return "Ended";
    const d = new Date(deadlineLike);
    const diff = d.getTime() - now.getTime();

    if (isNaN(d.getTime())) return "Ended";
    if (diff <= 0) {
      const status = deriveGameStatus({
        deadline: typeof deadlineLike === "string" ? deadlineLike : d.toISOString(),
        game_completed: gameCompleted,
        event_id: eventId,
        league,
      });
      if (status === "completed") return "Game Completed";
      if (status === "finalizing") return "Awaiting Final Score";
      return "Game in Progress";
    }

    let ms = diff;
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    ms -= hours * 60 * 60 * 1000;
    const mins = Math.floor(ms / (60 * 1000));

    const parts: string[] = [];
    if (days > 0) parts.push(plural(days, "day"));
    if (hours > 0 || days > 0) parts.push(plural(hours, "hr"));
    parts.push(plural(mins, "min"));

    return `Deadline in ${parts.join(" ")}`;
  };

  const renderCarousel = () => {
    const skBg = theme.dark ? "#2b2b2d" : "#e8e8f0";

    if (isInitialLoading || featuredGames.length === 0) {
      if (!isInitialLoading) {
        // Loading finished, no API games available (off-season or API failure).
        // Return early — dots and "See more matchups" are intentionally omitted.
        return (
          <View style={{ marginBottom: 10 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <View
                style={[
                  styles.featuredCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.dark
                      ? "rgba(108,99,255,0.10)"
                      : "rgba(108,99,255,0.07)",
                    borderLeftColor: theme.dark
                      ? "rgba(108,99,255,0.20)"
                      : "rgba(108,99,255,0.15)",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Rubik_600SemiBold",
                    color: theme.colors.onBackground,
                    marginBottom: 5,
                  }}
                >
                  No games right now
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Rubik_400Regular",
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 16,
                    lineHeight: 17,
                    opacity: 0.7,
                  }}
                >
                  Pick squares. Match the score. Win each quarter.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("CreateSquareScreen")}
                  style={[
                    styles.featuredButton,
                    { backgroundColor: theme.colors.primary, marginBottom: 12 },
                  ]}
                >
                  <Text style={[styles.featuredButtonText, { color: "#fff" }]}>
                    Create a Game
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Rubik_500Medium",
                      color: theme.colors.primary,
                      opacity: 0.8,
                    }}
                  >
                    Have a code? Join a game
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View style={{ marginBottom: 2 }}>
          {/* Section label — matches "✦ Featured Games": fontSize 11, marginH 16, marginB 4 */}
          <View
            style={{
              width: 110,
              height: 11,
              borderRadius: 4,
              marginHorizontal: 16,
              marginBottom: 4,
              backgroundColor: skBg,
            }}
          />
          {/* Card wrapper — mirrors FlatList item: paddingHorizontal 16 + featuredCard marginHorizontal 10 */}
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={[
                styles.featuredCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.dark
                    ? "rgba(108,99,255,0.20)"
                    : "rgba(108,99,255,0.14)",
                  borderLeftColor: theme.colors.primary,
                },
              ]}
            >
              {/* eyebrow — "STARTING SOON": featuredHeader marginBottom 8 */}
              <View style={styles.featuredHeader}>
                <View style={{ width: 100, height: 13, borderRadius: 4, backgroundColor: skBg }} />
              </View>
              {/* countdown: featuredCountdown marginBottom 6 */}
              <View style={{ width: 80, height: 12, borderRadius: 4, marginBottom: 6, backgroundColor: skBg }} />
              {/* matchup: featuredMatchup fontSize 20, marginBottom 6 */}
              <View style={{ width: "78%", height: 20, borderRadius: 5, marginBottom: 6, backgroundColor: skBg }} />
              {/* CTA: featuredButton paddingV 10, paddingH 18, borderRadius 10 → ~33px tall */}
              <View style={{ width: 186, height: 33, borderRadius: 10, backgroundColor: skBg }} />
            </View>
          </View>
          {/* Dots row — matches live: gap 7, marginTop 6 */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 6,
              gap: 7,
            }}
          >
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: skBg }} />
            ))}
          </View>
          {/* "See more matchups" pill — matches seeMoreChip: paddingV 6, borderRadius 20 → 28px tall */}
          <View style={{ alignItems: "center", marginTop: 6, marginBottom: 0 }}>
            <View style={{ width: 148, height: 28, borderRadius: 20, backgroundColor: skBg }} />
          </View>
        </View>
      );
    }

    return (
      <View style={{ marginBottom: 2 }}>
        {/* Section label */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Rubik_600SemiBold",
            color: theme.colors.primary,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginHorizontal: 16,
            marginBottom: 4,
            opacity: 0.85,
          }}
        >
          ✦ Featured Games
        </Text>

        <Animated.FlatList
          ref={carouselRef}
          data={featuredGames}
          keyExtractor={(item) => `${item.league}-${item.id}`}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          renderItem={({ item: game, index }) => {
            const matchup = `${game.awayTeam || "Away"} vs ${game.homeTeam || "Home"}`;
            const countdownInfo = formatGameCountdown(game.startTime);

            // Scale: active card = 1.0, adjacent = 0.96
            const inputRange = [
              (index - 1) * PAGE_WIDTH,
              index * PAGE_WIDTH,
              (index + 1) * PAGE_WIDTH,
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.96, 1.0, 0.96],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1.0, 0.72],
              extrapolate: "clamp",
            });

            return (
              <View style={{ width: PAGE_WIDTH, paddingHorizontal: 16 }}>
                <Animated.View style={{ transform: [{ scale }], opacity }}>
                  <TouchableOpacity
                    style={[
                      styles.featuredCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.dark
                          ? "rgba(108,99,255,0.20)"
                          : "rgba(108,99,255,0.14)",
                        borderLeftColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleFeaturedGameTap(game)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.featuredHeader}>
                      <Text style={[styles.featuredEyebrow, { color: theme.colors.primary }]}>
                        Starting Soon
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.featuredCountdown,
                        {
                          color: countdownInfo.isUrgent
                            ? theme.colors.error
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {countdownInfo.text}
                    </Text>
                    <Text style={[styles.featuredMatchup, { color: theme.colors.onBackground }]}>
                      {matchup}
                    </Text>
                    <View
                      style={[
                        styles.featuredButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        style={[styles.featuredButtonText, { color: "#fff" }]}
                        numberOfLines={1}
                      >
                        Lock In This Square
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            );
          }}
        />

        {/* Pagination dots — driven by scrollX interpolation, no setState lag */}
        {featuredGames.length > 1 && (
          <View
            style={{
              width: PAGE_WIDTH,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 6,
              gap: 7,
            }}
          >
            {featuredGames.map((_, i) => {
              const dotScale = scrollX.interpolate({
                inputRange: [
                  (i - 1) * PAGE_WIDTH,
                  i * PAGE_WIDTH,
                  (i + 1) * PAGE_WIDTH,
                ],
                outputRange: [1, 1.5, 1],
                extrapolate: "clamp",
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [
                  (i - 1) * PAGE_WIDTH,
                  i * PAGE_WIDTH,
                  (i + 1) * PAGE_WIDTH,
                ],
                outputRange: [0.35, 1, 0.35],
                extrapolate: "clamp",
              });
              return (
                <Animated.View
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.primary,
                    opacity: dotOpacity,
                    transform: [{ scale: dotScale }],
                  }}
                />
              );
            })}
          </View>
        )}

        {/* See more matchups — styled pill chip */}
        <View style={{ alignItems: "center", marginTop: 6, marginBottom: 0 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("GamePickerScreen")}
            style={[
              styles.seeMoreChip,
              {
                backgroundColor: theme.dark
                  ? "rgba(108,99,255,0.10)"
                  : "rgba(108,99,255,0.07)",
                borderColor: theme.dark
                  ? "rgba(108,99,255,0.30)"
                  : "rgba(108,99,255,0.22)",
              },
            ]}
          >
            <Text style={[styles.seeMoreText, { color: theme.colors.primary }]}>
              See more matchups
            </Text>
            <MaterialIcons name="arrow-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const closeAllReanimatedSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((ref) => ref?.close());
  };

  const handleLeaveSquare = async (item: any) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("squares")
        .select("player_ids, players, selections, title")
        .eq("id", item.id)
        .single();

      if (error || !data) {
        Toast.show({
          type: "error",
          text1: "Session not found",
          position: "bottom",
          bottomOffset: 60,
        });
        return;
      }

      const updatedPlayerIds = (data.player_ids || []).filter(
        (id: string) => id !== userId,
      );
      const updatedPlayers = (data.players || []).filter(
        (p: any) => p.userId !== userId,
      );
      const updatedSelections = (data.selections || []).filter(
        (sel: any) => sel.userId !== userId,
      );

      await supabase
        .from("squares")
        .update({
          players: updatedPlayers,
          player_ids: updatedPlayerIds,
          selections: updatedSelections,
        })
        .eq("id", item.id);

      if (updatedPlayers.length === 0) {
        await supabase.from("squares").delete().eq("id", item.id);
      } else {
        const currentPlayer = item.players?.find(
          (p: any) => p.userId === userId,
        );
        await sendPlayerLeftNotification(
          item.id,
          currentPlayer?.username || "Unknown",
          data.title || item.title,
        );
      }

      await cancelDeadlineNotifications();

      setUserGames((prev) => prev.filter((g: any) => g.id !== item.id));

      Toast.show({
        type: "info",
        text1: `Left ${item.title}`,
        position: "bottom",
        bottomOffset: 60,
      });
    } catch (err) {
      console.error("Error leaving square:", err);
      Toast.show({
        type: "error",
        text1: "Failed to leave session",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const handleDeleteSquare = async (item: any) => {
    try {
      await sendSquareDeletedNotification(
        item.id,
        item.title,
        item.players || [],
      );

      await supabase.from("squares").delete().eq("id", item.id);

      await cancelDeadlineNotifications();

      setUserGames((prev) => prev.filter((g: any) => g.id !== item.id));

      Toast.show({
        type: "success",
        text1: `Deleted ${item.title}`,
        position: "bottom",
        bottomOffset: 60,
      });
    } catch (err) {
      console.error("Error deleting square:", err);
      Toast.show({
        type: "error",
        text1: "Failed to delete session",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const renderRightActions = (item: any, isOwner: boolean) => {
    return (
      <TouchableOpacity
        style={[
          styles.swipeAction,
          { backgroundColor: isOwner ? "#f44336" : "#FF9800" },
        ]}
        onPress={() => {
          closeAllReanimatedSwipeables();
          setConfirmModal({ visible: true, item, isOwner });
        }}
      >
        <MaterialIcons
          name={isOwner ? "delete" : "exit-to-app"}
          size={24}
          color="#fff"
        />
        <Text style={styles.swipeActionText}>
          {isOwner ? "Delete" : "Leave"}
        </Text>
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Featured Game Card */}
          {renderCarousel()}


          {/* Your Squares header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 6,
              marginBottom: 6,
              marginHorizontal: 10,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: "600",
                fontFamily: "Rubik_600SemiBold",
                color: theme.colors.onBackground,
              }}
            >
              Your Squares
            </Text>

            {isInitialLoading ? (
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 13,
                  fontFamily: "Rubik_500Medium",
                  opacity: 0.25,
                }}
              >
                Edit
              </Text>
            ) : userGames.length > 0 ? (
              <TouchableOpacity
                onPress={() => setEditMode(!editMode)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={{
                    color: editMode
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                    fontSize: 13,
                    fontFamily: "Rubik_500Medium",
                    opacity: editMode ? 1 : 0.5,
                  }}
                >
                  {editMode ? "Done" : "Edit"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Primary action buttons */}
          <View
            style={{
              flexDirection: "row",
              marginHorizontal: 10,
              marginTop: 4,
              marginBottom: 22,
              gap: 5,
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
              borderRadius: 14,
              padding: 5,
            }}
          >
            {[
              {
                label: "Create",
                icon: "add-circle-outline",
                onPress: () => navigation.navigate("CreateSquareScreen"),
              },
              {
                label: "Join Game",
                icon: "vpn-key",
                onPress: () => setVisible(true),
              },
              {
                label: "Browse",
                icon: "public",
                onPress: () => navigation.navigate("BrowsePublicSquaresScreen"),
              },
            ].map(({ label, icon, onPress }) => {
              const isPrimary = label === "Create";
              return (
                <View
                  key={label}
                  style={{ flex: 1, opacity: isPrimary ? 1 : 0.7 }}
                >
                  <ScalePressable
                    onPress={onPress}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      minHeight: 44,
                      borderRadius: 12,
                      backgroundColor: isPrimary
                        ? theme.dark
                          ? "rgba(108,99,255,0.11)"
                          : "rgba(108,99,255,0.07)"
                        : theme.colors.surface,
                      borderWidth: isPrimary ? 1.5 : 1,
                      borderColor: isPrimary
                        ? theme.dark
                          ? "rgba(108,99,255,0.35)"
                          : "rgba(108,99,255,0.25)"
                        : theme.dark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.07)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: theme.dark ? 0.3 : 0.08,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <MaterialIcons
                      name={icon as any}
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isPrimary ? "700" : "600",
                        fontFamily: "Rubik_600SemiBold",
                        color: isPrimary
                          ? theme.colors.primary
                          : theme.colors.onBackground,
                      }}
                    >
                      {label}
                    </Text>
                  </ScalePressable>
                </View>
              );
            })}
          </View>

          <View style={{ paddingHorizontal: 5 }}>
            {isInitialLoading ? (
              /* ── Skeleton game cards — layout mirrors live gameCard exactly ── */
              [0, 1, 2].map((i) => {
                const skBg2 = theme.dark ? "#2b2b2d" : "#e8e8f0";
                return (
                  <View
                    key={i}
                    style={[
                      styles.gameCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderLeftColor: theme.colors.primary,
                        borderColor: theme.dark
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(0,0,0,0.07)",
                        marginBottom: 6,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        {/* Title row: title bar + status chip placeholder — marginBottom 3 */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 3,
                          }}
                        >
                          <View
                            style={{
                              flex: 1,
                              height: 15,
                              borderRadius: 5,
                              marginRight: 6,
                              backgroundColor: skBg2,
                            }}
                          />
                          <View
                            style={{
                              width: 52,
                              height: 18,
                              borderRadius: 6,
                              backgroundColor: skBg2,
                            }}
                          />
                        </View>
                        {/* Teams row — fontSize 13 → height 13, marginBottom 6 */}
                        <View
                          style={{
                            width: "62%",
                            height: 13,
                            borderRadius: 4,
                            marginBottom: 6,
                            backgroundColor: skBg2,
                          }}
                        />
                        {/* Stats row — 3 icon+text pairs, gap 16, marginBottom 6 */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 16,
                            marginBottom: 6,
                          }}
                        >
                          <View style={{ width: 32, height: 12, borderRadius: 4, backgroundColor: skBg2 }} />
                          <View style={{ width: 48, height: 12, borderRadius: 4, backgroundColor: skBg2, opacity: 0.6 }} />
                          <View style={{ width: 36, height: 12, borderRadius: 4, backgroundColor: skBg2, opacity: 0.6 }} />
                        </View>
                        {/* Fill bar — height 4, borderRadius 2 */}
                        <View
                          style={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: theme.dark ? "#333" : "#e8e8e8",
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              width: "45%",
                              height: "100%",
                              borderRadius: 2,
                              backgroundColor: skBg2,
                            }}
                          />
                        </View>
                        {/* Countdown — marginTop 6 */}
                        <View
                          style={{
                            width: "40%",
                            height: 12,
                            borderRadius: 4,
                            marginTop: 6,
                            backgroundColor: skBg2,
                          }}
                        />
                      </View>
                      {/* Chevron placeholder */}
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          marginLeft: 8,
                          backgroundColor: skBg2,
                          opacity: 0.5,
                        }}
                      />
                    </View>
                  </View>
                );
              })
            ) : userGames.length === 0 ? (
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 10,
                  fontStyle: "italic",
                }}
              >
                You haven’t joined or created any games yet.
              </Text>
            ) : (
              userGames.map((item, index) => {
                const deadline = item.deadline
                  ? new Date(item.deadline).getTime()
                  : null;
                const nowMs = Date.now();
                const isOwner = item.created_by === userId;

                const gameStatus = deriveGameStatus({
                  deadline: item.deadline,
                  game_completed: item.game_completed,
                  event_id: item.event_id,
                  league: item.league,
                });

                const STATUS_COLORS: Record<string, string> = {
                  completed: "#4CAF50",   // green
                  live: "#FF9800",        // orange
                  finalizing: "#7E57C2",  // muted purple — "waiting on confirmation"
                  upcoming: deadline && deadline - nowMs < 24 * 60 * 60 * 1000
                    ? "#f5c542"           // yellow: deadline soon
                    : theme.colors.primary,
                };
                const borderColor = STATUS_COLORS[gameStatus] ?? theme.colors.primary;

                const STATUS_LABELS: Record<string, string | null> = {
                  completed: "Completed",
                  live: "In Progress",
                  finalizing: "Awaiting Final Score",
                  upcoming: deadline && deadline - nowMs < 24 * 60 * 60 * 1000
                    ? "Starts Soon"
                    : null,
                };
                const statusLabel = STATUS_LABELS[gameStatus] ?? null;

                const isPublic = item.is_public;
                return (
                  <Animated.View
                    key={item.id}
                    style={{
                      opacity: opacityAnims[index] || new Animated.Value(1),
                      transform: [
                        {
                          translateY:
                            translateYAnims[index] || new Animated.Value(0),
                        },
                      ],
                    }}
                  >
                    <ReanimatedSwipeable
                      ref={(ref) => {
                        swipeableRefs.current[item.id] = ref;
                      }}
                      renderRightActions={() =>
                        renderRightActions(item, isOwner)
                      }
                      overshootRight={false}
                      friction={2}
                    >
                      <ScalePressable
                        style={[
                          styles.gameCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderLeftColor: borderColor,
                            borderColor: theme.dark
                              ? "rgba(255,255,255,0.07)"
                              : "rgba(0,0,0,0.07)",
                          },
                        ]}
                        onPress={() => {
                          if (editMode) {
                            setConfirmModal({ visible: true, item, isOwner });
                          } else {
                            navigation.navigate("SquareScreen", {
                              gridId: item.id,
                              inputTitle: item.title,
                              username: item.username,
                              deadline: item.deadline,
                              eventId: item.eventId,
                              disableAnimation: true,
                              pricePerSquare: item.price_per_square || 0,
                              league: item.league || "NFL",
                            });
                          }
                        }}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          {editMode && (
                            <MaterialIcons
                              name="remove-circle"
                              size={24}
                              color={isOwner ? "#f44336" : "#FF9800"}
                              style={{ marginRight: 12 }}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            {/* Title row */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 3,
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={{
                                  fontSize: 15,
                                  fontWeight: "600",
                                  color: theme.colors.onBackground,
                                  fontFamily: "SoraBold",
                                  flex: 1,
                                  marginRight: 6,
                                }}
                              >
                                {item.title}
                              </Text>
                              {/* Status chip */}
                              {statusLabel && (
                                <View
                                  style={{
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    backgroundColor: `${borderColor}22`,
                                    marginRight: isPublic ? 6 : 0,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontFamily: "Rubik_600SemiBold",
                                      color: borderColor,
                                      letterSpacing: 0.2,
                                    }}
                                  >
                                    {statusLabel}
                                  </Text>
                                </View>
                              )}
                              {isPublic && (
                                <View
                                  style={[
                                    styles.cardBadge,
                                    {
                                      backgroundColor: theme.dark
                                        ? "rgba(108,99,255,0.2)"
                                        : "rgba(108,99,255,0.1)",
                                    },
                                  ]}
                                >
                                  <MaterialIcons
                                    name="public"
                                    size={12}
                                    color={theme.colors.primary}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      color: theme.colors.primary,
                                      fontFamily: "Rubik_500Medium",
                                      marginLeft: 2,
                                    }}
                                  >
                                    Public
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Teams row */}
                            {(item.team1_full_name || item.team1) &&
                              (item.team2_full_name || item.team2) && (
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    fontSize: 13,
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: "Rubik_500Medium",
                                    marginBottom: 6,
                                  }}
                                >
                                  {item.team1_full_name || item.team1} vs{" "}
                                  {item.team2_full_name || item.team2}
                                </Text>
                              )}

                            {/* Stats row */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 16,
                                marginBottom: 6,
                              }}
                            >
                              {/* Player count — primary signal */}
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                <MaterialIcons
                                  name="people"
                                  size={14}
                                  color={theme.colors.onSurfaceVariant}
                                />
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: "Rubik_500Medium",
                                  }}
                                >
                                  {item.players?.length || 0}
                                </Text>
                              </View>
                              {/* % filled — secondary */}
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                  opacity: 0.55,
                                }}
                              >
                                <MaterialIcons
                                  name="grid-on"
                                  size={13}
                                  color={theme.colors.onSurfaceVariant}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: theme.colors.onSurfaceVariant,
                                    fontFamily: "Rubik_400Regular",
                                  }}
                                >
                                  {Math.round(
                                    ((item.selections?.length || 0) / 100) *
                                      100,
                                  )}
                                  % filled
                                </Text>
                              </View>
                              {/* League — secondary */}
                              {item.league ? (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 3,
                                    opacity: 0.55,
                                  }}
                                >
                                  <MaterialIcons
                                    name={
                                      ["nba", "ncaab"].includes(
                                        item.league?.toLowerCase(),
                                      )
                                        ? "sports-basketball"
                                        : item.league?.toLowerCase() ===
                                            "custom"
                                          ? "edit"
                                          : "sports-football"
                                    }
                                    size={13}
                                    color={theme.colors.onSurfaceVariant}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: theme.colors.onSurfaceVariant,
                                      fontFamily: "Rubik_400Regular",
                                    }}
                                  >
                                    {item.league?.toUpperCase()}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Fill bar */}
                            {(() => {
                              const totalSelections =
                                item.selections?.length || 0;
                              const maxSquares =
                                item.max_selection && item.max_selection < 100
                                  ? item.max_selection *
                                    (item.players?.length || 1)
                                  : 100;
                              const fillPct = Math.min(
                                totalSelections / 100,
                                1,
                              );
                              return (
                                <View
                                  style={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: theme.dark
                                      ? "#333"
                                      : "#e8e8e8",
                                    overflow: "hidden",
                                  }}
                                >
                                  <View
                                    style={{
                                      height: "100%",
                                      width: `${fillPct * 100}%`,
                                      borderRadius: 2,
                                      backgroundColor: borderColor,
                                    }}
                                  />
                                </View>
                              );
                            })()}

                            {/* Countdown */}
                            <Text
                              style={{
                                fontSize: 12,
                                color: borderColor,
                                fontFamily: "Rubik_500Medium",
                                marginTop: 6,
                              }}
                            >
                              {formatCountdown(
                                item.deadline,
                                item.game_completed,
                                item.league,
                                item.event_id,
                              )}
                            </Text>
                          </View>

                          {!editMode && (
                            <MaterialIcons
                              name="chevron-right"
                              size={24}
                              color={theme.colors.onSurfaceVariant}
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </View>
                      </ScalePressable>
                    </ReanimatedSwipeable>
                  </Animated.View>
                );
              })
            )}
          </View>
        </ScrollView>

        <JoinSessionModal
          visible={visible}
          onDismiss={() => setVisible(false)}
        />

        {/* Banner Ad */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom,
          }}
        >
          {/* <AdBanner /> */}
        </View>

        {/* Confirmation Modal for Leave/Delete */}
        <Portal>
          <Modal
            visible={confirmModal.visible}
            onDismiss={() =>
              setConfirmModal({ visible: false, item: null, isOwner: false })
            }
            contentContainerStyle={{
              marginHorizontal: 24,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              overflow: "hidden",
              padding: 0,
            }}
          >
            <LinearGradient
              colors={[theme.colors.error, "#b71c1c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 20,
                paddingBottom: 16,
              }}
            >
              <MaterialIcons
                name={confirmModal.isOwner ? "delete" : "logout"}
                size={22}
                color="#fff"
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 20,
                  fontFamily: "SoraBold",
                  color: "#fff",
                }}
              >
                {confirmModal.isOwner ? "Delete Session" : "Leave Session"}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setConfirmModal({
                    visible: false,
                    item: null,
                    isOwner: false,
                  })
                }
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ padding: 20 }}>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {confirmModal.isOwner
                  ? `Are you sure you want to permanently delete "${confirmModal.item?.title}"? This cannot be undone.`
                  : `Are you sure you want to leave "${confirmModal.item?.title}"? Your squares will be removed.`}
              </Text>
              <View style={styles.modalButtonRow}>
                <Button
                  onPress={() =>
                    setConfirmModal({
                      visible: false,
                      item: null,
                      isOwner: false,
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onPress={async () => {
                    const item = confirmModal.item;
                    const isOwner = confirmModal.isOwner;
                    setConfirmModal({
                      visible: false,
                      item: null,
                      isOwner: false,
                    });
                    if (isOwner) {
                      await handleDeleteSquare(item);
                    } else {
                      await handleLeaveSquare(item);
                    }
                  }}
                  mode="text"
                  textColor={theme.colors.error}
                  labelStyle={{ fontSize: 16 }}
                >
                  {confirmModal.isOwner ? "Delete" : "Leave"}
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      </View>
    </LinearGradient>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  welcomeHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  welcomeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featuredCard: {
    marginHorizontal: 10,
    marginBottom: 0,
    marginTop: 2,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderColor: "rgba(108,99,255,0.22)",
    borderLeftColor: "#6C63FF",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  featuredHeader: {
    marginBottom: 8,
  },
  featuredEyebrow: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
    textTransform: "uppercase",
  },
  featuredMatchup: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 6,
  },
  featuredCountdown: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 6,
  },
  featuredPromo: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginBottom: 12,
  },
  featuredButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  featuredButtonText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
    letterSpacing: 0.3,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gameCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderColor: "rgba(0,0,0,0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 16,
    marginLeft: 8,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    marginTop: 4,
  },
  dialogCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "Rubik_600SemiBold",
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    fontFamily: "Rubik_400Regular",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  seeMoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  seeMoreText: {
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
  },
});
