import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import * as Clipboard from "expo-clipboard";
import Icon from "react-native-vector-icons/Ionicons";
import { Timestamp } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Menu } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const convertToDate = (deadline) => {
  if (deadline instanceof Timestamp) return deadline.toDate();
  if (deadline instanceof Date) return deadline;
  return null;
};

const SquareScreen = ({ route, navigation }) => {
  const { gridId, inputTitle, team1, team2, deadline } = route.params;
  const formattedDeadline = convertToDate(deadline);

  const [userId, setUserId] = useState(null);
  const [selectedSquares, setSelectedSquares] = useState(new Set());
  const [squareColors, setSquareColors] = useState({});
  const [playerColors, setPlayerColors] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [isOwner, setIsOwner] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState(formattedDeadline);
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const currentUsername =
    userId && playerUsernames[userId] ? playerUsernames[userId] : "Unknown";

  useEffect(() => {
    if (formattedDeadline && new Date() > formattedDeadline) {
      navigation.replace("FinalSquareScreen", {
        gridId,
        inputTitle,
        team1,
        team2,
      });
    }
  }, [formattedDeadline]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const gridRef = doc(db, "squares", gridId);
    const unsubscribe = onSnapshot(gridRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const colorMapping = {};
        const nameMapping = {};

        if (data?.players) {
          data.players.forEach((p) => {
            colorMapping[p.userId] = p.color || "#999";
            nameMapping[p.userId] = p.username || p.userId;
          });

          setPlayerColors(colorMapping);
          setPlayerUsernames(nameMapping);
        }

        if (data?.selections) {
          const newSelections = new Set();
          const squareColorMap = {};

          data.selections.forEach((sel) => {
            const id = `${sel.x},${sel.y}`;
            newSelections.add(id);
            squareColorMap[id] = colorMapping[sel.userId] || "#999";
          });

          setSelectedSquares(newSelections);
          setSquareColors(squareColorMap);
        }

        if (data?.createdBy === userId) setIsOwner(true);
        if (data?.deadline) {
          const deadlineDate = convertToDate(data.deadline);
          if (deadlineDate) setDeadlineValue(deadlineDate);
        }
      }
    });

    return unsubscribe;
  }, [gridId, userId]);

  const handleDeadlineChange = async (event, selectedDate) => {
    if (!selectedDate) return;
    const gridRef = doc(db, "squares", gridId);
    try {
      await updateDoc(gridRef, { deadline: selectedDate });
      setDeadlineValue(selectedDate);
    } catch (err) {
      console.error("Error updating deadline:", err);
    }
  };

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
      if (selectedSquares.has(squareId)) {
        selectedSquares.delete(squareId);
        setSelectedSquares(new Set(selectedSquares));
        deselectSquareInFirestore(x, y);
      } else {
        selectedSquares.add(squareId);
        setSelectedSquares(new Set(selectedSquares));
        selectSquareInFirestore(x, y);
      }
    },
    [selectedSquares, deselectSquareInFirestore, selectSquareInFirestore]
  );

  const handleLeaveSquare = async () => {
    const gridRef = doc(db, "squares", gridId);
    try {
      await updateDoc(gridRef, {
        playerIds: arrayRemove(userId),
        selections: arrayRemove(
          ...Array.from(selectedSquares).map((s: string) => {
            const [x, y] = s.split(",");
            return {
              x: Number(x),
              y: Number(y),
              userId,
              username: currentUsername,
            };
          })
        ),
      });
      navigation.navigate("Main");
    } catch (err) {
      console.error("Failed to leave square:", err);
    }
  };

  const handleDeleteSquare = async () => {
    try {
      await deleteDoc(doc(db, "squares", gridId));
      navigation.navigate("Main");
    } catch (err) {
      console.error("Failed to delete square:", err);
    }
  };

  const renderGrid = () => {
    const grid = [];

    for (let x = 0; x < 10; x++) {
      const row = [];
      row.push(
        <Text key={`y-${x}`} style={styles.yAxisText}>
          {x}
        </Text>
      );

      for (let y = 0; y < 10; y++) {
        const squareId = `${x},${y}`;
        const bgColor = squareColors[squareId] || "#ddd";

        row.push(
          <TouchableOpacity
            key={squareId}
            style={[styles.square, { backgroundColor: bgColor }]}
            onPress={() => handlePress(x, y)}
            disabled={!playerColors[userId] || playerColors[userId] === bgColor}
          >
            <Text style={styles.coordinateText}>{`(${x},${y})`}</Text>
          </TouchableOpacity>
        );
      }

      grid.push(
        <View key={`row-${x}`} style={styles.row}>
          {row}
        </View>
      );
    }

    return grid;
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
              <Icon name="ellipsis-vertical" size={24} color="#000" />
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
              Clipboard.setString(gridId);
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

  const splitTeamName = (teamName) => (teamName ? teamName.split("") : []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{inputTitle}</Text>
      <Text style={styles.teamInfo}>{team2}</Text>

      <View style={styles.mainContainer}>
        <View style={styles.teamColumn}>
          {splitTeamName(team1).map((letter, index) => (
            <Text key={index} style={styles.teamLetter}>
              {letter}
            </Text>
          ))}
        </View>

        <View style={styles.gridWrapper}>
          <View style={styles.gridRows}>{renderGrid()}</View>
          <View style={styles.xAxisContainer}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Text key={i} style={styles.xAxisText}>
                {i}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.deadlineContainer}>
        {!isOwner && (
          <Text style={styles.deadlineText}>
            {deadlineValue
              ? `Deadline: ${deadlineValue.toLocaleString()}`
              : "No deadline set"}
          </Text>
        )}
        {isOwner && (
          <DateTimePicker
            value={deadlineValue || new Date()}
            mode="datetime"
            display="default"
            onChange={handleDeadlineChange}
          />
        )}
      </View>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Player Colors:</Text>
        <ScrollView style={styles.legendScroll} showsVerticalScrollIndicator>
          {Object.entries(playerColors).map(([uid, color]) => (
            <View key={uid} style={styles.legendItem}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color as string },
                ]}
              />
              <Text style={styles.legendText}>
                {uid === userId
                  ? `${currentUsername} (You)`
                  : playerUsernames?.[uid] || uid}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
    backgroundColor: "white",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textTransform: "uppercase",
    color: "#000",
  },
  teamInfo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  mainContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  teamLetter: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "Courier",
    textTransform: "uppercase",
  },
  gridWrapper: {
    flexDirection: "column",
    alignItems: "center",
  },
  gridRows: {
    flexDirection: "column",
  },
  row: {
    flexDirection: "row",
  },
  square: {
    width: 30,
    height: 30,
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  coordinateText: { fontSize: 10, color: "#000" },
  xAxisContainer: { flexDirection: "row", marginTop: 5, marginRight: 15 },
  xAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    paddingLeft: 25,
    fontFamily: "Courier",
  },
  yAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginTop: 5,
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  deadlineText: {
    fontSize: 18,
    color: "#000",
  },
  legendContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignSelf: "stretch",
    maxHeight: 120,
  },
  legendScroll: {
    paddingVertical: 5,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  legendText: {
    fontSize: 14,
    color: "#000",
  },
});

export default SquareScreen;
