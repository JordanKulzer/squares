import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
import FinalSquareScreen from "./src/screens/FinalSquareScreen";
import HeaderLogo from "./src/components/HeaderLogo";
import Icon from "react-native-vector-icons/MaterialIcons";
import SignupScreen from "./src/screens/SignUpScreen";
import { Provider as PaperProvider } from "react-native-paper";
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/components/ToastConfig";

const Stack = createNativeStackNavigator();

/** Wrapper screen to host the drawer */
const HomeScreen = ({ route, navigation }) => {
  const { userId, onLogout } = route.params;
  return <HomeDrawer userId={userId} onLogout={onLogout} />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
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
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {user ? (
            <>
              {/* Screen that doesn't have the back button in the header */}
              <Stack.Screen
                name="Main"
                component={HomeScreen}
                initialParams={{ userId: user.uid, onLogout: handleLogout }}
                options={() => ({
                  headerShown: false,
                })}
              />

              {/* Other screens with back + animation */}
              {[
                {
                  name: "JoinSquareScreen",
                  component: JoinSquareScreen,
                  title: "Join Game",
                },
                {
                  name: "CreateSquareScreen",
                  component: CreateSquareScreen,
                  title: "Create Game",
                },
                // {
                //   name: "SquareScreen",
                //   component: SquareScreen,
                //   title: null,
                // },
                {
                  name: "FinalSquareScreen",
                  component: FinalSquareScreen,
                  title: null,
                },
              ].map(({ name, component, title }) => (
                <Stack.Screen
                  key={name}
                  name={name}
                  component={component}
                  options={({ navigation }) => ({
                    animation: "slide_from_right",
                    headerTitle: () => <HeaderLogo />,
                    headerStyle: { backgroundColor: "white" },
                    headerBackTitleVisible: false,
                    headerTintColor: "#000",
                    title: title || undefined,
                    headerLeft: () => (
                      <TouchableOpacity
                        style={{ marginLeft: 10 }}
                        onPress={() => navigation.goBack()}
                      >
                        <Icon name="arrow-back" size={24} color="#000" />
                      </TouchableOpacity>
                    ),
                  })}
                />
              ))}

              {/* Optional */}
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "My Profile" }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: "Settings" }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Signup"
                component={SignupScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={toastConfig} position="bottom" bottomOffset={60} />
    </PaperProvider>
  );
};

export default App;
