import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";
import DetailsScreen from "../screens/DetailsScreen";
import NewSquareScreen from "../screens/NewSquareScreen";
import CreateSquareScreen from "../screens/CreateSquareScreen";
import JoinSquareScreen from "../screens/JoinSquareScreen";
import SquareScreen from "../screens/SquareScreen";

const Stack = createStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="JoinSquareScreen" component={JoinSquareScreen} />
      <Stack.Screen name="CreateSquareScreen" component={CreateSquareScreen} />
      <Stack.Screen name="NewSquareScreen" component={NewSquareScreen} />
      <Stack.Screen name="SquareScreen" component={SquareScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
