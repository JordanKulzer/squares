import React from "react";
import { Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import DetailsScreen from "./src/screens/DetailsScreen";
import NewSquareScreen from "./src/screens/NewSquareScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import CreateSquareScreen from "./src/screens/CreateSquareScreen";
import JoinSquareScreen from "./src/screens/JoinSquareScreen";
import SquareScreen from "./src/screens/SquareScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("./assets/favicon.png")} // Path to your image
          style={{ width: 40, height: 40 }} // Adjust size as needed
          resizeMode="contain"
        />
      ),
      headerStyle: {
        backgroundColor: "#a5a58d",
      },
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="JoinSquareScreen" component={JoinSquareScreen} />
    <Stack.Screen name="CreateSquareScreen" component={CreateSquareScreen} />
    <Stack.Screen name="NewSquareScreen" component={NewSquareScreen} />
    <Stack.Screen name="SquareScreen" component={SquareScreen} />
  </Stack.Navigator>
);

const SecondStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("./assets/favicon.png")} // Path to your image
          style={{ width: 40, height: 40 }} // Adjust size as needed
          resizeMode="contain"
        />
      ),
      headerStyle: {
        backgroundColor: "#a5a58d",
      },
    }}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

const ThirdStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerTitle: () => (
        <Image
          source={require("./assets/favicon.png")} // Path to your image
          style={{ width: 40, height: 40 }} // Adjust size as needed
          resizeMode="contain"
        />
      ),
      headerStyle: {
        backgroundColor: "#a5a58d",
      },
    }}
  >
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#ffe8d6" },
          tabBarActiveTintColor: "#6b705c",
          tabBarInactiveTintColor: "#a5a58d",
        }}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="My Profile" component={ThirdStack} />
        <Tab.Screen name="Settings" component={SecondStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;
