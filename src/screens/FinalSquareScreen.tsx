import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const Square = ({ x, y, isSelectedByUser, isSelectedByOthers }) => (
  <View
    style={[
      styles.square,
      isSelectedByUser && styles.selectedSquare,
      isSelectedByOthers && styles.otherUserSelectedSquare,
    ]}
  >
    <Text style={styles.coordinateText}>
      ({x},{y})
    </Text>
  </View>
);

const FinalSquareScreen = ({ route }) => {
  const { gridId, inputTitle, team1, team2 } = route.params;

  const [userSquares, setUserSquares] = useState(new Set());
  const [otherSquares, setOtherSquares] = useState(new Set());
  console.log("FinalSquareScreen: ", gridId, inputTitle, team1, team2); // Debugging log

  useEffect(() => {
    const ref = doc(db, "squares", gridId);
    const unsubscribe = onSnapshot(ref, (snap) => {
      const data = snap.data();
      if (data?.selections) {
        const mine = new Set();
        const others = new Set();
        data.selections.forEach((s) => {
          const id = `${s.x},${s.y}`;
          // if needed, you can distinguish current user here
          others.add(id); // treat all as final
        });
        setOtherSquares(others);
      }
    });

    return () => unsubscribe();
  }, [gridId]);

  const renderGrid = () => {
    const grid = [];
    for (let x = 0; x < 10; x++) {
      let row = [];
      row.push(<Text style={styles.yAxisText}>{x}</Text>);
      for (let y = 0; y < 10; y++) {
        const id = `${x},${y}`;
        row.push(
          <Square
            key={id}
            x={x}
            y={y}
            isSelectedByUser={false}
            isSelectedByOthers={otherSquares.has(id)}
          />
        );
      }
      grid.push(
        <View key={x} style={styles.row}>
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
  },
  gridWrapper: {
    flexDirection: "column",
    alignItems: "center",
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
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  selectedSquare: {
    backgroundColor: "#4CAF50",
  },
  otherUserSelectedSquare: {
    backgroundColor: "#FFEB3B",
  },
  coordinateText: {
    fontSize: 10,
    color: "#000",
  },
});

export default FinalSquareScreen;
