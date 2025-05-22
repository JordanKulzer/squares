import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Card, Menu, Snackbar } from "react-native-paper";
import {
  arrayRemove,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import * as Clipboard from "expo-clipboard";

const screenWidth = Dimensions.get("window").width;
const squareSize = (screenWidth - 80) / 11;

const FinalSquareScreen = ({ route }) => {
  const { gridId, inputTitle } = route.params;

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [squareColors, setSquareColors] = useState({});
  const [playerColors, setPlayerColors] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [xAxis, setXAxis] = useState<number[]>([]);
  const [yAxis, setYAxis] = useState<number[]>([]);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: inputTitle,
    });
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

      if (data?.players) {
        data.players.forEach((p) => {
          colorMapping[p.userId] = p.color || "#999";
          nameMapping[p.userId] = p.username || p.userId;
        });
        console.log("color: " + colorMapping[1]);
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
    });

    return unsub;
  }, [gridId]);

  const handleLeaveSquare = async () => {
    setMenuVisible(false);
    const ref = doc(db, "squares", gridId);
    try {
      await updateDoc(ref, {
        playerIds: arrayRemove(userId),
      });
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
            setMenuVisible(false); // close menu
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

  const handleSquarePress = (x: number, y: number) => {
    const key = `${x},${y}`;
    const userColor = squareColors[key];
    const userId = Object.entries(playerColors).find(
      ([id, color]) => color === userColor
    )?.[0];
    const username = playerUsernames[userId] || "Unknown Player";

    const message = userColor
      ? `${username} owns this square`
      : "This square is unclaimed";

    setSelectedSquare(key);

    if (snackbarVisible) {
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage(message);
      setSnackbarVisible(true);
    }
  };

  const handleDismissSnackbar = () => {
    setSnackbarVisible(false);
    setSelectedSquare(null); // 🔴 clear highlight
  };

  const splitTeamName = (teamName) => {
    return teamName ? teamName.split("") : [];
  };

  const renderGridBody = () => {
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

          row.push(
            <TouchableOpacity
              key={key}
              style={[
                styles.square,
                {
                  backgroundColor: color || "#fff",
                  borderColor: selectedSquare === key ? "blue" : "#ccc", // 👈 Highlight border
                  borderWidth: selectedSquare === key ? 2 : 1,
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

  useEffect(() => {
    navigation.setOptions({
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
  }, [menuVisible, isOwner]);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        handleDismissSnackbar(); // dismiss snackbar on outside press
      }}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            backgroundColor: isDark ? "#121212" : "#fff",
          }}
        >
          <Card style={styles.card}>
            {/* <Card.Title title={inputTitle} /> */}
            <View style={styles.legendWrapper}>
              <TouchableOpacity
                onPress={() => setLegendExpanded(!legendExpanded)}
              >
                <View style={styles.legendHeader}>
                  <Text style={styles.legendTitle}>Legend</Text>
                  <Icon
                    name={legendExpanded ? "expand-less" : "expand-more"}
                    size={24}
                  />
                </View>
              </TouchableOpacity>

              {legendExpanded && (
                <View style={styles.legendDropdown}>
                  {Object.entries(playerColors).map(([uid, color]) => {
                    const username = playerUsernames[uid] || uid;
                    const wonQuarters = quarterWinners
                      .filter((q) => q.username === username)
                      .map((q) => q.quarter);

                    return (
                      <View key={uid} style={styles.legendRow}>
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: color as string },
                          ]}
                        />
                        <Text style={styles.legendText}>{username}</Text>
                        {wonQuarters.length > 0 && (
                          <Text style={styles.legendTrophy}>
                            {" "}
                            🏆 {wonQuarters.join(", ")}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Card.Content>
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.teamLabel}>{team2}</Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                {/* Team1 Vertical Letters */}
                <View style={styles.teamColumn}>
                  {splitTeamName(team1).map((letter, i) => (
                    <Text key={i} style={styles.teamLetter}>
                      {letter}
                    </Text>
                  ))}
                </View>

                {/* Scrollable Grid */}
                <ScrollView horizontal>
                  <ScrollView>{renderGridBody()}</ScrollView>
                </ScrollView>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Quarter Winners" />
            <Card.Content>
              {quarterWinners.length > 0 ? (
                quarterWinners.map((q, i) => (
                  <View key={i} style={styles.winnerRow}>
                    <Icon name="emoji-events" size={20} color="gold" />
                    <Text style={styles.winnerText}>
                      {q.quarter}: {q.username}
                    </Text>
                  </View>
                ))
              ) : (
                <Text>No winners yet.</Text>
              )}
            </Card.Content>
          </Card>

          <Snackbar
  visible={snackbarVisible}
  onDismiss={handleDismissSnackbar}
  duration={999999}
  style={{
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 4,
    marginBottom: 20,
    marginHorizontal: 16,
  }}
  wrapperStyle={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  }}
  action={{
    label: 'Close',
    onPress: handleDismissSnackbar,
    textColor: '#007AFF', // iOS blue accent
  }}
>
  <Text style={{ color: '#333', fontWeight: '600' }}>
    {snackbarMessage}
  </Text>
</Snackbar>

        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  square: {
    width: squareSize,
    height: squareSize,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  axisCell: {
    backgroundColor: "#f5f5f5",
  },
  axisText: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
  },
  teamLabel: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Courier",
    textTransform: "uppercase",
    textAlign: "center",
    marginHorizontal: 2,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  winnerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },

  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 10,
  },
  teamLetter: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  teamLetterWrapper: {
    height: 34, // same as square height + margin
    justifyContent: "center",
    alignItems: "center",
  },
  legendWrapper: {
    position: "absolute",
    top: 0,
    left: 250,
    right: 16,
    zIndex: 100,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  legendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendDropdown: {
    marginTop: 8,
  },
  legendTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  colorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
  legendText: {
    fontSize: 14,
  },
  legendTrophy: {
    marginLeft: 8,
    fontSize: 12,
    color: "gold",
  },
});

export default FinalSquareScreen;
