import React, { useState } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import {
  Image,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import HomeScreen from "../screens/HomeScreen";
import HeaderLogo from "../components/HeaderLogo";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import NotificationsModal from "../components/NotificationsModal";
import ThemeToggle from "../components/ThemeToggle";

const Drawer = createDrawerNavigator();

/** Drawer Content Component */
const AppDrawerContent = ({
  userId,
  onLogout,
  isDarkTheme,
  toggleTheme,
}: {
  userId: string;
  onLogout: () => void;
  isDarkTheme: boolean;
  toggleTheme: () => void;
}) => {
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const theme = useTheme();

  const handleLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text style={[styles.header, { color: theme.colors.onBackground }]}>
        Settings
      </Text>

      <TouchableOpacity style={styles.settingItem}>
        <Text
          style={[styles.settingLabel, { color: theme.colors.onBackground }]}
        >
          Account Information
        </Text>
      </TouchableOpacity>

      <View style={styles.settingItem}>
        <Text
          style={[styles.settingLabel, { color: theme.colors.onBackground }]}
        >
          Dark Mode
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <ThemeToggle isDarkTheme={isDarkTheme} toggleTheme={toggleTheme} />
        </View>
      </View>

      <TouchableOpacity style={styles.settingItem}>
        <Text
          style={[styles.settingLabel, { color: theme.colors.onBackground }]}
        >
          Get Help
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <Text
          style={[styles.settingLabel, { color: theme.colors.onBackground }]}
        >
          Notifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => setLogoutConfirmVisible(true)}
      >
        {/* <MaterialCommunityIcons name="logout" size={22} color="#ff4d4d" /> */}
        <Text style={[styles.settingLabel, { color: theme.colors.error }]}>
          Log Out
        </Text>
      </TouchableOpacity>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal
          visible={logoutConfirmVisible}
          onDismiss={() => setLogoutConfirmVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Confirm Logout
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Are you sure you want to log out?
          </Text>

          <View style={styles.modalButtonRow}>
            <Button onPress={() => setLogoutConfirmVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleLogout}
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#fff"
            >
              Log Out
            </Button>
          </View>
        </Modal>
      </Portal>
      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        userId={userId}
      />
    </SafeAreaView>
  );
};

/** Drawer Navigator */
const AppDrawer = ({
  userId,
  onLogout,
  isDarkTheme,
  toggleTheme,
}: {
  userId: string;
  onLogout: () => void;
  isDarkTheme: boolean;
  toggleTheme: () => void;
}) => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <AppDrawerContent
          {...props}
          userId={userId}
          onLogout={onLogout}
          isDarkTheme={isDarkTheme}
          toggleTheme={toggleTheme}
        />
      )}
      screenOptions={({ navigation }) => ({
        headerTitle: () => (
          <Image
            source={require("../../assets/icons/new logo pt2.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        ),
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerLeft: () => (
          <TouchableOpacity
            style={{ marginLeft: 10 }}
            onPress={() => navigation.toggleDrawer()}
          >
            <MaterialCommunityIcons
              name="menu"
              size={28}
              color={theme.colors.onBackground}
            />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
};

/** Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 80,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,180,180,0.3)",
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalContainer: {
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
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});

export default AppDrawer;
