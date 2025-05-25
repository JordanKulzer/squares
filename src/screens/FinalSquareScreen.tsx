import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  useColorScheme,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Card, Menu } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import * as Clipboard from "expo-clipboard";
import { TabView, SceneMap, TabBar, TabBarProps } from "react-native-tab-view";
import Toast from "react-native-toast-message";

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
  const { gridId, inputTitle, deadline } = route.params;
  const formattedDeadline = convertToDate(deadline);

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

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
  const [showPlayers, setShowPlayers] = useState(false);
  const [maxSelections, setMaxSelections] = useState(0);

  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [deadlineValue, setDeadlineValue] = useState(formattedDeadline);
  const [isAfterDeadline, setIsAfterDeadline] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState(deadlineValue);

  const currentUsername =
    userId && playerUsernames[userId] ? playerUsernames[userId] : "Unknown";
  console.log("FINAL");

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "squares", title: "Square" },
    { key: "players", title: "Players" },
    { key: "winners", title: "Winners" },
  ]);

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: inputTitle });
  }, [navigation, inputTitle]);

  const quarterWinners = [
    { quarter: "1st", username: "Alice" },
    { quarter: "2nd", username: "Bob" },
    { quarter: "3rd", username: "Carlos" },
    { quarter: "4th", username: "Dana" },
  ];

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

      setTeam1Mascot(data.team1.split(" ").slice(-1)[0]); // 'Buccaneers'
      setTeam2Mascot(data.team2.split(" ").slice(-1)[0]); // 'Eagles'

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
    });

    return unsub;
  }, [gridId]);

  useEffect(() => {
    if (deadlineValue) {
      setIsAfterDeadline(new Date() > deadlineValue);
    }
  }, [deadlineValue]);

  useEffect(() => {
    if (!deadlineValue) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now > deadlineValue) {
        setIsAfterDeadline(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineValue]);

  const handleLeaveSquare = async () => {
    setMenuVisible(false);
    const ref = doc(db, "squares", gridId);
    try {
      await updateDoc(ref, { playerIds: arrayRemove(userId) });
      navigation.navigate("Main");
    } catch (err) {
      console.error("Failed to leave square:", err);
    }
  };

  const handleDeleteSquare = () => {
    Alert.alert(
      "Delete Square",
      "Are you sure you want to delete this square?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setMenuVisible(false);
            try {
              await deleteDoc(doc(db, "squares", gridId));
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
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={{ paddingRight: 12 }}
            >
              <Icon name="more-vert" size={24} color="#000" />
            </TouchableOpacity>
          }
          contentStyle={{
            backgroundColor: "#f0f0f0",
            borderRadius: 10,
            width: 200,
          }}
          style={{ marginTop: 40, elevation: 4 }}
        >
          <Menu.Item
            onPress={() => {
              Clipboard.setStringAsync(gridId);
              alert("Session ID copied!");
            }}
            title="Share Session ID"
            titleStyle={{ color: "#333", fontWeight: "bold" }}
          />
          {isOwner && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setTempDeadline(deadlineValue);
                setShowDeadlineModal(true);
              }}
              title="Change Deadline"
              titleStyle={{ color: "#333" }}
            />
          )}
          <Menu.Item
            onPress={handleLeaveSquare}
            title="Leave Square"
            titleStyle={{ color: "red" }}
          />
          {isOwner && (
            <Menu.Item
              onPress={handleDeleteSquare}
              title="Delete Square"
              titleStyle={{ color: "red" }}
            />
          )}
        </Menu>
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
      } else {
        updatedSet.add(squareId);
        selectSquareInFirestore(x, y);
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

  const renderEditSquare = () => {
    console.log("Rendering edit square grid...");
    const rows = [];
    for (let y = 0; y <= 10; y++) {
      const row = [];
      for (let x = 0; x <= 10; x++) {
        if (x === 0 && y === 0) {
          row.push(<View key="corner" style={styles.square} />);
        } else if (y === 0) {
          row.push(
            <View key={`x-${x}`} style={[styles.square, styles.axisCell]}>
              <Text style={styles.axisText}>{xAxis[x - 1]}</Text>
            </View>
          );
        } else if (x === 0) {
          row.push(
            <View key={`y-${y}`} style={[styles.square, styles.axisCell]}>
              <Text style={styles.axisText}>{yAxis[y - 1]}</Text>
            </View>
          );
        } else {
          const key = `${x - 1},${y - 1}`;
          const color = squareColors[key] || "#fff";
          const isSelected = selectedSquares.has(key);
          row.push(
            <TouchableOpacity
              key={key}
              style={[
                styles.square,
                {
                  backgroundColor: color,
                  borderColor: isSelected ? "#007AFF" : "#ccc",
                  borderWidth: isSelected ? 2 : 1,
                  shadowColor: isSelected ? "#007AFF" : "transparent",
                  shadowOpacity: isSelected ? 0.5 : 0,
                  shadowRadius: isSelected ? 6 : 0,
                  elevation: isSelected ? 5 : 1,
                },
              ]}
              onPress={() => handlePress(x - 1, y - 1)}
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

  const renderFinalSquare = () => {
    console.log("Rendering final square view");
    const rows = [];
    for (let y = 0; y <= 10; y++) {
      const row = [];
      for (let x = 0; x <= 10; x++) {
        if (x === 0 && y === 0) {
          row.push(<View key="corner" style={styles.square} />);
        } else if (y === 0) {
          row.push(
            <View key={`x-${x}`} style={[styles.square, styles.axisCell]}>
              <Text style={styles.axisText}>{xAxis[x - 1]}</Text>
            </View>
          );
        } else if (x === 0) {
          row.push(
            <View key={`y-${y}`} style={[styles.square, styles.axisCell]}>
              <Text style={styles.axisText}>{yAxis[y - 1]}</Text>
            </View>
          );
        } else {
          const key = `${x - 1},${y - 1}`;
          const color = squareColors[key] || "#fff";
          const isSelected = selectedSquare === key;
          row.push(
            <TouchableOpacity
              key={key}
              style={[
                styles.square,
                {
                  backgroundColor: color,
                  borderColor: isSelected ? "#007AFF" : "#ccc",
                  borderWidth: isSelected ? 2 : 1,
                  shadowColor: isSelected ? "#007AFF" : "transparent",
                  shadowOpacity: isSelected ? 0.5 : 0,
                  shadowRadius: isSelected ? 6 : 0,
                  elevation: isSelected ? 5 : 1,
                },
              ]}
              onPress={() => handleSquarePress(x - 1, y - 1)}
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
        <Card>
          <Card.Content>
            <Card style={styles.titleCard}>
              <Card.Content style={{ alignItems: "center" }}>
                <Text style={styles.titleText}>{team1}</Text>
                <Text style={styles.vsText}>vs</Text>
                <Text style={styles.titleText}>{team2}</Text>
              </Card.Content>
            </Card>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.teamLabel}>{team2Mascot}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 15 }}>
              <View style={styles.teamColumn}>
                {splitTeamName(team1Mascot).map((letter, i) => (
                  <Text key={i} style={styles.teamLetter}>
                    {letter}
                  </Text>
                ))}
              </View>
              <ScrollView horizontal>
                <ScrollView>
                  {isAfterDeadline ? renderFinalSquare() : renderEditSquare()}
                </ScrollView>
              </ScrollView>
            </View>
            {!isAfterDeadline && (
              <View style={styles.deadlineContainerCentered}>
                <Text style={styles.deadlineLabel}>Deadline:</Text>
                <Text style={styles.deadlineValue}>
                  {deadlineValue
                    ? deadlineValue.toLocaleString()
                    : "No deadline set"}
                </Text>
              </View>
            )}
            {/* <View>
              {Object.entries(playerColors).map(([uid, color]) => (
                <View key={uid} style={styles.legendRow}>
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color as string },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {playerUsernames[uid] || uid}
                  </Text>
                </View>
              ))}
            </View> */}
          </Card.Content>
        </Card>
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
              <Text
                style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}
              >
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
                  <Text style={{ color: "red", fontWeight: "600" }}>
                    Cancel
                  </Text>
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
      </ScrollView>
    ),
    players: () => (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <Card.Title title="Players" />
          <Card.Content>
            {Object.entries(playerColors).map(([uid, color]) => (
              <View key={uid} style={styles.playerRow}>
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color as string },
                  ]}
                />
                <Text style={styles.playerText}>
                  {playerUsernames[uid] || uid}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    ),
    winners: () => (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <Card.Title title="Quarter Winners" />
          <Card.Content>
            {quarterWinners.map((q, i) => (
              <View key={i} style={styles.winnerRow}>
                <Icon name="emoji-events" size={20} color="gold" />
                <Text style={styles.winnerText}>
                  {q.quarter}: {q.username}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    ),
  });

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: Dimensions.get("window").width }}
      renderTabBar={(props) => (
        <TabBar
          {...(props as TabBarProps)}
          indicatorStyle={{
            backgroundColor: "#007AFF",
            height: 4,
            borderRadius: 2,
          }}
          style={{
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
          activeColor="#007AFF" // 👈 Ensure active label color is applied
          inactiveColor={isDark ? "#ccc" : "#333"} // 👈 Ensure inactive color is readable
          renderLabel={({ route, focused, color }) => (
            <Text
              style={{
                color: color, // 👈 Use the `color` passed by TabBar
                fontWeight: focused ? "bold" : "500",
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              {route.title}
            </Text>
          )}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: 12 },
  square: {
    width: squareSize,
    height: squareSize,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  axisCell: { backgroundColor: "#f5f5f5" },
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
    marginLeft: -5,
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
    backgroundColor: "#fafafa",
    marginHorizontal: 8,
    borderRadius: 12,
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
});

export default FinalSquareScreen;
