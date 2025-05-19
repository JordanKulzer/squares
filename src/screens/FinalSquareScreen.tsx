import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

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
  console.log("FinalSquare");
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
    });

    return unsubscribe;
  }, [gridId]);

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
        const id = `${x},${y}`;
        const bgColor = squareColors[id] || "#ddd";

        row.push(
          <View key={id} style={[styles.square, { backgroundColor: bgColor }]}>
            <Text style={styles.coordinateText}>
              ({x},{y})
            </Text>
          </View>
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

  const splitTeamName = (teamName) => {
    return teamName ? teamName.split("") : [];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{inputTitle}</Text>
      <Text style={styles.teamInfo}>{team2}</Text>

      <View style={styles.mainContainer}>
        <View style={styles.teamColumn}>
          {splitTeamName(team1).map((letter, i) => (
            <Text key={i} style={styles.teamLetter}>
              {letter}
            </Text>
          ))}
        </View>

        <View style={styles.gridWrapper}>
          <View style={styles.xAxisContainer}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Text key={i} style={styles.xAxisText}>
                {i}
              </Text>
            ))}
          </View>
          <View style={styles.gridRows}>{renderGrid()}</View>
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
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
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
  coordinateText: {
    fontSize: 10,
    color: "#000",
  },
  xAxisContainer: {
    flexDirection: "row",
    marginTop: 5,
    marginRight: 15,
  },
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
