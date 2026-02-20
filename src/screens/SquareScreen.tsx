import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Pressable,
  RefreshControl,
  Image,
} from "react-native";
import {
  Button,
  Card,
  Modal,
  Portal,
  useTheme,
  Chip,
} from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  useIsFocused,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { TabView, TabBar } from "react-native-tab-view";
import Toast from "react-native-toast-message";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import SessionOptionsModal from "../components/SessionOptionsModal";
import DeadlinePickerModal from "../components/DeadlinePickerModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  scheduleNotifications,
  sendPlayerLeftNotification,
  sendSquareDeletedNotification,
  cancelDeadlineNotifications,
} from "../utils/notifications";
import { supabase } from "../lib/supabase";
import { API_BASE_URL } from "../utils/apiConfig";
import * as Sentry from "@sentry/react-native";
import { useFonts, Anton_400Regular } from "@expo-google-fonts/anton";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
} from "@expo-google-fonts/rubik";
import SkeletonLoader from "../components/SkeletonLoader";
import tinycolor from "tinycolor2";
import ScoreEntryModal from "../components/ScoreEntryModal";
import AddGuestPlayerModal from "../components/AddGuestPlayerModal";
import AssignSquareModal from "../components/AssignSquareModal";
import { recordQuarterWin } from "../utils/squareLimits";
import { isBadgeEmoji, getBadgeEmoji } from "../../assets/constants/iconOptions";


// ✨ Square size calculation - moved to component level for proper recalculation
const getSquareSize = () => {
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  // Detect if device is likely a tablet (iPad)
  const isTablet = screenWidth >= 768 || screenHeight >= 768;

  // Account for all horizontal spacing:
  // - ScrollView paddingHorizontal: 4 × 2 = 8
  // - Card borderLeftWidth: 4
  // - Card.Content paddingHorizontal: 4 × 2 = 8
  // - Y-axis team label: 19 (minWidth 16 + paddingRight 3)
  // Total: 39
  const availableWidth = screenWidth - (isTablet ? 60 : 39);
  const calculatedSize = availableWidth / 11; // 11 columns (1 axis + 10 squares)

  // No cap — let the grid use all available space
  const maxSize = isTablet ? 80 : 60;

  return Math.min(maxSize, calculatedSize);
};

const splitTeamName = (teamName) => {
  return teamName ? teamName.split("") : [];
};

const formatPeriodLabel = (quarter: string, index: number) => {
  const num = parseInt(quarter.replace("Q", ""), 10);
  if (num <= 4) return `Quarter ${num}`;
  return `Overtime ${num - 4}`;
};

const calculatePlayerWinnings = (
  quarterWinners: any[],
  playerUsernames: Record<string, string>,
  pricePerSquare: number,
  totalSquares: number,
) => {
  const winningsMap: Record<string, number> = {};

  if (!Array.isArray(quarterWinners) || !pricePerSquare || totalSquares === 0) {
    return winningsMap;
  }

  const totalPayout = pricePerSquare * totalSquares;
  const payoutPerQuarter = totalPayout / quarterWinners.length;

  const usernameToUserId: Record<string, string> = {};
  Object.entries(playerUsernames).forEach(([uid, name]) => {
    if (typeof name === "string") {
      usernameToUserId[name.trim()] = uid;
    }
  });

  quarterWinners.forEach((w, index) => {
    const username = w?.username;
    if (typeof username === "string" && username !== "No Winner") {
      const trimmed = username.trim();
      const userId = usernameToUserId[trimmed];

      if (userId) {
        winningsMap[userId] = (winningsMap[userId] || 0) + payoutPerQuarter;
      }
    }
  });

  return winningsMap;
};

