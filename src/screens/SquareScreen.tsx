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
import { useIsFocused, useNavigation, useFocusEffect } from "@react-navigation/native";
import { TabView, SceneMap, TabBar, TabBarProps } from "react-native-tab-view";
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

// ✨ Square size calculation - moved to component level for proper recalculation
const getSquareSize = () => {
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  // Detect if device is likely a tablet (iPad)
  const isTablet = screenWidth >= 768 || screenHeight >= 768;

  // Account for all horizontal spacing:
  // - Card padding left/right: 16 (from paddingHorizontal: 8 on both sides)
  // - Y-axis labels: ~30px
  // - Container margins: 32 (16 per side)
  // - Safety buffer for borders/shadows: 8
  const availableWidth = screenWidth - (isTablet ? 120 : 86);
  const calculatedSize = availableWidth / 11; // 11 columns (1 axis + 10 squares)

  // iPad: Allow larger squares (30-80px), Phone: smaller range (30-52px)
  const minSize = 30;
  const maxSize = isTablet ? 80 : 52;

  return Math.max(minSize, Math.min(maxSize, calculatedSize));
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
  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [deadlineValue, setDeadlineValue] = useState<Date | null>(null);
  const [isAfterDeadline, setIsAfterDeadline] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(deadlineValue);
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(false);
  const [sessionOptionsVisible, setSessionOptionsVisible] = useState(false);
  const [pendingSquares, setPendingSquares] = useState<Set<string>>(new Set());
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isTeam1Home, setIsTeam1Home] = useState<boolean | null>(null);
  const [manualOverride, setManualOverride] = useState(false);
  const [winningsByUser, setWinningsByUser] = useState<Record<string, number>>(
    {},
  );
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
  ) => {
    return scores
      .map(({ home, away }, i) => {
        if (home === null || away === null) return null;

        const team1Score = isTeam1Home ? home : away;
        const team2Score = isTeam1Home ? away : home;

        const x = xAxis.findIndex((val) => val === team2Score % 10);
        const y = yAxis.findIndex((val) => val === team1Score % 10);

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
            ? playerUsernames[matchingSelection.userId]
            : "No Winner",
          square: [xAxis[x], yAxis[y]],
        };
      })
      .filter(Boolean);
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

    const liveWinnings = calculatePlayerWinnings(
      quarterWinners.slice(0, completedQuarters.length),
      playerUsernames,
      pricePerSquare,
      Object.keys(squareColors).length,
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
        const claimedNow = Object.keys(squareColors).length;
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
      if (data.selections && xAxis.length && yAxis.length) {
        if (isTeam1Home !== null) {
          const winners = determineQuarterWinners(
            quarterScores,
            selections,
            xAxis,
            yAxis,
            isTeam1Home,
          );
          setQuarterWinners(winners);
        }
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

        // Load persisted game_completed status from database
        if (data.game_completed) {
          setGameCompleted(true);
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

        if (data.created_by === userId) setIsOwner(true);
        if (data.deadline) setDeadlineValue(new Date(data.deadline));
        setMaxSelections(data.max_selection);
        if (typeof data.axis_hidden === "boolean")
          setHideAxisUntilDeadline(data.axis_hidden);
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
  }, [isFocused, eventId, deadlineValue, refreshKey]);

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
          const payoutPerQuarter =
            pricePerSquare && Object.keys(squareColors).length > 0
              ? (pricePerSquare * Object.keys(squareColors).length) /
                quarterScores.length
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
      const totalWinnings = isUnclaimed ? 0 : winningQuartersData.reduce((sum, q) => sum + q.payout, 0);

      setWinnerModalData({
        username: isUnclaimed ? "No Winner" : username,
        userColor: userColor || "#888888",
        winningQuarters: winningQuartersData.map(q => ({
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
    }, [])
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
        <TouchableOpacity
          onPress={() => setSessionOptionsVisible(true)}
          style={styles.headerButton}
        >
          <Icon name="more-vert" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isOwner, inputTitle, title]);

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

  const lastPressTime = useRef<Record<string, number>>({});

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

      if (isSelected) {
        await deselectSquareInSupabase(x, y);

        updatedSet.delete(squareId);
        const newColors = { ...squareColors };
        delete newColors[squareId];
        setSquareColors(newColors);

        setSelections((prev) =>
          prev.filter((s) => !(s.x === x && s.y === y && s.userId === userId)),
        );
      } else {
        await selectSquareInSupabase(x, y);

        updatedSet.add(squareId);
        setSquareColors((prev) => ({
          ...prev,
          [squareId]: playerColors[userId],
        }));
        setSelections((prev) => [
          ...prev,
          { x, y, userId, username: currentUsername },
        ]);
      }
      setPendingSquares((prev) => {
        const newSet = new Set(prev);
        newSet.add(squareId);
        return newSet;
      });

      setSelectedSquares(updatedSet);
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
    ],
  );

  useEffect(() => {
    if (!isFocused || !userId || !gridId) return;

    let isCancelled = false;

    const fetchSelections = async () => {
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
      setSelectedSquares(mySet);
    };

    fetchSelections();

    const interval = setInterval(fetchSelections, 5000);

    return () => {
      clearInterval(interval);
      isCancelled = true;
    };
  }, [userId, gridId, isFocused]);

  const dividerColor = theme.dark ? "#2a2a2a" : "#e8e8e8";

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
          const color = squareColors[key] || defaultSquareColor;
          const isSelected = selectedSquares.has(key);
          const isWinner = winningSquares.has(key);

          row.push(
            <Pressable
              key={key}
              style={({ pressed }) => [
                dynamicStyles.square,
                {
                  backgroundColor: color,
                  borderColor: isSelected
                    ? selectedBorderColor
                    : isDark
                      ? "#333"
                      : "#e0e0e0",
                  borderWidth: isSelected ? 2.5 : 1,
                  opacity: pressed ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  borderBottomRightRadius: x === 10 && y === 10 ? 8 : 0,
                },
                isSelected && styles.selectedSquare,
              ]}
              onPress={() => {
                if (editable || onSquarePress === handleSquarePress) {
                  onSquarePress(x - 1, y - 1);
                }
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isWinner && <Text style={dynamicStyles.trophyEmoji}>🏆</Text>}
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
                const count = userSquareCount[userKey] || 0;
                const totalOwed =
                  typeof pricePerSquare === "number" && pricePerSquare > 0
                    ? count * pricePerSquare
                    : null;

                return (
                  <View
                    key={uid}
                    style={[
                      styles.playerRow,
                      {
                        borderBottomColor:
                          theme.colors.outlineVariant || "rgba(0,0,0,0.05)",
                        borderBottomWidth: idx < playerList.length - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flex: 1,
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={[
                          styles.colorIndicator,
                          {
                            backgroundColor: color as string,
                            borderColor: theme.dark ? "#444" : "#ddd",
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.playerName,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {username}
                        </Text>
                        <Text
                          style={[
                            styles.playerSubtext,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {count} / {maxSelections} selected
                        </Text>

                        {userSelections[userKey]?.length > 0 &&
                          (!hideAxisUntilDeadline || isAfterDeadline) && (
                            <Text
                              style={[
                                styles.squaresList,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                              numberOfLines={2}
                            >
                              {userSelections[userKey].join(", ")}
                            </Text>
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
    theme,
    selections,
    hideAxisUntilDeadline,
    isAfterDeadline,
    winningsByUser,
    refreshing,
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
                const { home, away } = q;
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
                        <View
                          style={[
                            styles.winnerDot,
                            {
                              backgroundColor:
                                playerColors?.[
                                  Object.keys(playerUsernames).find(
                                    (id) =>
                                      playerUsernames[id]?.trim() ===
                                      username.trim(),
                                  )
                                ] || "#4CAF50",
                            },
                          ]}
                        />
                        <Text style={styles.winnerText}>
                          {pricePerSquare
                            ? `${username} wins $${(
                                (pricePerSquare *
                                  Object.keys(squareColors).length) /
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

  const renderScene = useMemo(
    () =>
      SceneMap({
        squares: () => {
          if (!isFocused) return null;

          const selectedCount = selectedSquares.size;
          const numericPrice = parseFloat(pricePerSquare || 0);
          const totalOwed = numericPrice * selectedCount;

          return (
            <ScrollView
              contentContainerStyle={{
                padding: 16,
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
                          : formatTimeLeft(deadlineValue, now)}
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
                  style={{ paddingHorizontal: 8, paddingVertical: 12 }}
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
                          Price per square
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
        },
        players: renderPlayers,
        winners: renderWinners,
      }),
    [
      title,
      team1,
      team2,
      team1Mascot,
      team2Mascot,
      deadlineValue,
      now,
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
    ],
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
                {...(props as TabBarProps)}
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
              contentContainerStyle={[
                styles.winnerModalContainer,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {winnerModalData && (
                <View>
                  {winnerModalData.username === "No Winner" ? (
                    // No Winner state
                    <>
                      <View style={styles.winnerModalHeader}>
                        <Text style={styles.winnerModalEmoji}>😔</Text>
                        <Text
                          style={[
                            styles.winnerModalTitle,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          No Winner
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.modalDivider,
                          { backgroundColor: dividerColor, marginVertical: 16 },
                        ]}
                      />

                      <Text
                        style={[
                          styles.winnerModalSquare,
                          { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
                        ]}
                      >
                        Square ({winnerModalData.squareCoords[0]},{" "}
                        {winnerModalData.squareCoords[1]}) was unclaimed
                      </Text>

                      <View style={styles.winnerModalQuarters}>
                        {winnerModalData.winningQuarters.map((q, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.winnerModalQuarterCard,
                              {
                                backgroundColor: theme.colors.elevation.level2,
                                borderLeftColor: theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.winnerModalQuarterLabel,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {q.label}
                            </Text>
                            <Text
                              style={[
                                styles.winnerModalQuarterScore,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {q.score}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : (
                    // Winner state
                    <>
                      <View style={styles.winnerModalHeader}>
                        <Text style={styles.winnerModalEmoji}>🏆</Text>
                        <Text
                          style={[
                            styles.winnerModalTitle,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Winner!
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.modalDivider,
                          { backgroundColor: dividerColor, marginVertical: 16 },
                        ]}
                      />

                      <View style={styles.winnerModalPlayer}>
                        <View
                          style={[
                            styles.winnerModalColorDot,
                            { backgroundColor: winnerModalData.userColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.winnerModalUsername,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {winnerModalData.username}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.winnerModalSquare,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Square ({winnerModalData.squareCoords[0]},{" "}
                        {winnerModalData.squareCoords[1]})
                      </Text>

                      <View style={styles.winnerModalQuarters}>
                        {winnerModalData.winningQuarters.map((q, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.winnerModalQuarterCard,
                              { backgroundColor: theme.colors.elevation.level2 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.winnerModalQuarterLabel,
                                { color: theme.colors.primary },
                              ]}
                            >
                              {q.label}
                            </Text>
                            <Text
                              style={[
                                styles.winnerModalQuarterScore,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {q.score}
                            </Text>
                            {q.payout > 0 && (
                              <Text style={styles.winnerModalQuarterPayout}>
                                +${q.payout.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>

                      {winnerModalData.totalWinnings > 0 && (
                        <View
                          style={[
                            styles.winnerModalTotal,
                            { borderTopColor: dividerColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.winnerModalTotalLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Total Winnings
                          </Text>
                          <Text style={styles.winnerModalTotalAmount}>
                            ${winnerModalData.totalWinnings.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  <Button
                    mode="contained"
                    onPress={() => setWinnerModalVisible(false)}
                    style={styles.winnerModalButton}
                  >
                    Close
                  </Button>
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
    trophyEmoji: {
      fontSize: Math.min(22, squareSize * 0.6),
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
    paddingRight: 4,
    minWidth: 28,
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
  winnerModalContainer: {
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 5,
    borderLeftColor: "#5e60ce",
  },
  winnerModalHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  winnerModalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  winnerModalTitle: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
  },
  winnerModalPlayer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  winnerModalColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.1)",
  },
  winnerModalUsername: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
  },
  winnerModalSquare: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  winnerModalQuarters: {
    gap: 12,
    marginBottom: 16,
  },
  winnerModalQuarterCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#5e60ce",
  },
  winnerModalQuarterLabel: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 4,
  },
  winnerModalQuarterScore: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    marginBottom: 4,
  },
  winnerModalQuarterPayout: {
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
    color: "#4CAF50",
  },
  winnerModalTotal: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  winnerModalTotalLabel: {
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  winnerModalTotalAmount: {
    fontSize: 24,
    fontFamily: "Rubik_600SemiBold",
    color: "#4CAF50",
  },
  winnerModalButton: {
    borderRadius: 20,
  },
});

export default SquareScreen;
