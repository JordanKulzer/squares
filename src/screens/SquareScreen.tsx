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
  Image,
  FlatList,
  Animated,
  Platform,
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
import * as Notifications from "expo-notifications";
import { scheduleNotifications } from "../utils/notifications";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/apiConfig";
import * as Sentry from "@sentry/react-native";

const screenWidth = Dimensions.get("window").width;
const squareSize = (screenWidth - 80) / 11;

const splitTeamName = (teamName) => {
  return teamName ? teamName.split("") : [];
};

const SquareScreen = ({ route }) => {
  const { gridId, inputTitle, eventId, pricePerSquare } = route.params;
  const [now, setNow] = useState(new Date());
  const isFocused = useIsFocused();

  const theme = useTheme();
  const isDark = theme.dark;

  const [squareColors, setSquareColors] = useState({});
  const [playerColors, setPlayerColors] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
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
  const leaveAnim = useRef(new Animated.Value(0)).current;
  const deleteAnim = useRef(new Animated.Value(0)).current;

  const screenHeight = Dimensions.get("window").height;
  const insets = useSafeAreaInsets();
  const usableHeight = screenHeight - insets.top - insets.bottom - 120;

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

  useLayoutEffect(() => {
    if (!isFocused) return;

    navigation.setOptions({ headerTitle: title });
  }, [navigation, title]);

  const determineQuarterWinners = (scores, selections, xAxis, yAxis) => {
    return scores
      .map(({ home, away }, i) => {
        if (home === null || away === null) {
          return null; // skip this quarter entirely
        }

        const x = xAxis.findIndex((val) => val === home % 10);
        const y = yAxis.findIndex((val) => val === away % 10);
        const matchingSelection = selections.find(
          (sel) => sel.x === x && sel.y === y
        );

        return {
          quarter: `${i + 1}`,
          username: matchingSelection
            ? playerUsernames[matchingSelection.userId]
            : "No Winner",
          square: [away % 10, home % 10],
        };
      })
      .filter(Boolean);
  };

  useEffect(() => {
    if (!isFocused) return;

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

      setQuarterScores(data.quarter_scores || []);

      if (data.selections && xAxis.length && yAxis.length) {
        const winners = determineQuarterWinners(
          data.quarter_scores || [],
          data.selections,
          xAxis,
          yAxis
        );
        setQuarterWinners(winners);
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
    if (!isFocused) return;

    const fetchSquareData = async () => {
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

      const colorMapping = {};
      const nameMapping = {};

      setTitle(data.title || "");
      setTeam1(data.team1 || "");
      setTeam2(data.team2 || "");
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
    if (!isFocused) return;
    if (!eventId || !deadlineValue) return;

    const fetchQuarterScores = async () => {
      const startDate = deadlineValue.toISOString().split("T")[0];
      const now = new Date();
      if (now < new Date(deadlineValue)) return;

      try {
        Sentry.addBreadcrumb({
          category: "fetch information",
          message: "fetchQuarterScores",
          level: "info",
        });
        const res = await fetch(
          `${API_BASE_URL}/scores?eventId=${eventId}&startDate=${startDate}`
        );
        const game = await res.json();
        const apiScores = game?.quarterScores ?? [];

        const { data: dbData, error: dbError } = await supabase
          .from("squares")
          .select("quarter_scores")
          .eq("id", gridId)
          .single();

        const dbScores = dbData?.quarter_scores ?? [];

        const scoresDiffer =
          JSON.stringify(apiScores) !== JSON.stringify(dbScores);
        const finalScores =
          scoresDiffer && dbScores.length > 0 ? dbScores : apiScores;

        setQuarterScores(finalScores);

        const storageKey = `notifiedQuarters-${eventId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        const alreadyNotified: number[] = stored ? JSON.parse(stored) : [];
        const newNotified = [...alreadyNotified];

        finalScores.forEach((q, index) => {
          const quarterNumber = index + 1;
          if (!alreadyNotified.includes(quarterNumber)) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: `🏈 End of Q${quarterNumber}`,
                body: `Quarter ${quarterNumber} just ended. Check the standings!`,
                sound: true,
              },
              trigger: null,
            });
            newNotified.push(quarterNumber);
          }
        });

        if (newNotified.length !== alreadyNotified.length) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(newNotified));
        }
      } catch (e) {
        Sentry.captureException(e);
        console.warn("Error fetching quarter scores", e);
      }
    };

    fetchQuarterScores();

    const interval = setInterval(fetchQuarterScores, 30000);
    return () => clearInterval(interval);
  }, [eventId, deadlineValue, refreshKey]);

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
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: Platform.OS === "ios" ? -20 : 0,
          }}
        >
          <Image
            source={require("../../assets/icons/squares-logo.png")}
            style={{ height: 100, width: 100 }}
            resizeMode="contain"
          />
        </View>
      ),

      gestureEnabled: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Main")}
          style={{ paddingLeft: 12 }}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onBackground} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setSessionOptionsVisible(true)}
          style={{ paddingRight: 12 }}
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
      } else {
        await selectSquareInSupabase(x, y);

        updatedSet.add(squareId);
        setSquareColors((prev) => ({
          ...prev,
          [squareId]: playerColors[userId],
        }));
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
    if (!isFocused) return null;

    const userSelections: Record<string, string[]> = {};
    const userSquareCount: Record<string, number> = {};

    players.forEach((p) => {
      userSelections[p.userId] = [];
      userSquareCount[p.userId] = 0;
    });

    (selections || []).forEach(({ x, y, userId }) => {
      if (!userSelections[userId]) {
        userSelections[userId] = [];
        userSquareCount[userId] = 0;
      }

      userSelections[userId].push(`(${xAxis[x]},${yAxis[y]})`);
      userSquareCount[userId]++;
    });

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
              { color: theme.colors.onSurface },
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
                const username = playerUsernames[uid] || uid;
                const count = userSquareCount[uid] || 0;
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
                            fontWeight: "600",
                          }}
                        >
                          {username}
                        </Text>
                        <Text style={{ color: theme.colors.onSurface }}>
                          {count} / {maxSelections} squares selected
                        </Text>

                        {userSelections[uid]?.length > 0 &&
                          (!hideAxisUntilDeadline || isAfterDeadline) && (
                            <Text
                              style={{
                                color: theme.colors.onSurfaceVariant,
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              {userSelections[uid].join(", ")}
                            </Text>
                          )}
                      </View>
                    </View>

                    {totalOwed !== null && (
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "bold",
                          fontSize: 14,
                          fontFamily: "SoraBold",
                          paddingLeft: 6,
                        }}
                      >
                        ${totalOwed.toFixed(2)}
                      </Text>
                    )}
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
  ]);

  const renderWinners = useCallback(() => {
    if (!isFocused) return null;

    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, height: usableHeight },
          ]}
        >
          <Card.Title
            title={
              quarterWinners.some(
                (w) => w?.username && w.username !== "No Winner"
              )
                ? "Results!"
                : "No Winners Yet."
            }
            titleStyle={[
              styles.tabSectionTitle,
              { color: theme.colors.onSurface },
            ]}
            style={{ marginBottom: 8, paddingHorizontal: 12 }}
          />
          <Card.Content>
            {quarterScores.length > 0 ? (
              quarterScores.map((q, i) => {
                const { home, away } = q;
                const winner = quarterWinners[i];
                if (home == null || away == null || !winner) return null;
                const username = winner?.username ?? "No Winner";
                const square = winner?.square ?? ["-", "-"];
                const totalSelected = Object.keys(squareColors).length;
                const totalPayout = pricePerSquare * totalSelected;
                const payoutPerQuarter = totalPayout / 4;
                const payout = pricePerSquare
                  ? `$${payoutPerQuarter.toFixed(2)}`
                  : "";
                const quarterNumber = q.quarter.replace("Q", "");
                const usernameToUid = useMemo(() => {
                  return Object.entries(playerUsernames).reduce(
                    (acc, [uid, username]) => {
                      const nameStr = String(username).trim();
                      acc[nameStr] = uid;
                      return acc;
                    },
                    {} as Record<string, string>
                  );
                }, [playerUsernames]);

                const getColorForUsername = (username: string) => {
                  const uid = usernameToUid[username.trim()];
                  return playerColors?.[uid] || "#999";
                };

                return (
                  <Card
                    key={i}
                    style={[
                      styles.sessionTitleCard,
                      {
                        backgroundColor: theme.colors.elevation.level2,
                        marginBottom: 12,
                      },
                    ]}
                  >
                    <Card.Content>
                      <Text
                        style={[
                          styles.quarterLabel,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Quarter {quarterNumber}: {team2Mascot} {q.away} -{" "}
                        {team1Mascot} {q.home}
                      </Text>
                      <Text
                        style={[
                          styles.squareInfoText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Winning square: ({square[0]}, {square[1]})
                      </Text>

                      {username !== "No Winner" ? (
                        <>
                          <View style={styles.winnerRow}>
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                backgroundColor: getColorForUsername(username),

                                marginRight: 8,
                                borderWidth: 1,
                                borderColor: theme.dark ? "#444" : "#ccc",
                              }}
                            />
                            <Text
                              style={[
                                styles.winnerText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {username} wins {payout}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.winnerText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          ❌ No winner for this quarter
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            ) : (
              <Text
                style={{
                  color: theme.colors.onSurface,
                  marginTop: 10,
                  fontFamily: "Sora",
                }}
              >
                Scores not yet available.
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
            <ScrollView contentContainerStyle={{ padding: 14 }}>
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
                  <Card
                    style={[
                      styles.sessionTitleCard,
                      {
                        backgroundColor: theme.colors.elevation.level2,
                      },
                    ]}
                  >
                    <Card.Content style={{ alignItems: "center" }}>
                      <View style={styles.titleContent}>
                        <Text
                          style={[
                            styles.sessionTitle,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {title}
                        </Text>
                      </View>
                      <Text style={styles.sessionSubtitle}>
                        {team1} vs {team2}
                      </Text>
                    </Card.Content>
                  </Card>
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    <Text
                      style={[
                        styles.teamLabel,
                        { color: theme.colors.onSurface },
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
                            { color: theme.colors.onSurface },
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
                        marginTop: 12,
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
                          fontFamily: "SoraBold",
                        }}
                      >
                        Price per square: ${pricePerSquare.toFixed(2)}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: 16,
                          fontWeight: "bold",
                          fontFamily: "SoraBold",
                        }}
                      >
                        Total Owed: ${totalOwed.toFixed(2)}
                      </Text>
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
          onDismiss={() => closeAnimatedDialog(setShowLeaveConfirm, leaveAnim)}
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
            <Text style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
              Are you sure you want to leave this square?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
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
                    const updatedSelections = (data.selections || []).filter(
                      (sel) => sel.userId !== userId
                    );

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
            <Text style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
              Are you sure you want to permanently delete this square?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
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
                    await supabase.from("squares").delete().eq("id", gridId);

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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
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
    fontFamily: "Sora",
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
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryText,
    fontFamily: "Sora",
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
