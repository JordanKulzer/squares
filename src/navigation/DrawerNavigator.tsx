import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { collection, query, where, getDocs } from "firebase/firestore";
import HomeScreen from "../screens/HomeScreen";
import SquareScreen from "../screens/SquareScreen"; // Screen where the selected square is displayed
import { db } from "../../firebaseConfig";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const CustomDrawerContent = ({ userId }) => {
  const navigation = useNavigation();
  const [squares, setSquares] = useState([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchSquares = async () => {
      try {
        const squaresRef = collection(db, "grids"); // Firestore collection
        const q = query(squaresRef, where("participants", "array-contains", userId)); // Filter squares by user ID
        const querySnapshot = await getDocs(q);

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
        <Text style={styles.noSquaresText}>You haven't joined or created any squares yet.</Text>
      ) : (
        <FlatList
          data={squares}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.squareItem}
              onPress={() => navigation.navigate("SquareScreen", { squareId: item.id })}
            >
              <Text style={styles.squareText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

/** Drawer Navigator (Available only on Home Screen) */
const HomeDrawer = ({ userId }) => (
  <Drawer.Navigator
    drawerContent={(props) => <CustomDrawerContent {...props} userId={userId} />}
  >
    <Drawer.Screen name="Home" component={HomeScreen} />
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
