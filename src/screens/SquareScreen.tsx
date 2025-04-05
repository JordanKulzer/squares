import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import React, { useState, useEffect, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { db } from "../../firebaseConfig";

const SquareScreen = ({
  route,
}: {
  route: {
    params: {
      gridId: string;
      inputTitle: string;
      username: string;
      numPlayers: null;
      team1: string;
      team2: string;
      gridSize: null;
    };
  };
}) => {
  const auth = getAuth();
  // const userId = auth.currentUser?.uid;
  const { gridId, inputTitle, username, numPlayers, team1, team2, gridSize } =
    route.params;
  console.log("GRID SIZE: ", gridSize); // Check the grid size

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<string[]>([]);
  const [otherSelectedSquares, setOtherSelectedSquares] = useState<string[]>(
    []
  );

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // const squareAmount = gridSize;

  // Listen for real-time updates
  useEffect(() => {
    const gridRef = doc(db, "squares", gridId);

    const unsubscribe = onSnapshot(gridRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.selections) {
          // Separate squares based on who selected them
          const userSquares: string[] = [];
          const otherSquares: string[] = [];

          data.selections.forEach((sel: any) => {
            const square = `${sel.x},${sel.y}`;
            if (sel.userId === userId) {
              userSquares.push(square);
            } else {
              otherSquares.push(square);
            }
          });

          setSelectedSquares(userSquares);
          setOtherSelectedSquares(otherSquares);
        }
      }
    });

    return () => unsubscribe();
  }, [gridId, userId]);

  // Function to update Firestore when a square is selected
  const selectSquareInFirestore = async (x: number, y: number) => {
    if (!userId) {
      console.error(
        "User ID is undefined. Ensure user is authenticated before selecting a square."
      );
      return;
    }
    const gridRef = doc(db, "squares", gridId);
    const selection = { x, y, userId, username };
    console.log("Y", selection);
    try {
      await updateDoc(gridRef, {
        selections: arrayUnion(selection),
      });
    } catch (error) {
      console.error("Error selecting square in Firestore:", error);
    }
  };

  // Function to remove the deselected square from Firestore
  const deselectSquareInFirestore = async (x: number, y: number) => {
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
        selections: arrayRemove(selection),
      });
    } catch (error) {
      console.error("Error deselecting square in Firestore:", error);
    }
  };

  // Function to handle press on a grid square
  const handlePress = (x: number, y: number) => {
    const newSquare = `${x},${y}`;

    if (selectedSquares.includes(newSquare)) {
      setSelectedSquares(selectedSquares.filter((item) => item !== newSquare));
      deselectSquareInFirestore(x, y);
    } else {
      selectSquareInFirestore(x, y);
    }
  };

  // Memoized Square component to optimize rendering
  const Square = memo(({ x, y, isSelected, isOtherSelected, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.square,
        isSelected && styles.selectedSquare,
        isOtherSelected && styles.otherUserSelectedSquare,
      ]}
      onPress={() => onPress(x, y)}
    />
  ));

  // Function to render grid squares
  const renderGrid = () => {
    let grid = [];
    for (let x = 0; x < gridSize; x++) {
      let row = [];
      for (let y = 0; y < gridSize; y++) {
        const squareId = `${x},${y}`;
        const isCurrentUserSelected = selectedSquares.includes(squareId);
        const isOtherUserSelected = otherSelectedSquares.includes(squareId);

        row.push(
          <Square
            key={squareId}
            x={x}
            y={y}
            isSelected={isCurrentUserSelected}
            isOtherSelected={isOtherUserSelected}
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

  return (
    <View style={styles.container}>
      <Text>{inputTitle}</Text>
      <View style={styles.gridContainer}>
        <View style={styles.yAxisContainer}>
          {Array.from({ length: gridSize }, (_, index) => (
            <Text key={index} style={styles.axisLabel}>
              {index}
            </Text>
          ))}
        </View>

        <View style={styles.gridWithXAxis}>
          <View style={styles.xAxisRow}>
            {Array.from({ length: gridSize }, (_, index) => (
              <Text key={index} style={styles.axisLabel}>
                {index}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>{renderGrid()}</View>
        </View>
      </View>

      <Text style={styles.arrayTitle}>{username}'s Selected Coordinates:</Text>
      <Text style={styles.selectedArray}>{selectedSquares.join(", ")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  gridContainer: {
    flexDirection: "row",
  },
  yAxisContainer: {
    justifyContent: "space-evenly",
    alignItems: "center",
    marginRight: 10,
  },
  gridWithXAxis: {
    flexDirection: "column",
  },
  xAxisRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  grid: {
    marginTop: 10,
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
    borderColor: "#ccc", // Make border consistent
  },
  selectedSquare: {
    backgroundColor: "#4CAF50", // Current user selected square color
  },
  otherUserSelectedSquare: {
    backgroundColor: "#FFEB3B", // Other user selected square color (yellow for example)
  },
  axisLabel: {
    fontSize: 12,
    width: 30,
    textAlign: "center",
    lineHeight: 30,
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
});

export default SquareScreen;
