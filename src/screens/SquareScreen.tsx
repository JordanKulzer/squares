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
} from "react-native";
import { Button, Card, Modal, Portal, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { TabView, SceneMap, TabBar, TabBarProps } from "react-native-tab-view";
import Toast from "react-native-toast-message";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import SessionOptionsModal from "../components/SessionOptionsModal";
import DeadlinePickerModal from "../components/DeadlinePickerModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  checkQuarterEndNotification,
  scheduleNotifications,
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

const screenWidth = Dimensions.get("window").width;
const squareSize = (screenWidth - 80) / 11;

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
  totalSquares: number
) => {
  const winningsMap: Record<string, number> = {};

  if (!Array.isArray(quarterWinners) || !pricePerSquare || totalSquares === 0) {
    console.log("⚠️ Skipping winnings calculation — invalid inputs");
    console.log({ quarterWinners, pricePerSquare, totalSquares });
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

  console.log("👥 Player usernames map:", playerUsernames);
  console.log("🔁 Reverse lookup (username → userId):", usernameToUserId);
  console.log("🏈 Quarter winners array:", quarterWinners);
  console.log(
    "💵 pricePerSquare:",
    pricePerSquare,
    "totalSquares:",
    totalSquares
  );

  quarterWinners.forEach((w, index) => {
    const username = w?.username;
    if (typeof username === "string" && username !== "No Winner") {
      const trimmed = username.trim();
      const userId = usernameToUserId[trimmed];
      console.log(
        `➡️ Quarter ${index + 1}: username=${trimmed}, userId=${userId}`
      );

      if (userId) {
        winningsMap[userId] = (winningsMap[userId] || 0) + payoutPerQuarter;
      } else {
        console.warn(`⚠️ Could not map username "${trimmed}" to any userId`);
      }
    } else {
      console.log(`❌ No valid winner for quarter ${index + 1}`, w);
    }
  });

  console.log("✅ Final winningsMap:", winningsMap);

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
    {}
  );
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
  });
  const leaveAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messageFade = useRef(new Animated.Value(1)).current;

  const [refreshingScores, setRefreshingScores] = useState(false);
  const [squareDataLoaded, setSquareDataLoaded] = useState(false);
  const [scoresLoaded, setScoresLoaded] = useState(false);
  const loading = !squareDataLoaded || !scoresLoaded;

  const screenHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const usableHeight = screenHeight - insets.top - insets.bottom - 120;
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

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
    { key: "winners", title: "Winners" },
  ]);

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const navigation = useNavigation();

  const determineQuarterWinners = (
    scores,
    selections,
    xAxis,
    yAxis,
    isTeam1Home
  ) => {
    return scores
      .map(({ home, away }, i) => {
        if (home === null || away === null) return null;

        const team1Score = isTeam1Home ? home : away;
        const team2Score = isTeam1Home ? away : home;

        const x = xAxis.findIndex((val) => val === team2Score % 10);
        const y = yAxis.findIndex((val) => val === team1Score % 10);

        if (x === -1 || y === -1) {
          console.warn(
            `❌ Could not find index for home % 10 (${
              home % 10
            }) or away % 10 (${away % 10}) in axis arrays`
          );
          return {
            quarter: `${i + 1}`,
            username: "No Winner",
            square: [home % 10, away % 10],
          };
        }

        const matchingSelection = selections.find(
          (sel) => sel.x === x && sel.y === y
        );

        if (!matchingSelection) {
          console.log(
            `❌ No selection matched for (x=${x}, y=${y}) aka (${xAxis[x]}, ${yAxis[y]})`
          );
        }

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
        isTeam1Home
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

  useEffect(() => {
    if (!quarterWinners?.length || !Object.keys(playerUsernames).length) return;

    // Only include quarters that have actual numeric scores
    const completedQuarters = quarterScores.filter(
      (q) => q.home != null && q.away != null
    );

    if (completedQuarters.length === 0) return;

    const liveWinnings = calculatePlayerWinnings(
      quarterWinners.slice(0, completedQuarters.length),
      playerUsernames,
      pricePerSquare,
      Object.keys(squareColors).length
    );

    setWinningsByUser(liveWinnings);
  }, [
    quarterWinners,
    quarterScores,
    playerUsernames,
    pricePerSquare,
    squareColors,
    gameCompleted, // ✅ ensures final winnings still show
  ]);

  useEffect(() => {
    if (!gameCompleted || !Object.keys(playerUsernames).length) return;

    const finalizeTotalWinnings = async () => {
      // 1) Load snapshot + how many periods we already paid
      const { data: squareData, error: fetchErr } = await supabase
        .from("squares")
        .select(
          "payout_done, winnings_snapshot, winnings_quarters_done, quarter_payouts"
        )
        .eq("id", gridId)
        .single();
      if (fetchErr) return;

      // If we already marked done and nothing new, bail
      // (prevents double-paying when the effect fires again)
      const prevPaidCount = squareData?.winnings_quarters_done ?? 0;

      // Count how many actually have scores
      const completed = quarterScores.filter(
        (q) => q.home != null && q.away != null
      ).length;
      if (completed <= prevPaidCount) return;

      // Build username->uid map once
      const nameToUid: Record<string, string> = {};
      Object.entries(playerUsernames).forEach(([uid, name]) => {
        if (typeof name === "string") nameToUid[name.trim()] = uid;
      });

      // Start from previous snapshot (don’t recompute older periods!)
      const newSnapshot: Record<string, number> = {
        ...(squareData?.winnings_snapshot ?? {}),
      };

      // 2) Credit ONLY the newly completed periods
      for (let i = prevPaidCount; i < completed; i++) {
        const win = quarterWinners[i];
        if (!win || win.username === "No Winner") continue;

        const uid = nameToUid[win.username.trim()];
        if (!uid) continue;

        // Prefer a stored per-period payout if you’ve been saving it;
        // otherwise fall back to current-per-period (one-time)
        const storedPayouts: number[] = squareData?.quarter_payouts ?? [];
        const periodsCount = quarterScores.length; // includes OT if present
        const claimedNow = Object.keys(squareColors).length;
        const fallbackPayout =
          ((pricePerSquare || 0) * claimedNow) / periodsCount;

        const payoutForThisPeriod =
          typeof storedPayouts[i] === "number"
            ? storedPayouts[i]
            : fallbackPayout;

        // Apply cents rounding
        const cents = Math.round((payoutForThisPeriod + 1e-8) * 100) / 100;

        // Increment user winnings immediately (delta only for this period)
        const { error: incErr } = await supabase.rpc(
          "increment_user_winnings",
          {
            user_id: uid,
            amount_to_add: cents,
          }
        );
        if (!incErr) {
          newSnapshot[uid] = parseFloat(
            ((newSnapshot[uid] ?? 0) + cents).toFixed(2)
          );
        }
      }

      // 3) Persist snapshot + how many periods are paid
      await supabase
        .from("squares")
        .update({
          winnings_snapshot: newSnapshot,
          winnings_quarters_done: completed,
          // Optional: only set payout_done when ALL periods are truly final
          payout_done: true,
        })
        .eq("id", gridId);
    };

    finalizeTotalWinnings();
  }, [gameCompleted, quarterWinners]);

  useEffect(() => {
    if (!isFocused || !userId) return;

    const fetchSelectionsAndWinners = async () => {
      Sentry.addBreadcrumb({
        category: "fetch information",
        message: "fetchSelectionsAndWinners",
        level: "info",
      });
      const { data, error } = await supabase
        .from("squares")
        .select("quarter_scores, selections")
        .eq("id", gridId)
        .single();

      if (error || !data) return;
      console.log(data.quarter_scores);

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
            isTeam1Home
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
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !userId) return;

    const fetchSquareData = async () => {
      try {
        Sentry.addBreadcrumb({
          category: "fetch information",
          message: "fetchSquareData",
          level: "info",
        });
        const { data, error } = await supabase
          .from("squares")
          .select("*")
          .eq("id", gridId)
          .single();

        if (error || !data) return;

        setManualOverride(!!data.manual_override);

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
              (s) => s.userId === userId
            );
            const mySet = new Set(mySelections.map((s) => `${s.x},${s.y}`));
            const allPendingResolved = [...pendingSquares].every((sq) =>
              mySet.has(sq)
            );
            if (allPendingResolved || pendingSquares.size === 0) {
              setSelectedSquares(mySet);
              setPendingSquares(new Set());
            }
          }
        }

        setXAxis(
          data.x_axis?.length === 10 ? data.x_axis : [...Array(10).keys()]
        );
        setYAxis(
          data.y_axis?.length === 10 ? data.y_axis : [...Array(10).keys()]
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
  }, [gridId, userId, refreshKey]);

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
    if (!eventId || !deadlineValue) return;

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
      console.log("🔗 API Base URL:", API_BASE_URL);

      const now = new Date();
      if (now < new Date(deadlineValue)) return;

      await checkOverride();
      if (manualOverride) {
        console.log("⚙️ Manual override active — skipping API overwrite");
        return;
      }
      setRefreshingScores(true);

      try {
        Sentry.addBreadcrumb({
          category: "fetch information",
          message: "fetchQuarterScores",
          level: "info",
        });
        console.log(
          "🔍 Fetching scores for eventId:",
          eventId,
          "league:",
          league
        );

        const res = await fetch(
          `${API_BASE_URL}/apisports/scores?eventId=${eventId}&league=${league}&startDate=${startDate}&team1=${team1}&team2=${team2}`
        );

        const text = await res.text();
        console.log("🧠 Raw backend response:", text.slice(0, 400));
        if (text.startsWith("<"))
          throw new Error("Received HTML instead of JSON");
        const game = JSON.parse(text);
        if (!game || !game.id)
          throw new Error("Invalid game data from backend");

        if (!scoresLoaded) {
          setScoresLoaded(true);
        }

        const myNotifySettings = players.find(
          (p) => p.userId === userId
        )?.notifySettings;

        if (myNotifySettings) {
          await checkQuarterEndNotification(game, gridId, myNotifySettings);
        }

        const apiScores = game?.quarterScores ?? [];
        const isCompleted = game?.completed ?? false;
        console.log("🏁 Game completed from API:", isCompleted);
        setGameCompleted(isCompleted);

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

          if (error) {
            console.warn(
              "❌ Failed to update quarter_scores in Supabase:",
              error.message
            );
          } else {
            console.log("✅ Saved quarter_scores to Supabase");
          }
        }

        const completedCount = game?.completedQuarters ?? 0;
        const visibleScores = isCompleted
          ? game?.quarterScores ?? []
          : game?.quarterScores?.slice(0, completedCount) ?? [];

        // ✅ Merge API updates only into non-manual quarters
        setQuarterScores((prevScores) => {
          if (!Array.isArray(prevScores) || prevScores.length === 0)
            return visibleScores;

          const merged = prevScores.map((prev, i) => {
            const apiQ = visibleScores[i];
            if (!apiQ) return prev;

            // Skip if this quarter was manually edited
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
    [playerColors]
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
      quarterResults: false,
      playerJoined: false,
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

    if (diff <= 0) return "Deadline has passed";

    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(" ");
  };

  const showSquareToast = (message: string) => {
    Toast.hide();

    setTimeout(() => {
      Toast.show({
        type: "info",
        text1: message,
        position: "bottom",
        visibilityTime: 3000,
        autoHide: true,
        bottomOffset: 60,
        text1Style: {
          fontSize: 16,
          fontWeight: "600",
          color: "#333",
          textAlign: "center",
        },
      });
    }, 200);
  };

  const handleSquarePress = (x: number, y: number) => {
    const key = `${x},${y}`;
    const userColor = squareColors[key];
    const userId = Object.entries(playerColors).find(
      ([, color]) => color === userColor
    )?.[0];
    const username = playerUsernames[userId] || "Unknown Player";
    const xLabel = xAxis[x];
    const yLabel = yAxis[y];

    const message = userColor
      ? `${username} owns (${xLabel},${yLabel})`
      : "This square is unclaimed";

    showSquareToast(message);
  };

  useLayoutEffect(() => {
    if (!isFocused) return;
    navigation.setOptions({
      headerTitle: () => (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: 20,
            fontWeight: "600",
            textAlign: "center",
            textTransform: "uppercase",
            color: theme.colors.onBackground,
            fontFamily: "Rubik_600SemiBold",
            maxWidth: Dimensions.get("window").width * 0.8,
          }}
        >
          {inputTitle}
        </Text>
      ),

      gestureEnabled: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Main")}
          style={{
            height: 30,
            width: 30,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setSessionOptionsVisible(true)}
          style={{
            height: 30,
            width: 30,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="more-vert" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isOwner]);

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

  const handlePress = useCallback(
    async (x, y) => {
      const squareId = `${x},${y}`;
      const currentColor = squareColors[squareId];

      if (currentColor && currentColor !== playerColors[userId]) {
        const username = Object.entries(playerColors).find(
          ([, color]) => color === currentColor
        )?.[0];
        showSquareToast(
          `${playerUsernames[username] || "Someone"} already owns this square.`
        );
        return;
      }

      const isSelected = selectedSquares.has(squareId);
      const updatedSet = new Set(selectedSquares);

      if (!isSelected && selectedSquares.size >= maxSelections) {
        showSquareToast(`Limit reached: Max ${maxSelections} squares allowed.`);
        return;
      }

      if (isSelected) {
        await deselectSquareInSupabase(x, y);

        updatedSet.delete(squareId);
        const newColors = { ...squareColors };
        delete newColors[squareId];
        setSquareColors(newColors);

        setSelections((prev) =>
          prev.filter((s) => !(s.x === x && s.y === y && s.userId === userId))
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
    ]
  );

  const loadingMessages = [
    `Hi...`,
    `${title} is sooooo close to being ready`,
    `I pinky promise...${title} is almost ready!`,
    `Just a few more seconds...`,
    `Did you know? The first video game ever created was "Tennis for Two" in 1958!`,
    `This is just awkward at this point....`,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(messageFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);

        Animated.timing(messageFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

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
        (sel) => sel.userId === userId
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

  const dividerColor = theme.dark ? "#333" : "#eee";

  const renderSquareGrid = ({
    editable,
    onSquarePress,
  }: {
    editable: boolean;
    onSquarePress: (x: number, y: number) => void;
  }) => {
    const numberColor = isDark ? "#eee" : "#222";
    const axisSquareColor = isDark ? "#1e1e1e" : "#f2f2f2";
    const selectedBorderColor = isDark ? "#9fa8ff" : "#5e60ce";
    const defaultSquareColor = isDark ? "#1e1e1e" : "#fff";
    const winningSquares = new Set(
      quarterWinners
        .map((w) => {
          if (!w || !w.square) return null;

          const [scoreX, scoreY] = w.square;
          const visualX = xAxis.findIndex((val) => val === scoreX);
          const visualY = yAxis.findIndex((val) => val === scoreY);

          if (visualX === -1 || visualY === -1) {
            console.warn(
              `⚠️ Invalid axis mapping for winner square: [${scoreX}, ${scoreY}]`
            );
            return null;
          }

          return `${visualX},${visualY}`;
        })
        .filter(Boolean)
    );

    const rows = [];

    for (let y = 0; y <= 10; y++) {
      const row = [];
      for (let x = 0; x <= 10; x++) {
        if (x === 0 && y === 0) {
          row.push(
            <View
              key="corner"
              style={[styles.square, { backgroundColor: axisSquareColor }]}
            />
          );
        } else if (y === 0) {
          row.push(
            <View
              key={`x-${x}`}
              style={[styles.square, { backgroundColor: axisSquareColor }]}
            >
              <Text style={[styles.axisText, { color: numberColor }]}>
                {!hideAxisUntilDeadline || isAfterDeadline ? xAxis[x - 1] : "?"}
              </Text>
            </View>
          );
        } else if (x === 0) {
          row.push(
            <View
              key={`y-${y}`}
              style={[styles.square, { backgroundColor: axisSquareColor }]}
            >
              <Text style={[styles.axisText, { color: numberColor }]}>
                {!hideAxisUntilDeadline || isAfterDeadline ? yAxis[y - 1] : "?"}
              </Text>
            </View>
          );
        } else {
          const key = `${x - 1},${y - 1}`;
          const color = squareColors[key] || defaultSquareColor;
          const isSelected = selectedSquares.has(key);
          const isWinner = winningSquares.has(key);

          row.push(
            <TouchableOpacity
              key={key}
              style={[
                styles.square,
                {
                  backgroundColor: color,
                  borderColor: isSelected
                    ? selectedBorderColor
                    : isDark
                    ? "#444"
                    : "#ccc",
                  borderWidth: isSelected ? 2 : 1,
                  shadowColor: isSelected ? selectedBorderColor : "transparent",
                  shadowOpacity: isSelected ? 0.5 : 0,
                  shadowRadius: isSelected ? 6 : 0,
                  elevation: isSelected ? 5 : 1,
                },
              ]}
              onPress={() => {
                if (editable || onSquarePress === handleSquarePress) {
                  onSquarePress(x - 1, y - 1);
                }
              }}
            >
              {isWinner && (
                <Text style={{ fontSize: 16, color: "#FFD700" }}>🏆</Text>
              )}
            </TouchableOpacity>
          );
        }
      }
      rows.push(
        <View key={y} style={styles.row}>
          {row}
        </View>
      );
    }

    return rows;
  };

  const renderPlayers = useCallback(() => {
    if (!isFocused || !userId) return;

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

    console.log("🎯 Calculated winningsByUser:", winningsMap);

    return (
      <View style={{ flex: 1 }}>
        <Card
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              marginHorizontal: 16,
              marginTop: 16,
              height: usableHeight,
            },
          ]}
        >
          <Card.Title
            title="Players"
            titleStyle={[
              styles.tabSectionTitle,
              { color: theme.colors.primary },
            ]}
            style={{ marginBottom: 8, paddingHorizontal: 12 }}
          />
          <Card.Content>
            <FlatList
              data={playerList}
              keyExtractor={([uid]) => uid}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 100,
              }}
              style={{ maxHeight: usableHeight - 80 }}
              renderItem={({ item }) => {
                const [uid, color] = item;
                const userKey = String(uid);
                const username = playerUsernames[userKey] || userKey;
                const count = userSquareCount[userKey] || 0;
                const totalOwed =
                  typeof pricePerSquare === "number" && pricePerSquare > 0
                    ? count * pricePerSquare
                    : null;

                return (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor:
                        theme.colors.outlineVariant || "rgba(0,0,0,0.1)",
                    }}
                  >
                    <View style={{ flexDirection: "row", flex: 1 }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: color as string,
                          marginRight: 12,
                          borderWidth: 1,
                          borderColor: theme.dark ? "#333" : "#ccc",
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.colors.onSurface,
                            fontFamily: "Rubik_600SemiBold",
                            fontSize: 18,
                          }}
                        >
                          {username}
                        </Text>
                        <Text
                          style={{
                            color: theme.colors.onSurface,
                            fontSize: 16,
                            fontFamily: "Rubik_400Regular",
                          }}
                        >
                          {count} / {maxSelections} squares selected
                        </Text>

                        {userSelections[userKey]?.length > 0 &&
                          (!hideAxisUntilDeadline || isAfterDeadline) && (
                            <Text
                              style={{
                                color: theme.colors.onSurfaceVariant,
                                fontSize: 14,
                                fontFamily: "Rubik_400Regular",
                                marginTop: 2,
                              }}
                            >
                              {userSelections[userKey].join(", ")}
                            </Text>
                          )}
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      {totalOwed !== null && (
                        <Text
                          style={{
                            color: theme.colors.primary,
                            fontWeight: "bold",
                            fontSize: 14,
                            fontFamily: "SoraBold",
                          }}
                        >
                          Bet ${totalOwed.toFixed(2)}
                        </Text>
                      )}
                      {winningsMap[userKey] > 0 && (
                        <Text
                          style={{
                            color: "#4CAF50",
                            fontWeight: "bold",
                            fontSize: 14,
                            fontFamily: "SoraBold",
                            marginTop: 2,
                          }}
                        >
                          Won ${winningsMap[userKey].toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </Card.Content>
        </Card>
      </View>
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
  ]);

  const renderWinners = useCallback(() => {
    if (!isFocused) return null;
    const usernameToUid = useMemo(() => {
      const map: Record<string, string> = {};
      Object.entries(playerUsernames).forEach(([uid, name]) => {
        map[String(name).trim()] = uid;
      });
      return map;
    }, [playerUsernames]);

    const getColorForUsername = (name: string) =>
      playerColors?.[usernameToUid[name.trim()]] || "#999";

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Card
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderLeftWidth: 5,
              borderWidth: 1.5,
              borderLeftColor: theme.colors.primary,
              borderColor: "rgba(94, 96, 206, 0.4)",
              marginBottom: 16,
            },
          ]}
        >
          <Card.Title
            title={
              gameCompleted
                ? quarterWinners.some(
                    (w) => w?.username && w.username !== "No Winner"
                  )
                  ? "🏆 Results"
                  : "No Winners"
                : "Waiting for Scores..."
            }
            titleStyle={{
              fontFamily: "Anton_400Regular",
              color: theme.colors.primary,
              letterSpacing: 1,
              fontSize: 20,
            }}
            // style={{
            //   borderBottomWidth: 1,
            //   borderBottomColor: "rgba(94,96,206,0.3)",
            // }}
          />

          <Card.Content>
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
                    style={{
                      backgroundColor: theme.colors.elevation.level2,
                      borderRadius: 12,
                      borderWidth: 1.25,
                      borderColor: "rgba(94,96,206,0.3)",
                      padding: 14,
                      marginBottom: 12,
                      shadowColor: "#000",
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    {/* Quarter Title */}
                    <Text
                      style={{
                        fontFamily: "Anton_400Regular",
                        fontSize: 20,
                        color: theme.colors.onSurface,
                        textTransform: "uppercase",
                      }}
                    >
                      Quarter {i + 1}: {team1Mascot}{" "}
                      {isTeam1Home ? q.home : q.away} - {team2Mascot}{" "}
                      {isTeam1Home ? q.away : q.home}
                    </Text>

                    {/* Winning Square */}
                    <Text
                      style={{
                        fontFamily: "Rubik_400Regular",
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                        marginBottom: 2,
                        fontSize: 15,
                      }}
                    >
                      Winning square: ({square[0]}, {square[1]})
                    </Text>

                    {/* Winner Row */}
                    {isWinner ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor:
                              playerColors?.[
                                Object.keys(playerUsernames).find(
                                  (id) =>
                                    playerUsernames[id]?.trim() ===
                                    username.trim()
                                )
                              ] || "#4CAF50",
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: theme.dark ? "#444" : "#ccc",
                          }}
                        />
                        <Text
                          style={{
                            fontFamily: "Rubik_600SemiBold",
                            color: "#4CAF50",
                            fontSize: 15,
                          }}
                        >
                          {username} wins $
                          {pricePerSquare
                            ? (
                                (pricePerSquare *
                                  Object.keys(squareColors).length) /
                                quarterScores.length
                              ).toFixed(2)
                            : ""}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 16, marginRight: 4 }}>❌</Text>
                        <Text
                          style={{
                            fontFamily: "Rubik_500Medium",
                            color: "#FF5252",
                            fontSize: 14,
                          }}
                        >
                          No winner for this quarter
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text
                style={{
                  fontFamily: "Rubik_400Regular",
                  fontSize: 16,
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 10,
                }}
              >
                Your game has not yet started.
              </Text>
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
                padding: 14,
                paddingBottom: insets.bottom + 40,
              }}
            >
              <Card
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    height: usableHeight,
                  },
                ]}
              >
                <Card.Content>
                  {/* <Card> */}
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 22,
                          fontFamily: "Anton_400Regular",
                          color: theme.colors.primary,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          textAlign: "center",
                        }}
                      >
                        {fullTeam1}
                      </Text>

                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "Rubik_500Medium",
                          color: theme.colors.onSurfaceVariant,
                          marginVertical: 4,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                        }}
                      >
                        vs
                      </Text>

                      <Text
                        style={{
                          fontSize: 22,
                          fontFamily: "Anton_400Regular",
                          color: theme.colors.primary,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          textAlign: "center",
                        }}
                      >
                        {fullTeam2}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    <Text
                      style={[
                        styles.teamLabel,
                        {
                          color: theme.colors.onSurface,
                          fontFamily: "Rubik_500Medium",
                        },
                      ]}
                    >
                      {team2Mascot}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", marginBottom: 15 }}>
                    <View style={styles.teamColumn}>
                      {splitTeamName(team1Mascot).map((letter, i) => (
                        <Text
                          key={i}
                          style={[
                            styles.teamLetter,
                            {
                              color: theme.colors.onSurface,
                              fontFamily: "Rubik_500Medium",
                            },
                          ]}
                        >
                          {letter}
                        </Text>
                      ))}
                    </View>
                    <ScrollView horizontal>
                      <ScrollView>
                        {renderSquareGrid({
                          editable: !isAfterDeadline,
                          onSquarePress: isAfterDeadline
                            ? handleSquarePress
                            : handlePress,
                        })}
                      </ScrollView>
                    </ScrollView>
                  </View>
                  {
                    <View style={styles.deadlineContainerCentered}>
                      <Text
                        style={[
                          styles.deadlineLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Time Remaining:
                      </Text>
                      <Text
                        style={[
                          styles.deadlineValue,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {deadlineValue
                          ? formatTimeLeft(deadlineValue, now)
                          : "No deadline set"}
                      </Text>
                    </View>
                  }
                  {pricePerSquare > 0 && (
                    <View
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 10,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.outlineVariant || "#ccc",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontSize: 16,
                          fontFamily: "Rubik_400Regular",
                        }}
                      >
                        Price per square: ${pricePerSquare.toFixed(2)}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: 16,
                          fontWeight: "bold",
                          fontFamily: "Rubik_400Regular",
                          paddingTop: 6,
                        }}
                      >
                        Total Bet: ${totalOwed.toFixed(2)}
                      </Text>

                      {winningsByUser?.[userId] > 0 && (
                        <Text
                          style={{
                            color: "#4CAF50",
                            fontSize: 16,
                            fontWeight: "bold",
                            fontFamily: "Rubik_400Regular",
                            paddingTop: 6,
                          }}
                        >
                          Your Winnings: ${winningsByUser[userId].toFixed(2)}
                        </Text>
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
    ]
  );

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {loading ? (
        <Animated.View style={{ opacity: fadeAnim, flex: 1, padding: 16 }}>
          <Animated.View style={{ opacity: messageFade }}>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 16,
                marginBottom: 12,
                textAlign: "center",
                fontFamily: "Rubik_600SemiBold",
              }}
            >
              {loadingMessages[currentMessageIndex]}
            </Text>
          </Animated.View>

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
                indicatorStyle={{
                  backgroundColor: "#5e60ce",
                  height: 4,
                  borderRadius: 2,
                }}
                style={{
                  backgroundColor: theme.colors.surface,
                  shadowColor: "#000",
                  shadowOpacity: 0.1,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
                activeColor="#5e60ce"
                inactiveColor={theme.dark ? theme.colors.onSurface : "#333333"}
                renderLabel={({ route, focused, color }) => (
                  <Text
                    style={{
                      color: color,
                      fontWeight: focused ? "bold" : "500",
                      fontSize: 14,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
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

          <Portal>
            <Modal
              visible={showLeaveConfirm}
              onDismiss={() =>
                closeAnimatedDialog(setShowLeaveConfirm, leaveAnim)
              }
            >
              <Animated.View
                style={[
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "rgba(94, 96, 206, 0.4)",
                    borderLeftWidth: 5,
                    borderBottomWidth: 0,
                    borderLeftColor: theme.colors.primary,
                    marginHorizontal: 16,
                    paddingVertical: 20,
                    paddingHorizontal: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                  getAnimatedDialogStyle(leaveAnim),
                ]}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: theme.colors.onSurface,
                    marginBottom: 12,
                  }}
                >
                  Leave Square
                </Text>
                <View
                  style={{
                    height: 1,
                    backgroundColor: dividerColor,
                    marginBottom: 20,
                  }}
                />
                <Text
                  style={{ color: theme.colors.onSurface, marginBottom: 20 }}
                >
                  Are you sure you want to leave this square?
                </Text>
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end" }}
                >
                  <Button
                    onPress={() =>
                      closeAnimatedDialog(setShowLeaveConfirm, leaveAnim)
                    }
                    textColor={theme.colors.error}
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
                          console.warn("No square found for gridId:", gridId);
                          Toast.show({
                            type: "error",
                            text1: "Session not found or access denied.",
                            position: "bottom",
                            bottomOffset: 60,
                          });
                          return;
                        }

                        const updatedPlayerIds = (data.player_ids || []).filter(
                          (id) => id !== userId
                        );
                        const updatedPlayers = (data.players || []).filter(
                          (p) => p.userId !== userId
                        );
                        const updatedSelections = (
                          data.selections || []
                        ).filter((sel) => sel.userId !== userId);

                        const { error: updateError } = await supabase
                          .from("squares")
                          .update({
                            players: updatedPlayers,
                            player_ids: updatedPlayerIds,
                            selections: updatedSelections,
                          })
                          .eq("id", gridId)
                          .single();

                        if (updateError) {
                          Toast.show({
                            type: "error",
                            text1: "Failed to leave session. Try again.",
                            position: "bottom",
                            bottomOffset: 60,
                          });
                          return;
                        }

                        if (updatedPlayers.length === 0) {
                          const { error: deleteError } = await supabase
                            .from("squares")
                            .delete()
                            .eq("id", gridId);
                          if (deleteError) {
                            console.error(
                              "Error deleting empty square:",
                              deleteError
                            );
                          }
                        }

                        Toast.show({
                          type: "info",
                          text1: `You’ve left ${title}`,
                          position: "bottom",
                          visibilityTime: 2500,
                          bottomOffset: 60,
                          text1Style: {
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#333",
                            textAlign: "center",
                          },
                        });

                        navigation.navigate("Main");
                      } catch (err) {
                        console.error("Failed to leave square:", err);
                        Sentry.captureException(err);
                        Toast.show({
                          type: "error",
                          text1: "Unexpected error leaving the square.",
                          position: "bottom",
                          bottomOffset: 60,
                        });
                      }
                    }}
                    textColor={theme.colors.primary}
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
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "rgba(94, 96, 206, 0.4)",
                    borderLeftWidth: 5,
                    borderBottomWidth: 0,
                    borderLeftColor: theme.colors.primary,
                    marginHorizontal: 16,
                    paddingVertical: 20,
                    paddingHorizontal: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                  getAnimatedDialogStyle(deleteAnim),
                ]}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: theme.colors.onSurface,
                    marginBottom: 12,
                  }}
                >
                  Delete Square
                </Text>
                <View
                  style={{
                    height: 1,
                    backgroundColor: dividerColor,
                    marginBottom: 20,
                  }}
                />
                <Text
                  style={{ color: theme.colors.onSurface, marginBottom: 20 }}
                >
                  Are you sure you want to permanently delete this square?
                </Text>
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end" }}
                >
                  <Button
                    onPress={() =>
                      closeAnimatedDialog(setShowDeleteConfirm, deleteAnim)
                    }
                    textColor={theme.colors.error}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={async () => {
                      closeAnimatedDialog(setShowDeleteConfirm, deleteAnim);
                      try {
                        await supabase
                          .from("squares")
                          .delete()
                          .eq("id", gridId);

                        Toast.show({
                          type: "error",
                          text1: `You’ve deleted ${title}!`,
                          position: "bottom",
                          visibilityTime: 2500,
                          bottomOffset: 60,
                          text1Style: {
                            fontSize: 16,
                            fontWeight: "600",
                            color: "#333",
                            textAlign: "center",
                          },
                        });
                        navigation.navigate("Main");
                      } catch (err) {
                        Sentry.captureException(err);
                        console.error("Failed to delete square:", err);
                      }
                    }}
                    textColor={theme.colors.primary}
                  >
                    Delete
                  </Button>
                </View>
              </Animated.View>
            </Modal>
          </Portal>
        </>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.primaryBackground,
    borderLeftWidth: 5,
    borderWidth: 1.5,
    borderLeftColor: colors.primary,
    borderColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  square: {
    width: squareSize,
    height: squareSize,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  axisText: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "Sora",
  },
  row: { flexDirection: "row" },
  teamLabel: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Sora",
    textTransform: "uppercase",
    textAlign: "center",
    marginHorizontal: 2,
  },
  squareInfoText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 2,
    fontFamily: "Sora",
  },

  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  winnerText: {
    fontSize: 15,
    fontWeight: "500",
  },

  quarterLabel: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Rubik_600SemiBold",
  },

  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 5,
    marginLeft: -10,
  },
  teamLetter: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Sora",
    textTransform: "uppercase",
  },
  legendRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  colorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
  yAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Sora",
    marginTop: 5,
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  deadlineText: {
    fontSize: 18,
    color: "#000",
  },
  deadlineContainerCentered: {
    alignItems: "center",
    marginBottom: 16,
  },
  deadlineLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#444",
    fontFamily: "Sora",
  },
  deadlineValue: {
    fontSize: 16,
    color: "#333",
    marginTop: 4,
    fontFamily: "Rubik_400Regular",
  },
  titleCard: {
    marginBottom: 24,
    backgroundColor: colors.highlightBackground,
    marginHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
  },
  vsText: {
    fontSize: 16,
    color: "#888",
    marginVertical: 4,
    fontWeight: "600",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  playerText: {
    fontSize: 16,
    marginLeft: 10,
  },
  winnerCard: {
    backgroundColor: colors.highlightBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  teamTitleCard: {
    backgroundColor: colors.highlightBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutralBorder,
    marginBottom: 16,
    elevation: 2,
  },
  // quarterLabel: {
  //   fontSize: 16,
  //   fontWeight: "bold",
  //   marginBottom: 6,
  //   color: "#333",
  // },
  scoreColumn: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 14,
    color: "#555",
  },
  winnerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  winnerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryText,
    textAlign: "center",
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
    justifyContent: "center",
  },
  teamLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    fontFamily: "Sora",
  },
  playerSubtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    fontFamily: "Sora",
  },
  tabSectionTitle: {
    fontSize: 22,
    color: colors.primaryText,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Anton_400Regular",
    paddingTop: 4,
  },
  sessionTitleCard: {
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.25,
    borderColor: "rgba(94, 96, 206, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  titleContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 22,
    fontFamily: "SoraBold",
    fontWeight: "700",
    textAlign: "center",
  },
  sessionSubtitle: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Sora",
    textAlign: "center",
  },
});

export default SquareScreen;
