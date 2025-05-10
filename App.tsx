import React, { useState, useEffect } from "react";
import { Image, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import JoinSquareScreen from "./src/screens/JoinSquareScreen";
import SquareScreen from "./src/screens/SquareScreen";
import CreateSquareScreen from "./src/screens/CreateSquareScreen";
import HomeDrawer from "./src/navigation/DrawerNavigator";
import LoginScreen from "./src/screens/LoginScreen";
import Icon from "react-native-vector-icons/MaterialIcons"; // Import Icon for the drawer toggle

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Home Stack with Drawer */
const HomeStack = ({ userId, onLogout }: any) => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: "#a5a58d" },
    }}
  >
    {/* Remove header settings from the HomeDrawer screen here */}
    <Stack.Screen
      name="HomeDrawer"
      options={({ navigation }: any) => ({
        headerTitle: () => (
          <Image
            source={require("./assets/icon_outline3.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        ),
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Icon
              name="menu"
              size={30}
              color="#fff"
              style={{ marginLeft: 15 }}
            />
          </TouchableOpacity>
        ),
      })}
    >
      {() => <HomeDrawer userId={userId} onLogout={onLogout} />}
    </Stack.Screen>
    <Stack.Screen name="JoinSquareScreen" component={JoinSquareScreen} />
    <Stack.Screen name="CreateSquareScreen" component={CreateSquareScreen} />
    <Stack.Screen name="SquareScreen" component={SquareScreen} />
  </Stack.Navigator>
);

/** Settings Stack */
const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("./assets/favicon.png")}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
        />
      ),
      headerStyle: { backgroundColor: "#a5a58d" },
    }}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

/** Profile Stack */
const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("./assets/favicon.png")}
          style={{ width: 40, height: 40 }}
          resizeMode="contain"
        />
      ),
      headerStyle: { backgroundColor: "#a5a58d" },
    }}
  >
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

/** Bottom Tabs */
const BottomTabs = ({ userId, onLogout }) => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#ffe8d6" },
      tabBarActiveTintColor: "#6b705c",
      tabBarInactiveTintColor: "#a5a58d",
    }}
  >
    <Tab.Screen name="Home">
      {() => <HomeStack userId={userId} onLogout={onLogout} />}
    </Tab.Screen>
    <Tab.Screen name="My Profile" component={ProfileStack} />
    <Tab.Screen name="Settings" component={SettingsStack} />
  </Tab.Navigator>
);

/** App Component */
const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out from Firebase
      setUser(null); // Update user state after logout
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <BottomTabs userId={user.uid} onLogout={handleLogout} />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default App;
