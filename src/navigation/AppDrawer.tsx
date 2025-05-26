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
import { auth, db } from "../../firebaseConfig";
import HeaderLogo from "../components/HeaderLogo";
import Icon from "react-native-vector-icons/MaterialIcons";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const AppDrawerContent = ({ userId, onLogout }) => {
  const navigation = useNavigation();
  const email = auth.currentUser?.email || "Unknown";

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <TouchableOpacity style={styles.settingItem}>
        <Text style={styles.settingLabel}>Account Information</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <Text style={styles.settingLabel}>Display Theme</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <Text style={styles.settingLabel}>Get Help</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <Text style={styles.settingLabel}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem} onPress={onLogout}>
        <Text style={styles.settingLabel}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/** Drawer Navigator */
const AppDrawer = ({ userId, onLogout }) => (
  <Drawer.Navigator
    drawerContent={(props) => (
      <AppDrawerContent {...props} userId={userId} onLogout={onLogout} />
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
  sectionHeader: {
    marginTop: 30,
    fontSize: 14,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingItem: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  settingLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },

  settingValue: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});

export default AppDrawer;
