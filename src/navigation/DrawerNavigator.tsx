import React, { useState, useEffect } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  Image,
  TouchableOpacity,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import SquareScreen from "../screens/SquareScreen";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import HeaderLogo from "../components/HeaderLogo";
import Icon from "react-native-vector-icons/MaterialIcons";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const CustomDrawerContent = ({ userId, onLogout }) => {
  const navigation = useNavigation();
  const [squares, setSquares] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "squares"),
      where("playerIds", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const squaresList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSquares(squaresList);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <SafeAreaView style={styles.container}>
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
                navigation.navigate("FinalSquareScreen", {
                  gridId: item.id,
                  inputTitle: item.title,
                  username: userId,
                  // team1: item.team1,
                  // team2: item.team2,
                  deadline: item.deadline,
                  disableAnimation: true,
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
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("../../assets/icons/icon_outline3.png")}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
      ),
    }}
  >
    <Drawer.Screen
      name="Home"
      component={HomeScreen}
      options={({ navigation }) => ({
        headerTitle: () => <HeaderLogo />,
        headerStyle: { backgroundColor: "white" },
        headerLeft: () => (
          <TouchableOpacity
            style={{ marginLeft: 10 }}
            onPress={() => navigation.toggleDrawer()}
          >
            <Icon name="menu" size={28} color="#000" />
          </TouchableOpacity>
        ),
      })}
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
    paddingTop: 80,
  },
  noSquaresText: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
    fontSize: 16,
  },
  squareItem: {
    padding: 15,
    backgroundColor: "#5e60ce",
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
