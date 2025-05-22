import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { arrayRemove, deleteDoc, updateDoc } from "firebase/firestore";
import * as Clipboard from "expo-clipboard";
import Icon from "react-native-vector-icons/Ionicons";
import { Menu } from "react-native-paper";

const quarterWinners = [
  { quarter: "1st", username: "Alice" },
  { quarter: "2nd", username: "Bob" },
  { quarter: "3rd", username: "Carlos" },
  { quarter: "4th", username: "Alice" },
];

const FinalSquareScreen = ({ route }) => {
  const { gridId, inputTitle, team1, team2 } = route.params;

  const [squareColors, setSquareColors] = useState({});
  const [playerColors, setPlayerColors] = useState({});
  const [playerUsernames, setPlayerUsernames] = useState({});
  const [xAxis, setXAxis] = useState<number[]>([]);
  const [yAxis, setYAxis] = useState<number[]>([]);
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  console.log("FinalSquare");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const ref = doc(db, "squares", gridId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data();

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

    return unsubscribe;
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

  const renderGrid = () => {
    const grid = [];

    for (let y = 0; y < 10; y++) {
      const row = [];

      // Render Y axis label
      row.push(
        <Text key={`y-${y}`} style={styles.yAxisText}>
          {yAxis[y]}
        </Text>
      );

      for (let x = 0; x < 10; x++) {
        const actualX = xAxis[x];
        const actualY = yAxis[y];
        const id = `${actualX},${actualY}`;
        const bgColor = squareColors[id] || "#ddd";

        row.push(
          <View key={id} style={[styles.square, { backgroundColor: bgColor }]}>
            <Text style={styles.coordinateText}>({id})</Text>
          </View>
        );
      }

      grid.push(
        <View key={`row-${y}`} style={styles.row}>
          {row}
        </View>
      );
    }

    return grid;
  };

  const splitTeamName = (teamName) => {
    return teamName ? teamName.split("") : [];
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{inputTitle}</Text>
      <Text style={styles.teamInfo}>{team2}</Text>

      <View style={styles.mainContainer}>
        <View style={styles.teamColumn}>
          {splitTeamName(team1).map((letter, i) => (
            <View key={i} style={styles.teamLetterWrapper}>
              <Text style={styles.teamLetter}>{letter}</Text>
            </View>
          ))}
        </View>

        <View style={styles.gridWrapper}>
          <View style={styles.xAxisContainer}>
            <Text style={styles.xAxisText}></Text>
            {/* spacer for Y-axis column */}
            {xAxis.map((val, i) => (
              <Text key={i} style={styles.xAxisText}>
                {val}
              </Text>
            ))}
          </View>

          <View style={styles.gridRows}>
            {xAxis.length === 10 && yAxis.length === 10 ? renderGrid() : null}
          </View>
        </View>
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
                {playerUsernames?.[uid] || uid}
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
    paddingTop: 50,
    backgroundColor: "white",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
    textTransform: "uppercase",
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
  },
  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 25,
    marginRight: -10,
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
  coordinateText: {
    fontSize: 10,
    color: "#000",
  },
  xAxisContainer: {
    flexDirection: "row",
    marginTop: 5,
    marginRight: 20,
    marginBottom: 2, // just a small tweak
  },
  xAxisText: {
    width: 34, // square width (30) + marginLeft + marginRight (2+2)
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Courier",
  },

  yAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Courier",
    marginTop: 5,
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

export default FinalSquareScreen;
