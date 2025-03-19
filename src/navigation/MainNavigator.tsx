import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";
import DetailsScreen from "../screens/DetailsScreen";
import NewSquareScreen from "../screens/NewSquareScreen";
import CreateNewSquareScreen from "../screens/CreateNewSquareScreen";

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen
        name="CreateNewSquareScreen"
        component={CreateNewSquareScreen}
      />
      <Stack.Screen name="NewSquareScreen" component={NewSquareScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
