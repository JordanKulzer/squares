// // import React from "react";
// // import { Image } from "react-native";
// // import { NavigationContainer } from "@react-navigation/native";
// // import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// // import { createNativeStackNavigator } from "@react-navigation/native-stack";
// // import HomeScreen from "./src/screens/HomeScreen";
// // import SettingsScreen from "./src/screens/SettingsScreen";
// // import ProfileScreen from "./src/screens/ProfileScreen";
// // import JoinSquareScreen from "./src/screens/JoinSquareScreen";
// // import SquareScreen from "./src/screens/SquareScreen";
// // import CreateSquareScreen from "./src/screens/CreateSquareScreen";

// // const Tab = createBottomTabNavigator();
// // const Stack = createNativeStackNavigator();

// // const HomeStack = () => (
// //   <Stack.Navigator
// //     screenOptions={{
// //       headerTitle: () => (
// //         <Image
// //           source={require("./assets/favicon.png")} // Path to your image
// //           style={{ width: 40, height: 40 }} // Adjust size as needed
// //           resizeMode="contain"
// //         />
// //       ),
// //       headerStyle: {
// //         backgroundColor: "#a5a58d",
// //       },
// //     }}
// //   >
// //     <Stack.Screen name="Home" component={HomeScreen} />
// //     <Stack.Screen name="JoinSquareScreen" component={JoinSquareScreen} />
// //     <Stack.Screen name="CreateSquareScreen" component={CreateSquareScreen} />
// //     <Stack.Screen name="SquareScreen" component={SquareScreen} />
// //   </Stack.Navigator>
// // );

// // const SecondStack = () => (
// //   <Stack.Navigator
// //     screenOptions={{
// //       headerTitle: () => (
// //         <Image
// //           source={require("./assets/favicon.png")} // Path to your image
// //           style={{ width: 40, height: 40 }} // Adjust size as needed
// //           resizeMode="contain"
// //         />
// //       ),
// //       headerStyle: {
// //         backgroundColor: "#a5a58d",
// //       },
// //     }}
// //   >
// //     <Stack.Screen name="Settings" component={SettingsScreen} />
// //   </Stack.Navigator>
// // );

// // const ThirdStack = () => (
// //   <Stack.Navigator
// //     screenOptions={{
// //       headerTitle: () => (
// //         <Image
// //           source={require("./assets/favicon.png")} // Path to your image
// //           style={{ width: 40, height: 40 }} // Adjust size as needed
// //           resizeMode="contain"
// //         />
// //       ),
// //       headerStyle: {
// //         backgroundColor: "#a5a58d",
// //       },
// //     }}
// //   >
// //     <Stack.Screen name="Profile" component={ProfileScreen} />
// //   </Stack.Navigator>
// // );

// // const App: React.FC = () => {
// //   return (
// //     <NavigationContainer>
// //       <Tab.Navigator
// //         screenOptions={{
// //           headerShown: false,
// //           tabBarStyle: { backgroundColor: "#ffe8d6" },
// //           tabBarActiveTintColor: "#6b705c",
// //           tabBarInactiveTintColor: "#a5a58d",
// //         }}
// //       >
// //         <Tab.Screen name="Home" component={HomeStack} />
// //         <Tab.Screen name="My Profile" component={ThirdStack} />
// //         <Tab.Screen name="Settings" component={SecondStack} />
// //       </Tab.Navigator>
// //     </NavigationContainer>
// //   );
// // };

// // export default App;

// import React from "react";
// import { Image } from "react-native";
// import { NavigationContainer } from "@react-navigation/native";
// import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { createDrawerNavigator } from "@react-navigation/drawer";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import HomeScreen from "./src/screens/HomeScreen";
// import SettingsScreen from "./src/screens/SettingsScreen";
// import ProfileScreen from "./src/screens/ProfileScreen";
// import JoinSquareScreen from "./src/screens/JoinSquareScreen";
// import SquareScreen from "./src/screens/SquareScreen";
// import CreateSquareScreen from "./src/screens/CreateSquareScreen";
// // import JoinedSquaresScreen from "./src/screens/JoinedSquaresScreen"; // The drawer content

// const Tab = createBottomTabNavigator();
// const Stack = createNativeStackNavigator();
// const Drawer = createDrawerNavigator();

