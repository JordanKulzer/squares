import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { auth } from "./firebaseConfig";
import JoinSquareScreen from "./src/screens/JoinSquareScreen";
import * as Notifications from "expo-notifications";
import CreateSquareScreen from "./src/screens/CreateSquareScreen";
import AppDrawer from "./src/navigation/AppDrawer";
import LoginScreen from "./src/screens/LoginScreen";
import SquareScreen from "./src/screens/SquareScreen";
import HeaderLogo from "./src/components/HeaderLogo";
import Icon from "react-native-vector-icons/MaterialIcons";
import SignupScreen from "./src/screens/SignUpScreen";
import { Provider as PaperProvider } from "react-native-paper";
import Toast from "react-native-toast-message";
import { getToastConfig } from "./src/components/ToastConfig";
import GamePickerScreen from "./src/screens/GamePickerScreen";
import HowToScreen from "./src/screens/HowToScreen";
import { LightTheme, DarkTheme } from "./assets/constants/theme";
import ForgotPasswordScreen from "./src/screens/ForgotPassword";
import { registerPushToken } from "./src/utils/registerPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator();

const HomeScreen = ({ userId, onLogout, isDarkTheme, toggleTheme }) => {
  return (
    <AppDrawer
      userId={userId}
      onLogout={onLogout}
      isDarkTheme={isDarkTheme}
      toggleTheme={toggleTheme}
    />
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const paperTheme = isDarkTheme ? DarkTheme : LightTheme;
  const navigationTheme = isDarkTheme ? NavigationDarkTheme : DefaultTheme;
  const toastConfig = getToastConfig(isDarkTheme);

  // Load saved theme preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme === "dark") setIsDarkTheme(true);
      if (savedTheme === "light") setIsDarkTheme(false);
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const next = !isDarkTheme;
    setIsDarkTheme(next);
    await AsyncStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Slight delay ensures auth.currentUser is populated
        setTimeout(() => {
          registerPushToken(firebaseUser.uid);
        }, 500);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await auth().signOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const linking = {
    prefixes: ["squaresgame://", "https://squaresgame.app"],
    config: {
      screens: {
        JoinSquareScreen: {
          path: "session/:sessionId",
        },
      },
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDarkTheme ? "light-content" : "dark-content"}
        backgroundColor={
          isDarkTheme ? DarkTheme.colors.surface : LightTheme.colors.surface
        }
      />
      <PaperProvider theme={paperTheme}>
        <NavigationContainer theme={navigationTheme} linking={linking}>
          <Stack.Navigator>
            {user ? (
              <>
                {/* Screen that doesn't have the back button in the header */}
                <Stack.Screen name="Main" options={{ headerShown: false }}>
                  {() => (
                    <HomeScreen
                      userId={user.uid}
                      onLogout={handleLogout}
                      isDarkTheme={isDarkTheme}
                      toggleTheme={toggleTheme}
                    />
                  )}
                </Stack.Screen>

                {/* Other screens with back + animation */}
                {[
                  {
                    name: "JoinSquareScreen",
                    component: JoinSquareScreen,
                    title: "Join Game",
                  },
                  {
                    name: "HowToScreen",
                    component: HowToScreen,
                    title: "How To Play",
                  },
                  {
                    name: "CreateSquareScreen",
                    component: CreateSquareScreen,
                    title: "Create Game",
                  },
                  {
                    name: "GamePickerScreen",
                    component: GamePickerScreen,
                    title: "Create Game",
                  },
                  {
                    name: "SquareScreen",
                    component: SquareScreen,
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
                      headerTitleAlign: "center",
                      headerStyle: {
                        backgroundColor: paperTheme.colors.surface,
                        borderBottomWidth: 2,
                        borderBottomColor: "red",
                      },
                      headerBackTitleVisible: false,
                      headerTintColor: paperTheme.colors.onBackground,
                      title: title || undefined,
                      headerLeft: () => (
                        <TouchableOpacity
                          style={{ marginLeft: 10 }}
                          onPress={() => navigation.goBack()}
                        >
                          <Icon
                            name="arrow-back"
                            size={24}
                            color={paperTheme.colors.onBackground}
                          />
                        </TouchableOpacity>
                      ),
                    })}
                  />
                ))}
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
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <Toast config={toastConfig} position="bottom" bottomOffset={60} />
      </PaperProvider>
    </>
  );
};

export default App;
