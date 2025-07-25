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
  createNavigationContainerRef,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { supabase } from "./src/lib/supabase";
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
import * as Linking from "expo-linking";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://ad2eab012c320c284637c80f6b9cb1cd@o4509662000054272.ingest.us.sentry.io/4509662000316416",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export const navigationRef = createNavigationContainerRef();

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
  const [recoveryMode, setRecoveryMode] = useState(false);

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
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData, error } = await supabase.auth.getUser();

        if (error || !userData?.user) {
          await supabase.auth.signOut();
          setUser(null);

          Toast.show({
            type: "error",
            text1: "Account Deleted",
            text2: "Your account no longer exists. Please sign up again.",
            position: "bottom",
          });
        } else {
          setUser(userData.user);
          setTimeout(() => {
            registerPushToken(userData.user.id);
          }, 500);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: userData, error } = await supabase.auth.getUser();
          if (error || !userData?.user) {
            await supabase.auth.signOut();
            setUser(null);

            Toast.show({
              type: "error",
              text1: "Account Deleted",
              text2: "Your account no longer exists. Please sign up again.",
              position: "bottom",
            });
          } else {
            setUser(userData.user);
            setTimeout(() => {
              registerPushToken(userData.user.id);
            }, 500);
          }
        } else {
          setUser(null);
          setRecoveryMode(false);
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const linking = {
    prefixes: [
      "squaresgame://", // for deep links
      "https://squares-41599.web.app", // fallback
    ],
    config: {
      screens: {
        ResetPasswordScreen: "reset-password", // add this line
        JoinSquareScreen: {
          path: "session/:sessionId",
        },
      },
    },
  };

  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url) return;

      const parsed = new URL(url);
      const hash = parsed.hash.startsWith("#")
        ? parsed.hash.substring(1)
        : parsed.hash;
      const params = new URLSearchParams(hash);

      const type = params.get("type");
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (type === "recovery" && access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        setRecoveryMode(true); // ✅ activate reset password screen
      }
    };

    const sub = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  const [fontsLoaded] = useFonts({
    Sora: require("./assets/fonts/Sora-Regular.ttf"),
    SoraBold: require("./assets/fonts/Sora-Bold.ttf"),
  });

  if (!fontsLoaded || loading) {
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
            {recoveryMode ? (
              <Stack.Screen
                name="ResetPasswordScreen"
                component={ResetPasswordScreen}
                options={{ headerShown: false }}
              />
            ) : user ? (
              <>
                {/* Screen that doesn't have the back button in the header */}
                <Stack.Screen name="Main" options={{ headerShown: false }}>
                  {() => (
                    <HomeScreen
                      userId={user.id}
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

export default Sentry.wrap(App);
