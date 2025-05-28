import React, { useState, useEffect } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  Image,
  TouchableOpacity,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Modal, Portal, Button } from "react-native-paper";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const AppDrawerContent = ({ userId, onLogout }) => {
  const email = auth.currentUser?.email || "Unknown";
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const handleLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout();
  };

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

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => setLogoutConfirmVisible(true)}
      >
        {/* <MaterialCommunityIcons name="logout" size={22} color="#ff4d4d" /> */}
        <Text style={[styles.settingLabel, { color: "#ff4d4d" }]}>Log Out</Text>
      </TouchableOpacity>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal
          visible={logoutConfirmVisible}
          onDismiss={() => setLogoutConfirmVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Confirm Logout</Text>
          <Text style={styles.modalSubtitle}>
            Are you sure you want to log out?
          </Text>

          <View style={styles.modalButtonRow}>
            <Button onPress={() => setLogoutConfirmVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleLogout}
              mode="contained"
              buttonColor="#ff4d4d"
              textColor="#fff"
            >
              Log Out
            </Button>
          </View>
        </Modal>
      </Portal>
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
          source={require("../../assets/icons/new logo pt2.png")}
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
            <MaterialCommunityIcons name="menu" size={28} color="#000" />
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
  userInfo: {
    alignItems: "center",
    marginVertical: 30,
  },
  email: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});

export default AppDrawer;
