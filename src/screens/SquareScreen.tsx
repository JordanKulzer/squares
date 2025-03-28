import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { db } from "../../firebaseConfig";

const SquareScreen = ({ route }: { route: { params: any } }) => {
  const {
    inputTitle,
    username,
    numPlayers,
    team1,
    team2,
    gridSize,
    gridId: providedGridId,
    isJoining,
  } = route.params;
  console.log(
    inputTitle,
    numPlayers,
    team1,
    team2,
    gridSize,
    providedGridId,
    isJoining
  );
  // Initial 10x10 grid coordinates, will contain coordinates of selected squares
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [gridId, setGridId] = useState<string>(providedGridId);
  const [size, setSize] = useState<number>(gridSize || 10);

  const squareAmount = size;

  useEffect(() => {
    const gridRef = doc(db, "grids", gridId);

    const setupGrid = async () => {
      const docSnap = await getDoc(gridRef);
      if (!docSnap.exists() && !isJoining) {
        await setDoc(gridRef, {
          title: inputTitle,
          createdBy: username,
          numPlayers,
          team1,
          team2,
          gridSize: gridSize || 10,
          selections: [],
        });
      } else if (docSnap.exists()) {
        const data = docSnap.data();
        setSize(data.gridSize);
      }
    };

    setupGrid();

    const unsubscribe = onSnapshot(gridRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSelectedSquares(data.selections || []);
      }
    });

    return () => unsubscribe();
  }, [gridId]);

  // Function to update Firestore when a square is selected
  const selectSquareInFirestore = async (
    gridId: string,
    x: number,
    y: number,
    playerId: string
  ) => {
    const gridRef = doc(db, "grids", gridId);
    try {
      // Add the selected square to the 'selections' array in Firestore
      await updateDoc(gridRef, {
        selections: arrayUnion({ x, y, playerId }),
      });
      console.log(`Square at (${x}, ${y}) selected by ${playerId}`);
    } catch (error) {
      console.error("Error selecting square in Firestore:", error);
    }
  };

  // Function to remove the deselected square from Firestore
  const deselectSquareInFirestore = async (
    gridId: string,
    x: number,
    y: number,
    playerId: string
  ) => {
    const gridRef = doc(db, "grids", gridId);
    try {
      // Remove the selected square from the 'selections' array in Firestore
      await updateDoc(gridRef, {
        selections: arrayRemove({ x, y, playerId }),
      });
      console.log(`Square at (${x}, ${y}) deselected by ${playerId}`);
      console.log(gridRef);
    } catch (error) {
      console.error("Error deselecting square in Firestore:", error);
    }
  };
  // Function to handle press on a grid square
  const handlePress = (x, y) => {
    const newSquare = `${x},${y}`;
    // Check if the square is already selected
    if (selectedSquares.includes(newSquare)) {
      // If yes, remove it from the array
      setSelectedSquares(selectedSquares.filter((item) => item !== newSquare));
      deselectSquareInFirestore(gridId, x, y, "playerId");
    } else {
      // If no, add it to the array
      selectSquareInFirestore(gridId, x, y, "playerId");
      <Text style={styles.squareText}>{inputTitle}</Text>;
      setSelectedSquares([...selectedSquares, newSquare]);
      <Text style={styles.squareText}>{inputTitle}</Text>;
    }
    <Text>{inputTitle}</Text>;
  };

  // Function to render grid squares
  const renderGrid = () => {
    let grid = [];
    for (let x = 0; x < squareAmount; x++) {
      let row = [];
      for (let y = 0; y < squareAmount; y++) {
        const squareId = `${x},${y}`;
        const isSelected = selectedSquares.includes(squareId);

        row.push(
          <TouchableOpacity
            key={squareId}
            style={[styles.square, isSelected && styles.selectedSquare]}
            onPress={() => handlePress(x, y)}
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
      {/* <ScrollView horizontal={true}> */}
      <View style={styles.gridContainer}>
        {/* Y-Axis labels */}
        {/* <Text>{team1}</Text> */}
        <View style={styles.yAxisContainer}>
          {Array.from({ length: squareAmount }, (_, index) => (
            <Text key={index} style={styles.axisLabel}>
              {index}
            </Text>
          ))}
        </View>

        {/* Grid and X-Axis labels */}
        <View style={styles.gridWithXAxis}>
          {/* X-Axis labels */}
          {/* <Text>{team2}</Text> */}
          <View style={styles.xAxisRow}>
            {Array.from({ length: squareAmount }, (_, index) => (
              <Text key={index} style={styles.axisLabel}>
                {index}
              </Text>
            ))}
          </View>

          {/* Scrollable grid */}
          <View style={styles.grid}>
            <View>{renderGrid()}</View>
          </View>
        </View>
      </View>
      {/* </ScrollView> */}

      <Text style={styles.arrayTitle}>{username}'s Selected Coordinates:</Text>
      <Text style={styles.selectedArray}>{selectedSquares.join(", ")}</Text>
      <Text>Grid ID: {gridId}</Text>
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
  squareText: {
    fontSize: 12,
    textAlign: "center",
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
  },
  selectedSquare: {
    backgroundColor: "#4CAF50",
  },
  axisLabel: {
    fontSize: 12,
    width: 30,
    textAlign: "center",
    lineHeight: 30, // Center the text vertically
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
