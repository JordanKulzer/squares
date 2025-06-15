import React, { useState } from "react";
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import {
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import HomeScreen from "../screens/HomeScreen";
import * as Linking from "expo-linking";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import NotificationsModal from "../components/NotificationsModal";
import ThemeToggle from "../components/ThemeToggle";
import { deleteUser, getAuth } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const Drawer = createDrawerNavigator<DrawerParamList>();

type DrawerParamList = {
  Home: undefined;
};

type AppDrawerContentProps = DrawerContentComponentProps & {
  userId: string;
  onLogout: () => void;
  isDarkTheme: boolean;
  toggleTheme: () => void;
};

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
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const theme = useTheme();

  const handleLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout();
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteConfirmVisible(false);
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        onLogout();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Try again later.");
    }
  };

  const renderItemWithIcon = (
    iconName: string,
    label: string,
    onPress?: () => void,
    labelColor = theme.colors.onBackground
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <MaterialCommunityIcons name={iconName} size={20} color={labelColor} />
      <Text style={[styles.settingLabel, { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <DrawerContentScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.header, { color: theme.colors.onBackground }]}>
          Settings
        </Text>
        <View style={styles.divider} />

        <View style={{ flex: 1 }}>
          <View style={styles.settingItem}>
            <MaterialCommunityIcons
              name="weather-night"
              size={20}
              color={theme.colors.onBackground}
            />
            <Text
              style={[
                styles.settingLabel,
                { color: theme.colors.onBackground },
              ]}
            >
              Dark Mode
            </Text>
            <View style={{ flex: 1, alignItems: "flex-end", paddingRight: 20 }}>
              <ThemeToggle
                isDarkTheme={isDarkTheme}
                toggleTheme={toggleTheme}
              />
            </View>
          </View>

          {renderItemWithIcon("bell-outline", "Notifications")}

          {renderItemWithIcon("help-circle-outline", "Get Help", () =>
            Linking.openURL("mailto:support@squaresapp.com")
          )}

          {renderItemWithIcon(
            "logout",
            "Log Out",
            () => setLogoutConfirmVisible(true),
            theme.colors.error
          )}
        </View>
      </DrawerContentScrollView>

      <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
        <Button
          icon="delete"
          mode="outlined"
          onPress={() => setDeleteConfirmVisible(true)}
          textColor={theme.colors.error}
          style={{
            backgroundColor: theme.dark ? theme.colors.error : "#ffe5e5",
            marginBottom: 12,
            borderColor: theme.colors.error,
          }}
          contentStyle={{ paddingVertical: 8 }}
          labelStyle={{
            fontWeight: "600",
            color: theme.dark ? theme.colors.onPrimary : theme.colors.error,
          }}
        >
          Delete Account
        </Button>
      </View>

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

        <Modal
          visible={deleteConfirmVisible}
          onDismiss={() => setDeleteConfirmVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Delete Account
          </Text>
          <Text
            style={[
              styles.modalSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            This will permanently delete your account and data. Continue?
          </Text>
          <View style={styles.modalButtonRow}>
            <Button onPress={() => setDeleteConfirmVisible(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteAccount}
              mode="contained"
              buttonColor={theme.colors.error}
              textColor="#fff"
            >
              Delete
            </Button>
          </View>
        </Modal>
      </Portal>

      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        userId={userId}
      />
    </View>
  );
};

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
      {...({
        id: "MainDrawer",
        drawerContent: (props) => (
          <AppDrawerContent
            {...props}
            userId={userId}
            onLogout={onLogout}
            isDarkTheme={isDarkTheme}
            toggleTheme={toggleTheme}
          />
        ),
        screenOptions: ({ navigation }) => ({
          headerTitle: () => (
            <Image
              source={require("../../assets/icons/squares-logo.png")}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          ),
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerLeft: () => (
            <TouchableOpacity
              style={{ paddingLeft: 16 }}
              onPress={() => navigation.toggleDrawer()}
            >
              <MaterialCommunityIcons
                name="menu"
                size={28}
                color={theme.colors.onBackground}
              />
            </TouchableOpacity>
          ),
          headerRight: () => <View style={{ width: 44 }} />,
        }),
      } as unknown as React.ComponentProps<typeof Drawer.Navigator>)}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,180,180,0.3)",
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
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
  deleteAccountButton: {
    borderRadius: 28,
    elevation: 2,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,180,180,0.3)",
  },
});

export default AppDrawer;
