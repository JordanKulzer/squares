import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Button,
} from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { collection, query, where, getDocs } from "firebase/firestore";
import HomeScreen from "../screens/HomeScreen";
import SquareScreen from "../screens/SquareScreen";
import { db } from "../../firebaseConfig";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const CustomDrawerContent = ({ userId, onLogout }) => {
  const navigation = useNavigation();
  const [squares, setSquares] = useState([]);
  const insets = useSafeAreaInsets();

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

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log("No squares found for user.");
        }

        const squaresList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

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
                  username: userId, // Assuming userId is the username
                  numPlayers: item.numPlayers,
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

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/** Drawer Navigator */
const HomeDrawer = ({ userId, onLogout }) => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <CustomDrawerContent {...props} userId={userId} onLogout={onLogout} />
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
  logoutButton: {
    padding: 15,
    backgroundColor: "#ff4d4d",
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeDrawer;
