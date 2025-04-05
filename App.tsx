import React, { useState, useEffect } from "react";
import { Image, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged } from "firebase/auth";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import JoinSquareScreen from "./src/screens/JoinSquareScreen";
import SquareScreen from "./src/screens/SquareScreen";
import CreateSquareScreen from "./src/screens/CreateSquareScreen";
import HomeDrawer from "./src/navigation/DrawerNavigator";
import { auth } from "./firebaseConfig";
import LoginScreen from "./src/screens/LoginScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Home Stack with Drawer */
const HomeStack = ({ userId }) => (
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
    <Stack.Screen name="HomeDrawer" options={{ headerShown: false }}>
      {() => <HomeDrawer userId={userId} />}
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
const BottomTabs = ({ userId }) => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#ffe8d6" },
      tabBarActiveTintColor: "#6b705c",
      tabBarInactiveTintColor: "#a5a58d",
    }}
  >
    <Tab.Screen name="Home">{() => <HomeStack userId={userId} />}</Tab.Screen>
    <Tab.Screen name="My Profile" component={ProfileStack} />
    <Tab.Screen name="Settings" component={SettingsStack} />
  </Tab.Navigator>
);

/** App Component */
const App: React.FC = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
        <BottomTabs userId={user.uid} />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default App;
