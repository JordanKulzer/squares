import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Text,
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
import FriendsScreen from "./src/screens/FriendsScreen";
import AddFriendsScreen from "./src/screens/AddFriendsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { LightTheme, DarkTheme } from "./assets/constants/theme";
import ForgotPasswordScreen from "./src/screens/ForgotPassword";
import { registerPushToken } from "./src/utils/registerPushToken";
import * as Linking from "expo-linking";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import * as Sentry from "@sentry/react-native";
import {
  useFonts as useAntonFonts,
  Anton_400Regular,
} from "@expo-google-fonts/anton";
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
} from "@expo-google-fonts/rubik";
import Constants from "expo-constants";

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

  useEffect(() => {
    const extra: any =
      Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};
    console.log("RUNTIME_SUPSABASE_URL:", extra.EXPO_PUBLIC_SUPABASE_URL);
    console.log(
      "RUNTIME_SUPABASE_ANON_KEY PRESN:",
      extra.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    );
    console.log("RUNTIME_API_BASE_URL:", extra.EXPO_PUBLIC_API_BASE_URL);
  }, []);

  const toggleTheme = async () => {
    const next = !isDarkTheme;
    setIsDarkTheme(next);
    await AsyncStorage.setItem("theme", next ? "dark" : "light");
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

  useEffect(() => {
    let isCancelled = false;

    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const ensureSupabaseReady = async () => {
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session || i === 9) return;
        await wait(200);
      }
    };

    const safeGetSession = async (attempt = 1): Promise<any | null> => {
      console.log(`🟦 [Auth] Checking session (attempt ${attempt})`);
      try {
        const result = (await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 5000),
          ),
        ])) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        const data = result?.data;
        const error = result?.error;

        // Handle invalid refresh token errors (e.g., deleted account)
        if (error) {
          console.warn("⚠️ [Auth] Session error:", error.message);
          if (
            error.message?.includes("Invalid Refresh Token") ||
            error.message?.includes("Refresh Token Not Found")
          ) {
            console.log(
              "🗑️ [Auth] Invalid refresh token detected, clearing session",
            );
            await supabase.auth.signOut();
            return null;
          }
        }

        if (data?.session) {
          console.log("✅ [Auth] Session found in local storage");
          return data.session;
        }

        console.log("⚪ [Auth] No session returned yet");
        return null;
      } catch (err: any) {
        if (err.message === "timeout" && attempt < 3) {
          console.log(
            `⏳ [Auth] Supabase still initializing... retrying (${attempt})`,
          );
          await wait(2000);
          return safeGetSession(attempt + 1);
        }
        // Handle AuthApiError for invalid refresh tokens
        if (
          err.message?.includes("Invalid Refresh Token") ||
          err.message?.includes("Refresh Token Not Found")
        ) {
          console.log(
            "🗑️ [Auth] Invalid refresh token in catch, clearing session",
          );
          await supabase.auth.signOut();
          return null;
        }
        console.warn("⚠️ [Auth] getSession failed:", err.message);
        return null;
      }
    };

    const checkSession = async () => {
      const session = await safeGetSession();
      if (isCancelled) return;

      if (session?.user) {
        console.log("👤 [Auth] Valid session detected — fetching user");
        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (error || !userData?.user) {
            console.warn("❌ [Auth] User invalid or deleted");
            await supabase.auth.signOut();
            setUser(null);
            Toast.show({
              type: "error",
              text1: "Account Deleted",
              text2: "Your account no longer exists. Please sign up again.",
              position: "bottom",
            });
          } else {
            console.log("🎯 [Auth] User verified:", userData.user.email);
            setUser(userData.user);
            setTimeout(() => registerPushToken(userData.user.id), 500);
          }
        } catch (err) {
          console.error("🔥 [Auth] getUser error:", err);
          setUser(null);
        }
      } else {
        console.log("🚪 [Auth] No active session — showing login");
        setUser(null);
      }
      setLoading(false);
    };

    // ✅ wrap awaits inside an IIFE
    (async () => {
      await ensureSupabaseReady();
      await checkSession();

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (isCancelled) return;
          console.log("🔄 [Auth] Auth state change event:", _event);

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
              setTimeout(() => registerPushToken(userData.user.id), 500);
            }
          } else {
            setUser(null);
            setRecoveryMode(false);
          }
          setLoading(false);
        },
      );

      return () => listener?.subscription.unsubscribe();
    })();

    return () => {
      isCancelled = true;
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

  const [fontsLoaded] = useAntonFonts({
    Anton_400Regular,
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
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
          <Stack.Navigator
            screenOptions={{
              headerShown: true,
              headerTitleAlign: "center",
              headerTitle: () => <HeaderLogo />,
              headerStyle: {
                backgroundColor: paperTheme.colors.surface,
                shadowOpacity: 0,
                elevation: 0,
              },
              headerTintColor: paperTheme.colors.onBackground,
            }}
          >
            {recoveryMode ? (
              <Stack.Screen
                name="ResetPasswordScreen"
                options={{ headerShown: false }}
              >
                {({ navigation }) => (
                  <ResetPasswordScreen
                    navigation={navigation}
                    onResetComplete={() => setRecoveryMode(false)}
                  />
                )}
              </Stack.Screen>
            ) : user ? (
              <>
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

                {/* Other screens with back buttons */}
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
                  {
                    name: "FriendsScreen",
                    component: FriendsScreen,
                    title: "Friends",
                  },
                  {
                    name: "AddFriendsScreen",
                    component: AddFriendsScreen,
                    title: null,
                  },
                  {
                    name: "ProfileScreen",
                    component: ProfileScreen,
                    title: "Profile",
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
                      headerTitleContainerStyle: {
                        justifyContent: "center",
                        alignItems: "center",
                      },

                      headerStyle: {
                        backgroundColor: paperTheme.colors.surface,
                        shadowOpacity: 0,
                        elevation: 0,
                        borderBottomWidth: 2, // ✅ make sure this is gone
                      },
                      headerBackTitleVisible: false,
                      headerTintColor: paperTheme.colors.onBackground,
                      title: title || undefined,
                      headerLeft: () => (
                        <TouchableOpacity
                          style={{
                            height: 30,
                            width: 30,
                            borderRadius: 20,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onPress={() => navigation.goBack()}
                        >
                          <Icon
                            name="arrow-back"
                            size={24}
                            color={paperTheme.colors.onBackground}
                          />
                        </TouchableOpacity>
                      ),
                      headerRight:
                        name === "FriendsScreen"
                          ? () => (
                              <TouchableOpacity
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 20,
                                  //backgroundColor: paperTheme.colors.primary,
                                  marginRight: 8,
                                }}
                                onPress={() =>
                                  navigation.navigate("AddFriendsScreen")
                                }
                              >
                                <Icon
                                  name="person-add"
                                  size={18}
                                  color="#fff"
                                />
                                <Text
                                  style={{
                                    color: "#fff",
                                    fontSize: 13,
                                    fontFamily: "Rubik_500Medium",
                                    marginLeft: 4,
                                  }}
                                >
                                  Add
                                </Text>
                              </TouchableOpacity>
                            )
                          : undefined,
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
