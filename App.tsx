import React from "react";
import { Image } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import DetailsScreen from "./src/screens/DetailsScreen";
import NewSquareScreen from "./src/screens/NewSquareScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator
  screenOptions={{
    headerTitle: () => (
      <Image
        source={require('./assets/favicon.png')} // Path to your image
        style={{ width: 40, height: 40 }} // Adjust size as needed
        resizeMode="contain"
      />
    ),
  }}>
    <Stack.Screen name="Homes" component={HomeScreen} />
    <Stack.Screen name="Details" component={DetailsScreen} />
    <Stack.Screen name="NewSquareScreen" component={NewSquareScreen} />
  </Stack.Navigator>
);

const SecondStack = () => (
  <Stack.Navigator >
    <Stack.Screen name="Details" component={DetailsScreen} />
    <Stack.Screen name="Home" component={HomeScreen} />
  </Stack.Navigator>
);

const App: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{
        headerShown: false,
      }}>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="My squares" component={SecondStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;