// /** Drawer navigator available only on Home screen */
// const HomeDrawer = () => (
//   <Drawer.Navigator
//     screenOptions={{
//       headerTitle: () => (
//         <Image
//           source={require("./assets/favicon.png")}
//           style={{ width: 40, height: 40 }}
//           resizeMode="contain"
//         />
//       ),
//       headerStyle: { backgroundColor: "#a5a58d" },
//     }}
//   >
//     <Drawer.Screen name="Homes" component={HomeScreen} />
//     {/* <Drawer.Screen name="My Squares" component={JoinedSquaresScreen} /> */}
//   </Drawer.Navigator>
// );

// /** Stack navigator containing HomeDrawer */
// const HomeStack = () => (
//   <Stack.Navigator
//     screenOptions={{
//       headerTitle: () => (
//         <Image
//           source={require("./assets/favicon.png")}
//           style={{ width: 40, height: 40 }}
//           resizeMode="contain"
//         />
//       ),
//       headerStyle: { backgroundColor: "#a5a58d" },
//     }}
//   >
//     <Stack.Screen
//       name="HomeDrawer"
//       component={HomeDrawer}
//       options={{ headerShown: false }}
//     />
//     <Stack.Screen name="JoinSquareScreen" component={JoinSquareScreen} />
//     <Stack.Screen name="CreateSquareScreen" component={CreateSquareScreen} />
//     <Stack.Screen name="SquareScreen" component={SquareScreen} />
//   </Stack.Navigator>
// );

// /** Other stacks remain unchanged */
// const SettingsStack = () => (
//   <Stack.Navigator
//     screenOptions={{
//       headerTitle: () => (
//         <Image
//           source={require("./assets/favicon.png")}
//           style={{ width: 40, height: 40 }}
//           resizeMode="contain"
//         />
//       ),
//       headerStyle: { backgroundColor: "#a5a58d" },
//     }}
//   >
//     <Stack.Screen name="Settings" component={SettingsScreen} />
//   </Stack.Navigator>
// );

// const ProfileStack = () => (
//   <Stack.Navigator
//     screenOptions={{
//       headerTitle: () => (
//         <Image
//           source={require("./assets/favicon.png")}
//           style={{ width: 40, height: 40 }}
//           resizeMode="contain"
//         />
//       ),
//       headerStyle: { backgroundColor: "#a5a58d" },
//     }}
//   >
//     <Stack.Screen name="Profile" component={ProfileScreen} />
//   </Stack.Navigator>
// );

// /** Bottom Tabs */
// const BottomTabs = () => (
//   <Tab.Navigator
//     screenOptions={{
//       headerShown: false,
//       tabBarStyle: { backgroundColor: "#ffe8d6" },
//       tabBarActiveTintColor: "#6b705c",
//       tabBarInactiveTintColor: "#a5a58d",
//     }}
//   >
//     <Tab.Screen name="Home" component={HomeStack} />
//     <Tab.Screen name="My Profile" component={ProfileStack} />
//     <Tab.Screen name="Settings" component={SettingsStack} />
//   </Tab.Navigator>
// );

// /** App Navigation */
// const App: React.FC = () => {
//   return (
//     <NavigationContainer>
//       <BottomTabs />
//     </NavigationContainer>
//   );
// };

// export default App;
import React from "react";
import { Image } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import HomeScreen from "./src/screens/HomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import JoinSquareScreen from "./src/screens/JoinSquareScreen";
import SquareScreen from "./src/screens/SquareScreen";
import CreateSquareScreen from "./src/screens/CreateSquareScreen";
import HomeDrawer from "./src/navigation/DrawerNavigator";

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
    <Stack.Screen
      name="HomeDrawer"
      component={() => <HomeDrawer userId={userId} />}
      options={{ headerShown: false }}
    />
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
    <Tab.Screen name="Home" component={() => <HomeStack userId={userId} />} />
    <Tab.Screen name="My Profile" component={ProfileStack} />
    <Tab.Screen name="Settings" component={SettingsStack} />
  </Tab.Navigator>
);

/** App Component */
const App: React.FC = () => {
  const userId = "currentUserId"; // Replace with real user ID from authentication
  return (
    <NavigationContainer>
      <BottomTabs userId={userId} />
    </NavigationContainer>
  );
};

export default App;