const formatTimeLeftStatic = (targetDate: Date) => {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return "Deadline passed";
  const seconds = Math.floor(diff / 1000) % 60;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const CountdownChip = React.memo(({ deadline }: { deadline: Date }) => {
  const [text, setText] = useState(() => formatTimeLeftStatic(deadline));
  useEffect(() => {
    const interval = setInterval(() => {
      setText(formatTimeLeftStatic(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  return <>{text}</>;
});

const SquareScreen = ({ route }) => {
  const {
    gridId,
    inputTitle,
    eventId,
    pricePerSquare,
    league = "NFL",
  } = route.params;
  const [now, setNow] = useState(new Date());
  const isFocused = useIsFocused();

  const theme = useTheme();
  const isDark = theme.dark;

  const [squareColors, setSquareColors] = useState({});
  const [playerColors, setPlayerColors] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [fullTeam1, setFullTeam1] = useState("");
  const [fullTeam2, setFullTeam2] = useState("");
  const [xAxis, setXAxis] = useState<number[]>([]);
  const [yAxis, setYAxis] = useState<number[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [userId, setUserId] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [team1Mascot, setTeam1Mascot] = useState("");
  const [team2Mascot, setTeam2Mascot] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [players, setPlayers] = useState([]);
  const [title, setTitle] = useState(route.params.inputTitle);
  const [maxSelections, setMaxSelections] = useState(0);
  const [quarterScores, setQuarterScores] = useState([]);
  const [quarterWinners, setQuarterWinners] = useState([]);
  const [selections, setSelections] = useState([]);
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(
    new Set(),
  );
  const [deadlineValue, setDeadlineValue] = useState<Date | null>(null);
  const [isAfterDeadline, setIsAfterDeadline] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(deadlineValue);
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(false);
  const [blockMode, setBlockMode] = useState(false);
  const [sessionOptionsVisible, setSessionOptionsVisible] = useState(false);
  const [pendingSquares, setPendingSquares] = useState<Set<string>>(new Set());
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isCustomGame, setIsCustomGame] = useState(false);
  const [showScoreEntryModal, setShowScoreEntryModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showAssignSquareModal, setShowAssignSquareModal] = useState(false);
  const [assignMode, setAssignMode] = useState(false);
  const [assignModePlayer, setAssignModePlayer] = useState<{
    userId: string;
    username: string;
    color: string;
  } | null>(null);
  const assignModePlayerRef = useRef<{ userId: string; username: string; color: string } | null>(null);
  const [isTeam1Home, setIsTeam1Home] = useState<boolean | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [winningsByUser, setWinningsByUser] = useState<Record<string, number>>(
    {},
  );
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [winnerModalData, setWinnerModalData] = useState<{
    username: string;
    userColor: string;
    winningQuarters: { label: string; score: string; payout: number }[];
    totalWinnings: number;
    squareCoords: [number, number];
  } | null>(null);

  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
  });

  // ✨ Calculate square size dynamically inside component with orientation support
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const squareSize = useMemo(() => getSquareSize(), [dimensions]);

  // ✨ Generate dynamic styles based on calculated square size
  const dynamicStyles = useMemo(
    () => getDynamicStyles(squareSize),
    [squareSize],
  );

  const leaveAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const [refreshingScores, setRefreshingScores] = useState(false);
  const [squareDataLoaded, setSquareDataLoaded] = useState(false);
  const [scoresLoaded, setScoresLoaded] = useState(false);
  const loading = !squareDataLoaded || !scoresLoaded;

  const screenHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const usableHeight = screenHeight - insets.top - insets.bottom - 120;

  // ✨ Smooth pulse animation for deadline timer - managed to prevent restart on re-renders
  useEffect(() => {
    // Stop any existing animation
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }

    if (deadlineValue && !isAfterDeadline) {
      // Create a subtle, smooth pulse animation
      pulseAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03, // More subtle than 1.05
            duration: 1500, // Slower for smoothness
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimationRef.current.start();
    } else {
      // Reset to normal scale when deadline passes
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    // Cleanup on unmount
    return () => {
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
      }
    };
  }, [deadlineValue, isAfterDeadline]);

  const openAnimatedDialog = (setter, animRef) => {
    setSessionOptionsVisible(false);
    setTimeout(() => {
      setter(true);
      Animated.timing(animRef, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 250);
  };

  const closeAnimatedDialog = (setter, animRef) => {
    Animated.timing(animRef, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setter(false);
    });
  };

  const getAnimatedDialogStyle = (animRef) => ({
    opacity: animRef,
    transform: [
      {
        scale: animRef.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  });

  const currentUsername = useMemo(() => {
    return userId && playerUsernames[userId]
      ? playerUsernames[userId]
      : "Unknown";
  }, [userId, playerUsernames]);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "squares", title: "Square" },
    { key: "players", title: "Players" },
    { key: "winners", title: "Results" },
  ]);

  const gradientColors = theme.dark
    ? (["#0a0a0a", "#1a1a1a", "#252525"] as const)
    : (["#f8f9fa", "#ffffff"] as const);

  const navigation = useNavigation();

  const determineQuarterWinners = (
    scores,
    selections,
    xAxis,
    yAxis,
    isTeam1Home,
    usernameMap: Record<string, string> = {},
  ) => {
    return scores.map((score, i) => {
      const { home, away } = score || {};

      if (home == null || away == null) {
        return {
          quarter: `${i + 1}`,
          username: "No Winner",
          square: ["-", "-"],
        };
      }

      const team1Score = isTeam1Home ? home : away;
      const team2Score = isTeam1Home ? away : home;

      const x = xAxis.findIndex((val) => Number(val) === team2Score % 10);
      const y = yAxis.findIndex((val) => Number(val) === team1Score % 10);

      if (x === -1 || y === -1) {
        return {
          quarter: `${i + 1}`,
          username: "No Winner",
          square: [home % 10, away % 10],
        };
      }

      const matchingSelection = selections.find(
        (sel) => sel.x === x && sel.y === y,
      );

      return {
        quarter: `${i + 1}`,
        username: matchingSelection
          ? usernameMap[matchingSelection.userId] || "Unknown"
          : "No Winner",
        square: [xAxis[x], yAxis[y]],
      };
    });
  };

  useEffect(() => {
    if (loading) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  useEffect(() => {
    if (!isFocused) return;
    if (!xAxis.length || !yAxis.length) return;
    if (!Array.isArray(quarterScores) || quarterScores.length === 0) return;

    if (isTeam1Home !== null) {
      const winners = determineQuarterWinners(
        quarterScores,
        selections,
        xAxis,
        yAxis,
        isTeam1Home,
        playerUsernames,
      );
      setQuarterWinners(winners);
    }
  }, [
    isFocused,
    quarterScores,
    selections,
    xAxis,
    yAxis,
    isTeam1Home,
    playerUsernames,
  ]);

  // Track which quarters have already had credits awarded
  const creditedQuartersRef = useRef<Set<string>>(new Set());

  // Save quarter_winners to database when they're calculated
  useEffect(() => {
    if (!quarterWinners || quarterWinners.length === 0) return;
    if (!gridId) return;

    // Only save if we have at least one completed quarter with scores
    const hasCompletedQuarters = quarterScores.some(
      (q) => q.home != null && q.away != null,
    );
    if (!hasCompletedQuarters) return;

    const saveQuarterWinners = async () => {
      const { error } = await supabase
        .from("squares")
        .update({ quarter_winners: quarterWinners })
        .eq("id", gridId);

      if (error) {
        console.error(
          "Failed to save quarter_winners:",
          JSON.stringify(error, null, 2),
        );
        return;
      }

      // Award credits for new quarter wins (2+ players required)
      const playerCount = players?.length || 0;
      for (const winner of quarterWinners) {
        if (
          winner.userId &&
          winner.username !== "No Winner" &&
          !creditedQuartersRef.current.has(winner.quarter)
        ) {
          creditedQuartersRef.current.add(winner.quarter);
          recordQuarterWin(winner.userId, playerCount).catch((err) =>
            console.warn("Failed to record quarter win:", err),
          );
        }
      }
    };

    saveQuarterWinners();
  }, [quarterWinners, gridId, quarterScores]);

  useEffect(() => {
    if (!quarterWinners?.length || !Object.keys(playerUsernames).length) return;

    const completedQuarters = quarterScores.filter(
      (q) => q.home != null && q.away != null,
    );

    if (completedQuarters.length === 0) return;

    const totalUnits = blockMode
      ? Math.round(Object.keys(squareColors).length / 4)
      : Object.keys(squareColors).length;
    const liveWinnings = calculatePlayerWinnings(
      quarterWinners.slice(0, completedQuarters.length),
      playerUsernames,
      pricePerSquare,
      totalUnits,
    );

    setWinningsByUser(liveWinnings);
  }, [
    quarterWinners,
    quarterScores,
    playerUsernames,
    pricePerSquare,
    squareColors,
    gameCompleted,
  ]);

  useEffect(() => {
    if (!gameCompleted || !Object.keys(playerUsernames).length) return;

    const finalizeTotalWinnings = async () => {
      const { data: squareData, error: fetchErr } = await supabase
        .from("squares")
        .select(
          "payout_done, winnings_snapshot, winnings_quarters_done, quarter_payouts",
        )
        .eq("id", gridId)
        .single();
      if (fetchErr) return;

      const prevPaidCount = squareData?.winnings_quarters_done ?? 0;

      const completed = quarterScores.filter(
        (q) => q.home != null && q.away != null,
      ).length;
      if (completed <= prevPaidCount) return;

      const nameToUid: Record<string, string> = {};
      Object.entries(playerUsernames).forEach(([uid, name]) => {
        if (typeof name === "string") nameToUid[name.trim()] = uid;
      });

      const newSnapshot: Record<string, number> = {
        ...(squareData?.winnings_snapshot ?? {}),
      };

      for (let i = prevPaidCount; i < completed; i++) {
        const win = quarterWinners[i];
        if (!win || win.username === "No Winner") continue;

        const uid = nameToUid[win.username.trim()];
        if (!uid) continue;

        const storedPayouts: number[] = squareData?.quarter_payouts ?? [];
        const periodsCount = quarterScores.length;
        const claimedNow = blockMode
          ? Math.round(Object.keys(squareColors).length / 4)
          : Object.keys(squareColors).length;
        const fallbackPayout =
          ((pricePerSquare || 0) * claimedNow) / periodsCount;

        const payoutForThisPeriod =
          typeof storedPayouts[i] === "number"
            ? storedPayouts[i]
            : fallbackPayout;

        const cents = Math.round((payoutForThisPeriod + 1e-8) * 100) / 100;

        const { error: incErr } = await supabase.rpc(
          "increment_user_winnings",
          {
            user_id: uid,
            amount_to_add: cents,
          },
        );
        if (!incErr) {
          newSnapshot[uid] = parseFloat(
            ((newSnapshot[uid] ?? 0) + cents).toFixed(2),
          );
        }
      }

      await supabase
        .from("squares")
        .update({
          winnings_snapshot: newSnapshot,
          winnings_quarters_done: completed,
          payout_done: true,
        })
        .eq("id", gridId);
    };

    finalizeTotalWinnings();
  }, [gameCompleted, quarterWinners]);

  // Award badges, credits, and update leaderboard stats for public games
  useEffect(() => {
    if (!gameCompleted || !userId || !quarterWinners?.length) return;

    const awardPublicGameRewards = async () => {
      try {
        // Check if this is a public game
        const { data: squareData } = await supabase
          .from("squares")
          .select("is_public, is_featured, id")
          .eq("id", gridId)
          .single();

        if (!squareData?.is_public) return;

        const isFeaturedGame = !!squareData.is_featured;

        // Find current user's in-game username
        const myUsername = playerUsernames[userId];
        if (!myUsername) return;

        // Count user's quarter wins in this game
        const myWins = quarterWinners.filter(
          (w: any) => w.username?.trim() === myUsername.trim() && w.username !== "No Winner",
        ).length;

        const isSweep = myWins === 4;

        // Upsert leaderboard stats
        const { data: existing } = await supabase
          .from("leaderboard_stats")
          .select("public_quarters_won, public_games_played, public_sweeps")
          .eq("user_id", userId)
          .maybeSingle();

        const prev = existing || { public_quarters_won: 0, public_games_played: 0, public_sweeps: 0 };

        await supabase.from("leaderboard_stats").upsert(
          {
            user_id: userId,
            username: myUsername.trim(),
            public_quarters_won: prev.public_quarters_won + myWins,
            public_games_played: prev.public_games_played + 1,
            public_sweeps: prev.public_sweeps + (isSweep ? 1 : 0),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        // Award credits for every 4 cumulative quarter wins
        const totalWins = prev.public_quarters_won + myWins;
        const prevMilestones = Math.floor(prev.public_quarters_won / 4);
        const newMilestones = Math.floor(totalWins / 4);
        const milestonesEarned = newMilestones - prevMilestones;

        for (let i = 0; i < milestonesEarned; i++) {
          await supabase.from("square_credits").insert({
            user_id: userId,
            earned_from_square_id: gridId,
          });
        }

        // Bonus credit for sweep (extra credit for featured games)
        if (isSweep) {
          const bonusCredits = isFeaturedGame ? 2 : 1;
          for (let i = 0; i < bonusCredits; i++) {
            await supabase.from("square_credits").insert({
              user_id: userId,
              earned_from_square_id: gridId,
            });
          }
        }

        // Award badges
        const totalGames = prev.public_games_played + 1;
        const totalSweeps = prev.public_sweeps + (isSweep ? 1 : 0);

        const badgesToCheck: { type: string; condition: boolean }[] = [
          { type: "first_public_game", condition: true },
          { type: "first_public_win", condition: myWins > 0 },
          { type: "5_wins", condition: totalWins >= 5 },
          { type: "10_public_wins", condition: totalWins >= 10 },
          { type: "25_public_wins", condition: totalWins >= 25 },
          { type: "50_public_wins", condition: totalWins >= 50 },
          { type: "100_public_wins", condition: totalWins >= 100 },
          { type: "sweep", condition: isSweep },
          { type: "double_sweep", condition: totalSweeps >= 2 },
          { type: "5_sweeps", condition: totalSweeps >= 5 },
          { type: "3_games", condition: totalGames >= 3 },
          { type: "social_butterfly", condition: totalGames >= 10 },
          { type: "20_games", condition: totalGames >= 20 },
          { type: "50_games", condition: totalGames >= 50 },
          { type: "credit_earner", condition: milestonesEarned > 0 || isSweep },
          { type: "featured_winner", condition: isFeaturedGame && myWins > 0 },
        ];

        for (const badge of badgesToCheck) {
          if (badge.condition) {
            await supabase
              .from("badges")
              .upsert(
                { user_id: userId, badge_type: badge.type },
                { onConflict: "user_id,badge_type" },
              );
          }
        }
      } catch (err) {
        console.error("Error awarding public game rewards:", err);
      }
    };

    awardPublicGameRewards();
  }, [gameCompleted, quarterWinners, userId]);

  useEffect(() => {
    if (!isFocused || !userId) return;

    const fetchSelectionsAndWinners = async () => {
      const { data, error } = await supabase
        .from("squares")
        .select("quarter_scores, selections")
        .eq("id", gridId)
        .single();

      if (error || !data) return;

      if (data.quarter_scores && data.quarter_scores.length > 0) {
        setQuarterScores((prev) => {
          return data.quarter_scores.map((q, i) => ({
            ...q,
            manual: prev?.[i]?.manual ?? q.manual ?? false,
          }));
        });
      }
      if (data.selections) {
        setSelections(data.selections);
      }
    };

    fetchSelectionsAndWinners();
  }, [refreshKey, gridId, isFocused, xAxis, yAxis]);

  useEffect(() => {
    if (!isFocused) return;

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || null);
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id || null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !userId) return;

    const fetchSquareData = async () => {
      try {
        const { data, error } = await supabase
          .from("squares")
          .select("*")
          .eq("id", gridId)
          .single();

        if (error || !data) return;

        setManualOverride(!!data.manual_override);
        const customGame = !data.event_id;
        setIsCustomGame(customGame);

        // Load persisted game_completed status from database
        if (data.game_completed) {
          setGameCompleted(true);
        }

        // For custom games, load scores from database
        if (customGame && data.quarter_scores) {
          setQuarterScores(data.quarter_scores);
          // Custom games use team1 as home by default
          setIsTeam1Home(true);
        }

        const colorMapping = {};
        const nameMapping = {};

        setTitle(data.title || "");
        setTeam1(data.team1 || "");
        setTeam2(data.team2 || "");
        setFullTeam1(data.team1_full_name || "");
        setFullTeam2(data.team2_full_name || "");

        setTeam1Mascot(data.team1?.split(" ").slice(-1)[0]);
        setTeam2Mascot(data.team2?.split(" ").slice(-1)[0]);
        setSelections(data.selections || []);

        if (data.players) {
          setPlayers(data.players);
          data.players.forEach((p) => {
            colorMapping[p.userId] = p.color || "#999";
            nameMapping[p.userId] = p.username || p.userId;
          });
          setPlayerColors(colorMapping);
          setPlayerUsernames(nameMapping);
        }

        if (data.selections) {
          const squareMap = {};
          data.selections.forEach((sel) => {
            const id = `${sel.x},${sel.y}`;
            squareMap[id] = colorMapping[sel.userId] || "#999";
          });
          setSquareColors(squareMap);

          if (userId) {
            const mySelections = data.selections.filter(
              (s) => s.userId === userId,
            );
            const mySet = new Set(mySelections.map((s) => `${s.x},${s.y}`));
            const allPendingResolved = [...pendingSquares].every((sq) =>
              mySet.has(sq),
            );
            if (allPendingResolved || pendingSquares.size === 0) {
              setSelectedSquares(mySet);
              setPendingSquares(new Set());
            }
          }
        }

        setXAxis(
          data.x_axis?.length === 10 ? data.x_axis : [...Array(10).keys()],
        );
        setYAxis(
          data.y_axis?.length === 10 ? data.y_axis : [...Array(10).keys()],
        );

        setCreatedBy(data.created_by);
        if (data.created_by === userId) setIsOwner(true);
        if (data.deadline) setDeadlineValue(new Date(data.deadline));
        setMaxSelections(data.max_selection);
        if (typeof data.axis_hidden === "boolean")
          setHideAxisUntilDeadline(data.axis_hidden);
        setBlockMode(!!data.block_mode);
      } finally {
        setTimeout(() => setSquareDataLoaded(true), 300);
      }
    };

    fetchSquareData();
  }, [gridId, userId, refreshKey, isFocused]);

  useEffect(() => {
    if (!isFocused) return;
    if (!deadlineValue) return;

    const updateDeadlineState = () => {
      const now = new Date();
      const isPast = now > deadlineValue;
      setIsAfterDeadline(isPast);
    };

    updateDeadlineState();

    const interval = setInterval(updateDeadlineState, 1000);

    return () => clearInterval(interval);
  }, [deadlineValue]);

  useEffect(() => {
    if (!isFocused) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Skip API score fetching for custom games
    if (isCustomGame) {
      if (!scoresLoaded) setScoresLoaded(true);
      return;
    }

    if (!eventId || !deadlineValue) {
      if (!scoresLoaded) setScoresLoaded(true);
      return;
    }

    let manualOverride = false;

    const checkOverride = async () => {
      const { data } = await supabase
        .from("squares")
        .select("manual_override")
        .eq("id", gridId)
        .single();

      manualOverride = data?.manual_override || false;
    };

    let interval: NodeJS.Timeout | null = null;

    const fetchQuarterScores = async () => {
      const startDate = deadlineValue.toISOString().split("T")[0];

      const now = new Date();
      if (now < new Date(deadlineValue)) {
        if (!scoresLoaded) setScoresLoaded(true);
        return;
      }
      await checkOverride();
      if (manualOverride) {
        console.log("⚙️ Manual override active – skipping API overwrite");
        return;
      }
      setRefreshingScores(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}/apisports/scores?eventId=${eventId}&league=${league}&startDate=${startDate}&team1=${team1}&team2=${team2}`,
        );

        const text = await res.text();
        if (text.startsWith("<"))
          throw new Error("Received HTML instead of JSON");
        const game = JSON.parse(text);
        if (!game || !game.id)
          throw new Error("Invalid game data from backend");

        if (!scoresLoaded) {
          setScoresLoaded(true);
        }

        const apiScores = game?.quarterScores ?? [];
        const isCompleted = game?.completed ?? false;

        // Infer completion: if all 4 quarters have scores and deadline was 1+ hour ago
        const allQuartersHaveScores =
          apiScores.length >= 4 &&
          apiScores
            .slice(0, 4)
            .every(
              (q: { home: number | null; away: number | null }) =>
                q.home !== null && q.away !== null,
            );
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const gameStartedOverOneHourAgo =
          deadlineValue && deadlineValue.getTime() < oneHourAgo;
        const inferredCompleted =
          allQuartersHaveScores && gameStartedOverOneHourAgo;

        // Only update gameCompleted if API says it's complete OR we can infer it
        // Don't overwrite a true value with false (preserves DB-loaded state)
        if (isCompleted || inferredCompleted) {
          setGameCompleted(true);
          // Persist to database
          await supabase
            .from("squares")
            .update({ game_completed: true })
            .eq("id", gridId);
        }

        const homeAbbrev = game?.team2_abbr?.toLowerCase();
        setIsTeam1Home(homeAbbrev === team1.toLowerCase());

        const { data: dbData } = await supabase
          .from("squares")
          .select("quarter_scores")
          .eq("id", gridId)
          .single();

        const dbScores = dbData?.quarter_scores ?? [];
        if (
          isCompleted &&
          apiScores.length > 0 &&
          (!Array.isArray(dbData?.quarter_scores) ||
            dbData.quarter_scores.length === 0)
        ) {
          const { error } = await supabase
            .from("squares")
            .update({ quarter_scores: apiScores })
            .eq("id", gridId);

          if (!error) {
            console.log("✅ Saved quarter_scores to Supabase");
          }
        }

        const completedCount = game?.completedQuarters ?? 0;
        const visibleScores = isCompleted
          ? (game?.quarterScores ?? [])
          : (game?.quarterScores?.slice(0, completedCount) ?? []);

        setQuarterScores((prevScores) => {
          if (!Array.isArray(prevScores) || prevScores.length === 0)
            return visibleScores;

          const merged = prevScores.map((prev, i) => {
            const apiQ = visibleScores[i];
            if (!apiQ) return prev;

            if (prev.manual) return prev;

            const homeChanged =
              typeof apiQ.home === "number" &&
              (prev.home == null || apiQ.home > prev.home);
            const awayChanged =
              typeof apiQ.away === "number" &&
              (prev.away == null || apiQ.away > prev.away);

            return {
              ...prev,
              home: homeChanged ? apiQ.home : prev.home,
              away: awayChanged ? apiQ.away : prev.away,
            };
          });

          return merged;
        });
      } catch (e) {
        Sentry.captureException(e);
        console.warn("Error fetching quarter scores", e);
      } finally {
        setRefreshingScores(false);
      }
    };

    if (isFocused) {
      fetchQuarterScores();
      interval = setInterval(fetchQuarterScores, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocused, eventId, deadlineValue, refreshKey, isCustomGame]);

  const playerList = useMemo(
    () => Object.entries(playerColors),
    [playerColors],
  );

  const handleLeaveSquare = () => {
    openAnimatedDialog(setShowLeaveConfirm, leaveAnim);
  };

  const handleDeleteSquare = () => {
    openAnimatedDialog(setShowDeleteConfirm, deleteAnim);
  };

  const handleDeadlineChange = async (event, selectedDate) => {
    const notifySettings = players.find((p) => p.userId === userId)
      ?.notifySettings ?? {
      deadlineReminders: false,
      playerJoined: false,
      playerLeft: false,
      squareDeleted: false,
    };

    if (!selectedDate || selectedDate.getTime() === deadlineValue?.getTime())
      return;

    const safeDeadline =
      typeof selectedDate === "string"
        ? new Date(selectedDate)
        : selectedDate instanceof Date
          ? selectedDate
          : null;

    if (!safeDeadline || isNaN(safeDeadline.getTime())) {
      console.warn("Invalid deadline:", selectedDate);
      return;
    }
    setDeadlineValue(safeDeadline);
    try {
      await supabase
        .from("squares")
        .update({ deadline: safeDeadline.toISOString() })
        .eq("id", gridId);

      await scheduleNotifications(selectedDate, gridId, notifySettings);
    } catch (err) {
      Sentry.captureException(err);
      console.error("Error updating deadline:", err);
    }
  };

  const handleSaveManualScores = async (scores: {
    quarters: { team1: string; team2: string; completed?: boolean }[];
    overtimes: { team1: string; team2: string; completed?: boolean }[];
  }) => {
    try {
      // Convert string scores to the format expected by the app
      const allScores = [...scores.quarters, ...scores.overtimes];
      const formattedScores = allScores.map((s) => ({
        home: s.team1 ? parseInt(s.team1, 10) : null,
        away: s.team2 ? parseInt(s.team2, 10) : null,
        manual: true,
        completed: !!s.completed,
      }));

      // Update local state
      setQuarterScores(formattedScores);

      // Save to database
      const { error } = await supabase
        .from("squares")
        .update({
          quarter_scores: formattedScores,
          manual_override: true,
        })
        .eq("id", gridId);

      if (error) {
        console.error("Error saving scores:", error);
        Toast.show({
          type: "error",
          text1: "Failed to save scores",
          position: "bottom",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Scores saved successfully",
          position: "bottom",
        });
        // Trigger refresh to recalculate winners
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error("Error saving manual scores:", err);
    }
  };

  const handleAddGuestPlayer = async (guestPlayer: {
    userId: string;
    username: string;
    color: string;
    displayType: "color" | "icon" | "initial";
    displayValue?: string;
    isGuest: boolean;
    addedBy: string;
  }) => {
    try {
      // Fetch current players
      const { data, error } = await supabase
        .from("squares")
        .select("players")
        .eq("id", gridId)
        .single();

      if (error || !data) {
        console.error("Failed to fetch players:", error);
        Toast.show({
          type: "error",
          text1: "Failed to add guest player",
          text2: error?.message || "Could not fetch players",
          position: "bottom",
        });
        return;
      }

      const updatedPlayers = [...(data.players || []), guestPlayer];
      // Don't add guest IDs to player_ids - that column expects valid UUIDs only

      const { error: updateError } = await supabase
        .from("squares")
        .update({
          players: updatedPlayers,
        })
        .eq("id", gridId);

      if (updateError) {
        console.error("Failed to update players:", updateError);
        Toast.show({
          type: "error",
          text1: "Failed to add guest player",
          text2: updateError?.message,
          position: "bottom",
        });
      } else {
        Toast.show({
          type: "success",
          text1: `${guestPlayer.username} added as guest`,
          position: "bottom",
        });
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error("Error adding guest player:", err);
      Toast.show({
        type: "error",
        text1: "Failed to add guest player",
        text2: String(err),
        position: "bottom",
      });
    }
  };

  const handleAssignSquareToPlayer = async (x: number, y: number) => {
    const player = assignModePlayerRef.current;
    if (!player) return;

    const key = `${x},${y}`;

    // Check if square is already claimed
    if (squareColors[key]) {
      Toast.show({
        type: "error",
        text1: "Square already claimed",
        position: "bottom",
      });
      return;
    }

    const assignToUserId = player.userId;
    const isGuestPlayer = assignToUserId.startsWith("guest_");

    try {
      if (isGuestPlayer) {
        // For guest players, directly update the selections array
        const { data, error: fetchError } = await supabase
          .from("squares")
          .select("selections")
          .eq("id", gridId)
          .single();

        if (fetchError || !data) {
          console.error("Failed to fetch selections:", fetchError);
          Toast.show({
            type: "error",
            text1: "Failed to assign square",
            text2: fetchError?.message,
            position: "bottom",
          });
          return;
        }

        const newSelection = {
          oddsId: null,
          oddsStatus: "unknown",
          oddsUpdatedAt: new Date().toISOString(),
          oddsValue: null,
          oddsBookmaker: null,
          oddsType: null,
          x,
          y,
          oddsDescription: null,
          userId: assignToUserId,
        };

        const updatedSelections = [...(data.selections || []), newSelection];

        const { error: updateError } = await supabase
          .from("squares")
          .update({ selections: updatedSelections })
          .eq("id", gridId);

        if (updateError) {
          console.error("Failed to update selections:", updateError);
          Toast.show({
            type: "error",
            text1: "Failed to assign square",
            text2: updateError?.message,
            position: "bottom",
          });
        } else {
          Toast.show({
            type: "success",
            text1: `Square assigned to ${player.username}`,
            position: "bottom",
            visibilityTime: 1500,
          });
          setRefreshKey((prev) => prev + 1);
        }
      } else {
        // For regular users, use the RPC
        const { error } = await supabase.rpc("add_selection", {
          grid_id: gridId,
          new_selection: {
            x,
            y,
            userId: assignToUserId,
            username: player.username,
          },
        });

        if (error) {
          console.error("RPC add_selection error:", error);
          Toast.show({
            type: "error",
            text1: "Failed to assign square",
            text2: error?.message,
            position: "bottom",
          });
        } else {
          Toast.show({
            type: "success",
            text1: `Square assigned to ${player.username}`,
            position: "bottom",
            visibilityTime: 1500,
          });
          setRefreshKey((prev) => prev + 1);
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error("Error assigning square:", err);
      Toast.show({
        type: "error",
        text1: "Failed to assign square",
        text2: String(err),
        position: "bottom",
      });
    }
  };

  const handleUnassignSquare = async (x: number, y: number) => {
    const key = `${x},${y}`;
    const color = squareColors[key];
    if (!color) return;

    const ownerEntry = Object.entries(playerColors).find(([, c]) => c === color);
    if (!ownerEntry) return;
    const [ownerUserId] = ownerEntry;
    const ownerUsername = playerUsernames[ownerUserId] || "";
    const isGuestOwner = ownerUserId.startsWith("guest_");

    try {
      if (isGuestOwner) {
        const { data, error } = await supabase
          .from("squares")
          .select("selections")
          .eq("id", gridId)
          .single();
        if (error || !data) throw error;
        const updated = (data.selections || []).filter(
          (s: any) => !(s.x === x && s.y === y),
        );
        await supabase.from("squares").update({ selections: updated }).eq("id", gridId);
      } else {
        await supabase.rpc("remove_selection", {
          grid_id: gridId,
          selection_to_remove: { x, y, userId: ownerUserId, username: ownerUsername },
        });
      }
      Toast.show({ type: "success", text1: "Square removed", position: "bottom", visibilityTime: 1500 });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error unassigning square:", err);
      Toast.show({ type: "error", text1: "Failed to unassign square", position: "bottom" });
    }
  };

  const handleUnassignBlock = async (squares: { x: number; y: number }[]) => {
    if (squares.length === 0) return;
    // Determine owner from the first square's color
    const firstKey = `${squares[0].x},${squares[0].y}`;
    const color = squareColors[firstKey];
    if (!color) return;
    const ownerEntry = Object.entries(playerColors).find(([, c]) => c === color);
    if (!ownerEntry) return;
    const [ownerUserId] = ownerEntry;
    const ownerUsername = playerUsernames[ownerUserId] || "";
    const isGuestOwner = ownerUserId.startsWith("guest_");

    try {
      if (isGuestOwner) {
        // Single fetch → remove all → single write (avoids race condition)
        const { data, error } = await supabase
          .from("squares")
          .select("selections")
          .eq("id", gridId)
          .single();
        if (error || !data) throw error;
        const coordSet = new Set(squares.map((sq) => `${sq.x},${sq.y}`));
        const updated = (data.selections || []).filter(
          (s: any) => !coordSet.has(`${s.x},${s.y}`),
        );
        await supabase.from("squares").update({ selections: updated }).eq("id", gridId);
      } else {
        await Promise.all(
          squares.map((sq) =>
            supabase.rpc("remove_selection", {
              grid_id: gridId,
              selection_to_remove: { x: sq.x, y: sq.y, userId: ownerUserId, username: ownerUsername },
            }),
          ),
        );
      }
      Toast.show({ type: "success", text1: "Block removed", position: "bottom", visibilityTime: 1500 });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error unassigning block:", err);
      Toast.show({ type: "error", text1: "Failed to unassign block", position: "bottom" });
    }
  };

  const handleAssignBlockToPlayer = async (x: number, y: number) => {
    const player = assignModePlayerRef.current;
    if (!player) return;
    const blockSquares = getBlockSquares(x, y);

    // Check all 4 are empty
    for (const sq of blockSquares) {
      if (squareColors[`${sq.x},${sq.y}`]) {
        Toast.show({ type: "error", text1: "A square in this block is already claimed", position: "bottom" });
        return;
      }
    }

    const assignToUserId = player.userId;
    const isGuestPlayer = assignToUserId.startsWith("guest_");

    try {
      if (isGuestPlayer) {
        const { data, error } = await supabase
          .from("squares")
          .select("selections")
          .eq("id", gridId)
          .single();
        if (error || !data) throw error;
        const now = new Date().toISOString();
        const newSelections = blockSquares.map((sq) => ({
          oddsId: null, oddsStatus: "unknown", oddsUpdatedAt: now,
          oddsValue: null, oddsBookmaker: null, oddsType: null,
          x: sq.x, y: sq.y, oddsDescription: null, userId: assignToUserId,
        }));
        const { error: updateError } = await supabase
          .from("squares")
          .update({ selections: [...(data.selections || []), ...newSelections] })
          .eq("id", gridId);
        if (updateError) throw updateError;
      } else {
        await Promise.all(
          blockSquares.map((sq) =>
            supabase.rpc("add_selection", {
              grid_id: gridId,
              new_selection: { x: sq.x, y: sq.y, userId: assignToUserId, username: player.username },
            }),
          ),
        );
      }
      Toast.show({ type: "success", text1: `Block assigned to ${player.username}`, position: "bottom", visibilityTime: 1500 });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error assigning block:", err);
      Toast.show({ type: "error", text1: "Failed to assign block", position: "bottom" });
    }
  };

  const formatTimeLeft = (targetDate: Date, now: Date = new Date()) => {
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) return "Deadline passed";

    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const showSquareToast = (message: string) => {
    Toast.hide();

    setTimeout(() => {
      Toast.show({
        type: "info",
        text1: message,
        position: "bottom",
        visibilityTime: 2500,
        autoHide: true,
        bottomOffset: 60,
        text1Style: {
          fontSize: 15,
          fontWeight: "600",
          color: theme.colors.onSurface,
          textAlign: "center",
        },
      });
    }, 100);
  };

  const handleSquarePress = (x: number, y: number) => {
    const key = `${x},${y}`;
    const userColor = squareColors[key];
    const squareUserId = Object.entries(playerColors).find(
      ([, color]) => color === userColor,
    )?.[0];
    const username = playerUsernames[squareUserId];
    const xLabel = xAxis[x];
    const yLabel = yAxis[y];

    // Check if this square won any quarters
    const winningQuartersData = quarterWinners
      .map((w, idx) => {
        if (!w || !w.square) return null;
        const [scoreX, scoreY] = w.square;
        if (scoreX === xLabel && scoreY === yLabel) {
          const quarterScore = quarterScores[idx];
          const totalUnitsForPayout = blockMode
            ? Math.round(Object.keys(squareColors).length / 4)
            : Object.keys(squareColors).length;
          const payoutPerQuarter =
            pricePerSquare && totalUnitsForPayout > 0
              ? (pricePerSquare * totalUnitsForPayout) / quarterScores.length
              : 0;

          return {
            label: idx < 4 ? `Quarter ${idx + 1}` : `Overtime ${idx - 3}`,
            score: quarterScore
              ? `${team1Mascot} ${isTeam1Home ? quarterScore.home : quarterScore.away} - ${team2Mascot} ${isTeam1Home ? quarterScore.away : quarterScore.home}`
              : "Score pending",
            payout: payoutPerQuarter,
          };
        }
        return null;
      })
      .filter(Boolean);

    // If this is a winning square, show the detailed modal
    if (winningQuartersData.length > 0) {
      // If no owner, this is effectively "No Winner" for payout purposes
      const isUnclaimed = !userColor || !username;
      const totalWinnings = isUnclaimed
        ? 0
        : winningQuartersData.reduce((sum, q) => sum + q.payout, 0);

      setWinnerModalData({
        username: isUnclaimed ? "No Winner" : username,
        userColor: userColor || "#888888",
        winningQuarters: winningQuartersData.map((q) => ({
          ...q,
          payout: isUnclaimed ? 0 : q.payout,
        })),
        totalWinnings,
        squareCoords: [xLabel, yLabel],
      });
      setWinnerModalVisible(true);
      return;
    }

    // For non-winning squares, show the simple toast
    let message: string;
    if (userColor && username) {
      message = `${username} • (${xLabel}, ${yLabel})`;
    } else {
      message = `Unclaimed • (${xLabel}, ${yLabel})`;
    }

    showSquareToast(message);
  };

  // ✨ Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // ✨ Refresh data when returning from EditSquareScreen or other screens
  useFocusEffect(
    useCallback(() => {
      // Trigger refresh when screen gains focus (e.g., returning from edit)
      setRefreshKey((k) => k + 1);
    }, []),
  );

  useLayoutEffect(() => {
    if (!isFocused) return;
    navigation.setOptions({
      headerTitle: () => (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
            color: theme.colors.onBackground,
            fontFamily: "Rubik_600SemiBold",
            maxWidth: Dimensions.get("window").width * 0.7,
          }}
        >
          {title || inputTitle}
        </Text>
      ),

      gestureEnabled: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Main")}
          style={styles.headerButton}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() =>
              (navigation as any).navigate("CommentsScreen", {
                gridId,
                title: title || inputTitle,
                isOwner,
              })
            }
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chat-bubble-outline" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSessionOptionsVisible(true)}
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="more-vert" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, isOwner, inputTitle, title, isFocused]);

  const selectSquareInSupabase = async (x, y) => {
    await supabase.rpc("add_selection", {
      grid_id: gridId,
      new_selection: { x, y, userId, username: currentUsername },
    });
  };

  const deselectSquareInSupabase = async (x, y) => {
    await supabase.rpc("remove_selection", {
      grid_id: gridId,
      selection_to_remove: { x, y, userId, username: currentUsername },
    });
  };

  const getBlockSquares = useCallback((x: number, y: number) => {
    const bx = Math.floor(x / 2) * 2;
    const by = Math.floor(y / 2) * 2;
    return [
      { x: bx, y: by },
      { x: bx + 1, y: by },
      { x: bx, y: by + 1 },
      { x: bx + 1, y: by + 1 },
    ];
  }, []);

  const countSelectedBlocks = useCallback((squares: Set<string>) => {
    const blockOrigins = new Set<string>();
    squares.forEach((sq) => {
      const [sx, sy] = sq.split(",").map(Number);
      const bx = Math.floor(sx / 2) * 2;
      const by = Math.floor(sy / 2) * 2;
      blockOrigins.add(`${bx},${by}`);
    });
    return blockOrigins.size;
  }, []);

  const lastPressTime = useRef<Record<string, number>>({});
  const lastLongPressKey = useRef<string | null>(null);

  const handlePress = useCallback(
    async (x, y) => {
      const squareId = `${x},${y}`;
      const now = Date.now();

      if (
        lastPressTime.current[squareId] &&
        now - lastPressTime.current[squareId] < 400
      ) {
        return;
      }
      lastPressTime.current[squareId] = now;

      if (blockMode) {
        // Block mode: select/deselect a 2x2 block
        const blockSquares = getBlockSquares(x, y);
        const blockIds = blockSquares.map((s) => `${s.x},${s.y}`);

        // Check if any square in the block is owned by someone else
        for (const bid of blockIds) {
          const color = squareColors[bid];
          if (color && color !== playerColors[userId]) {
            const ownerKey = Object.entries(playerColors).find(
              ([, c]) => c === color,
            )?.[0];
            showSquareToast(
              `${playerUsernames[ownerKey] || "Someone"} owns a square in this block`,
            );
            return;
          }
        }

        const isSelected = selectedSquares.has(blockIds[0]);
        const updatedSet = new Set(selectedSquares);

        if (
          !isSelected &&
          countSelectedBlocks(selectedSquares) >= maxSelections
        ) {
          showSquareToast(`Limit reached: ${maxSelections} blocks max`);
          return;
        }

        // Optimistic UI update
        if (isSelected) {
          for (const bid of blockIds) {
            updatedSet.delete(bid);
          }
          const newColors = { ...squareColors };
          for (const bid of blockIds) {
            delete newColors[bid];
          }
          setSquareColors(newColors);
          setSelections((prev) =>
            prev.filter(
              (s) =>
                !(
                  blockSquares.some((bs) => bs.x === s.x && bs.y === s.y) &&
                  s.userId === userId
                ),
            ),
          );
          setSelectedSquares(updatedSet);
          // Run RPC in background
          Promise.all(
            blockSquares.map((sq) => deselectSquareInSupabase(sq.x, sq.y)),
          )
            .catch(() => {
              // Revert UI and show Toast
              setSquareColors((prev) => {
                const reverted = { ...prev };
                for (const bid of blockIds) {
                  reverted[bid] = playerColors[userId];
                }
                return reverted;
              });
              setSelections((prev) => [
                ...prev,
                ...blockSquares.map((sq) => ({
                  x: sq.x,
                  y: sq.y,
                  userId,
                  username: currentUsername,
                })),
              ]);
              setSelectedSquares((prev) => {
                const reverted = new Set(prev);
                for (const bid of blockIds) {
                  reverted.add(bid);
                }
                return reverted;
              });
              showSquareToast("Failed to deselect block. Please try again.");
            })
            .finally(() => {
              setPendingSquares((prev) => {
                const cleared = new Set(prev);
                for (const bid of blockIds) {
                  cleared.delete(bid);
                }
                return cleared;
              });
            });
        } else {
          for (const bid of blockIds) {
            updatedSet.add(bid);
          }
          setSquareColors((prev) => {
            const updated = { ...prev };
            for (const bid of blockIds) {
              updated[bid] = playerColors[userId];
            }
            return updated;
          });
          setSelections((prev) => [
            ...prev,
            ...blockSquares.map((sq) => ({
              x: sq.x,
              y: sq.y,
              userId,
              username: currentUsername,
            })),
          ]);
          setSelectedSquares(updatedSet);
          // Run RPC in background
          Promise.all(
            blockSquares.map((sq) => selectSquareInSupabase(sq.x, sq.y)),
          )
            .catch(() => {
              // Revert UI and show Toast
              setSquareColors((prev) => {
                const reverted = { ...prev };
                for (const bid of blockIds) {
                  delete reverted[bid];
                }
                return reverted;
              });
              setSelections((prev) =>
                prev.filter(
                  (s) =>
                    !(
                      blockSquares.some((bs) => bs.x === s.x && bs.y === s.y) &&
                      s.userId === userId
                    ),
                ),
              );
              setSelectedSquares((prev) => {
                const reverted = new Set(prev);
                for (const bid of blockIds) {
                  reverted.delete(bid);
                }
                return reverted;
              });
              showSquareToast("Failed to select block. Please try again.");
            })
            .finally(() => {
              setPendingSquares((prev) => {
                const cleared = new Set(prev);
                for (const bid of blockIds) {
                  cleared.delete(bid);
                }
                return cleared;
              });
            });
        }
        setPendingSquares((prev) => {
          const newSet = new Set(prev);
          for (const bid of blockIds) {
            newSet.add(bid);
          }
          return newSet;
        });
      } else {
        // Normal mode: select/deselect individual square
        const currentColor = squareColors[squareId];

        if (currentColor && currentColor !== playerColors[userId]) {
          const username = Object.entries(playerColors).find(
            ([, color]) => color === currentColor,
          )?.[0];
          showSquareToast(
            `${playerUsernames[username] || "Someone"} owns this square`,
          );
          return;
        }

        const isSelected = selectedSquares.has(squareId);
        const updatedSet = new Set(selectedSquares);

        if (!isSelected && selectedSquares.size >= maxSelections) {
          showSquareToast(`Limit reached: ${maxSelections} squares max`);
          return;
        }

        // Optimistic UI update
        if (isSelected) {
          updatedSet.delete(squareId);
          const newColors = { ...squareColors };
          delete newColors[squareId];
          setSquareColors(newColors);
          setSelections((prev) =>
            prev.filter(
              (s) => !(s.x === x && s.y === y && s.userId === userId),
            ),
          );
          setSelectedSquares(updatedSet);
          // Run RPC in background
          deselectSquareInSupabase(x, y)
            .catch(() => {
              // Revert UI and show Toast
              setSquareColors((prev) => ({
                ...prev,
                [squareId]: playerColors[userId],
              }));
              setSelections((prev) => [
                ...prev,
                { x, y, userId, username: currentUsername },
              ]);
              setSelectedSquares((prev) => {
                const reverted = new Set(prev);
                reverted.add(squareId);
                return reverted;
              });
              showSquareToast("Failed to deselect square. Please try again.");
            })
            .finally(() => {
              setPendingSquares((prev) => {
                const cleared = new Set(prev);
                cleared.delete(squareId);
                return cleared;
              });
            });
        } else {
          updatedSet.add(squareId);
          setSquareColors((prev) => ({
            ...prev,
            [squareId]: playerColors[userId],
          }));
          setSelections((prev) => [
            ...prev,
            { x, y, userId, username: currentUsername },
          ]);
          setSelectedSquares(updatedSet);
          // Run RPC in background
          selectSquareInSupabase(x, y)
            .catch(() => {
              // Revert UI and show Toast
              setSquareColors((prev) => {
                const reverted = { ...prev };
                delete reverted[squareId];
                return reverted;
              });
              setSelections((prev) =>
                prev.filter(
                  (s) => !(s.x === x && s.y === y && s.userId === userId),
                ),
              );
              setSelectedSquares((prev) => {
                const reverted = new Set(prev);
                reverted.delete(squareId);
                return reverted;
              });
              showSquareToast("Failed to select square. Please try again.");
            })
            .finally(() => {
              setPendingSquares((prev) => {
                const cleared = new Set(prev);
                cleared.delete(squareId);
                return cleared;
              });
            });
        }
        setPendingSquares((prev) => {
          const newSet = new Set(prev);
          newSet.add(squareId);
          return newSet;
        });
      }
    },
    [
      squareColors,
      playerColors,
      userId,
      selectedSquares,
      deselectSquareInSupabase,
      selectSquareInSupabase,
      playerUsernames,
      maxSelections,
      blockMode,
      getBlockSquares,
      countSelectedBlocks,
      currentUsername,
    ],
  );

  useEffect(() => {
    if (!isFocused || !userId || !gridId) return;

    let isCancelled = false;

    const fetchSelections = async () => {
      // Skip polling while there are pending select/deselect operations
      // to avoid overwriting optimistic UI updates
      if (pendingSquares.size > 0) return;

      const { data, error } = await supabase
        .from("squares")
        .select("selections")
        .eq("id", gridId)
        .single();

      if (isCancelled || error || !data?.selections) return;

      const mySelections = data.selections.filter(
        (sel) => sel.userId === userId,
      );
      const mySet = new Set(mySelections.map((sel) => `${sel.x},${sel.y}`));
      // Only update if selections actually changed to avoid unnecessary re-renders
      setSelectedSquares((prev) => {
        if (prev.size !== mySet.size) return mySet;
        for (const key of prev) {
          if (!mySet.has(key)) return mySet;
        }
        return prev;
      });
    };

    fetchSelections();

    const interval = setInterval(fetchSelections, 5000);

    return () => {
      clearInterval(interval);
      isCancelled = true;
    };
  }, [userId, gridId, isFocused]);

  const dividerColor = theme.dark ? "#2a2a2a" : "#e8e8e8";

  // Build a lookup from square key to the player who owns it
  const squarePlayerMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (selections && players) {
      selections.forEach((sel) => {
        const key = `${sel.x},${sel.y}`;
        const player = players.find((p) => p.userId === sel.userId);
        if (player) map[key] = player;
      });
    }
    return map;
  }, [selections, players]);

  // ✨ Improved grid rendering with better visual feedback
  const renderSquareGrid = ({
    editable,
    onSquarePress,
  }: {
    editable: boolean;
    onSquarePress: (x: number, y: number) => void;
  }) => {
    const numberColor = isDark ? "#f0f0f0" : "#1a1a1a";
    const axisSquareColor = isDark ? "#1a1a1a" : "#f5f5f5";
    const selectedBorderColor = theme.colors.primary;
    const defaultSquareColor = isDark ? "#252525" : "#ffffff";

    const winningSquares = new Set(
      quarterWinners
        .map((w) => {
          if (!w || !w.square) return null;

          const [scoreX, scoreY] = w.square;
          const visualX = xAxis.findIndex((val) => val === scoreX);
          const visualY = yAxis.findIndex((val) => val === scoreY);

          if (visualX === -1 || visualY === -1) return null;
          return `${visualX},${visualY}`;
        })
        .filter(Boolean),
    );

    const rows = [];

    for (let y = 0; y <= 10; y++) {
      const row = [];
      for (let x = 0; x <= 10; x++) {
        if (x === 0 && y === 0) {
          row.push(
            <View
              key="corner"
              style={[
                dynamicStyles.square,
                {
                  backgroundColor: axisSquareColor,
                  borderTopLeftRadius: 8,
                },
              ]}
            />,
          );
        } else if (y === 0) {
          row.push(
            <View
              key={`x-${x}`}
              style={[
                dynamicStyles.square,
                {
                  backgroundColor: axisSquareColor,
                  borderTopRightRadius: x === 10 ? 8 : 0,
                },
              ]}
            >
              <Text style={[dynamicStyles.axisText, { color: numberColor }]}>
                {!hideAxisUntilDeadline || isAfterDeadline ? xAxis[x - 1] : "?"}
              </Text>
            </View>,
          );
        } else if (x === 0) {
          row.push(
            <View
              key={`y-${y}`}
              style={[
                dynamicStyles.square,
                {
                  backgroundColor: axisSquareColor,
                  borderBottomLeftRadius: y === 10 ? 8 : 0,
                },
              ]}
            >
              <Text style={[dynamicStyles.axisText, { color: numberColor }]}>
                {!hideAxisUntilDeadline || isAfterDeadline ? yAxis[y - 1] : "?"}
              </Text>
            </View>,
          );
        } else {
          const key = `${x - 1},${y - 1}`;
          const baseColor = squareColors[key] || defaultSquareColor;
          const squarePlayer = squarePlayerMap[key];
          const displayType = squarePlayer?.displayType || "color";
          const displayValue = squarePlayer?.displayValue;
          const hasCustomDisplay =
            squareColors[key] &&
            (displayType === "icon" || displayType === "initial");
          const color = hasCustomDisplay
            ? tinycolor(baseColor).setAlpha(0.3).toRgbString()
            : baseColor;
          const isSelected = selectedSquares.has(key);
          const isWinner = winningSquares.has(key);

          // In block mode, determine which edges are outer vs inner within the 2x2 block
          const blockBorderStyle = blockMode
            ? (() => {
                const gx = x - 1; // grid coordinate (0-9)
                const gy = y - 1;
                const isLeftInBlock = gx % 2 === 0;
                const isTopInBlock = gy % 2 === 0;
                if (isSelected) {
                  const lightBorder = isDark ? "#555" : "#ccc";
                  return {
                    borderLeftWidth: isLeftInBlock ? 2.5 : 1,
                    borderRightWidth: isLeftInBlock ? 1 : 2.5,
                    borderTopWidth: isTopInBlock ? 2.5 : 1,
                    borderBottomWidth: isTopInBlock ? 1 : 2.5,
                    borderLeftColor: isLeftInBlock
                      ? selectedBorderColor
                      : lightBorder,
                    borderRightColor: isLeftInBlock
                      ? lightBorder
                      : selectedBorderColor,
                    borderTopColor: isTopInBlock
                      ? selectedBorderColor
                      : lightBorder,
                    borderBottomColor: isTopInBlock
                      ? lightBorder
                      : selectedBorderColor,
                  };
                }
                // Unselected: show outer block borders to outline 2x2 groups
                const outerBorder = isDark ? "#666" : "#999";
                const innerBorder = isDark ? "#333" : "#e0e0e0";
                return {
                  borderLeftWidth: isLeftInBlock ? 1.5 : 0.5,
                  borderRightWidth: isLeftInBlock ? 0.5 : 1.5,
                  borderTopWidth: isTopInBlock ? 1.5 : 0.5,
                  borderBottomWidth: isTopInBlock ? 0.5 : 1.5,
                  borderLeftColor: isLeftInBlock ? outerBorder : innerBorder,
                  borderRightColor: isLeftInBlock ? innerBorder : outerBorder,
                  borderTopColor: isTopInBlock ? outerBorder : innerBorder,
                  borderBottomColor: isTopInBlock ? innerBorder : outerBorder,
                };
              })()
            : {};

          row.push(
            <Pressable
              key={key}
              style={({ pressed }) => [
                dynamicStyles.square,
                {
                  backgroundColor: color,
                  borderColor: isWinner
                    ? "#FFD700"
                    : isSelected
                      ? selectedBorderColor
                      : isDark
                        ? "#333"
                        : "#e0e0e0",
                  borderWidth: isWinner ? 3 : isSelected ? 2.5 : 1,
                  overflow: "visible",
                  zIndex: isWinner ? 10 : 0,
                  elevation: isWinner ? 10 : 0,
                  opacity: pressed ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  borderBottomRightRadius: x === 10 && y === 10 ? 8 : 0,
                  // blockBorderStyle uses per-side colors that would override borderColor shorthand,
                  // so skip it for winning squares to preserve the gold border
                  ...(blockMode && !isWinner ? blockBorderStyle : {}),
                  // Ensure winner's per-side colors are all gold (overrides any inherited per-side colors)
                  ...(isWinner ? {
                    borderLeftColor: "#FFD700",
                    borderRightColor: "#FFD700",
                    borderTopColor: "#FFD700",
                    borderBottomColor: "#FFD700",
                  } : {}),
                },
                isSelected && styles.selectedSquare,
              ]}
              onPress={() => {
                // Suppress the press that fires immediately after a long press on the same cell
                if (lastLongPressKey.current === key) {
                  lastLongPressKey.current = null;
                  return;
                }
                const ax = x - 1;
                const ay = y - 1;
                // Assign mode: owner managing squares on behalf of players
                if (assignMode && isOwner) {
                  const currentPlayer = assignModePlayerRef.current;
                  const playerColor = currentPlayer ? playerColors[currentPlayer.userId] : null;
                  if (blockMode) {
                    const blockSquares = getBlockSquares(ax, ay);
                    // Only interact with squares belonging to the current assign-mode player
                    const playerClaimedSquares = blockSquares.filter((sq) => {
                      const c = squareColors[`${sq.x},${sq.y}`];
                      return c && c === playerColor;
                    });
                    if (playerClaimedSquares.length > 0) {
                      handleUnassignBlock(playerClaimedSquares);
                    } else if (currentPlayer) {
                      handleAssignBlockToPlayer(ax, ay);
                    }
                  } else {
                    const squareOwnerColor = squareColors[key];
                    if (squareOwnerColor && playerColor && squareOwnerColor === playerColor) {
                      handleUnassignSquare(ax, ay);
                    } else if (!squareOwnerColor && currentPlayer) {
                      handleAssignSquareToPlayer(ax, ay);
                    }
                  }
                  return;
                }
                if (editable || onSquarePress === handleSquarePress) {
                  onSquarePress(ax, ay);
                }
              }}
              onLongPress={() => {
                lastLongPressKey.current = key;
                // Allow owners to open assign modal for empty squares
                if (isOwner && !squareColors[key] && players.length > 0) {
                  setShowAssignSquareModal(true);
                }
              }}
              delayLongPress={500}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {hasCustomDisplay && displayValue ? (
                displayType === "icon" ? (
                  isBadgeEmoji(displayValue) ? (
                    <Text style={{ fontSize: Math.min(16, squareSize * 0.4) }}>
                      {getBadgeEmoji(displayValue)}
                    </Text>
                  ) : (
                    <Icon
                      name={displayValue}
                      size={Math.min(20, squareSize * 0.5)}
                      color={baseColor}
                    />
                  )
                ) : (
                  <Text
                    style={{
                      fontSize: Math.min(18, squareSize * 0.5),
                      fontWeight: "700",
                      color: baseColor,
                      fontFamily: "Rubik_600SemiBold",
                    }}
                  >
                    {displayValue.toUpperCase()}
                  </Text>
                )
              ) : null}
              {isWinner && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -7,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: "#FFD700",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <Text style={{ fontSize: 8, lineHeight: 14, color: "#7a5000" }}>★</Text>
                </View>
              )}
            </Pressable>,
          );
        }
      }
      rows.push(
        <View key={y} style={styles.row}>
          {row}
        </View>,
      );
    }

    return rows;
  };

  // ✨ Modernized Players tab with better layout
  const renderPlayers = useCallback(() => {
    if (!isFocused || !userId) return null;

    const userSelections: Record<string, string[]> = {};
    const userSquareCount: Record<string, number> = {};

    (selections || []).forEach(({ x, y, userId }) => {
      if (!userId) return;

      const key = String(userId);
      userSelections[key] ??= [];
      userSquareCount[key] ??= 0;

      const label = `(${xAxis?.[x] ?? "?"},${yAxis?.[y] ?? "?"})`;
      userSelections[key].push(label);
      userSquareCount[key]++;
    });

    const winningsMap = winningsByUser || {};

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card
          style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}
        >
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
              Players
            </Text>

            {playerList.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon
                  name="people-outline"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  No players yet
                </Text>
              </View>
            ) : (
              playerList.map(([uid, color], idx) => {
                const userKey = String(uid);
                const username = playerUsernames[userKey] || userKey;
                const rawCount = userSquareCount[userKey] || 0;
                const count = blockMode ? Math.round(rawCount / 4) : rawCount;
                const totalOwed =
                  typeof pricePerSquare === "number" && pricePerSquare > 0
                    ? count * pricePerSquare
                    : null;

                const hasSelections = userSelections[userKey]?.length > 0 &&
                  (!hideAxisUntilDeadline || isAfterDeadline);
                const isExpanded = expandedPlayers.has(userKey);

                return (
                  <TouchableOpacity
                    key={uid}
                    activeOpacity={hasSelections ? 0.7 : 1}
                    onPress={() => {
                      if (!hasSelections) return;
                      setExpandedPlayers((prev) => {
                        const next = new Set(prev);
                        if (next.has(userKey)) next.delete(userKey);
                        else next.add(userKey);
                        return next;
                      });
                    }}
                    style={[
                      styles.playerRow,
                      {
                        borderBottomColor:
                          theme.colors.outlineVariant || "rgba(0,0,0,0.05)",
                        borderBottomWidth: idx < playerList.length - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {(() => {
                          const player = players.find((p) => p.userId === uid);
                          const dType = player?.displayType || "color";
                          const dValue = player?.displayValue;
                          return (
                            <View
                              style={[
                                styles.colorIndicator,
                                {
                                  backgroundColor:
                                    dType === "color"
                                      ? (color as string)
                                      : tinycolor(color as string)
                                          .setAlpha(0.3)
                                          .toRgbString(),
                                  borderColor: theme.dark ? "#444" : "#ddd",
                                },
                              ]}
                            >
                              {dType === "icon" && dValue ? (
                                isBadgeEmoji(dValue) ? (
                                  <Text style={{ fontSize: 10 }}>
                                    {getBadgeEmoji(dValue)}
                                  </Text>
                                ) : (
                                  <Icon
                                    name={dValue}
                                    size={12}
                                    color={color as string}
                                  />
                                )
                              ) : dType === "initial" && dValue ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: color as string,
                                  }}
                                >
                                  {dValue.toUpperCase()}
                                </Text>
                              ) : null}
                            </View>
                          );
                        })()}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text
                              style={[
                                styles.playerName,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {username}
                            </Text>
                            {uid === createdBy && (
                              <View
                                style={{
                                  backgroundColor: theme.colors.primary,
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 8,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "700",
                                    color: "#fff",
                                  }}
                                >
                                  OWNER
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text
                              style={[
                                styles.playerSubtext,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {count} / {maxSelections} selected
                            </Text>
                            {hasSelections && (
                              <Icon
                                name={isExpanded ? "expand-less" : "expand-more"}
                                size={16}
                                color={theme.colors.onSurfaceVariant}
                              />
                            )}
                          </View>
                        </View>

                        <View style={styles.statsColumn}>
                          {totalOwed !== null && totalOwed > 0 && (
                            <Chip
                              mode="flat"
                              textStyle={styles.chipText}
                              style={[
                                styles.betChip,
                                {
                                  backgroundColor: theme.colors.secondaryContainer,
                                },
                              ]}
                            >
                              ${totalOwed.toFixed(2)}
                            </Chip>
                          )}
                          {winningsMap[userKey] > 0 && (
                            <Chip
                              mode="flat"
                              icon="trophy"
                              textStyle={[styles.chipText, { color: "#2e7d32" }]}
                              style={[
                                styles.winChip,
                                { backgroundColor: "#e8f5e9" },
                              ]}
                            >
                              ${winningsMap[userKey].toFixed(2)}
                            </Chip>
                          )}
                        </View>
                      </View>

                      {/* Expandable selections */}
                      {hasSelections && isExpanded && (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 4,
                            marginTop: 8,
                            marginLeft: 32,
                          }}
                        >
                          {userSelections[userKey].map((sq, i) => (
                            <View
                              key={i}
                              style={{
                                backgroundColor: theme.dark
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(0,0,0,0.05)",
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 10,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: "Rubik_500Medium",
                                  color: theme.colors.onSurfaceVariant,
                                }}
                              >
                                {sq}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }, [
    playerList,
    playerUsernames,
    playerColors,
    squareColors,
    maxSelections,
    pricePerSquare,
    blockMode,
    createdBy,
    theme,
    selections,
    hideAxisUntilDeadline,
    isAfterDeadline,
    winningsByUser,
    refreshing,
    expandedPlayers,
  ]);

  // ✨ Modernized Winners tab
  const renderWinners = useCallback(() => {
    if (!isFocused) return null;

    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card
          style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}
        >
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
              {gameCompleted
                ? quarterWinners.some(
                    (w) => w?.username && w.username !== "No Winner",
                  )
                  ? "🏆 Results"
                  : "No Winners"
                : "⏱️ Awaiting Results"}
            </Text>

            {quarterScores.length > 0 ? (
              quarterScores.map((q, i) => {
                const { home, away, completed } = q;
                const winner = quarterWinners[i];
                if (home == null || away == null || !winner) return null;

                const username = winner?.username ?? "No Winner";
                const square = winner?.square ?? ["-", "-"];
                const isWinner = username !== "No Winner";

                return (
                  <View
                    key={i}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: theme.colors.elevation.level2,
                        borderColor: isWinner
                          ? "rgba(76, 175, 80, 0.3)"
                          : theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View style={styles.resultHeader}>
                      <Text
                        style={[
                          styles.quarterNumber,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
                      </Text>
                      <Text
                        style={[
                          styles.scoreText,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {team1Mascot} {isTeam1Home ? q.home : q.away} -{" "}
                        {team2Mascot} {isTeam1Home ? q.away : q.home}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.squareText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Square: ({square[1]}, {square[0]})
                    </Text>

                    {isWinner ? (
                      <View style={styles.winnerInfo}>
                        {(() => {
                          const winnerId = Object.keys(playerUsernames).find(
                            (id) =>
                              playerUsernames[id]?.trim() === username.trim(),
                          );
                          const winnerColor =
                            playerColors?.[winnerId] || "#4CAF50";
                          const winnerPlayer = players.find(
                            (p) => p.userId === winnerId,
                          );
                          const dType = winnerPlayer?.displayType || "color";
                          const dValue = winnerPlayer?.displayValue;
                          return (
                            <View
                              style={[
                                styles.winnerDot,
                                {
                                  backgroundColor:
                                    dType === "color"
                                      ? winnerColor
                                      : tinycolor(winnerColor)
                                          .setAlpha(0.3)
                                          .toRgbString(),
                                  justifyContent: "center",
                                  alignItems: "center",
                                },
                              ]}
                            >
                              {dType === "icon" && dValue ? (
                                isBadgeEmoji(dValue) ? (
                                  <Text style={{ fontSize: 8 }}>
                                    {getBadgeEmoji(dValue)}
                                  </Text>
                                ) : (
                                  <Icon
                                    name={dValue}
                                    size={10}
                                    color={winnerColor}
                                  />
                                )
                              ) : dType === "initial" && dValue ? (
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "700",
                                    color: winnerColor,
                                  }}
                                >
                                  {dValue.toUpperCase()}
                                </Text>
                              ) : null}
                            </View>
                          );
                        })()}
                        <Text style={styles.winnerText}>
                          {pricePerSquare
                            ? `${username} wins $${(
                                (pricePerSquare *
                                  (blockMode
                                    ? Math.round(
                                        Object.keys(squareColors).length / 4,
                                      )
                                    : Object.keys(squareColors).length)) /
                                quarterScores.length
                              ).toFixed(2)}`
                            : `${username} wins!`}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noWinnerInfo}>
                        <Text style={styles.noWinnerText}>No winner</Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon
                  name="sports-football"
                  size={48}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Game hasn't started yet
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }, [
    isFocused,
    quarterScores,
    quarterWinners,
    pricePerSquare,
    playerUsernames,
    playerColors,
    squareColors,
    team1Mascot,
    team2Mascot,
    theme,
    gameCompleted,
    refreshing,
  ]);

  const renderSquaresTab = useCallback(() => {
          if (!isFocused) return null;

          const selectedCount = blockMode
            ? countSelectedBlocks(selectedSquares)
            : selectedSquares.size;
          const numericPrice = parseFloat(pricePerSquare || 0);
          const totalOwed = numericPrice * selectedCount;

          return (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 4,
                paddingTop: 16,
                paddingBottom: insets.bottom + 40,
              }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {/* Team Header */}
              <View
                style={[
                  styles.teamHeader,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.teamInfo}>
                  <Text
                    style={[styles.teamName, { color: theme.colors.primary }]}
                  >
                    {fullTeam1}
                  </Text>
                  <Text
                    style={[
                      styles.vsText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    VS
                  </Text>
                  <Text
                    style={[styles.teamName, { color: theme.colors.primary }]}
                  >
                    {fullTeam2}
                  </Text>
                </View>

                {/* Deadline/Status Chip */}
                {deadlineValue && (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Chip
                      icon={
                        gameCompleted
                          ? "check-circle"
                          : isAfterDeadline
                            ? "football"
                            : "timer"
                      }
                      mode="flat"
                      style={[
                        styles.deadlineChip,
                        {
                          backgroundColor: gameCompleted
                            ? "#e8f5e9"
                            : isAfterDeadline
                              ? theme.colors.secondaryContainer
                              : theme.colors.secondaryContainer,
                        },
                      ]}
                      textStyle={{
                        fontFamily: "Rubik_600SemiBold",
                        fontSize: 13,
                        color: gameCompleted
                          ? "#2e7d32"
                          : isAfterDeadline
                            ? theme.colors.onSecondaryContainer
                            : theme.colors.onSecondaryContainer,
                      }}
                    >
                      {gameCompleted
                        ? "Game Completed"
                        : isAfterDeadline
                          ? "Game in Progress"
                          : <CountdownChip deadline={deadlineValue} />}
                    </Chip>
                  </Animated.View>
                )}
              </View>

              {/* Grid Card */}
              <Card
                style={[
                  styles.gridCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content
                  style={{ paddingHorizontal: 4, paddingVertical: 12 }}
                >
                  <View style={styles.gridHeader}>
                    <Text
                      style={[
                        styles.axisLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {team2Mascot}
                    </Text>
                  </View>

                  {/* Grid - Fixed size, no horizontal scroll to prevent render issues with live updates */}
                  <View style={styles.gridContainer}>
                    <View style={styles.yAxisLabel}>
                      {splitTeamName(team1Mascot).map((letter, i) => (
                        <Text
                          key={i}
                          style={[
                            dynamicStyles.teamLetter,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {letter}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.gridWrapper}>
                      {renderSquareGrid({
                        editable: !isAfterDeadline,
                        onSquarePress: isAfterDeadline
                          ? handleSquarePress
                          : handlePress,
                      })}
                    </View>
                  </View>

                  {/* Stats Footer */}
                  {pricePerSquare > 0 && (
                    <View
                      style={[
                        styles.statsFooter,
                        { borderTopColor: dividerColor },
                      ]}
                    >
                      <View style={styles.statItem}>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {blockMode ? "Price per block" : "Price per square"}
                        </Text>
                        <Text
                          style={[
                            styles.statValue,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          ${pricePerSquare.toFixed(2)}
                        </Text>
                      </View>

                      {selectedCount > 0 && (
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Your total bet
                          </Text>
                          <Text
                            style={[
                              styles.statValue,
                              { color: theme.colors.primary },
                            ]}
                          >
                            ${totalOwed.toFixed(2)}
                          </Text>
                        </View>
                      )}

                      {winningsByUser?.[userId] > 0 && (
                        <View style={styles.statItem}>
                          <Text
                            style={[
                              styles.statLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Your winnings
                          </Text>
                          <Text
                            style={[styles.statValue, { color: "#4CAF50" }]}
                          >
                            ${winningsByUser[userId].toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>
            </ScrollView>
          );
  }, [
    title,
    team1,
    team2,
    team1Mascot,
    team2Mascot,
    deadlineValue,
    selectedSquares,
    pricePerSquare,
    playerColors,
    playerUsernames,
    squareColors,
    maxSelections,
    quarterScores,
    quarterWinners,
    isFocused,
    theme,
    winningsByUser,
    refreshing,
    assignMode,
    assignModePlayer,
    isOwner,
    blockMode,
  ]);

  const renderScene = useCallback(
    ({ route: tabRoute }: { route: { key: string } }) => {
      switch (tabRoute.key) {
        case "squares":
          return renderSquaresTab();
        case "players":
          return renderPlayers();
        case "winners":
          return renderWinners();
        default:
          return null;
      }
    },
    [renderSquaresTab, renderPlayers, renderWinners],
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {loading ? (
        <Animated.View
          pointerEvents={loading ? "auto" : "none"}
          style={{ opacity: fadeAnim, flex: 1, padding: 16 }}
        >
          <SkeletonLoader variant="squareScreen" />
        </Animated.View>
      ) : (
        <>
          <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: Dimensions.get("window").width }}
            renderTabBar={(props) => (
              <TabBar
                {...props}
                indicatorStyle={styles.tabIndicator}
                style={[
                  styles.tabBar,
                  { backgroundColor: theme.colors.surface },
                ]}
                activeColor={theme.colors.primary}
                inactiveColor={theme.colors.onSurfaceVariant}
                renderLabel={({ route, focused, color }) => (
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color,
                        fontWeight: focused ? "700" : "500",
                      },
                    ]}
                  >
                    {route.title}
                  </Text>
                )}
              />
            )}
          />

          <DeadlinePickerModal
            visible={showDeadlineModal}
            onDismiss={() => setShowDeadlineModal(false)}
            date={tempDeadline || new Date()}
            onConfirm={(newDate) => {
              setDeadlineValue(newDate);
              handleDeadlineChange(null, newDate);
            }}
          />

          <SessionOptionsModal
            visible={sessionOptionsVisible}
            onDismiss={() => setSessionOptionsVisible(false)}
            gridId={gridId}
            isOwner={isOwner}
            handleLeaveSquare={handleLeaveSquare}
            handleDeleteSquare={handleDeleteSquare}
            setTempDeadline={setTempDeadline}
            deadlineValue={deadlineValue}
            setShowDeadlineModal={setShowDeadlineModal}
            triggerRefresh={() => setRefreshKey((k) => k + 1)}
            currentTitle={title}
            team1={team1}
            team2={team2}
            quarterScores={quarterScores}
            onAddGuestPlayer={() => {
              setSessionOptionsVisible(false);
              setTimeout(() => setShowAddGuestModal(true), 300);
            }}
            onAssignSquares={() => {
              setSessionOptionsVisible(false);
              setTimeout(() => setShowAssignSquareModal(true), 300);
            }}
          />

          {/* Score Entry Modal (owner can manually enter/override scores) */}
          <ScoreEntryModal
            visible={showScoreEntryModal}
            onDismiss={() => setShowScoreEntryModal(false)}
            onSave={handleSaveManualScores}
            team1Name={fullTeam1 || team1}
            team2Name={fullTeam2 || team2}
            saveButtonLabel="Apply Scores"
            initialScores={{
              quarters: quarterScores.slice(0, 4).map((q) => ({
                team1: q?.home != null ? String(q.home) : "",
                team2: q?.away != null ? String(q.away) : "",
                completed: !!q?.completed,
              })),
              overtimes: quarterScores.slice(4).map((q) => ({
                team1: q?.home != null ? String(q.home) : "",
                team2: q?.away != null ? String(q.away) : "",
                completed: !!q?.completed,
              })),
            }}
            onEndGame={async () => {
              try {
                const { error } = await supabase
                  .from("squares")
                  .update({ game_completed: true })
                  .eq("id", gridId);
                if (error) throw error;
                setGameCompleted(true);
                setShowScoreEntryModal(false);
                Toast.show({
                  type: "success",
                  text1: "Game ended",
                  text2: "Final winners have been calculated",
                  position: "bottom",
                });
              } catch (err) {
                Sentry.captureException(err);
                Toast.show({
                  type: "error",
                  text1: "Failed to end game",
                  position: "bottom",
                });
              }
            }}
            onReopenGame={async () => {
              try {
                const { error } = await supabase
                  .from("squares")
                  .update({ game_completed: false })
                  .eq("id", gridId);
                if (error) throw error;
                setGameCompleted(false);
                Toast.show({
                  type: "success",
                  text1: "Game reopened",
                  text2: "You can continue editing scores",
                  position: "bottom",
                });
              } catch (err) {
                Sentry.captureException(err);
                Toast.show({
                  type: "error",
                  text1: "Failed to reopen game",
                  position: "bottom",
                });
              }
            }}
            gameCompleted={gameCompleted}
          />

          {/* Add Guest Player Modal */}
          <AddGuestPlayerModal
            visible={showAddGuestModal}
            onDismiss={() => setShowAddGuestModal(false)}
            onAddPlayer={handleAddGuestPlayer}
            currentUserId={userId || ""}
            usedColors={players.map((p) => p.color).filter(Boolean)}
          />

          {/* Assign Mode Header Banner */}
          {assignMode && assignModePlayer && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: assignModePlayer.color,
                paddingVertical: 8,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                zIndex: 100,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="person" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontFamily: "Sora" }}>
                  Assigning to: {assignModePlayer.username}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAssignMode(false);
                  assignModePlayerRef.current = null;
                  setAssignModePlayer(null);
                }}
                style={{
                  backgroundColor: "rgba(0,0,0,0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontFamily: "Sora" }}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Assign Square Modal */}
          <AssignSquareModal
            visible={showAssignSquareModal}
            onDismiss={() => setShowAssignSquareModal(false)}
            onSelectPlayer={(player) => {
              assignModePlayerRef.current = player;
              setAssignModePlayer(player);
              setAssignMode(true);
            }}
            players={players}
            currentUserId={userId || ""}
          />

          {/* Confirmation Modals */}
          <Portal>
            <Modal
              visible={showLeaveConfirm}
              onDismiss={() =>
                closeAnimatedDialog(setShowLeaveConfirm, leaveAnim)
              }
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.surface },
                  getAnimatedDialogStyle(leaveAnim),
                ]}
              >
                <Text
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  Leave Session
                </Text>
                <View
                  style={[
                    styles.modalDivider,
                    { backgroundColor: dividerColor },
                  ]}
                />
                <Text
                  style={[styles.modalText, { color: theme.colors.onSurface }]}
                >
                  Are you sure you want to leave this session? Your squares will
                  be removed.
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    onPress={() =>
                      closeAnimatedDialog(setShowLeaveConfirm, leaveAnim)
                    }
                    textColor={theme.colors.onSurfaceVariant}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={async () => {
                      if (!userId) return;

                      closeAnimatedDialog(setShowLeaveConfirm, leaveAnim);

                      try {
                        const { data, error } = await supabase
                          .from("squares")
                          .select("player_ids, players, selections, title")
                          .eq("id", gridId)
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
                          (id) => id !== userId,
                        );
                        const updatedPlayers = (data.players || []).filter(
                          (p) => p.userId !== userId,
                        );
                        const updatedSelections = (
                          data.selections || []
                        ).filter((sel) => sel.userId !== userId);

                        await supabase
                          .from("squares")
                          .update({
                            players: updatedPlayers,
                            player_ids: updatedPlayerIds,
                            selections: updatedSelections,
                          })
                          .eq("id", gridId);

                        if (updatedPlayers.length === 0) {
                          await supabase
                            .from("squares")
                            .delete()
                            .eq("id", gridId);
                        } else {
                          // Notify the owner that a player left
                          await sendPlayerLeftNotification(
                            gridId,
                            currentUsername,
                            data.title || title,
                          );
                        }

                        // Cancel any scheduled deadline notifications for this session
                        await cancelDeadlineNotifications();

                        Toast.show({
                          type: "info",
                          text1: `Left ${title}`,
                          position: "bottom",
                          bottomOffset: 60,
                        });

                        navigation.navigate("Main");
                      } catch (err) {
                        Sentry.captureException(err);
                        Toast.show({
                          type: "error",
                          text1: "Failed to leave session",
                          position: "bottom",
                          bottomOffset: 60,
                        });
                      }
                    }}
                    textColor={theme.colors.error}
                  >
                    Leave
                  </Button>
                </View>
              </Animated.View>
            </Modal>
          </Portal>

          <Portal>
            <Modal
              visible={showDeleteConfirm}
              onDismiss={() =>
                closeAnimatedDialog(setShowDeleteConfirm, deleteAnim)
              }
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.colors.surface },
                  getAnimatedDialogStyle(deleteAnim),
                ]}
              >
                <Text
                  style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                >
                  Delete Session
                </Text>
                <View
                  style={[
                    styles.modalDivider,
                    { backgroundColor: dividerColor },
                  ]}
                />
                <Text
                  style={[styles.modalText, { color: theme.colors.onSurface }]}
                >
                  Are you sure you want to permanently delete this session? This
                  cannot be undone.
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    onPress={() =>
                      closeAnimatedDialog(setShowDeleteConfirm, deleteAnim)
                    }
                    textColor={theme.colors.onSurfaceVariant}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={async () => {
                      closeAnimatedDialog(setShowDeleteConfirm, deleteAnim);
                      try {
                        // Notify players before deleting via push notifications
                        await sendSquareDeletedNotification(
                          gridId,
                          title,
                          players,
                        );

                        await supabase
                          .from("squares")
                          .delete()
                          .eq("id", gridId);

                        // Cancel any scheduled deadline notifications
                        await cancelDeadlineNotifications();

                        Toast.show({
                          type: "success",
                          text1: `Deleted ${title}`,
                          position: "bottom",
                          bottomOffset: 60,
                        });
                        navigation.navigate("Main");
                      } catch (err) {
                        Sentry.captureException(err);
                      }
                    }}
                    textColor={theme.colors.error}
                  >
                    Delete
                  </Button>
                </View>
              </Animated.View>
            </Modal>
          </Portal>

          {/* Winner Details Modal */}
          <Portal>
            <Modal
              visible={winnerModalVisible}
              onDismiss={() => setWinnerModalVisible(false)}
              contentContainerStyle={styles.winnerModalOuter}
            >
              {winnerModalData && (
                <View
                  style={[
                    styles.winnerModalContainer,
                    {
                      backgroundColor: theme.dark ? "#1a1a2e" : "#fff",
                    },
                  ]}
                >
                  {/* Close button */}
                  <TouchableOpacity
                    onPress={() => setWinnerModalVisible(false)}
                    style={styles.winnerModalClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Icon
                      name="close"
                      size={22}
                      color={
                        theme.dark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.35)"
                      }
                    />
                  </TouchableOpacity>

                  {winnerModalData.username === "No Winner" ? (
                    <>
                      {/* No Winner gradient header */}
                      <LinearGradient
                        colors={
                          theme.dark
                            ? ["#3d2020", "#1a1a2e"]
                            : ["#9e9e9e", "#757575"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.winnerModalHeader}
                      >
                        <Text style={styles.winnerModalEmoji}>😔</Text>
                        <Text style={styles.winnerModalHeaderTitle}>
                          No Winner
                        </Text>
                        <Text style={styles.winnerModalHeaderSub}>
                          Square ({winnerModalData.squareCoords[0]},{" "}
                          {winnerModalData.squareCoords[1]}) was unclaimed
                        </Text>
                      </LinearGradient>

                      <View style={styles.winnerModalBody}>
                        <View style={styles.winnerModalQuarters}>
                          {winnerModalData.winningQuarters.map((q, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.winnerModalQuarterCard,
                                {
                                  backgroundColor: theme.dark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.03)",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.winnerModalQuarterLabel,
                                  {
                                    color: theme.dark
                                      ? "rgba(255,255,255,0.5)"
                                      : "rgba(0,0,0,0.45)",
                                  },
                                ]}
                              >
                                {q.label}
                              </Text>
                              <Text
                                style={[
                                  styles.winnerModalQuarterScore,
                                  {
                                    color: theme.dark ? "#fff" : "#1a1a2e",
                                  },
                                ]}
                              >
                                {q.score}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Winner gradient header */}
                      <LinearGradient
                        colors={
                          theme.dark
                            ? ["#2d1b69", "#1a1a2e"]
                            : ["#FFB800", "#FF8F00"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.winnerModalHeader}
                      >
                        <Text style={styles.winnerModalEmoji}>🏆</Text>
                        <Text style={styles.winnerModalHeaderTitle}>
                          Winner!
                        </Text>

                        {/* Player display */}
                        <View style={styles.winnerModalPlayerRow}>
                          {(() => {
                            const modalWinnerId = Object.keys(
                              playerUsernames
                            ).find(
                              (id) =>
                                playerUsernames[id]?.trim() ===
                                winnerModalData.username.trim()
                            );
                            const modalPlayer = players.find(
                              (p) => p.userId === modalWinnerId
                            );
                            const mDType =
                              modalPlayer?.displayType || "color";
                            const mDValue = modalPlayer?.displayValue;
                            const mColor = winnerModalData.userColor;
                            return (
                              <View
                                style={[
                                  styles.winnerModalAvatar,
                                  {
                                    backgroundColor:
                                      mDType === "color"
                                        ? mColor
                                        : tinycolor(mColor)
                                            .setAlpha(0.3)
                                            .toRgbString(),
                                    borderColor: "rgba(255,255,255,0.3)",
                                  },
                                ]}
                              >
                                {mDType === "icon" && mDValue ? (
                                  isBadgeEmoji(mDValue) ? (
                                    <Text style={{ fontSize: 16 }}>
                                      {getBadgeEmoji(mDValue)}
                                    </Text>
                                  ) : (
                                    <Icon
                                      name={mDValue}
                                      size={20}
                                      color={mColor}
                                    />
                                  )
                                ) : mDType === "initial" && mDValue ? (
                                  <Text
                                    style={{
                                      fontSize: 16,
                                      fontWeight: "700",
                                      color: mColor,
                                    }}
                                  >
                                    {mDValue.toUpperCase()}
                                  </Text>
                                ) : null}
                              </View>
                            );
                          })()}
                          <View>
                            <Text style={styles.winnerModalUsername}>
                              {winnerModalData.username}
                            </Text>
                            <Text style={styles.winnerModalSquareLabel}>
                              Square ({winnerModalData.squareCoords[0]},{" "}
                              {winnerModalData.squareCoords[1]})
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>

                      <View style={styles.winnerModalBody}>
                        <View style={styles.winnerModalQuarters}>
                          {winnerModalData.winningQuarters.map((q, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.winnerModalQuarterCard,
                                {
                                  backgroundColor: theme.dark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.03)",
                                },
                              ]}
                            >
                              <View
                                style={styles.winnerModalQuarterRow}
                              >
                                <Text
                                  style={[
                                    styles.winnerModalQuarterLabel,
                                    {
                                      color: theme.dark
                                        ? "rgba(255,255,255,0.5)"
                                        : "rgba(0,0,0,0.45)",
                                    },
                                  ]}
                                >
                                  {q.label}
                                </Text>
                                {q.payout > 0 && (
                                  <Text
                                    style={styles.winnerModalQuarterPayout}
                                  >
                                    +${q.payout.toFixed(2)}
                                  </Text>
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.winnerModalQuarterScore,
                                  {
                                    color: theme.dark ? "#fff" : "#1a1a2e",
                                  },
                                ]}
                              >
                                {q.score}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {winnerModalData.totalWinnings > 0 && (
                          <LinearGradient
                            colors={
                              theme.dark
                                ? ["rgba(76,175,80,0.15)", "rgba(76,175,80,0.05)"]
                                : ["rgba(76,175,80,0.1)", "rgba(76,175,80,0.03)"]
                            }
                            style={styles.winnerModalTotal}
                          >
                            <Text
                              style={[
                                styles.winnerModalTotalLabel,
                                {
                                  color: theme.dark
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(0,0,0,0.5)",
                                },
                              ]}
                            >
                              Total Winnings
                            </Text>
                            <Text style={styles.winnerModalTotalAmount}>
                              ${winnerModalData.totalWinnings.toFixed(2)}
                            </Text>
                          </LinearGradient>
                        )}
                      </View>
                    </>
                  )}
                </View>
              )}
            </Modal>
          </Portal>
        </>
      )}
    </LinearGradient>
  );
};

// ✨ Dynamic styles that depend on squareSize
const getDynamicStyles = (squareSize: number) =>
  StyleSheet.create({
    square: {
      width: squareSize,
      height: squareSize,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
    },
    axisText: {
      fontSize: Math.min(16, squareSize * 0.55),
      fontFamily: "Rubik_600SemiBold",
      textAlign: "center",
    },
    teamLetter: {
      fontSize: Math.min(18, squareSize * 0.65),
      fontFamily: "Rubik_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      lineHeight: squareSize,
      textAlign: "center",
    },
  });

const styles = StyleSheet.create({
  // Header
  headerButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab Bar
  tabBar: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  tabIndicator: {
    backgroundColor: "#5e60ce",
    height: 3,
    borderRadius: 1.5,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Cards
  modernCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#5e60ce",
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Anton_400Regular",
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: "uppercase",
  },

  // Team Header
  teamHeader: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#5e60ce",
  },
  teamInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  teamName: {
    fontSize: 20,
    fontFamily: "Anton_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vsText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    marginVertical: 4,
    letterSpacing: 1,
  },
  deadlineChip: {
    alignSelf: "center",
  },

  // Grid
  gridCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#5e60ce",
  },
  gridHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  axisLabel: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  yAxisLabel: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 7,
    minWidth: 16,
  },
  gridWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSquare: {
    shadowColor: "#5e60ce",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
  },
  statsFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },

  // Players Tab
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  playerName: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 2,
  },
  playerSubtext: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  squaresList: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  statsColumn: {
    alignItems: "flex-end",
    gap: 6,
  },
  betChip: {
    minHeight: 32,
  },
  winChip: {
    minHeight: 32,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
  },

  // Winners Tab
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#5e60ce",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  quarterNumber: {
    fontSize: 18,
    fontFamily: "Anton_400Regular",
    backgroundColor: "rgba(94, 96, 206, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    flex: 1,
  },
  squareText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginBottom: 8,
  },
  winnerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  winnerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  winnerText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#4CAF50",
  },
  noWinnerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  noWinnerText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: "#999",
  },

  // Empty States
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    marginTop: 12,
  },

  // Modals
  modalContent: {
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },

  // Winner Modal
  winnerModalOuter: {
    margin: 16,
  },
  winnerModalContainer: {
    borderRadius: 24,
    overflow: "hidden",
  },
  winnerModalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  winnerModalHeader: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  winnerModalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  winnerModalHeaderTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  winnerModalHeaderSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textAlign: "center",
  },
  winnerModalPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  winnerModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  winnerModalUsername: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  winnerModalSquareLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  winnerModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  winnerModalQuarters: {
    gap: 10,
  },
  winnerModalQuarterCard: {
    borderRadius: 14,
    padding: 14,
  },
  winnerModalQuarterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  winnerModalQuarterLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  winnerModalQuarterScore: {
    fontSize: 15,
    fontWeight: "500",
  },
  winnerModalQuarterPayout: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
  },
  winnerModalTotal: {
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  winnerModalTotalLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  winnerModalTotalAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4CAF50",
  },
});

export default SquareScreen;
