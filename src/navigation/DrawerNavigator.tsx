import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import HomeScreen from "../screens/HomeScreen";
import SquareScreen from "../screens/SquareScreen";
import { db } from "../../firebaseConfig";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const CustomDrawerContent = ({ userId }) => {
  const navigation = useNavigation();
  const [squares, setSquares] = useState([]);
  const insets = useSafeAreaInsets();

  console.log("HomeDrawer User ID:", userId);
  useEffect(() => {
    const fetchSquares = async () => {
      try {
        if (!userId) {
          console.log("No user ID found.");
          return;
        }

        const squaresRef = collection(db, "squares");
        const q = query(
          squaresRef,
          where("playerIds", "array-contains", userId) // Checks if user is in the players array
        );

        console.log("Running Firestore Query:", q);

        const querySnapshot = await getDocs(q);
        console.log("Query Snapshot Size:", querySnapshot.size);

        if (querySnapshot.empty) {
          console.log("No squares found for user.");
        }

        const squaresList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched Squares List:", squaresList);
        setSquares(squaresList);
      } catch (error) {
        console.error("Error fetching squares:", error);
      }
    };

    fetchSquares();
  }, [userId]);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>My Squares</Text>

      {squares.length === 0 ? (
        <Text style={styles.noSquaresText}>
          You haven't joined any squares yet.
        </Text>
      ) : (
        <FlatList
          data={squares}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.squareItem}
              onPress={() =>
                navigation.navigate("SquareScreen", {
                  gridId: item.id,
                  inputTitle: item.title,
                  username: userId, // Assuming userId is the username, update if necessary
                  numPlayers: item.numPlayers, // Assuming numPlayers is stored in Firestore
                  team1: item.team1,
                  team2: item.team2,
                  gridSize: item.gridSize,
                })
              }
            >
              <Text style={styles.squareText}>
                {item.title || "Unnamed Square"}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

/** Drawer Navigator */
const HomeDrawer = ({ userId }) => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <CustomDrawerContent {...props} userId={userId} />
    )}
  >
    <Drawer.Screen name="Home" component={HomeScreen} />
    <Drawer.Screen
      name="SquareScreen"
      component={SquareScreen}
      options={{ headerShown: false }}
    />
  </Drawer.Navigator>
);

/** Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f8f8f8",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  noSquaresText: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
    fontSize: 16,
  },
  squareItem: {
    padding: 15,
    backgroundColor: "#6b705c",
    borderRadius: 8,
    marginVertical: 5,
  },
  squareText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default HomeDrawer;
