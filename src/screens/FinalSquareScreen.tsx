import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
} from "react-native";
import { Card, useTheme } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import { StackActions, useNavigation } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import { TabView, SceneMap, TabBar, TabBarProps } from "react-native-tab-view";
import Toast from "react-native-toast-message";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import SessionOptionsModal from "../components/SessionOptionsModal";

const screenWidth = Dimensions.get("window").width;
const squareSize = (screenWidth - 80) / 11;

const splitTeamName = (teamName) => {
  return teamName ? teamName.split("") : [];
};

const convertToDate = (deadline) => {
  if (deadline instanceof Timestamp) return deadline.toDate();
  if (deadline instanceof Date) return deadline;
  return null;
};

const FinalSquareScreen = ({ route }) => {
  const { gridId, inputTitle, deadline, eventId } = route.params;
  const formattedDeadline = convertToDate(deadline);

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const [team1Mascot, setTeam1Mascot] = useState("");
  const [team2Mascot, setTeam2Mascot] = useState("");
  const [team1Logo, setTeam1Logo] = useState(null);
  const [team2Logo, setTeam2Logo] = useState(null);
  const [maxSelections, setMaxSelections] = useState(0);
  const [quarterScores, setQuarterScores] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [quarterWinners, setQuarterWinners] = useState([]);

  const fallbackLogo = "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png";

  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [deadlineValue, setDeadlineValue] = useState(formattedDeadline);
  const [isAfterDeadline, setIsAfterDeadline] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(deadlineValue);
  const [hideAxisUntilDeadline, setHideAxisUntilDeadline] = useState(false);
  const [sessionOptionsVisible, setSessionOptionsVisible] = useState(false);

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
    navigation.setOptions({ headerTitle: inputTitle });
  }, [navigation, inputTitle]);

  useEffect(() => {
    if (!eventId) {
      setQuarterScores([
        { quarter: "1Q", home: 7, away: 3, winner: "Buccaneers" },
        { quarter: "2Q", home: 10, away: 10, winner: "Tie" },
        { quarter: "3Q", home: 0, away: 14, winner: "Eagles" },
        { quarter: "4Q", home: 6, away: 7, winner: "Eagles" },
      ]);
    }
  }, []);

  // const quarterWinners = [
  //   { quarter: "1", username: "Alice", square: [7, 3] },
  //   { quarter: "2", username: "Bob", square: [0, 0] },
  //   { quarter: "3", username: "Carlos", square: [0, 4] },
  //   { quarter: "4", username: "Dana", square: [6, 7] },
  // ];

  const determineQuarterWinners = (scores, selections, xAxis, yAxis) => {
    return scores.map(({ home, away }, i) => {
      const x = xAxis.findIndex((val) => val === away % 10);
      const y = yAxis.findIndex((val) => val === home % 10);
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
    });
  };

  useEffect(() => {
    if (quarterScores.length > 0 && xAxis.length && yAxis.length) {
      const ref = doc(db, "squares", gridId);
      getDoc(ref).then((docSnap) => {
        const data = docSnap.data();
        if (data?.selections) {
          const winners = determineQuarterWinners(
            quarterScores,
            data.selections,
            xAxis,
            yAxis
          );
          setQuarterWinners(winners);
        }
      });
    }
  }, [quarterScores, xAxis, yAxis]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const ref = doc(db, "squares", gridId);
    const unsub = onSnapshot(ref, (docSnap) => {
      const data = docSnap.data();
      if (!data) return;
      const colorMapping = {};
      const nameMapping = {};

      setTeam1(data.team1 || "");
      setTeam2(data.team2 || "");

      setTeam1Mascot(data.team1.split(" ").slice(-1)[0]);
      setTeam2Mascot(data.team2.split(" ").slice(-1)[0]);

      if (data?.players) {
        data.players.forEach((p) => {
          colorMapping[p.userId] = p.color || "#999";
          nameMapping[p.userId] = p.username || p.userId;
        });
        setPlayerColors(colorMapping);
        setPlayerUsernames(nameMapping);
      }

      if (data?.selections) {
        const squareMap = {};
        data.selections.forEach((sel) => {
          const id = `${sel.x},${sel.y}`;
          squareMap[id] = colorMapping[sel.userId] || "#999";
        });
        setSquareColors(squareMap);

        if (userId && Array.isArray(data.selections)) {
          const mySelections = data.selections.filter(
            (sel) => sel.userId === userId
          );
          const mySet = new Set(mySelections.map((sel) => `${sel.x},${sel.y}`));
          setSelectedSquares(mySet);
        }
      }

      if (Array.isArray(data?.xAxis) && data.xAxis.length === 10) {
        setXAxis(data.xAxis);
      } else {
        setXAxis([...Array(10).keys()]);
      }

      if (Array.isArray(data?.yAxis) && data.yAxis.length === 10) {
        setYAxis(data.yAxis);
      } else {
        setYAxis([...Array(10).keys()]);
      }

      if (data?.createdBy === auth.currentUser?.uid) {
        setIsOwner(true);
      }

      if (data?.deadline) {
        const deadlineDate = convertToDate(data.deadline);
        setDeadlineValue(deadlineDate);
      }

      if (typeof data?.maxSelections === "number") {
        setMaxSelections(data.maxSelections);
      }

      if (typeof data?.hideAxisUntilDeadline === "boolean") {
        setHideAxisUntilDeadline(data.hideAxisUntilDeadline);
      }
    });

    return unsub;
  }, [gridId]);

  useEffect(() => {
    if (!deadlineValue) return;

    const updateDeadlineState = () => {
      const now = new Date();
      const isPast = now > deadlineValue;
      setIsAfterDeadline(isPast);
      setTimeLeft(isPast ? "Finalized" : formatTimeLeft(deadlineValue));
    };

    updateDeadlineState();

    const interval = setInterval(updateDeadlineState, 1000);

    return () => clearInterval(interval);
  }, [deadlineValue]);

  // **API for quarter scores/logos**
  useEffect(() => {
    const fetchQuarterScores = async () => {
      if (!eventId) return;

      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
        );
        const data = await res.json();
        const game = data.events.find((e) => e.id === eventId.toLocaleString());

        console.log(
          "Fetched games:",
          data.events.map((e) => e.id)
        );

        if (!game) return;

        const competition = game.competitions?.[0];
        if (!competition) {
          console.warn("No competition found in game");
          return;
        }

        const home = competition.competitors?.find(
          (c) => c.homeAway === "home"
        );
        const away = competition.competitors?.find(
          (c) => c.homeAway === "away"
        );

        const homeScores = Array.isArray(home?.linescores)
          ? home.linescores.map((s) => s.value)
          : [];

        const awayScores = Array.isArray(away?.linescores)
          ? away.linescores.map((s) => s.value)
          : [];

        console.log("home team object:", home);
        console.log("home linescores:", home?.linescores);

        const scores = homeScores.map((homeQ, i) => ({
          quarter: `${i + 1}Q`,
          home: homeQ,
          away: awayScores[i],
          winner:
            homeQ > awayScores[i]
              ? home.team.displayName
              : away.team.displayName,
        }));
        console.log("Quarter Scores:", scores);

        if (!home?.team?.logo?.[0]?.href || !away?.team?.logo?.[0]?.href) {
          console.warn("Logo(s) missing", {
            homeTeam: home?.team,
            awayTeam: away?.team,
          });
        }

        // MOCK DATA //
        if (homeScores.length === 0 || awayScores.length === 0) {
          console.warn("Linescores missing — using mock data for testing");
          setQuarterScores([
            // { quarter: "1Q", home: 7, away: 3, winner: "Eagles" },
            // { quarter: "2Q", home: 10, away: 10, winner: "Tie" },
            // { quarter: "3Q", home: 0, away: 14, winner: "Cowboys" },
            // { quarter: "4Q", home: 6, away: 7, winner: "Cowboys" },
          ]);
          setTeam1Logo(home?.team?.logo || fallbackLogo);
          setTeam2Logo(away?.team?.logo || fallbackLogo);
          return; // prevent setting empty scores below
        }
        // END OF MOCK DATA //

        setQuarterScores(scores);
        setTeam1Logo(home?.team?.logo || fallbackLogo);
        setTeam2Logo(away?.team?.logo || fallbackLogo);
      } catch (e) {
        console.warn("Error fetching quarter scores", e);
      }
    };

    fetchQuarterScores();
  }, [eventId]);

  const handleLeaveSquare = () => {
    Alert.alert("Leave Square", "Are you sure you want to leave this square?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          const ref = doc(db, "squares", gridId);
          setSessionOptionsVisible(false);
          try {
            const docSnap = await getDoc(ref);
            if (!docSnap.exists()) return;

            const data = docSnap.data();
            const updatedPlayerIds = (data.playerIds || []).filter(
              (id) => id !== userId
            );
            const updatedPlayers = (data.players || []).filter(
              (p) => p.userId !== userId
            );
            const updatedSelections = (data.selections || []).filter(
              (sel) => sel.userId !== userId
            );

            await updateDoc(ref, {
              playerIds: updatedPlayerIds,
              players: updatedPlayers,
              selections: updatedSelections,
            });

            Toast.show({
              type: "error",
              text1: `You’ve left ${inputTitle}`,
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

            if (updatedPlayers.length === 0) {
              await deleteDoc(ref);
            }

            navigation.navigate("Main");
          } catch (err) {
            console.error("Failed to leave square:", err);
          }
        },
      },
    ]);
  };

  const handleDeleteSquare = () => {
    Alert.alert(
      "Delete Square",
      "Are you sure you want to permanently delete this square?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSessionOptionsVisible(false);
              await deleteDoc(doc(db, "squares", gridId));
              Toast.show({
                type: "error",
                text1: `You’ve deleted ${inputTitle}!`,
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
              console.error("Failed to delete square:", err);
            }
          },
        },
      ]
    );
  };

  const handleDeadlineChange = async (event, selectedDate) => {
    if (!selectedDate || selectedDate.getTime() === deadlineValue?.getTime())
      return;
    setDeadlineValue(selectedDate); // keep local state in sync
    try {
      await updateDoc(doc(db, "squares", gridId), { deadline: selectedDate });
    } catch (err) {
      console.error("Error updating deadline:", err);
    }
  };

  const formatTimeLeft = (targetDate: Date) => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) return "Finalized";

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
    Toast.hide(); // Hide current toast immediately

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
      ([id, color]) => color === userColor
    )?.[0];
    const username = playerUsernames[userId] || "Unknown Player";
    const xLabel = xAxis[x];
    const yLabel = yAxis[y];

    const message = userColor
      ? `${username} owns (${xLabel},${yLabel})`
      : "This square is unclaimed";

    setSelectedSquare(key);
    showSquareToast(message);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: inputTitle,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.dispatch(StackActions.popToTop())}
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
  }, [navigation, menuVisible, isOwner]);

  const selectSquareInFirestore = useCallback(
    async (x, y) => {
      if (!userId) return;
      const gridRef = doc(db, "squares", gridId);
      await updateDoc(gridRef, {
        selections: arrayUnion({ x, y, userId, username: currentUsername }),
      });
    },
    [gridId, userId, currentUsername]
  );

  const deselectSquareInFirestore = useCallback(
    async (x, y) => {
      if (!userId) return;
      const gridRef = doc(db, "squares", gridId);
      await updateDoc(gridRef, {
        selections: arrayRemove({ x, y, userId, username: currentUsername }),
      });
    },
    [gridId, userId, currentUsername]
  );

  const handlePress = useCallback(
    (x, y) => {
      const squareId = `${x},${y}`;
      const currentColor = squareColors[squareId];

      // Square owned by another player
      if (currentColor && currentColor !== playerColors[userId]) {
        const username = Object.entries(playerColors).find(
          ([id, color]) => color === currentColor
        )?.[0];
        showSquareToast(
          `${playerUsernames[username] || "Someone"} already owns this square.`
        );
        return;
      }

      // Square owned by me (toggle)
      const isSelected = selectedSquares.has(squareId);
      const updatedSet = new Set(selectedSquares);

      if (!isSelected && selectedSquares.size >= maxSelections) {
        showSquareToast(`Limit reached: Max ${maxSelections} squares allowed.`);
        return;
      }

      if (isSelected) {
        updatedSet.delete(squareId);
        deselectSquareInFirestore(x, y);
        const newColors = { ...squareColors };
        delete newColors[squareId];
        setSquareColors(newColors);
      } else {
        updatedSet.add(squareId);
        selectSquareInFirestore(x, y);
        setSquareColors((prev) => ({
          ...prev,
          [squareId]: playerColors[userId],
        }));
      }

      setSelectedSquares(updatedSet); // Re-trigger re-render
    },
    [
      squareColors,
      playerColors,
      userId,
      selectedSquares,
      deselectSquareInFirestore,
      selectSquareInFirestore,
      playerUsernames,
    ]
  );

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, "squares", gridId);
    const unsub = onSnapshot(ref, (docSnap) => {
      const data = docSnap.data();
      if (!data?.selections) return;

      const mySelections = data.selections.filter(
        (sel) => sel.userId === userId
      );
      const mySet = new Set(mySelections.map((sel) => `${sel.x},${sel.y}`));
      setSelectedSquares(mySet);
    });

    return unsub;
  }, [userId, gridId]);

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
            />
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

  const renderScene = SceneMap({
    squares: () => (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Card
              style={[
                styles.winnerCard,
                {
                  backgroundColor: theme.colors.elevation.level1,
                  borderColor: theme.colors.outline,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Card.Content style={{ alignItems: "center" }}>
                <View style={styles.teamRow}>
                  <Image
                    source={{ uri: team1Logo || fallbackLogo }}
                    style={styles.teamLogo}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.titleText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {team1}
                  </Text>
                </View>
                <Text
                  style={[styles.vsText, { color: theme.colors.onSurface }]}
                >
                  vs
                </Text>
                <View style={styles.teamRow}>
                  <Image
                    source={{ uri: team2Logo || fallbackLogo }}
                    style={styles.teamLogo}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.titleText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {team2}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text
                style={[styles.teamLabel, { color: theme.colors.onSurface }]}
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
            {!isAfterDeadline && (
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
                    ? formatTimeLeft(deadlineValue)
                    : "No deadline set"}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    ),
    players: () => {
      // Build a count of squares per user
      const userSquareCount: Record<string, number> = {};
      Object.entries(squareColors).forEach(([_, color]) => {
        const uid = Object.entries(playerColors).find(
          ([id, userColor]) => userColor === color
        )?.[0];
        if (uid) {
          userSquareCount[uid] = (userSquareCount[uid] || 0) + 1;
        }
      });

      const playerList = Object.entries(playerColors);

      return (
        <Card
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface },
            { margin: 16 },
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
              renderItem={({ item: [uid, color] }) => {
                const username = playerUsernames[uid] || uid;
                const count = userSquareCount[uid] || 0;
                const isMaxed = count >= maxSelections;

                return (
                  <View style={styles.playerRow}>
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color as string },
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
                          ,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {count} / {maxSelections} squares selected
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </Card.Content>
        </Card>
      );
    },

    winners: () => (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Title
            title={
              quarterWinners.some(
                (w) => w?.username && w.username !== "No Winner"
              )
                ? "Congratulations Winners!"
                : "No Winners Yet.  Be patient"
            }
            titleStyle={[styles.winnerTitle, { color: theme.colors.onSurface }]}
          />
          <Card.Content>
            {quarterScores.length > 0 ? (
              quarterScores.map((q, i) => {
                const winner = quarterWinners[i];
                const username = winner?.username ?? "No Winner";
                const square = winner?.square ?? ["-", "-"];
                return (
                  <Card
                    key={i}
                    style={[
                      styles.winnerCard,
                      {
                        backgroundColor: theme.colors.elevation.level1,
                        borderColor: theme.colors.outline,
                        borderWidth: StyleSheet.hairlineWidth,
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
                        Quarter {q.quarter}
                      </Text>
                      <View style={styles.scoreColumn}>
                        <Text
                          style={[
                            styles.scoreText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {team1Mascot}: {q.home}
                        </Text>
                        <Text
                          style={[
                            styles.scoreText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {team2Mascot}: {q.away}
                        </Text>
                      </View>
                      <View style={styles.winnerInfo}>
                        {username !== "No Winner" ? (
                          <>
                            <Icon name="emoji-events" size={20} color="gold" />
                            <Text
                              style={[
                                styles.winnerText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {username} wins with square ({square[0]},{" "}
                              {square[1]})
                            </Text>
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
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            ) : (
              <Text style={{ color: theme.colors.onSurface, marginTop: 10 }}>
                Scores not yet available.
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    ),
  });

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
      {showDeadlineModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "80%",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Select New Deadline
            </Text>

            <DateTimePicker
              value={tempDeadline || new Date()}
              mode="datetime"
              display="default"
              onChange={(event, date) => {
                if (date) setTempDeadline(date);
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowDeadlineModal(false)}
                style={{ padding: 10 }}
              >
                <Text style={{ color: "red", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowDeadlineModal(false);
                  handleDeadlineChange(null, tempDeadline);
                }}
                style={{ padding: 10 }}
              >
                <Text style={{ color: "#007AFF", fontWeight: "600" }}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
      />
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
  axisCell: { backgroundColor: "#f3f4f6" },
  axisText: { fontSize: 15, fontWeight: "bold", textAlign: "center" },
  row: { flexDirection: "row" },
  teamLabel: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Courier",
    textTransform: "uppercase",
    textAlign: "center",
    marginHorizontal: 2,
  },
  winnerRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  winnerText: { marginLeft: 8, fontSize: 14, fontWeight: "600" },
  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 5,
    marginLeft: -10,
  },
  teamLetter: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Courier",
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
  legendText: { fontSize: 14 },
  yAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginTop: 5,
  },
  coordinateText: { fontSize: 10, color: "#000" },
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
  },
  deadlineValue: {
    fontSize: 16,
    color: "#333",
    marginTop: 4,
  },
  titleCard: {
    marginBottom: 24,
    backgroundColor: colors.highlightBackground,
    marginHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftColor: colors.primary,
    borderColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 5,
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
  quarterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#333",
  },
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
  },
  playerSubtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  tabSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primaryText,
  },
});

export default FinalSquareScreen;
