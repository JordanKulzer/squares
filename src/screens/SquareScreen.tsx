import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

// Memoized Square component
const Square = React.memo(
  ({ x, y, isSelected, isOtherSelected, onPress, isDisabled }: any) => {
    return (
      <TouchableOpacity
        style={[
          styles.square,
          isSelected && styles.selectedSquare,
          isOtherSelected && styles.otherUserSelectedSquare,
        ]}
        onPress={() => !isDisabled && onPress(x, y)}
        disabled={isDisabled}
      >
        <Text style={styles.coordinateText}>
          ({x},{y})
        </Text>
      </TouchableOpacity>
    );
  }
);

const SquareScreen = ({ route }: { route: any }) => {
  const { gridId, inputTitle, username, gridSize, team1, team2 } = route.params;

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(
    new Set()
  );
  const [otherSelectedSquares, setOtherSelectedSquares] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const gridRef = doc(db, "squares", gridId);
    const unsubscribe = onSnapshot(gridRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.selections) {
          const userSquares = new Set<string>();
          const otherSquares = new Set<string>();

          data.selections.forEach((sel: any) => {
            const square = `${sel.x},${sel.y}`;
            if (sel.userId === userId) {
              userSquares.add(square);
            } else {
              otherSquares.add(square);
            }
          });

          setSelectedSquares(userSquares);
          setOtherSelectedSquares(otherSquares);
        }
      }
    });

    return () => unsubscribe();
  }, [gridId, userId]);

  const selectSquareInFirestore = useCallback(
    async (x: number, y: number) => {
      if (!userId) {
        console.error(
          "User ID is undefined. Ensure user is authenticated before selecting a square."
        );
        return;
      }
      const gridRef = doc(db, "squares", gridId);
      const selection = { x, y, userId, username };

      try {
        await updateDoc(gridRef, {
          selections: arrayUnion(selection),
        });
      } catch (error) {
        console.error("Error selecting square in Firestore:", error);
      }
    },
    [gridId, userId, username]
  );

  const deselectSquareInFirestore = useCallback(
    async (x: number, y: number) => {
      if (!userId) {
        console.error(
          "User ID is undefined. Ensure user is authenticated before deselecting a square."
        );
        return;
      }
      const gridRef = doc(db, "squares", gridId);
      const selection = { x, y, userId, username };

      try {
        await updateDoc(gridRef, {
          selections: arrayRemove(selection),
        });
      } catch (error) {
        console.error("Error deselecting square in Firestore:", error);
      }
    },
    [gridId, userId, username]
  );

  const handlePress = useCallback(
    (x: number, y: number) => {
      const squareId = `${x},${y}`;

      if (selectedSquares.has(squareId)) {
        // Deselect square
        selectedSquares.delete(squareId);
        setSelectedSquares(new Set(selectedSquares)); // Trigger re-render with new Set
        deselectSquareInFirestore(x, y);
      } else {
        // Select square
        selectedSquares.add(squareId);
        setSelectedSquares(new Set(selectedSquares)); // Trigger re-render with new Set
        selectSquareInFirestore(x, y);
      }
    },
    [selectedSquares, deselectSquareInFirestore, selectSquareInFirestore]
  );

  const renderGrid = () => {
    const grid = [];
    for (let x = 0; x < gridSize; x++) {
      let row = [];
      row.push(<Text style={styles.yAxisText}>{x}</Text>);

      for (let y = 0; y < gridSize; y++) {
        const squareId = `${x},${y}`;
        const isSelected = selectedSquares.has(squareId);
        const isOtherSelected = otherSelectedSquares.has(squareId);

        const isDisabled = isOtherSelected; // Disable square if selected by another user

        row.push(
          <Square
            key={squareId}
            x={x}
            y={y}
            isSelected={isSelected}
            isOtherSelected={isOtherSelected}
            isDisabled={isDisabled}
            onPress={handlePress}
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

  const splitTeamName = (teamName: string) => {
    return teamName.split("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{inputTitle}</Text>

      {/* Displaying Team2 above the grid */}
      <Text style={styles.teamInfo}>{team2}</Text>

      <View style={styles.mainContainer}>
        {/* Displaying Team1 vertically to the left */}
        <View style={styles.teamColumn}>
          {splitTeamName(team1).map((letter, index) => (
            <Text key={index} style={styles.teamLetter}>
              {letter}
            </Text>
          ))}
        </View>

        <View style={styles.gridWrapper}>
          <View style={styles.axisWrapper}>
            {/* Render Grid */}
            <View style={styles.gridRows}>{renderGrid()}</View>
          </View>

          {/* Render X-axis numbers */}
          <View style={styles.xAxisContainer}>
            {Array.from({ length: gridSize }).map((_, index) => (
              <Text key={index} style={styles.xAxisText}>
                {index}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.arrayTitle}>My Squares:</Text>
      <Text style={styles.selectedArray}>
        {Array.from(selectedSquares)
          .map((square) => `(${square})`) // Add parentheses around each square's coordinate
          .join(", ")}{" "}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
    backgroundColor: "#a5a58d",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textTransform: "uppercase",
    color: "#000000",
  },
  teamInfo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  mainContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  teamColumn: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10, // Adds space between Team1 and the grid
  },
  teamLetter: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 0,
  },
  gridWrapper: {
    flexDirection: "column",
    alignItems: "center",
  },
  axisWrapper: {
    flexDirection: "row",
  },
  xAxisText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    paddingLeft: 25,
  },
  yAxisText: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5, // Space between the Y-axis and the grid
    fontSize: 14,
    fontWeight: "bold",
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
    backgroundColor: "#4CAF50", // Current user selected square color
  },
  otherUserSelectedSquare: {
    backgroundColor: "#FFEB3B", // Other user selected square color
  },
  coordinateText: {
    fontSize: 10,
    color: "#000", // Color of the text displaying coordinates
  },
  arrayTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },
  selectedArray: {
    marginTop: 10,
    fontSize: 16,
  },
  xAxisContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5,
    marginRight: 15,
  },
});

export default SquareScreen;
