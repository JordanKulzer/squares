import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import * as Clipboard from "expo-clipboard"; // Import expo-clipboard
import Icon from "react-native-vector-icons/Ionicons"; // Import share icon from MaterialIcons
import { Timestamp } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Menu } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// This function will check if it's a Firebase Timestamp or a regular Date
const convertToDate = (deadline: any) => {
  if (deadline instanceof Timestamp) {
    return deadline.toDate();
  } else if (deadline instanceof Date) {
    return deadline;
  } else {
    return null;
  }
};

const SquareScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { gridId, inputTitle, username, team1, team2, deadline } = route.params;

  const formattedDeadline = convertToDate(deadline);

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(
    new Set()
  );
  const [otherSelectedSquares, setOtherSelectedSquares] = useState<Set<string>>(
    new Set()
  );
  const [isOwner, setIsOwner] = useState(false);
  const [deadlineValue, setDeadlineValue] = useState<Date | null>(
    formattedDeadline
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(!menuVisible);
  const closeMenu = () => setMenuVisible(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (formattedDeadline && new Date() > formattedDeadline) {
      console.log("Deadline has passed, navigating to FinalSquareScreen...");
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

        if (data?.createdBy === userId) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }

        if (data?.deadline) {
          const deadlineDate = convertToDate(data.deadline);
          if (deadlineDate) {
            setDeadlineValue(deadlineDate);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [gridId, userId]);

  const handleDeadlineChange = async (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS keeps picker open
    if (!selectedDate) return;

    const gridRef = doc(db, "squares", gridId);
    try {
      await updateDoc(gridRef, { deadline: selectedDate });
      setDeadlineValue(selectedDate);
      console.log("Deadline updated successfully");
    } catch (err) {
      console.error("Error updating deadline:", err);
    }
  };

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
    for (let x = 0; x < 10; x++) {
      let row = [];
      row.push(<Text style={styles.yAxisText}>{x}</Text>);

      for (let y = 0; y < 10; y++) {
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
    if (teamName) {
      return teamName.split("");
    }
    return [];
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity onPress={toggleMenu} style={{ paddingRight: 12 }}>
              <Icon name="ellipsis-vertical" size={24} color="#000" />
            </TouchableOpacity>
          }
          contentStyle={{
            backgroundColor: "#f0f0f0",
            borderRadius: 10,
            width: 200,
          }}
          style={{
            marginTop: 40, // push it below the header a bit
            elevation: 4, // adds shadow on Android
          }}
        >
          <Menu.Item
            onPress={() => {
              Clipboard.setString(gridId);
              alert("Session ID copied!");
              closeMenu();
            }}
            title="Share Session ID"
            titleStyle={{ color: "#333", fontWeight: "bold" }}
          />
          <Menu.Item
            onPress={() => {
              handleLeaveSquare();
              closeMenu();
            }}
            title="Leave Square"
            titleStyle={{ color: "red" }}
          />
          {isOwner && (
            <Menu.Item
              onPress={() => {
                handleDeleteSquare();
                closeMenu();
              }}
              title="Delete Square"
              titleStyle={{ color: "red" }}
            />
          )}
        </Menu>
      ),
    });
  }, [menuVisible, isOwner]);

  const handleLeaveSquare = async () => {
    const gridRef = doc(db, "squares", gridId);
    try {
      await updateDoc(gridRef, {
        playerIds: arrayRemove(userId),
        selections: arrayRemove(
          ...Array.from(selectedSquares).map((s) => {
            const [x, y] = s.split(",");
            return { x: Number(x), y: Number(y), userId, username };
          })
        ),
      });
      navigation.navigate("Home");
    } catch (err) {
      console.error("Failed to leave square:", err);
    }
  };

  const handleDeleteSquare = async () => {
    try {
      await deleteDoc(doc(db, "squares", gridId));
      navigation.navigate("Home");
    } catch (err) {
      console.error("Failed to delete square:", err);
    }
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
            {Array.from({ length: 10 }).map((_, index) => (
              <Text key={index} style={styles.xAxisText}>
                {index}
              </Text>
            ))}
          </View>
        </View>
      </View>
      {/* <Text style={styles.deadlineText}>
        {formattedDeadline
          ? `Deadline: ${formattedDeadline.toLocaleString()}`
          : "No deadline set"}
      </Text> */}
      <View style={styles.deadlineContainer}>
        {!isOwner && (
          <Text style={styles.deadlineText}>
            {deadlineValue
              ? `Deadline: ${deadlineValue.toLocaleString()}`
              : "No deadline set"}
          </Text>
        )}

        {/* {isOwner && (
          <TouchableOpacity
            style={styles.editDeadlineButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.editDeadlineText}>Edit</Text>
          </TouchableOpacity>
        )} */}

        {isOwner && (
          <DateTimePicker
            value={deadlineValue || new Date()}
            mode="datetime"
            display="default"
            onChange={handleDeadlineChange}
          />
        )}
      </View>

      <Text style={styles.arrayTitle}>My Squares:</Text>
      {/* <Text style={styles.selectedArray}>
        {Array.from(selectedSquares)
          .map((square) => `(${square})`) // Add parentheses around each square's coordinate
          .join(", ")}{" "}
      </Text> */}
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
    color: "#000000",
  },
  deadlineText: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 20,
  },
  teamInfo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Courier",
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
    fontFamily: "Courier",
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
    fontFamily: "Courier",
  },
  yAxisText: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5, // Space between the Y-axis and the grid
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Courier",
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
  copyButton: {
    marginRight: 15,
    padding: 10,
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  editDeadlineButton: {
    marginLeft: 10,
    padding: 5,
    backgroundColor: "#6b705c",
    borderRadius: 5,
  },
  editDeadlineText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default SquareScreen;
